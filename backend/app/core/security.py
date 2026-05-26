from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta, timezone
from app.core.config import settings
import uuid

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str, role: str, tenant_id: uuid.UUID = None, expires_delta: timedelta = None) -> str:
    """
    Create a JWT access token
    
    Args:
        user_id: User UUID as string
        role: User role (e.g., "PLATFORM_ADMIN", "ISP_ADMIN")
        tenant_id: Optional Tenant UUID
        expires_delta: Token expiration time (default: from settings)
    
    Returns:
        JWT token string
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Calculate expiration time
    expire = datetime.now(timezone.utc) + expires_delta
    
    # Build payload - convert all UUIDs to strings for JSON serialization
    payload = {
        "sub": user_id,  # user_id is already a string
        "role": role,
        "tenant_id": str(tenant_id) if tenant_id else None,  # ← Convert UUID to string
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    
    # Encode JWT
    encoded_jwt = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    return encoded_jwt