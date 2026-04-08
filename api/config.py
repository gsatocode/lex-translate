from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = Field(..., description="PostgreSQL async connection URL (postgresql+asyncpg://...)")
    redis_url: str = Field(..., description="Redis connection URL")
    secret_key: str = Field(..., min_length=32, description="JWT signing secret — generate with: openssl rand -hex 32")

    llm_provider: str = Field(default="anthropic")
    anthropic_api_key: str = Field(default="")
    openai_api_key: str = Field(default="")
    groq_api_key: str = Field(default="")

    r2_account_id: str = Field(default="")
    r2_access_key: str = Field(default="")
    r2_secret_key: str = Field(default="")
    r2_bucket: str = Field(default="lex-translate")

    @property
    def r2_endpoint(self) -> str:
        return f"https://{self.r2_account_id}.r2.cloudflarestorage.com"


settings = Settings()
