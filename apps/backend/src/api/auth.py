from fastapi import APIRouter, Depends, HTTPException
from supabase import create_client, Client
from src.core.config import get_settings
from src.core.security import get_current_user

router = APIRouter()
settings = get_settings()

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


@router.get("/me")
async def get_current_user_info(user: dict = Depends(get_current_user)):
    return {"user_id": user["user_id"], "email": user["email"]}


@router.post("/sync-user")
async def sync_user(user: dict = Depends(get_current_user)):
    try:
        result = supabase.table("users").upsert({
            "id": user["user_id"],
            "email": user["email"],
        }).execute()
        return {"success": True, "data": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))