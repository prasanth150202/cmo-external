from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_PORT: int = 8000

    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/cmo_external"

    JWT_SECRET: str = "changeme"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    ENCRYPTION_KEY: Optional[str] = None

    META_CLIENT_ID: Optional[str] = None
    META_CLIENT_SECRET: Optional[str] = None
    META_REDIRECT_URI: str = "http://localhost:8000/api/v1/oauth/meta/callback"

    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/oauth/google/callback"
    GOOGLE_ADS_DEVELOPER_TOKEN: Optional[str] = None
    GOOGLE_ADS_LOGIN_CUSTOMER_ID: Optional[str] = None

    GEMINI_API_KEY: Optional[str] = None

    REDIS_URL: str = "redis://localhost:6379/0"

    SYNC_INTERVAL_HOURS: int = 4
    SYNC_ON_STARTUP: bool = True

    # Comma-separated list, e.g. "https://app.digifyce.com,https://cmo-external.vercel.app"
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    # The frontend origin OAuth callbacks redirect back to (no trailing slash).
    FRONTEND_URL: str = "http://localhost:3000"

    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_BUCKET: Optional[str] = None
    AWS_REGION: str = "ap-south-1"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
