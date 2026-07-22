"""
Pydantic v2 schemas for request/response validation.
"""
from __future__ import annotations
from typing import List, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime


# ─── Complaint Schemas ────────────────────────────────────────────────────────

class ComplaintBase(BaseModel):
    customer_name: str = ""
    customer_type: str = ""
    reporter_contact: str = ""
    product_name: str = ""
    product_type: str = "FDF"
    product_strength_grade: str = ""
    batch_lot_number: str = ""
    mfg_date: str = ""
    exp_date: str = ""
    affected_quantity: str = ""
    complaint_description: str = ""
    defect_category: str = ""
    packaging_condition: str = ""
    storage_condition: str = ""
    adverse_event: bool = False
    adverse_event_details: str = ""
    status: str = "Logged"
    date_logged: str = ""
    last_updated: str = ""


class ComplaintCreate(ComplaintBase):
    complaint_number: str = ""


class ComplaintUpdate(ComplaintBase):
    pass


class ComplaintResponse(ComplaintBase):
    id: str
    complaint_number: str

    model_config = {"from_attributes": True}


# ─── Risk Assessment Schemas ──────────────────────────────────────────────────

class RiskAssessmentBase(BaseModel):
    severity: str = ""
    risk_level: str = ""
    suggested_routing: str = ""
    root_cause_hypothesis: str = ""
    rationale: str = ""
    capa_required: bool = False
    recommended_actions: List[str] = []


class RiskAssessmentResponse(RiskAssessmentBase):
    id: str
    complaint_id: str

    model_config = {"from_attributes": True}


# ─── Full Record (Complaint + Risk) ──────────────────────────────────────────

class ComplaintRecord(BaseModel):
    complaint: ComplaintResponse
    risk: Optional[RiskAssessmentResponse] = None

    model_config = {"from_attributes": True}


# ─── Audit Log Schemas ────────────────────────────────────────────────────────

class AuditLogResponse(BaseModel):
    id: str
    complaint_id: Optional[str] = None
    timestamp: datetime
    user_name: str
    action: str
    details: str
    field_modified: str = ""

    model_config = {"from_attributes": True}


# ─── Co-pilot Request/Response ────────────────────────────────────────────────

class FileAttachment(BaseModel):
    name: str
    mime_type: str
    size: int
    base64_data: str


class CopilotRequest(BaseModel):
    prompt: str = ""
    current_complaint: Optional[dict] = None
    current_risk: Optional[dict] = None
    file: Optional[FileAttachment] = None
    user_role: str = "QA Manager"


class CopilotComplaintData(BaseModel):
    customer_name: Optional[str] = None
    customer_type: Optional[str] = None
    reporter_contact: Optional[str] = None
    product_name: Optional[str] = None
    product_type: Optional[str] = None
    product_strength_grade: Optional[str] = None
    batch_lot_number: Optional[str] = None
    mfg_date: Optional[str] = None
    exp_date: Optional[str] = None
    affected_quantity: Optional[str] = None
    complaint_description: Optional[str] = None
    defect_category: Optional[str] = None
    packaging_condition: Optional[str] = None
    storage_condition: Optional[str] = None
    adverse_event: Optional[bool] = None
    adverse_event_details: Optional[str] = None


class CopilotRiskData(BaseModel):
    severity: Optional[str] = None
    risk_level: Optional[str] = None
    suggested_routing: Optional[str] = None
    root_cause_hypothesis: Optional[str] = None
    rationale: Optional[str] = None
    capa_required: Optional[bool] = None
    recommended_actions: Optional[List[str]] = None


class CopilotResponse(BaseModel):
    success: bool = True
    assistant_reply: str = ""
    action_performed: str = "GENERAL_QUERY"
    updated_fields: List[str] = []
    complaint: CopilotComplaintData = Field(default_factory=CopilotComplaintData)
    risk_assessment: CopilotRiskData = Field(default_factory=CopilotRiskData)
    error: Optional[str] = None


# ─── Save Complaint Request ────────────────────────────────────────────────────

class SaveComplaintRequest(BaseModel):
    complaint: ComplaintCreate
    risk: RiskAssessmentBase
    user_name: str = "QA Manager"
