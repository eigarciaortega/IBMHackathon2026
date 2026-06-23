from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@processor-db:5432/processor_db",
        validation_alias="PROCESSOR_DATABASE_URL",
    )
    service_name: str = "processor-service"
    log_level: str = "INFO"
    accounts_service_url: str = Field(
        default="http://accounts-service:8001", validation_alias="ACCOUNTS_SERVICE_URL"
    )
    reconciliation_interval_seconds: int = Field(default=30, validation_alias="RECONCILIATION_INTERVAL_SECONDS")
    pending_timeout_seconds: int = Field(default=60, validation_alias="PENDING_TIMEOUT_SECONDS")
    http_timeout_seconds: float = 5.0


settings = Settings()
