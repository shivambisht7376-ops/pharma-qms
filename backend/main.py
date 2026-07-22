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


# ── Serve React Frontend (Production) ──
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

client_build_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dist", "client")

# Only mount static files if the build directory exists (i.e. in production)
if os.path.exists(client_build_dir):
    # Mount the /assets folder created by Vite
    assets_dir = os.path.join(client_build_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    # Catch-all route to serve index.html for React Router (and other static files at root)
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # If they request a specific file like favicon.ico
        specific_file = os.path.join(client_build_dir, full_path)
        if os.path.exists(specific_file) and os.path.isfile(specific_file):
            return FileResponse(specific_file)
        # Otherwise serve index.html for client-side routing
        return FileResponse(os.path.join(client_build_dir, "index.html"))

