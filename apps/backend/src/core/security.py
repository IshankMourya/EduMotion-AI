from jose import jwt, JWTError
from fastapi import HTTPException, Depends, Request
from typing import Optional
from src.core.config import get_settings

settings = get_settings()

SUPABASE_JWT_SECRET = settings.SUPABASE_SERVICE_ROLE_KEY
ALGORITHM = "HS256"


async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = auth_header.split(" ")[1]

    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=[ALGORITHM], audience="authenticated")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return {"user_id": user_id, "email": payload.get("email"), "claims": payload}
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


async def get_optional_user(request: Request) -> Optional[dict]:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=[ALGORITHM], audience="authenticated")
        user_id = payload.get("sub")
        if not user_id:
            return None
        return {"user_id": user_id, "email": payload.get("email"), "claims": payload}
    except JWTError:
        return None