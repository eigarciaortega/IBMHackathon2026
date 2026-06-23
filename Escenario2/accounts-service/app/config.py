from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@accounts-db:5432/accounts_db",
        validation_alias="ACCOUNTS_DATABASE_URL",
    )
    service_name: str = "accounts-service"
    log_level: str = "INFO"


settings = Settings()
