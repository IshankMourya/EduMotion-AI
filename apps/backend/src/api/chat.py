from fastapi import APIRouter, Depends, HTTPException
from supabase import create_client, Client
from uuid import UUID
from src.core.config import get_settings
from src.core.security import get_current_user
from src.schemas import ChatRequest, ChatResponse, ChatMessageCreate, ChatMessageResponse

router = APIRouter()
settings = get_settings()

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest, user: dict = Depends(get_current_user)):
    # Verify project ownership
    project = (
        supabase.table("projects")
        .select("id")
        .eq("id", str(request.project_id))
        .eq("user_id", user["user_id"])
        .execute()
    )
    if not project.data:
        raise HTTPException(status_code=404, detail="Project not found")

    # Save user message
    user_msg = ChatMessageCreate(role="user", content=request.message)
    supabase.table("chat_messages").insert({
        **user_msg.model_dump(),
        "project_id": str(request.project_id),
        "user_id": user["user_id"],
    }).execute()

    # Placeholder response - will be implemented in Stage 7
    assistant_response = "This is a placeholder response. Chat functionality will be implemented in Stage 7 with RAG over PDF content."

    # Save assistant message
    assistant_msg = ChatMessageCreate(role="assistant", content=assistant_response)
    supabase.table("chat_messages").insert({
        **assistant_msg.model_dump(),
        "project_id": str(request.project_id),
        "user_id": user["user_id"],
    }).execute()

    return ChatResponse(message=assistant_response, sources=[])


@router.get("/{project_id}/history", response_model=list[ChatMessageResponse])
async def get_chat_history(project_id: UUID, user: dict = Depends(get_current_user)):
    # Verify project ownership
    project = (
        supabase.table("projects")
        .select("id")
        .eq("id", str(project_id))
        .eq("user_id", user["user_id"])
        .execute()
    )
    if not project.data:
        raise HTTPException(status_code=404, detail="Project not found")

    result = (
        supabase.table("chat_messages")
        .select("*")
        .eq("project_id", str(project_id))
        .order("created_at", desc=False)
        .execute()
    )
    return result.data or []