"""
Async SQLAlchemy database setup for PostgreSQL (Neon).
"""
import ssl
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from backend.config import get_settings

settings = get_settings()


def _build_async_url(url: str) -> str:
    """
    Convert a standard PostgreSQL URL to asyncpg-compatible format.
    - Replaces postgres:// or postgresql:// with postgresql+asyncpg://
    - Removes ALL query params (sslmode, channel_binding) since asyncpg
      does not accept them in the URL; SSL is handled via connect_args instead.
    """
    from urllib.parse import urlparse, urlunparse

    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    # Strip ALL query params — asyncpg uses connect_args for SSL
    parsed = urlparse(url)
    cleaned = parsed._replace(query="")
    return urlunparse(cleaned)


async_url = _build_async_url(settings.database_url)

# Create SSL context for Neon (requires TLS)
ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE  # Neon uses valid certs; set True in strict prod

engine = create_async_engine(
    async_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    connect_args={"ssl": ssl_ctx},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    """FastAPI dependency to provide a DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Create all tables on startup."""
    async with engine.begin() as conn:
        from backend import models  # noqa: F401 -- ensure models are registered
        await conn.run_sync(Base.metadata.create_all)
