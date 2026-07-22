"""
SQLAlchemy ORM models for Pharma QMS.
Tables: complaints, risk_assessments, audit_logs
"""
import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, String, Boolean, Text, DateTime, Date,
    ForeignKey, Integer, ARRAY
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from backend.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String, primary_key=True, default=gen_uuid)
    complaint_number = Column(String, unique=True, nullable=False)
    status = Column(String, default="Logged")

    # Customer
    customer_name = Column(String, default="")
    customer_type = Column(String, default="")
    reporter_contact = Column(String, default="")

    # Product
    product_name = Column(String, default="")
    product_type = Column(String, default="FDF")  # API or FDF
    product_strength_grade = Column(String, default="")
    batch_lot_number = Column(String, default="")
    mfg_date = Column(String, default="")
    exp_date = Column(String, default="")

    # Complaint Detail
    affected_quantity = Column(String, default="")
    complaint_description = Column(Text, default="")
    defect_category = Column(String, default="")
    packaging_condition = Column(String, default="")
    storage_condition = Column(String, default="")

    # Adverse Event
    adverse_event = Column(Boolean, default=False)
    adverse_event_details = Column(Text, default="")

    # Timestamps
    date_logged = Column(String, default="")
    last_updated = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    risk_assessment = relationship("RiskAssessment", back_populates="complaint", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="complaint", cascade="all, delete-orphan")


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(String, primary_key=True, default=gen_uuid)
    complaint_id = Column(String, ForeignKey("complaints.id", ondelete="CASCADE"), unique=True, nullable=False)

    severity = Column(String, default="")          # Minor / Major / Critical
    risk_level = Column(String, default="")        # Low / Medium / High / Critical
    suggested_routing = Column(String, default="")
    root_cause_hypothesis = Column(Text, default="")
    rationale = Column(Text, default="")
    capa_required = Column(Boolean, default=False)

    # Stored as semicolon-separated string (PostgreSQL ARRAY alternative for simplicity)
    recommended_actions = Column(Text, default="")  # JSON array string

    complaint = relationship("Complaint", back_populates="risk_assessment")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=gen_uuid)
    complaint_id = Column(String, ForeignKey("complaints.id", ondelete="SET NULL"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user_name = Column(String, default="System")
    action = Column(String, nullable=False)
    details = Column(Text, default="")
    field_modified = Column(String, default="")

    complaint = relationship("Complaint", back_populates="audit_logs")
