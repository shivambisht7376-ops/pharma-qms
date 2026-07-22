"""
Copilot router — POST /api/copilot/process
Runs the LangGraph agent and returns structured complaint + risk + reply.
"""
import logging
from fastapi import APIRouter, HTTPException
from backend.schemas import CopilotRequest, CopilotResponse, CopilotComplaintData, CopilotRiskData
from backend.agent.graph import run_complaint_agent

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/process", response_model=CopilotResponse)
async def process_complaint(request: CopilotRequest):
    """
    Main AI co-pilot endpoint.
    Accepts: natural language prompt + optional file (base64) + current complaint state
    Returns: extracted complaint fields, risk assessment, assistant reply
    """
    try:
        file_base64 = None
        file_name = None
        file_mime = None

        if request.file:
            file_base64 = request.file.base64_data
            file_name = request.file.name
            file_mime = request.file.mime_type

        result = await run_complaint_agent(
            user_message=request.prompt,
            current_complaint=request.current_complaint,
            current_risk=request.current_risk,
            file_base64=file_base64,
            file_name=file_name,
            file_mime_type=file_mime,
            user_role=request.user_role,
        )

        extracted = result.get("extracted_complaint") or {}
        risk_raw = result.get("risk_assessment") or {}

        # Build complaint response — camelCase to snake_case mapping
        # The frontend sends camelCase current_complaint, so normalize keys
        def normalize_key(k: str) -> str:
            """Convert camelCase or mixed keys to snake_case."""
            import re
            s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', k)
            return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

        normalized = {normalize_key(k): v for k, v in extracted.items()}
        updated_fields = result.get("updated_fields", [])

        complaint_data = CopilotComplaintData(
            customer_name=normalized.get("customer_name"),
            customer_type=normalized.get("customer_type"),
            reporter_contact=normalized.get("reporter_contact"),
            product_name=normalized.get("product_name"),
            product_type=normalized.get("product_type"),
            product_strength_grade=normalized.get("product_strength_grade"),
            batch_lot_number=normalized.get("batch_lot_number"),
            mfg_date=normalized.get("mfg_date"),
            exp_date=normalized.get("exp_date"),
            affected_quantity=normalized.get("affected_quantity"),
            complaint_description=normalized.get("complaint_description"),
            defect_category=normalized.get("defect_category"),
            packaging_condition=normalized.get("packaging_condition"),
            storage_condition=normalized.get("storage_condition"),
            adverse_event=normalized.get("adverse_event"),
            adverse_event_details=normalized.get("adverse_event_details"),
        )

        risk_data = CopilotRiskData(
            severity=risk_raw.get("severity"),
            risk_level=risk_raw.get("risk_level"),
            suggested_routing=risk_raw.get("suggested_routing"),
            root_cause_hypothesis=risk_raw.get("root_cause_hypothesis"),
            rationale=risk_raw.get("rationale"),
            capa_required=risk_raw.get("capa_required"),
            recommended_actions=risk_raw.get("recommended_actions"),
        )

        return CopilotResponse(
            success=True,
            assistant_reply=result.get("assistant_reply", ""),
            action_performed=result.get("action_performed", "GENERAL_QUERY"),
            updated_fields=updated_fields,
            complaint=complaint_data,
            risk_assessment=risk_data,
            error=result.get("error"),
        )

    except Exception as e:
        logger.error(f"Copilot process error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
