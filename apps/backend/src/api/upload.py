import os
import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from supabase import create_client, Client
from src.core.config import get_settings
from src.core.security import get_current_user

router = APIRouter()
settings = get_settings()

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

UPLOAD_DIR = Path("/tmp/edumotion_uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 50 * 1024 * 1024
ALLOWED_TYPES = ["application/pdf"]


def generate_safe_filename(original_filename: str) -> str:
    """Generate a UUID-based filename preserving the extension."""
    ext = Path(original_filename).suffix.lower()
    if ext not in [".pdf"]:
        ext = ".pdf"
    return f"{uuid.uuid4()}{ext}"


@router.post("/pdf")
async def upload_pdf(
    projectId: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Upload a PDF file for a project."""
    
    # Validate project ownership
    project = (
        supabase.table("projects")
        .select("id, status")
        .eq("id", projectId)
        .eq("user_id", user["user_id"])
        .execute()
    )
    if not project.data:
        raise HTTPException(status_code=404, detail="Project not found")

    proj = project.data[0]
    if proj["status"] not in ["draft", "uploaded"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot upload to project in status: {proj['status']}"
        )

    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    # Read and validate file size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File size exceeds {MAX_FILE_SIZE / (1024*1024)}MB limit")

    # Generate safe filename
    safe_filename = generate_safe_filename(file.filename or "document.pdf")
    user_upload_dir = UPLOAD_DIR / user["user_id"] / projectId
    user_upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = user_upload_dir / safe_filename

    # Save file to temp location
    with open(file_path, "wb") as f:
        f.write(content)

    # Upload to Supabase Storage
    storage_path = f"{user['user_id']}/{projectId}/{safe_filename}"
    upload_result = supabase.storage.from_("pdfs").upload(
        storage_path,
        content,
        file_options={"content-type": "application/pdf", "cache-control": "3600", "upsert": "false"}
    )

    if upload_result.get("error"):
        # Clean up temp file
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {upload_result['error'].message}")

    # Update project with PDF info
    update_result = supabase.table("projects").update({
        "pdf_path": storage_path,
        "pdf_size": len(content),
        "status": "uploaded",
    }).eq("id", projectId).execute()

    if not update_result.data:
        raise HTTPException(status_code=500, detail="Failed to update project")

    return {
        "file_path": storage_path,
        "file_size": len(content),
        "filename": safe_filename,
        "original_filename": file.filename,
        "project_id": projectId,
    }