import os
import logging
import json
from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from supabase import create_client, Client
from src.core.config import get_settings
from src.core.security import get_current_user
from src.schemas import ProcessPDFRequest, RenderVideoRequest
from src.services.document_parser import DocumentParser, ExtractionResult
from src.services.ollama_client import OllamaAnalyzer, DocumentAnalysis
from src.services.storyboard_generator import StoryboardGenerator, Storyboard
from src.services.video_renderer import VideoRenderer, NarrationGenerator, RenderResult, NarrationResult, RenderMode
from src.services.embedding_service import EmbeddingService
from src.services.chat_service import ChatService

router = APIRouter()
settings = get_settings()

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

logger = logging.getLogger(__name__)

# Statuses that indicate a job is currently running
RUNNING_STATUSES = [
    "extracting",
    "analyzing",
    "generating_storyboard",
    "rendering",
]


def check_concurrent_job(project_id: UUID, user_id: str) -> str | None:
    """Check if there's already a running job for this project. Returns error message if so."""
    project = supabase.table("projects").select("status").eq("id", str(project_id)).eq("user_id", user_id).execute()
    if not project.data:
        return "Project not found"
    status = project.data[0].get("status")
    if status in RUNNING_STATUSES:
        return f"A job is already running (status: {status}). Please wait for it to complete."
    return None


# Initialize services
document_parser = DocumentParser()

ollama_analyzer = OllamaAnalyzer(
    host=settings.OLLAMA_BASE_URL,
    model=settings.OLLAMA_MODEL,
    temperature=0.1,
)

storyboard_generator = StoryboardGenerator(
    host=settings.OLLAMA_BASE_URL,
    model=settings.OLLAMA_MODEL,
    temperature=0.2,
)

video_renderer = VideoRenderer(
    remotion_serve_url=settings.REMOTION_SERVE_URL,
    ffmpeg_path=settings.FFMPEG_PATH,
    comfyui_url=settings.COMFYUI_URL,
    render_mode=RenderMode(settings.RENDER_MODE),
)

narration_generator = NarrationGenerator(
    piper_model=settings.PIPER_MODEL_PATH,
)

embedding_service = EmbeddingService(
    host=settings.OLLAMA_BASE_URL,
    model=settings.OLLAMA_EMBED_MODEL,
)

chat_service = ChatService(
    supabase=supabase,
    ollama_analyzer=ollama_analyzer,
    embedding_service=embedding_service,
)


async def process_pdf_background(project_id: UUID, user_id: str):
    """Background task to extract PDF text and save chunks."""
    try:
        logger.info(f"Starting PDF extraction for project {project_id}")

        # Update progress
        supabase.table("projects").update({
            "status": "extracting",
            "progress": 5,
            "progress_message": "Starting PDF extraction..."
        }).eq("id", str(project_id)).execute()

        project = (
            supabase.table("projects")
            .select("id, pdf_path, pdf_pages")
            .eq("id", str(project_id))
            .eq("user_id", user_id)
            .execute()
        )
        if not project.data:
            logger.error(f"Project {project_id} not found for user {user_id}")
            return

        proj = project.data[0]
        pdf_path = proj.get("pdf_path")
        if not pdf_path:
            logger.error(f"No PDF path for project {project_id}")
            supabase.table("projects").update({
                "status": "failed",
                "error_message": "No PDF file found",
                "progress": 0,
                "progress_message": "Failed: No PDF file found"
            }).eq("id", str(project_id)).execute()
            return

        filename = os.path.basename(pdf_path)

        supabase.table("projects").update({
            "progress": 20,
            "progress_message": "Extracting text with Docling..."
        }).eq("id", str(project_id)).execute()

        result: ExtractionResult = document_parser.extract(user_id, str(project_id), filename)

        if not result.success:
            logger.error(f"PDF extraction failed for {project_id}: {result.error}")
            supabase.table("projects").update({
                "status": "failed",
                "error_message": f"PDF extraction failed: {result.error}",
                "progress": 0,
                "progress_message": f"Failed: {result.error}"
            }).eq("id", str(project_id)).execute()
            return

        logger.info(f"Extracted {len(result.chunks)} chunks from {result.page_count} pages")

        supabase.table("projects").update({
            "progress": 60,
            "progress_message": "Saving extracted chunks..."
        }).eq("id", str(project_id)).execute()

        if result.chunks:
            chunk_data = []
            for chunk in result.chunks:
                chunk_data.append({
                    "project_id": str(project_id),
                    "chunk_index": chunk.chunk_index,
                    "content": chunk.content,
                    "token_count": chunk.token_count,
                    "embedding": None,  # Will be filled after generation
                    "page_number": chunk.page_number,
                })

            batch_size = 100
            for i in range(0, len(chunk_data), batch_size):
                batch = chunk_data[i:i + batch_size]
                supabase.table("pdf_chunks").insert(batch).execute()

            # Generate embeddings for chunks
            logger.info(f"Generating embeddings for {len(result.chunks)} chunks...")
            supabase.table("projects").update({
                "progress": 75,
                "progress_message": "Generating embeddings..."
            }).eq("id", str(project_id)).execute()

            for i, chunk in enumerate(result.chunks):
                embedding = await embedding_service.generate_embedding(chunk.content)
                if embedding:
                    # Update the chunk with its embedding
                    supabase.table("pdf_chunks").update({
                        "embedding": embedding
                    }).eq("project_id", str(project_id)).eq("chunk_index", chunk.chunk_index).execute()

                # Update progress
                progress = 75 + int((i / len(result.chunks)) * 20)
                supabase.table("projects").update({
                    "progress": min(progress, 95),
                    "progress_message": f"Generated embeddings ({i+1}/{len(result.chunks)})"
                }).eq("id", str(project_id)).execute()

        supabase.table("projects").update({
            "status": "extracted",
            "progress": 95,
            "progress_message": "PDF extraction complete, ready for analysis",
            "pdf_pages": result.page_count,
        }).eq("id", str(project_id)).execute()

        logger.info(f"PDF extraction completed for project {project_id}")

        await analyze_document_background(project_id, user_id, result.markdown)

    except Exception as e:
        logger.exception(f"PDF extraction background task failed for {project_id}: {e}")
        supabase.table("projects").update({
            "status": "failed",
            "error_message": f"Extraction error: {str(e)}",
            "progress": 0,
            "progress_message": f"Failed: {str(e)}"
        }).eq("id", str(project_id)).execute()


async def analyze_document_background(project_id: UUID, user_id: str, markdown: str):
    """Background task to analyze document with Qwen3."""
    try:
        logger.info(f"Starting document analysis for project {project_id}")

        supabase.table("projects").update({
            "status": "analyzing",
            "progress": 10,
            "progress_message": "Starting document analysis with Qwen3..."
        }).eq("id", str(project_id)).execute()

        analysis: DocumentAnalysis = await ollama_analyzer.analyze_document(markdown)

        supabase.table("projects").update({
            "progress": 70,
            "progress_message": "Saving analysis results..."
        }).eq("id", str(project_id)).execute()

        analysis_data = {
            "title": analysis.title,
            "summary": analysis.summary,
            "learning_objectives": analysis.learning_objectives,
            "key_concepts": analysis.key_concepts,
            "definitions": analysis.definitions,
            "examples": analysis.examples,
            "difficult_topics": analysis.difficult_topics,
            "estimated_duration_minutes": analysis.estimated_duration_minutes,
            "target_audience": analysis.target_audience,
        }

        supabase.table("projects").update({
            "status": "analyzed",
            "progress": 90,
            "progress_message": "Analysis complete, ready for storyboard generation",
            "analysis_json": analysis_data,
        }).eq("id", str(project_id)).execute()

        logger.info(f"Document analysis completed for project {project_id}")

    except Exception as e:
        logger.exception(f"Document analysis failed for {project_id}: {e}")
        supabase.table("projects").update({
            "status": "failed",
            "error_message": f"Analysis error: {str(e)}",
            "progress": 0,
            "progress_message": f"Failed: {str(e)}"
        }).eq("id", str(project_id)).execute()


async def generate_storyboard_background(project_id: UUID, user_id: str):
    """Background task to generate storyboard from analysis."""
    try:
        logger.info(f"Starting storyboard generation for project {project_id}")

        supabase.table("projects").update({
            "status": "generating_storyboard",
            "progress": 10,
            "progress_message": "Preparing storyboard generation..."
        }).eq("id", str(project_id)).execute()

        project = (
            supabase.table("projects")
            .select("id, analysis_json, pdf_pages")
            .eq("id", str(project_id))
            .eq("user_id", user_id)
            .execute()
        )
        if not project.data:
            logger.error(f"Project {project_id} not found for user {user_id}")
            return

        proj = project.data[0]
        analysis = proj.get("analysis_json")
        if not analysis:
            logger.error(f"No analysis found for project {project_id}")
            supabase.table("projects").update({
                "status": "failed",
                "error_message": "No analysis available for storyboard generation",
                "progress": 0,
                "progress_message": "Failed: No analysis available"
            }).eq("id", str(project_id)).execute()
            return

        chunks = (
            supabase.table("pdf_chunks")
            .select("content")
            .eq("project_id", str(project_id))
            .order("chunk_index")
            .execute()
        )
        if not chunks.data:
            logger.error(f"No chunks found for project {project_id}")
            supabase.table("projects").update({
                "status": "failed",
                "error_message": "No extracted content for storyboard",
                "progress": 0,
                "progress_message": "Failed: No extracted content"
            }).eq("id", str(project_id)).execute()
            return

        markdown = "\n\n".join([c["content"] for c in chunks.data])

        supabase.table("projects").update({
            "progress": 30,
            "progress_message": "Generating storyboard with Qwen3..."
        }).eq("id", str(project_id)).execute()

        storyboard: Storyboard = await storyboard_generator.generate_storyboard(
            analysis=analysis,
            markdown=markdown,
            max_scenes=12,
            min_scenes=6,
            target_duration_min=60,
            target_duration_max=180,
        )

        storyboard_data = {
            "scenes": [
                {
                    "id": scene.id,
                    "order": scene.order,
                    "title": scene.title,
                    "narration": scene.narration,
                    "body_text": scene.body_text,
                    "visual_type": scene.visual_type,
                    "visual_description": scene.visual_description,
                    "source_reference": scene.source_reference,
                    "duration_seconds": scene.duration_seconds,
                }
                for scene in storyboard.scenes
            ],
            "total_duration_seconds": storyboard.total_duration_seconds,
            "metadata": storyboard.metadata,
        }

        supabase.table("projects").update({
            "status": "storyboard_ready",
            "progress": 90,
            "progress_message": "Storyboard generated, ready for rendering",
            "storyboard_json": storyboard_data,
        }).eq("id", str(project_id)).execute()

        logger.info(f"Storyboard generated for project {project_id}: {len(storyboard.scenes)} scenes, {storyboard.total_duration_seconds}s")

    except Exception as e:
        logger.exception(f"Storyboard generation failed for {project_id}: {e}")
        supabase.table("projects").update({
            "status": "failed",
            "error_message": f"Storyboard error: {str(e)}",
            "progress": 0,
            "progress_message": f"Failed: {str(e)}"
        }).eq("id", str(project_id)).execute()


async def render_video_background(project_id: UUID, user_id: str):
    """Background task to render final video with narration."""
    try:
        logger.info(f"Starting video render for project {project_id}")

        supabase.table("projects").update({
            "status": "rendering",
            "progress": 5,
            "progress_message": "Starting video rendering pipeline..."
        }).eq("id", str(project_id)).execute()

        project = (
            supabase.table("projects")
            .select("id, storyboard_json, pdf_path")
            .eq("id", str(project_id))
            .eq("user_id", user_id)
            .execute()
        )
        if not project.data:
            logger.error(f"Project {project_id} not found for user {user_id}")
            return

        proj = project.data[0]
        storyboard = proj.get("storyboard_json")
        if not storyboard:
            logger.error(f"No storyboard found for project {project_id}")
            supabase.table("projects").update({
                "status": "failed",
                "error_message": "No storyboard available for rendering",
                "progress": 0,
                "progress_message": "Failed: No storyboard available"
            }).eq("id", str(project_id)).execute()
            return

        # Generate narration audio
        logger.info(f"Generating narration for project {project_id}")
        supabase.table("projects").update({
            "progress": 15,
            "progress_message": "Generating narration with Piper TTS..."
        }).eq("id", str(project_id)).execute()

        narration_audio = await narration_generator.generate_narration(str(project_id), storyboard)

        if not narration_audio:
            logger.warning(f"No narration audio generated for project {project_id}")

        # Render video
        logger.info(f"Rendering video for project {project_id}")
        supabase.table("projects").update({
            "progress": 35,
            "progress_message": "Rendering video with Remotion..."
        }).eq("id", str(project_id)).execute()

        result: RenderResult = await video_renderer.render_video(
            str(project_id),
            storyboard,
            narration_audio,
            progress_callback=lambda current, total, msg: supabase.table("projects").update({
                "progress": min(35 + int((current / total) * 40), 75),
                "progress_message": f"Rendering: {msg}"
            }).eq("id", str(project_id)).execute()
        )

        if not result.success:
            logger.error(f"Video render failed for {project_id}: {result.error}")
            supabase.table("projects").update({
                "status": "failed",
                "error_message": f"Video render failed: {result.error}",
                "progress": 0,
                "progress_message": f"Failed: {result.error}"
            }).eq("id", str(project_id)).execute()
            return

        # Upload final video to Supabase Storage
        supabase.table("projects").update({
            "progress": 85,
            "progress_message": "Uploading video to storage..."
        }).eq("id", str(project_id)).execute()

        video_filename = f"{user_id}/{project_id}/final_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.mp4"
        with open(result.video_path, "rb") as f:
            video_content = f.read()

        upload_result = supabase.storage.from_("videos").upload(
            video_filename,
            video_content,
            file_options={"content-type": "video/mp4", "cache-control": "3600", "upsert": "false"}
        )

        if upload_result.get("error"):
            logger.error(f"Video upload failed: {upload_result['error'].message}")
            supabase.table("projects").update({
                "status": "failed",
                "error_message": f"Video upload failed: {upload_result['error'].message}",
                "progress": 0,
                "progress_message": f"Failed: Video upload error"
            }).eq("id", str(project_id)).execute()
            return

        # Update project with final video info
        supabase.table("projects").update({
            "status": "completed",
            "progress": 100,
            "progress_message": "Video generation complete!",
            "video_path": video_filename,
            "video_duration_sec": int(result.duration_seconds) if result.duration_seconds else 0,
            "video_size": result.video_size,
        }).eq("id", str(project_id)).execute()

        logger.info(f"Video render completed for project {project_id}: {result.video_path}")

    except Exception as e:
        logger.exception(f"Video render failed for {project_id}: {e}")
        supabase.table("projects").update({
            "status": "failed",
            "error_message": f"Video render error: {str(e)}",
            "progress": 0,
            "progress_message": f"Failed: {str(e)}"
        }).eq("id", str(project_id)).execute()


# API Endpoints

@router.post("/pdf")
async def process_pdf(
    request: ProcessPDFRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    project = (
        supabase.table("projects")
        .select("id, status, pdf_path")
        .eq("id", str(request.project_id))
        .eq("user_id", user["user_id"])
        .execute()
    )
    if not project.data:
        raise HTTPException(status_code=404, detail="Project not found")

    proj = project.data[0]
    if proj["status"] not in ["uploaded", "extracted", "failed", "analyzed", "storyboard_ready"]:
        raise HTTPException(status_code=400, detail=f"Cannot process project in status: {proj['status']}")

    if not proj["pdf_path"]:
        raise HTTPException(status_code=400, detail="No PDF uploaded")

    # Check for concurrent job
    concurrent_error = check_concurrent_job(request.project_id, user["user_id"])
    if concurrent_error:
        raise HTTPException(status_code=409, detail=concurrent_error)

    supabase.table("projects").update({"status": "extracting"}).eq("id", str(request.project_id)).execute()

    background_tasks.add_task(process_pdf_background, request.project_id, user["user_id"])

    return {"message": "PDF processing started", "project_id": str(request.project_id)}


@router.post("/analyze")
async def analyze_document(
    request: ProcessPDFRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """Trigger document analysis manually (for retry or re-analysis)."""
    project = (
        supabase.table("projects")
        .select("id, status, pdf_path")
        .eq("id", str(request.project_id))
        .eq("user_id", user["user_id"])
        .execute()
    )
    if not project.data:
        raise HTTPException(status_code=404, detail="Project not found")

    proj = project.data[0]
    if proj["status"] not in ["extracted", "failed", "analyzed", "storyboard_ready"]:
        raise HTTPException(status_code=400, detail=f"Cannot analyze project in status: {proj['status']}")

    if not proj["pdf_path"]:
        raise HTTPException(status_code=400, detail="No PDF uploaded")

    # Check for concurrent job
    concurrent_error = check_concurrent_job(request.project_id, user["user_id"])
    if concurrent_error:
        raise HTTPException(status_code=409, detail=concurrent_error)

    chunks = (
        supabase.table("pdf_chunks")
        .select("content")
        .eq("project_id", str(request.project_id))
        .order("chunk_index")
        .execute()
    )
    if not chunks.data:
        raise HTTPException(status_code=400, detail="No extracted content found")

    markdown = "\n\n".join([c["content"] for c in chunks.data])

    supabase.table("projects").update({"status": "analyzing"}).eq("id", str(request.project_id)).execute()

    background_tasks.add_task(analyze_document_background, request.project_id, user["user_id"], markdown)

    return {"message": "Document analysis started", "project_id": str(request.project_id)}


@router.get("/analysis/{project_id}")
async def get_analysis(project_id: UUID, user: dict = Depends(get_current_user)):
    """Get document analysis for a project."""
    project = (
        supabase.table("projects")
        .select("id, analysis_json, status")
        .eq("id", str(project_id))
        .eq("user_id", user["user_id"])
        .execute()
    )
    if not project.data:
        raise HTTPException(status_code=404, detail="Project not found")

    proj = project.data[0]
    if not proj.get("analysis_json"):
        raise HTTPException(status_code=404, detail="No analysis available")

    return proj["analysis_json"]


@router.post("/storyboard")
async def generate_storyboard(
    request: ProcessPDFRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """Generate storyboard from analyzed document."""
    project = (
        supabase.table("projects")
        .select("id, status, analysis_json, pdf_path")
        .eq("id", str(request.project_id))
        .eq("user_id", user["user_id"])
        .execute()
    )
    if not project.data:
        raise HTTPException(status_code=404, detail="Project not found")

    proj = project.data[0]
    if proj["status"] not in ["analyzed", "failed", "storyboard_ready"]:
        raise HTTPException(status_code=400, detail=f"Cannot generate storyboard in status: {proj['status']}")

    if not proj.get("analysis_json"):
        raise HTTPException(status_code=400, detail="Document must be analyzed first")

    if not proj["pdf_path"]:
        raise HTTPException(status_code=400, detail="No PDF uploaded")

    # Check for concurrent job
    concurrent_error = check_concurrent_job(request.project_id, user["user_id"])
    if concurrent_error:
        raise HTTPException(status_code=409, detail=concurrent_error)

    supabase.table("projects").update({"status": "generating_storyboard"}).eq("id", str(request.project_id)).execute()

    background_tasks.add_task(generate_storyboard_background, request.project_id, user["user_id"])

    return {"message": "Storyboard generation started", "project_id": str(request.project_id)}


@router.get("/storyboard/{project_id}")
async def get_storyboard(project_id: UUID, user: dict = Depends(get_current_user)):
    """Get storyboard for a project."""
    project = (
        supabase.table("projects")
        .select("id, storyboard_json, status")
        .eq("id", str(project_id))
        .eq("user_id", user["user_id"])
        .execute()
    )
    if not project.data:
        raise HTTPException(status_code=404, detail="Project not found")

    proj = project.data[0]
    if not proj.get("storyboard_json"):
        raise HTTPException(status_code=404, detail="No storyboard available")

    return proj["storyboard_json"]


@router.post("/storyboard/{project_id}/approve")
async def approve_storyboard(project_id: UUID, user: dict = Depends(get_current_user)):
    """Approve storyboard and move to rendering stage."""
    project = (
        supabase.table("projects")
        .select("id, status, storyboard_json")
        .eq("id", str(project_id))
        .eq("user_id", user["user_id"])
        .execute()
    )
    if not project.data:
        raise HTTPException(status_code=404, detail="Project not found")

    proj = project.data[0]
    if proj["status"] != "storyboard_ready":
        raise HTTPException(status_code=400, detail=f"Cannot approve storyboard in status: {proj['status']}")

    if not proj.get("storyboard_json"):
        raise HTTPException(status_code=400, detail="No storyboard to approve")

    supabase.table("projects").update({
        "status": "approved_for_render",
    }).eq("id", str(project_id)).execute()

    return {"message": "Storyboard approved", "project_id": str(project_id)}


@router.post("/video")
async def render_video(
    request: RenderVideoRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    project = (
        supabase.table("projects")
        .select("id, status, storyboard_json")
        .eq("id", str(request.project_id))
        .eq("user_id", user["user_id"])
        .execute()
    )
    if not project.data:
        raise HTTPException(status_code=404, detail="Project not found")

    proj = project.data[0]
    if proj["status"] not in ["storyboard_ready", "approved_for_render"]:
        raise HTTPException(status_code=400, detail=f"Cannot render video in status: {proj['status']}")

    if not proj.get("storyboard_json"):
        raise HTTPException(status_code=400, detail="No storyboard available")

    # Check for concurrent job
    concurrent_error = check_concurrent_job(request.project_id, user["user_id"])
    if concurrent_error:
        raise HTTPException(status_code=409, detail=concurrent_error)

    supabase.table("projects").update({"status": "rendering"}).eq("id", str(request.project_id)).execute()

    background_tasks.add_task(render_video_background, request.project_id, user["user_id"])

    return {"message": "Video rendering started", "project_id": str(request.project_id)}


@router.post("/chat/{project_id}")
async def chat_with_document(
    project_id: UUID,
    request: ChatRequest,
    user: dict = Depends(get_current_user),
):
    """Chat with the document using RAG."""
    # Verify project ownership
    project = (
        supabase.table("projects")
        .select("id, status")
        .eq("id", str(project_id))
        .eq("user_id", user["user_id"])
        .execute()
    )
    if not project.data:
        raise HTTPException(status_code=404, detail="Project not found")

    proj = project.data[0]
    if proj["status"] not in ["storyboard_ready", "approved_for_render", "completed"]:
        raise HTTPException(status_code=400, detail=f"Cannot chat with document in status: {proj['status']}")

    result = await chat_service.chat(
        project_id=project_id,
        user_id=user["user_id"],
        message=request.message,
        top_k=5,
    )

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Chat failed"))

    return result


@router.get("/chat/{project_id}/history")
async def get_chat_history(
    project_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Get chat history for a project."""
    project = (
        supabase.table("projects")
        .select("id, status")
        .eq("id", str(project_id))
        .eq("user_id", user["user_id"])
        .execute()
    )
    if not project.data:
        raise HTTPException(status_code=404, detail="Project not found")

    messages = (
        supabase.table("chat_messages")
        .select("*")
        .eq("project_id", str(project_id))
        .order("created_at", desc=False)
        .execute()
    )

    return messages.data or []


@router.get("/comfyui/health")
async def comfyui_health():
    """Check ComfyUI server health."""
    import aiohttp
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get("http://127.0.0.1:8188/api/prompt", timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status == 200:
                    return {"status": "healthy", "comfyui_url": "http://127.0.0.1:8188"}
                else:
                    return {"status": "unhealthy", "error": f"HTTP {resp.status}"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@router.get("/render/mode")
async def get_render_mode():
    """Get current render mode."""
    from src.services.video_renderer import video_renderer, RenderMode
    return {
        "render_mode": video_renderer.render_mode.value,
        "available_modes": [m.value for m in RenderMode],
    }


@router.post("/render/mode")
async def set_render_mode(mode: str):
    """Set render mode (remotion or wan21)."""
    from src.services.video_renderer import video_renderer, RenderMode
    try:
        video_renderer.render_mode = RenderMode(mode)
        return {"message": f"Render mode set to {mode}", "render_mode": mode}
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Invalid render mode: {mode}. Available: remotion, wan21")