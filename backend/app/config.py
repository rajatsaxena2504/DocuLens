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

    # ===========================================
    # AI Provider Configuration
    # Priority: Ollama → Databricks → Gemini → Anthropic → Placeholder
    # ===========================================

    # 1. Ollama / LM Studio (Local Models) - HIGHEST PRIORITY
    # For Ollama: http://localhost:11434
    # For LM Studio: http://localhost:1234/v1
    ollama_base_url: str = ""  # Set to enable local models
    ollama_model: str = "llama3.2"  # Model name (llama3.2, mistral, codellama, etc.)

    # 2. Databricks Foundation Models
    databricks_host: str = ""  # e.g., https://your-workspace.cloud.databricks.com
    databricks_token: str = ""  # Personal access token
    databricks_model: str = "databricks-meta-llama-3-1-70b-instruct"  # Model serving endpoint

    # 3. Google Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # 4. Anthropic Claude
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-3-haiku-20240307"

    # GitHub
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
