"""
LangGraph-powered complaint processing agent using Groq LLMs.
Compatible with langgraph>=1.0 and langchain-core>=1.0

Models:
  - gemma2-9b-it              → intent routing + field extraction
  - llama-3.3-70b-versatile   → risk assessment + assistant reply
"""
from __future__ import annotations
import json
import base64
import logging
from typing import TypedDict, Optional, List, Annotated
import operator
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


# ─── Groq LLM Clients ─────────────────────────────────────────────────────────

def get_fast_llm():
    """gemma2-9b-it — fast extraction and routing."""
    return ChatGroq(
        api_key=settings.groq_api_key,
        model="gemma2-9b-it",
        temperature=0.1,
        max_tokens=4096,
    )


def get_smart_llm():
    """llama-3.3-70b-versatile — deeper reasoning for risk + replies."""
    return ChatGroq(
        api_key=settings.groq_api_key,
        model="llama-3.3-70b-versatile",
        temperature=0.2,
        max_tokens=4096,
    )


# ─── Agent State ──────────────────────────────────────────────────────────────

class AgentState(TypedDict):
    # Inputs
    user_message: str
    current_complaint: Optional[dict]
    current_risk: Optional[dict]
    file_content: Optional[str]
    file_name: Optional[str]
    user_role: str

    # Intermediate
    intent: str

    # Outputs
    extracted_complaint: Optional[dict]
    updated_fields: List[str]
    risk_assessment: Optional[dict]
    assistant_reply: str
    action_performed: str
    error: Optional[str]


def _strip_json_fences(text: str) -> str:
    """Remove markdown code fences from LLM output."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first line (```json or ```) and last line (```)
        inner = lines[1:-1] if lines[-1].strip() == "```" else lines[1:]
        text = "\n".join(inner).strip()
    return text


# ─── Nodes ────────────────────────────────────────────────────────────────────

def router_node(state: AgentState) -> AgentState:
    """Determines intent: LOG_NEW | EDIT_FIELDS | EXTRACT_DOCUMENT | GENERAL_QUERY"""
    try:
        if state.get("file_content"):
            return {**state, "intent": "EXTRACT_DOCUMENT"}

        llm = get_fast_llm()
        response = llm.invoke([
            SystemMessage(content=ROUTER_PROMPT),
            HumanMessage(content=state["user_message"]),
        ])
        intent = response.content.strip().upper()
        valid = {"LOG_NEW", "EDIT_FIELDS", "EXTRACT_DOCUMENT", "GENERAL_QUERY"}
        if intent not in valid:
            for v in valid:
                if v in intent:
                    intent = v
                    break
            else:
                intent = "EDIT_FIELDS" if state.get("current_complaint") else "LOG_NEW"
        return {**state, "intent": intent}
    except Exception as e:
        logger.error(f"router_node error: {e}")
        return {**state, "intent": "LOG_NEW", "error": str(e)}


def log_complaint_node(state: AgentState) -> AgentState:
    """Extracts complaint fields from natural language."""
    try:
        llm = get_fast_llm()
        response = llm.invoke([
            SystemMessage(content=LOG_COMPLAINT_PROMPT),
            HumanMessage(content=f"Extract complaint details:\n\n{state['user_message']}"),
        ])
        text = _strip_json_fences(response.content)
        extracted = json.loads(text)
        all_fields = [k for k, v in extracted.items() if v not in ("", None, False)]
        return {**state, "extracted_complaint": extracted, "updated_fields": all_fields, "action_performed": "LOG_NEW"}
    except Exception as e:
        logger.error(f"log_complaint_node error: {e}")
        return {**state, "extracted_complaint": {}, "updated_fields": [], "action_performed": "LOG_NEW", "error": str(e)}


def edit_complaint_node(state: AgentState) -> AgentState:
    """Updates only the fields specified by the user, preserving all others."""
    try:
        current = state.get("current_complaint") or {}
        prompt = EDIT_COMPLAINT_PROMPT.format(current_complaint=json.dumps(current, indent=2))
        llm = get_fast_llm()
        response = llm.invoke([
            SystemMessage(content=prompt),
            HumanMessage(content=f"User edit: {state['user_message']}"),
        ])
        text = _strip_json_fences(response.content)
        result = json.loads(text)
        updated_complaint = result.get("updated_complaint", current)
        updated_fields = result.get("updated_fields", [])
        return {**state, "extracted_complaint": updated_complaint, "updated_fields": updated_fields, "action_performed": "EDIT_FIELDS"}
    except Exception as e:
        logger.error(f"edit_complaint_node error: {e}")
        return {**state, "extracted_complaint": state.get("current_complaint") or {}, "updated_fields": [], "action_performed": "EDIT_FIELDS", "error": str(e)}


def extract_document_node(state: AgentState) -> AgentState:
    """Extracts complaint data from uploaded document text."""
    try:
        document_text = state.get("file_content") or state.get("user_message") or ""
        file_name = state.get("file_name") or "document"
        prompt = EXTRACT_DOCUMENT_PROMPT.format(document_text=document_text)
        llm = get_smart_llm()
        response = llm.invoke([
            SystemMessage(content=prompt),
            HumanMessage(content=f"Extract all complaint details from: {file_name}"),
        ])
        text = _strip_json_fences(response.content)
        extracted = json.loads(text)
        all_fields = [k for k, v in extracted.items() if v not in ("", None, False)]
        return {**state, "extracted_complaint": extracted, "updated_fields": all_fields, "action_performed": "EXTRACT_DOCUMENT"}
    except Exception as e:
        logger.error(f"extract_document_node error: {e}")
        return {**state, "extracted_complaint": {}, "updated_fields": [], "action_performed": "EXTRACT_DOCUMENT", "error": str(e)}


def general_query_node(state: AgentState) -> AgentState:
    """Handles general questions without modifying the complaint."""
    return {**state, "extracted_complaint": state.get("current_complaint") or {}, "updated_fields": [], "action_performed": "GENERAL_QUERY"}


def risk_assessment_node(state: AgentState) -> AgentState:
    """Generates ICH Q9 pharmaceutical risk assessment."""
    try:
        complaint_data = state.get("extracted_complaint") or state.get("current_complaint") or {}
        if not (complaint_data.get("complaint_description") or complaint_data.get("product_name")):
            return {**state, "risk_assessment": state.get("current_risk") or {}}

        prompt = RISK_ASSESSMENT_PROMPT.format(complaint_data=json.dumps(complaint_data, indent=2))
        llm = get_smart_llm()
        response = llm.invoke([
            SystemMessage(content=prompt),
            HumanMessage(content="Generate the pharmaceutical risk assessment."),
        ])
        text = _strip_json_fences(response.content)
        risk = json.loads(text)
        return {**state, "risk_assessment": risk}
    except Exception as e:
        logger.error(f"risk_assessment_node error: {e}")
        return {**state, "risk_assessment": state.get("current_risk") or {}, "error": str(e)}


def reply_node(state: AgentState) -> AgentState:
    """Generates a conversational assistant reply."""
    try:
        complaint = state.get("extracted_complaint") or {}
        risk = state.get("risk_assessment") or {}
        action = state.get("action_performed", "GENERAL_QUERY")
        updated = state.get("updated_fields", [])

        if action == "GENERAL_QUERY":
            return {**state, "assistant_reply": "I'm your Pharma QMS Co-pilot. Describe a complaint in plain language to log it, or ask me to update specific fields."}

        complaint_summary = (
            f"Product: {complaint.get('product_name', 'N/A')}, "
            f"Batch: {complaint.get('batch_lot_number', 'N/A')}, "
            f"Customer: {complaint.get('customer_name', 'N/A')}"
        )
        risk_summary = (
            f"Severity: {risk.get('severity', 'N/A')}, "
            f"Risk: {risk.get('risk_level', 'N/A')}, "
            f"Routing: {risk.get('suggested_routing', 'N/A')}"
        )
        prompt = ASSISTANT_REPLY_PROMPT.format(
            action=action,
            complaint_summary=complaint_summary,
            risk_summary=risk_summary,
            updated_fields=", ".join(updated) if updated else "none",
            user_message=state["user_message"],
        )
        llm = get_smart_llm()
        response = llm.invoke([
            SystemMessage(content=prompt),
            HumanMessage(content="Generate the assistant reply now."),
        ])
        reply = response.content.strip().strip('"').strip("'")
        return {**state, "assistant_reply": reply}
    except Exception as e:
        logger.error(f"reply_node error: {e}")
        return {**state, "assistant_reply": f"Complaint processed. Action: {state.get('action_performed', 'complete')}."}


# ─── Routing Logic ────────────────────────────────────────────────────────────

def route_by_intent(state: AgentState) -> str:
    mapping = {
        "LOG_NEW": "log_complaint",
        "EDIT_FIELDS": "edit_complaint",
        "EXTRACT_DOCUMENT": "extract_document",
        "GENERAL_QUERY": "general_query",
    }
    return mapping.get(state.get("intent", "LOG_NEW"), "log_complaint")


# ─── Build Graph ──────────────────────────────────────────────────────────────

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


# ─── Public Invoke ────────────────────────────────────────────────────────────

async def run_complaint_agent(
    user_message: str,
    current_complaint: Optional[dict] = None,
    current_risk: Optional[dict] = None,
    file_base64: Optional[str] = None,
    file_name: Optional[str] = None,
    file_mime_type: Optional[str] = None,
    user_role: str = "QA Manager",
) -> dict:
    """Run the LangGraph complaint agent and return result state."""
    file_content = None
    if file_base64:
        try:
            decoded = base64.b64decode(file_base64).decode("utf-8", errors="replace")
            file_content = decoded
        except Exception as e:
            logger.warning(f"Could not decode file: {e}")
            file_content = file_base64

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
