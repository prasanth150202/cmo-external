"""
Fernet AES-256 symmetric encryption for OAuth tokens.
Tokens are encrypted before DB write and decrypted on read.
If ENCRYPTION_KEY is not set, tokens are stored as-is (dev only).
"""
from typing import Optional
from app.core.config import settings

_fernet = None


def _get_fernet():
    global _fernet
    if _fernet is None and settings.ENCRYPTION_KEY:
        from cryptography.fernet import Fernet
        _fernet = Fernet(settings.ENCRYPTION_KEY.encode())
    return _fernet


def encrypt(value: str) -> str:
    f = _get_fernet()
    if f is None:
        return value  # dev fallback — no key configured
    return f.encrypt(value.encode()).decode()


def decrypt(value: str) -> str:
    f = _get_fernet()
    if f is None:
        return value
    try:
        return f.decrypt(value.encode()).decode()
    except Exception:
        return value  # already plaintext (dev migration)
