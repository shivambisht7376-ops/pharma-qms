"""
LangGraph-powered complaint processing agent using Groq LLMs.
Compatible with langgraph>=1.0 and langchain-core>=1.0

Models:
  - gemma2-9b-it              → intent routing + field extraction  
  - llama-3.3-70b-versatile   → risk assessment + assistant reply
"""
from __future__ import annotations
import json
import re
import base64
import logging
from typing import TypedDict, Optional, List
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from backend.agent.prompts import (
    ROUTER_PROMPT,
    LOG_COMPLAINT_PROMPT,
    EDIT_COMPLAINT_PROMPT,
    EXTRACT_DOCUMENT_PROMPT,
    RISK_ASSESSMENT_PROMPT,
    ASSISTANT_REPLY_PROMPT,
)
from backend.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Empty complaint template ──────────────────────────────────────────────────
EMPTY_COMPLAINT = {
    "customer_name": "",
    "customer_type": "",
    "reporter_contact": "",
    "product_name": "",
    "product_type": "FDF",
    "product_strength_grade": "",
    "batch_lot_number": "",
    "mfg_date": "",
    "exp_date": "",
    "affected_quantity": "",
    "complaint_description": "",
    "defect_category": "",
    "packaging_condition": "",
    "storage_condition": "",
    "adverse_event": False,
    "adverse_event_details": "",
}

# ── Groq LLM Clients ──────────────────────────────────────────────────────────

def get_fast_llm(json_mode: bool = False):
    """llama-3.1-8b-instant — fast extraction and routing."""
    kwargs: dict = dict(
        api_key=settings.groq_api_key,
        model="llama-3.1-8b-instant",
        temperature=0.0,
        max_tokens=2048,
    )
    if json_mode:
        kwargs["model_kwargs"] = {"response_format": {"type": "json_object"}}
    return ChatGroq(**kwargs)


def get_smart_llm(json_mode: bool = False):
    """llama-3.3-70b-versatile — deeper reasoning for risk + replies."""
    kwargs: dict = dict(
        api_key=settings.groq_api_key,
        model="llama-3.3-70b-versatile",
        temperature=0.1,
        max_tokens=2048,
    )
    if json_mode:
        kwargs["model_kwargs"] = {"response_format": {"type": "json_object"}}
    return ChatGroq(**kwargs)


# ── Robust JSON extractor ─────────────────────────────────────────────────────

def _extract_json(text: str) -> dict:
    """
    Multi-strategy JSON extractor — handles:
    1. Pure JSON response
    2. JSON inside markdown code fences (```json ... ```)
    3. JSON embedded inside prose text
    4. Partial/malformed JSON (best effort)
    """
    text = text.strip()

    # Strategy 1: try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strategy 2: strip markdown fences
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.IGNORECASE)
    if fence_match:
        try:
            return json.loads(fence_match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Strategy 3: find largest JSON object in the text
    brace_pattern = re.findall(r"\{[\s\S]*?\}", text)
    if brace_pattern:
        # Try from largest to smallest match
        for candidate in sorted(brace_pattern, key=len, reverse=True):
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                continue

    # Strategy 4: extract JSON from first { to last }
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass

    logger.error(f"[JSON EXTRACT FAILED] Raw LLM output: {text[:500]}")
    return {}


# ── Agent State ───────────────────────────────────────────────────────────────

class AgentState(TypedDict):
    user_message: str
    current_complaint: Optional[dict]
    current_risk: Optional[dict]
    file_content: Optional[str]
    file_name: Optional[str]
    user_role: str
    intent: str
    extracted_complaint: Optional[dict]
    updated_fields: List[str]
    risk_assessment: Optional[dict]
    assistant_reply: str
    action_performed: str
    error: Optional[str]


# ── Nodes ─────────────────────────────────────────────────────────────────────

def router_node(state: AgentState) -> AgentState:
    """Determines intent: LOG_NEW | EDIT_FIELDS | EXTRACT_DOCUMENT | GENERAL_QUERY"""
    try:
        if state.get("file_content"):
            return {**state, "intent": "EXTRACT_DOCUMENT"}

        llm = get_fast_llm(json_mode=False)  # Router returns plain text, not JSON
        response = llm.invoke([
            SystemMessage(content=ROUTER_PROMPT),
            HumanMessage(content=state["user_message"]),
        ])
        raw = response.content.strip().upper()

        # Parse intent from response
        intent = "LOG_NEW"
        for candidate in ["LOG_NEW", "EDIT_FIELDS", "EXTRACT_DOCUMENT", "GENERAL_QUERY"]:
            if candidate in raw:
                intent = candidate
                break

        # ── Meaningful-complaint check ────────────────────────────────────────
        # Only treat complaint as "existing" when real identifying fields are filled.
        # Default values like product_type="FDF" do NOT count as an existing complaint.
        current_cmp = state.get("current_complaint") or {}
        has_meaningful_complaint = bool(
            current_cmp.get("customer_name") or
            current_cmp.get("product_name") or
            current_cmp.get("batch_lot_number") or
            current_cmp.get("complaint_description")
        )

        # ── Safety rules ──────────────────────────────────────────────────────
        msg_lower = state["user_message"].lower()
        edit_keywords = ["change", "update", "modify", "correct", "edit",
                         "set", "make it", "actually", "fix", "adjust"]

        if has_meaningful_complaint and any(w in msg_lower for w in edit_keywords):
            # User clearly wants to edit an existing complaint
            intent = "EDIT_FIELDS"
        elif not has_meaningful_complaint and intent == "EDIT_FIELDS":
            # LLM wrongly said EDIT but there's no real complaint yet → force LOG_NEW
            intent = "LOG_NEW"

        logger.info(f"[ROUTER] Intent: {intent} | has_meaningful={has_meaningful_complaint}")
        return {**state, "intent": intent}
    except Exception as e:
        logger.error(f"[ROUTER ERROR] {e}")
        return {**state, "intent": "LOG_NEW", "error": str(e)}



def log_complaint_node(state: AgentState) -> AgentState:
    """Extracts complaint fields from natural language — uses JSON mode for reliability."""
    try:
        # Use llama-3.3-70b for better extraction reliability in JSON mode
        llm = get_smart_llm(json_mode=True)

        system_prompt = LOG_COMPLAINT_PROMPT + """

CRITICAL: You MUST respond with ONLY a JSON object. No introduction, no explanation, no markdown.
Start your response with { and end with }
Extract every detail you can find in the user message.
"""
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=state["user_message"]),
        ])

        logger.info(f"[LOG_COMPLAINT] Raw LLM: {response.content[:300]}")
        extracted = _extract_json(response.content)

        if not extracted:
            # Fallback: try with gemma
            llm2 = get_fast_llm(json_mode=False)
            response2 = llm2.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=state["user_message"]),
            ])
            extracted = _extract_json(response2.content)

        # Merge with empty template so all keys are present
        merged = {**EMPTY_COMPLAINT, **extracted}

        # Determine which fields were actually filled
        updated_fields = [
            k for k, v in merged.items()
            if v not in ("", None, False, []) and EMPTY_COMPLAINT.get(k) != v
        ]

        logger.info(f"[LOG_COMPLAINT] Extracted {len(updated_fields)} fields: {updated_fields}")
        return {
            **state,
            "extracted_complaint": merged,
            "updated_fields": updated_fields,
            "action_performed": "LOG_NEW",
        }
    except Exception as e:
        logger.error(f"[LOG_COMPLAINT ERROR] {e}", exc_info=True)
        return {**state, "extracted_complaint": EMPTY_COMPLAINT, "updated_fields": [], "action_performed": "LOG_NEW", "error": str(e)}


def edit_complaint_node(state: AgentState) -> AgentState:
    """
    Updates ONLY the fields the user mentioned.
    Returns a delta (only changed fields + their new values).
    Python merges the delta onto the existing complaint — the LLM never
    needs to reproduce the full complaint, preventing data loss.
    """
    try:
        current = state.get("current_complaint") or {}
        current_merged = {**EMPTY_COMPLAINT, **current}

        # Ask LLM only for the CHANGED fields — not the entire complaint
        edit_prompt = f"""You are a pharmaceutical QMS field editor.

CURRENT COMPLAINT STATE:
{json.dumps(current_merged, indent=2)}

The user wants to make an edit. Extract ONLY the fields they want to change.

RULES:
1. Return ONLY the fields mentioned by the user — do not include unchanged fields
2. Use the exact same snake_case key names from the schema
3. The allowed field names are: customer_name, customer_type, reporter_contact, product_name,
   product_type, product_strength_grade, batch_lot_number, mfg_date, exp_date,
   affected_quantity, complaint_description, defect_category, packaging_condition,
   storage_condition, adverse_event, adverse_event_details

CRITICAL: Respond with ONLY a JSON object containing ONLY the changed fields.
Example: If user changes quantity, return: {{"affected_quantity": "50 bottles"}}
Do NOT include unchanged fields. Do NOT add markdown or explanation."""

        llm = get_smart_llm(json_mode=True)
        response = llm.invoke([
            SystemMessage(content=edit_prompt),
            HumanMessage(content=f"User edit: {state['user_message']}"),
        ])

        logger.info(f"[EDIT_COMPLAINT] Delta from LLM: {response.content[:300]}")
        delta = _extract_json(response.content)

        # Merge delta onto existing — NEVER replace everything
        updated_complaint = {**current_merged, **delta}
        updated_fields = list(delta.keys())

        logger.info(f"[EDIT_COMPLAINT] Updated fields: {updated_fields}")
        return {
            **state,
            "extracted_complaint": updated_complaint,
            "updated_fields": updated_fields,
            "action_performed": "EDIT_FIELDS",
        }
    except Exception as e:
        logger.error(f"[EDIT_COMPLAINT ERROR] {e}", exc_info=True)
        return {**state, "extracted_complaint": state.get("current_complaint") or EMPTY_COMPLAINT, "updated_fields": [], "action_performed": "EDIT_FIELDS", "error": str(e)}


def extract_document_node(state: AgentState) -> AgentState:
    """Extracts complaint data from uploaded document text."""
    try:
        document_text = state.get("file_content") or state.get("user_message") or ""
        prompt = EXTRACT_DOCUMENT_PROMPT.replace("{document_text}", document_text) + """

CRITICAL: Respond with ONLY a JSON object. No markdown. Start with { and end with }.
"""
        llm = get_smart_llm(json_mode=True)
        response = llm.invoke([
            SystemMessage(content=prompt),
            HumanMessage(content="Extract all complaint details from this document."),
        ])

        extracted = _extract_json(response.content)
        merged = {**EMPTY_COMPLAINT, **extracted}
        updated_fields = [k for k, v in merged.items() if v not in ("", None, False) and EMPTY_COMPLAINT.get(k) != v]

        return {**state, "extracted_complaint": merged, "updated_fields": updated_fields, "action_performed": "EXTRACT_DOCUMENT"}
    except Exception as e:
        logger.error(f"[EXTRACT_DOCUMENT ERROR] {e}", exc_info=True)
        return {**state, "extracted_complaint": EMPTY_COMPLAINT, "updated_fields": [], "action_performed": "EXTRACT_DOCUMENT", "error": str(e)}


def general_query_node(state: AgentState) -> AgentState:
    """Handles general questions without modifying the complaint."""
    return {
        **state,
        "extracted_complaint": state.get("current_complaint") or EMPTY_COMPLAINT,
        "updated_fields": [],
        "action_performed": "GENERAL_QUERY",
    }


def risk_assessment_node(state: AgentState) -> AgentState:
    """Generates ICH Q9 pharmaceutical risk assessment."""
    try:
        complaint_data = state.get("extracted_complaint") or state.get("current_complaint") or {}

        # Skip if no meaningful complaint data at all
        any_data = any(
            v not in (None, "", False, [])
            for v in complaint_data.values()
        )
        if not any_data:
            return {**state, "risk_assessment": state.get("current_risk") or {}}

        prompt = RISK_ASSESSMENT_PROMPT.replace(
            "{complaint_data}", json.dumps(complaint_data, indent=2)
        ) + """

CRITICAL: Respond with ONLY a valid JSON object. No markdown fences, no explanation.
"""
        llm = get_smart_llm(json_mode=True)
        response = llm.invoke([
            SystemMessage(content=prompt),
            HumanMessage(content="Generate the pharmaceutical risk assessment now."),
        ])

        logger.info(f"[RISK] Raw LLM: {response.content[:200]}")
        risk = _extract_json(response.content)

        if not risk:
            risk = {
                "severity": "Major",
                "risk_level": "High",
                "suggested_routing": "QA Investigation",
                "root_cause_hypothesis": "Further investigation required.",
                "rationale": "Packaging/product defect reported.",
                "capa_required": True,
                "recommended_actions": ["Initiate QA investigation", "Request batch samples", "Notify QP"],
            }

        return {**state, "risk_assessment": risk}
    except Exception as e:
        logger.error(f"[RISK ERROR] {e}", exc_info=True)
        return {**state, "risk_assessment": state.get("current_risk") or {}, "error": str(e)}


def reply_node(state: AgentState) -> AgentState:
    """Generates a conversational assistant reply."""
    try:
        complaint = state.get("extracted_complaint") or {}
        risk = state.get("risk_assessment") or {}
        action = state.get("action_performed", "GENERAL_QUERY")
        updated = state.get("updated_fields", [])

        if action == "GENERAL_QUERY":
            llm = get_smart_llm(json_mode=False)
            response = llm.invoke([
                SystemMessage(content="You are a helpful Pharma QMS AI co-pilot. Answer pharmaceutical QMS questions concisely and professionally."),
                HumanMessage(content=state["user_message"]),
            ])
            return {**state, "assistant_reply": response.content.strip()}

        complaint_summary = (
            f"Customer: {complaint.get('customer_name', 'N/A')}, "
            f"Product: {complaint.get('product_name', 'N/A')} {complaint.get('product_strength_grade', '')}, "
            f"Batch: {complaint.get('batch_lot_number', 'N/A')}, "
            f"Issue: {(complaint.get('complaint_description') or '')[:100]}"
        )
        risk_summary = (
            f"Severity: {risk.get('severity', 'N/A')}, "
            f"Risk Level: {risk.get('risk_level', 'N/A')}, "
            f"Routing: {risk.get('suggested_routing', 'N/A')}"
        )

        prompt = ASSISTANT_REPLY_PROMPT.format(
            action=action,
            complaint_summary=complaint_summary,
            risk_summary=risk_summary,
            updated_fields=", ".join(updated) if updated else "none",
            user_message=state["user_message"],
        )

        llm = get_smart_llm(json_mode=False)
        response = llm.invoke([
            SystemMessage(content=prompt),
            HumanMessage(content="Generate the assistant reply now. Be specific about what was extracted."),
        ])
        reply = response.content.strip().strip('"').strip("'")
        return {**state, "assistant_reply": reply}
    except Exception as e:
        logger.error(f"[REPLY ERROR] {e}")
        return {**state, "assistant_reply": f"Complaint processed successfully. Action: {state.get('action_performed', 'complete')}."}


# ── Routing Logic ─────────────────────────────────────────────────────────────

def route_by_intent(state: AgentState) -> str:
    mapping = {
        "LOG_NEW": "log_complaint",
        "EDIT_FIELDS": "edit_complaint",
        "EXTRACT_DOCUMENT": "extract_document",
        "GENERAL_QUERY": "general_query",
    }
    return mapping.get(state.get("intent", "LOG_NEW"), "log_complaint")


# ── Build Graph ───────────────────────────────────────────────────────────────

def build_complaint_graph():
    graph = StateGraph(AgentState)

    graph.add_node("router", router_node)
    graph.add_node("log_complaint", log_complaint_node)
    graph.add_node("edit_complaint", edit_complaint_node)
    graph.add_node("extract_document", extract_document_node)
    graph.add_node("general_query", general_query_node)
    graph.add_node("risk_assessment", risk_assessment_node)
    graph.add_node("reply", reply_node)

    graph.set_entry_point("router")
    graph.add_conditional_edges(
        "router",
        route_by_intent,
        {
            "log_complaint": "log_complaint",
            "edit_complaint": "edit_complaint",
            "extract_document": "extract_document",
            "general_query": "general_query",
        },
    )
    for node in ["log_complaint", "edit_complaint", "extract_document", "general_query"]:
        graph.add_edge(node, "risk_assessment")
    graph.add_edge("risk_assessment", "reply")
    graph.add_edge("reply", END)

    return graph.compile()


complaint_graph = build_complaint_graph()


# ── Public Invoke ─────────────────────────────────────────────────────────────

async def run_complaint_agent(
    user_message: str,
    current_complaint: Optional[dict] = None,
    current_risk: Optional[dict] = None,
    file_base64: Optional[str] = None,
    file_name: Optional[str] = None,
    file_mime_type: Optional[str] = None,
    user_role: str = "QA Manager",
) -> dict:
    file_content = None
    if file_base64:
        try:
            raw_bytes = base64.b64decode(file_base64)

            # Check if it's a PDF by magic bytes
            if raw_bytes[:4] == b'%PDF' or (file_mime_type and 'pdf' in file_mime_type.lower()):
                # Use PyPDF2 to extract text from PDF
                try:
                    import io
                    import PyPDF2
                    pdf_reader = PyPDF2.PdfReader(io.BytesIO(raw_bytes))
                    pages_text = []
                    for page in pdf_reader.pages:
                        text = page.extract_text()
                        if text:
                            pages_text.append(text.strip())
                    file_content = "\n\n".join(pages_text)
                    logger.info(f"[PDF] Extracted {len(pdf_reader.pages)} pages, {len(file_content)} chars")
                    if not file_content.strip():
                        file_content = f"[PDF uploaded: {file_name or 'document.pdf'} — no extractable text found. It may be a scanned image PDF.]"
                except Exception as pdf_err:
                    logger.warning(f"PyPDF2 extraction failed: {pdf_err}")
                    file_content = raw_bytes.decode("utf-8", errors="replace")
            else:
                # Plain text / other formats — decode normally
                file_content = raw_bytes.decode("utf-8", errors="replace")

        except Exception as e:
            logger.warning(f"Could not decode file: {e}")
            file_content = str(file_base64)[:2000]

    initial_state: AgentState = {
        "user_message": user_message or "Process the uploaded document",
        "current_complaint": current_complaint,
        "current_risk": current_risk,
        "file_content": file_content,
        "file_name": file_name,
        "user_role": user_role,
        "intent": "",
        "extracted_complaint": None,
        "updated_fields": [],
        "risk_assessment": None,
        "assistant_reply": "",
        "action_performed": "GENERAL_QUERY",
        "error": None,
    }

    result = await complaint_graph.ainvoke(initial_state)
    return result
