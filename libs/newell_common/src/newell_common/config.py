from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central config for every Newell service. Env vars use the NEWELL_ prefix."""

    model_config = SettingsConfigDict(env_prefix="NEWELL_", env_file=".env", extra="ignore")

    env: str = "local"
    service_name: str = "newell"
    log_level: str = "INFO"

    postgres_dsn: str = "postgresql+asyncpg://newell:newell@localhost:5432/newell"
    redis_url: str = "redis://localhost:6379/0"
    minio_endpoint: str = "localhost:9000"
    minio_public_endpoint: str = "localhost:9000"
    minio_access_key: str = "newell"
    minio_secret_key: str = "newell-secret"
    minio_bucket: str = "newell-media"

    locales_dir: str = "locales"
    default_locale: str = "en"

    jwt_secret: str = "dev-insecure-secret-change-me-in-production-please"
    jwt_algorithm: str = "HS256"
    access_ttl_seconds: int = 900
    refresh_ttl_seconds: int = 2592000

    auth_url: str = "http://auth:8000"
    profile_url: str = "http://profile:8000"
    media_url: str = "http://media:8000"
    plantcare_url: str = "http://plantcare:8000"
    interior_url: str = "http://interior:8000"

    ai_provider: str = "mock"
    ai_gateway_url: str = "http://ai_gateway:8000"


@lru_cache
def get_settings() -> Settings:
    return Settings()
