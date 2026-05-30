"""
Encrypt/decrypt sensitive M-Pesa credentials at rest.
Uses Fernet symmetric encryption.
"""

from cryptography.fernet import Fernet
from app.core.config import settings
import base64
import hashlib


def _get_fernet() -> Fernet:
    key_bytes = settings.MPESA_ENCRYPTION_KEY.encode()
    # Derive a 32-byte key and base64url-encode it for Fernet
    derived = hashlib.sha256(key_bytes).digest()
    fernet_key = base64.urlsafe_b64encode(derived)
    return Fernet(fernet_key)


def encrypt(plaintext: str) -> str:
    """Encrypt a string. Returns base64 ciphertext."""
    f = _get_fernet()
    return f.encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    """Decrypt a ciphertext string."""
    f = _get_fernet()
    return f.decrypt(ciphertext.encode()).decode()