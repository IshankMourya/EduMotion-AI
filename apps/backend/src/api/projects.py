from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import create_client, Client
from typing import List, Optional
from uuid import UUID
from src.core.config import get_settings
from src.core.security import get_current_user
from src.schemas import ProjectCreate, ProjectUpdate, ProjectResponse

router = APIRouter()
settings = get_settings()

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(project: ProjectCreate, user: dict = Depends(get_current_user)):
    data = {
        **project.model_dump(),
        "user_id": user["user_id"],
        "status": "draft",
    }
    result = supabase.table("projects").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create project")
    return result.data[0]


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    user: dict = Depends(get_current_user),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
):
    query = supabase.table("projects").select("*").eq("user_id", user["user_id"])
    if status:
        query = query.eq("status", status)
    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    result = query.execute()
    return result.data or []


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: UUID, user: dict = Depends(get_current_user)):
    result = supabase.table("projects").select("*").eq("id", str(project_id)).eq("user_id", user["user_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return result.data[0]


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: UUID, project: ProjectUpdate, user: dict = Depends(get_current_user)):
    result = (
        supabase.table("projects")
        .update(project.model_dump(exclude_unset=True))
        .eq("id", str(project_id))
        .eq("user_id", user["user_id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return result.data[0]


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: UUID, user: dict = Depends(get_current_user)):
    result = supabase.table("projects").delete().eq("id", str(project_id)).eq("user_id", user["user_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")