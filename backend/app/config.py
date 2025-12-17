from pydantic_settings import BaseSettings
from functools import lru_cache
import os
from pathlib import Path

# Find .env file - check current dir, then parent dir
def find_env_file():
    current = Path(__file__).resolve().parent.parent  # backend/app -> backend
    for check_dir in [current, current.parent]:  # backend, then project root
        env_path = check_dir / ".env"
        if env_path.exists():
            return str(env_path)
    return ".env"


class Settings(BaseSettings):
    # Database - Use SQLite by default for easy development (no PostgreSQL setup required)
    # Set DATABASE_URL env var to use PostgreSQL in production
    database_url: str = "sqlite:///./doculens.db"

    # Security
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours

    # External APIs (Gemini is prioritized if available, then Anthropic)
    gemini_api_key: str = ""
    anthropic_api_key: str = ""
    github_token: str = ""

    # File uploads
    upload_dir: str = "./uploads"
    max_upload_size: int = 50 * 1024 * 1024  # 50MB

    # App settings
    app_name: str = "DocuLens"
    debug: bool = False

    class Config:
        env_file = find_env_file()
        case_sensitive = False
        extra = "ignore"  # Ignore extra env vars not defined in Settings


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
