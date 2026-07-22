"""
Application configuration — reads from environment variables.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # Groq AI
    groq_api_key: str = ""

    # Database (Neon PostgreSQL)
    database_url: str = ""

    # CORS
    frontend_url: str = "http://localhost:5173"

    # App
    app_name: str = "Pharma QMS"
    debug: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
