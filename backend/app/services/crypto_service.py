from cryptography.fernet import Fernet, InvalidToken
from app.core.config import settings


# ── Fernet instance — initialized once from settings ─────────────────────────
_fernet = Fernet(settings.FERNET_KEY.encode())


def encrypt(plain_text: str) -> str:
    """
    Encrypt a plain string. Returns a URL-safe base64 encoded string.
    Use this before storing any secret in the database.
    """
    if not plain_text:
        raise ValueError("Cannot encrypt empty string")
    return _fernet.encrypt(plain_text.encode()).decode()


def decrypt(cipher_text: str) -> str:
    """
    Decrypt a Fernet-encrypted string back to plain text.
    Raises ValueError if the token is invalid or tampered with.
    """
    if not cipher_text:
        raise ValueError("Cannot decrypt empty string")
    try:
        return _fernet.decrypt(cipher_text.encode()).decode()
    except InvalidToken:
        raise ValueError("Decryption failed — invalid or tampered token")


def encrypt_if_not_none(value: str | None) -> str | None:
    """Encrypt only if value is not None. Useful for optional fields."""
    if value is None:
        return None
    return encrypt(value)


def decrypt_if_not_none(value: str | None) -> str | None:
    """Decrypt only if value is not None."""
    if value is None:
        return None
    return decrypt(value)