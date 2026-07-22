"""
Audit log router — GET /api/audit-logs
"""
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from backend.database import get_db
from backend.models import AuditLog
from backend.schemas import AuditLogResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=List[AuditLogResponse])
async def list_audit_logs(db: AsyncSession = Depends(get_db)):
    """List all audit log entries, newest first."""
    try:
        result = await db.execute(
            select(AuditLog).order_by(desc(AuditLog.timestamp)).limit(500)
        )
        logs = result.scalars().all()
        return [
            AuditLogResponse(
                id=log.id,
                complaint_id=log.complaint_id,
                timestamp=log.timestamp,
                user_name=log.user_name or "System",
                action=log.action,
                details=log.details or "",
                field_modified=log.field_modified or "",
            )
            for log in logs
        ]
    except Exception as e:
        logger.error(f"List audit logs error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
