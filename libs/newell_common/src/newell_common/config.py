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
    minio_access_key: str = "newell"
    minio_secret_key: str = "newell-secret"


@lru_cache
def get_settings() -> Settings:
    return Settings()
