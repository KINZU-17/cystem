import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "CYSTEM Engine"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "sqlite:///./cystem.db"

    # Security & Auth
    JWT_SECRET_KEY: str = "cystem_secret_key_change_in_production_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Daraja M-Pesa API
    MPESA_ENVIRONMENT: str = "sandbox"
    MPESA_CONSUMER_KEY: str = ""
    MPESA_CONSUMER_SECRET: str = ""
    MPESA_SHORTCODE: str = "174379"
    MPESA_PASSKEY: str = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"
    MPESA_CALLBACK_URL: str = "http://localhost:8000/api/v1/wallet/mpesa/callback"

    # Daraja B2C (Withdrawals)
    MPESA_B2C_SHORTCODE: str = "600000"
    MPESA_INITIATOR_NAME: str = "testapi"
    MPESA_INITIATOR_PASSWORD: str = ""
    MPESA_CERT_PATH: str = "./certs/sandbox_cert.cer"

    # Financial Game Logic
    POINTS_TO_KSH_RATE: float = 130.0  # 1 Point = 130 KSH
    ADMIN_WITHDRAWAL_FEE_KSH: float = 3.0  # 3 KSH admin platform cut

    # SMS
    AT_USERNAME: str = "sandbox"
    AT_API_KEY: str = ""

    # Admin Master Secret
    ADMIN_SECRET_KEY: str = "cystem_admin_secret_2026"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
