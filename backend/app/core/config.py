from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import secrets


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    APP_NAME: str = "HonestBill"
    APP_VERSION: str = "0.1.0"

    # ── Database ─────────────────────────────────────
    DATABASE_URL: str
    DATABASE_URL_SYNC: str

    # ── Security ─────────────────────────────────────
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── Encryption (Fernet) ──────────────────────────
    # Used to encrypt MikroTik passwords and M-Pesa credentials at rest.
    # Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    FERNET_KEY: str

    # ── M-Pesa / Daraja ──────────────────────────────
    # These are PLATFORM-LEVEL Daraja credentials (your account).
    # Each ISP tenant also has their own credentials stored encrypted in DB.
    # -- M-Pesa Encryption Key
    MPESA_ENCRYPTION_KEY: str = "honestbill-mpesa-encrypt-key-2026"
    MPESA_ENVIRONMENT: str = "sandbox"
    MPESA_CONSUMER_KEY: str = ""
    MPESA_CONSUMER_SECRET: str = ""
    MPESA_SHORTCODE: str = "174379"
    MPESA_PASSKEY: str = ""
    MPESA_CALLBACK_URL: str = ""

    DARAJA_ENV: str = "sandbox"  # sandbox | production
    DARAJA_BASE_URL: str = "https://sandbox.safaricom.co.ke"

    # ── Platform Commission ───────────────────────────
    DEFAULT_COMMISSION_RATE: float = 0.10  # 10%

    # ── Rate Limiting ─────────────────────────────────
    STK_PUSH_RATE_LIMIT_SECONDS: int = 30
    PAYMENT_ATTEMPTS_PER_HOUR: int = 3

    # ── Network Polling ───────────────────────────────
    NETWORK_POLL_INTERVAL_SECONDS: int = 60
    NETWORK_OUTAGE_THRESHOLD: int = 3  # consecutive failures before marking DOWN

    # ── Session ───────────────────────────────────────
    SESSION_EXPIRY_CHECK_INTERVAL_SECONDS: int = 60
    STK_PUSH_TIMEOUT_SECONDS: int = 90

    # ── Safaricom IP Whitelist ────────────────────────
    # Only these IPs are allowed to hit /api/mpesa/callback/*
    SAFARICOM_IPS: List[str] = [
        "196.201.214.200",
        "196.201.214.206",
        "196.201.213.114",
        "196.201.214.207",
        "196.201.214.208",
        "196.201.213.44",
        "196.201.214.171",
        "196.201.214.178",
        "196.201.214.132",
        "196.201.214.136",
        "196.201.212.127",
        "196.201.212.138",
    ]

    # ── CORS ─────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
    ]

    @field_validator("DARAJA_BASE_URL", mode="before")
    @classmethod
    def set_daraja_url(cls, v, info):
        # Auto-set base URL based on environment
        env = info.data.get("DARAJA_ENV", "sandbox")
        if env == "production":
            return "https://api.safaricom.co.ke"
        return "https://sandbox.safaricom.co.ke"

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }


# Single instance — import this everywhere
settings = Settings()