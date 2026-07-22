"""
Complaints CRUD router — /api/complaints
"""
import json
import uuid
import logging
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from backend.database import get_db
from backend.models import Complaint, RiskAssessment, AuditLog
from backend.schemas import SaveComplaintRequest, ComplaintRecord, ComplaintResponse, RiskAssessmentResponse

logger = logging.getLogger(__name__)
router = APIRouter()


def serialize_risk(risk: RiskAssessment) -> RiskAssessmentResponse:
    actions = []
    if risk.recommended_actions:
        try:
            actions = json.loads(risk.recommended_actions)
        except Exception:
            actions = [a.strip() for a in risk.recommended_actions.split(";") if a.strip()]

    return RiskAssessmentResponse(
        id=risk.id,
        complaint_id=risk.complaint_id,
        severity=risk.severity or "",
        risk_level=risk.risk_level or "",
        suggested_routing=risk.suggested_routing or "",
        root_cause_hypothesis=risk.root_cause_hypothesis or "",
        rationale=risk.rationale or "",
        capa_required=risk.capa_required or False,
        recommended_actions=actions,
    )


def serialize_complaint(c: Complaint) -> ComplaintResponse:
    return ComplaintResponse(
        id=c.id,
        complaint_number=c.complaint_number,
        status=c.status or "Logged",
        customer_name=c.customer_name or "",
        customer_type=c.customer_type or "",
        reporter_contact=c.reporter_contact or "",
        product_name=c.product_name or "",
        product_type=c.product_type or "FDF",
        product_strength_grade=c.product_strength_grade or "",
        batch_lot_number=c.batch_lot_number or "",
        mfg_date=c.mfg_date or "",
        exp_date=c.exp_date or "",
        affected_quantity=c.affected_quantity or "",
        complaint_description=c.complaint_description or "",
        defect_category=c.defect_category or "",
        packaging_condition=c.packaging_condition or "",
        storage_condition=c.storage_condition or "",
        adverse_event=c.adverse_event or False,
        adverse_event_details=c.adverse_event_details or "",
        date_logged=c.date_logged or "",
        last_updated=c.last_updated or "",
    )


@router.get("", response_model=List[ComplaintRecord])
async def list_complaints(db: AsyncSession = Depends(get_db)):
    """List all complaints with their risk assessments."""
    try:
        result = await db.execute(
            select(Complaint).order_by(desc(Complaint.created_at))
        )
        complaints = result.scalars().all()

        records = []
        for c in complaints:
            risk_resp = None
            if c.risk_assessment:
                risk_resp = serialize_risk(c.risk_assessment)
            records.append(ComplaintRecord(
                complaint=serialize_complaint(c),
                risk=risk_resp,
            ))
        return records
    except Exception as e:
        logger.error(f"List complaints error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=ComplaintRecord)
async def save_complaint(body: SaveComplaintRequest, db: AsyncSession = Depends(get_db)):
    """Create or update a complaint + risk assessment."""
    try:
        c_data = body.complaint
        r_data = body.risk
        today = datetime.utcnow().strftime("%Y-%m-%d")

        # Generate complaint number if missing
        complaint_number = c_data.complaint_number or f"CMP-{datetime.utcnow().year}-{str(uuid.uuid4())[:4].upper()}"

        # Check if complaint already exists
        existing_result = await db.execute(
            select(Complaint).where(Complaint.complaint_number == complaint_number)
        )
        existing = existing_result.scalar_one_or_none()

        if existing:
            # Update existing
            existing.status = c_data.status or existing.status
            existing.customer_name = c_data.customer_name or existing.customer_name
            existing.customer_type = c_data.customer_type or existing.customer_type
            existing.reporter_contact = c_data.reporter_contact or existing.reporter_contact
            existing.product_name = c_data.product_name or existing.product_name
            existing.product_type = c_data.product_type or existing.product_type
            existing.product_strength_grade = c_data.product_strength_grade or existing.product_strength_grade
            existing.batch_lot_number = c_data.batch_lot_number or existing.batch_lot_number
            existing.mfg_date = c_data.mfg_date or existing.mfg_date
            existing.exp_date = c_data.exp_date or existing.exp_date
            existing.affected_quantity = c_data.affected_quantity or existing.affected_quantity
            existing.complaint_description = c_data.complaint_description or existing.complaint_description
            existing.defect_category = c_data.defect_category or existing.defect_category
            existing.packaging_condition = c_data.packaging_condition or existing.packaging_condition
            existing.storage_condition = c_data.storage_condition or existing.storage_condition
            existing.adverse_event = c_data.adverse_event
            existing.adverse_event_details = c_data.adverse_event_details or existing.adverse_event_details
            existing.last_updated = today

            # Update or create risk
            if existing.risk_assessment:
                ra = existing.risk_assessment
            else:
                ra = RiskAssessment(id=str(uuid.uuid4()), complaint_id=existing.id)
                db.add(ra)

            complaint_obj = existing
        else:
            # Create new
            complaint_id = str(uuid.uuid4())
            complaint_obj = Complaint(
                id=complaint_id,
                complaint_number=complaint_number,
                status=c_data.status if c_data.status != "Draft" else "Logged",
                customer_name=c_data.customer_name,
                customer_type=c_data.customer_type,
                reporter_contact=c_data.reporter_contact,
                product_name=c_data.product_name,
                product_type=c_data.product_type,
                product_strength_grade=c_data.product_strength_grade,
                batch_lot_number=c_data.batch_lot_number,
                mfg_date=c_data.mfg_date,
                exp_date=c_data.exp_date,
                affected_quantity=c_data.affected_quantity,
                complaint_description=c_data.complaint_description,
                defect_category=c_data.defect_category,
                packaging_condition=c_data.packaging_condition,
                storage_condition=c_data.storage_condition,
                adverse_event=c_data.adverse_event,
                adverse_event_details=c_data.adverse_event_details,
                date_logged=c_data.date_logged or today,
                last_updated=today,
            )
            db.add(complaint_obj)

            ra = RiskAssessment(id=str(uuid.uuid4()), complaint_id=complaint_id)
            db.add(ra)

        # Update risk fields
        ra.severity = r_data.severity
        ra.risk_level = r_data.risk_level
        ra.suggested_routing = r_data.suggested_routing
        ra.root_cause_hypothesis = r_data.root_cause_hypothesis
        ra.rationale = r_data.rationale
        ra.capa_required = r_data.capa_required
        ra.recommended_actions = json.dumps(r_data.recommended_actions)

        # Add audit log
        audit = AuditLog(
            id=str(uuid.uuid4()),
            complaint_id=complaint_obj.id,
            user_name=body.user_name,
            action="COMPLAINT_SAVED",
            details=f"Complaint {complaint_number} saved to QMS Master Log. Severity: {r_data.severity}",
            field_modified="",
        )
        db.add(audit)

        await db.commit()
        await db.refresh(complaint_obj)

        return ComplaintRecord(
            complaint=serialize_complaint(complaint_obj),
            risk=serialize_risk(ra),
        )
    except Exception as e:
        await db.rollback()
        logger.error(f"Save complaint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{complaint_id}")
async def delete_complaint(complaint_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a complaint by ID."""
    try:
        result = await db.execute(select(Complaint).where(Complaint.id == complaint_id))
        complaint = result.scalar_one_or_none()
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")
        await db.delete(complaint)
        await db.commit()
        return {"success": True, "message": f"Complaint {complaint_id} deleted."}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
