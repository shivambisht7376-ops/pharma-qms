"""
FastAPI application entry point for Pharma QMS.
"""
import logging
import sys
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import get_settings
from backend.database import init_db
from backend.routers import copilot, complaints, audit

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialize DB tables."""
    logger.info("*** Pharma QMS API starting up...")
    try:
        await init_db()
        logger.info("[OK] Database tables initialized (Neon PostgreSQL)")
    except Exception as e:
        logger.error(f"[ERROR] Database initialization failed: {e}")
        logger.error("   Ensure DATABASE_URL is set correctly in .env")
    yield
    logger.info("[STOP] Pharma QMS API shutting down...")


app = FastAPI(
    title="Pharma QMS API",
    description="Pharmaceutical Quality Management System — AI-powered complaint processing",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS — allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(copilot.router, prefix="/api/copilot", tags=["AI Co-pilot"])
app.include_router(complaints.router, prefix="/api/complaints", tags=["Complaints"])
app.include_router(audit.router, prefix="/api/audit-logs", tags=["Audit Logs"])


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "service": "Pharma QMS AI Engine v2.0",
        "models": {
            "extraction": "groq/gemma2-9b-it",
            "risk_assessment": "groq/llama-3.3-70b-versatile",
        },
        "database": "Neon PostgreSQL",
    }
