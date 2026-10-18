
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "CampusMind"
    APP_VERSION: str = "0.1.0"
    APP_ENV: str = "development"

    API_PREFIX: str = "/api/v1"

    HOST: str = "127.0.0.1"
    PORT: int = 8000

    GROQ_API_KEY: str
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USERNAME: str = "neo4j"
    NEO4J_PASSWORD: str

    QDRANT_URL: str = "http://localhost:6333"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
