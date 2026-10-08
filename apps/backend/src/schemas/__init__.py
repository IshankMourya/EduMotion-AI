from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from enum import Enum


class ProjectStatus(str, Enum):
    DRAFT = "draft"
    UPLOADED = "uploaded"
    EXTRACTING = "extracting"
    EXTRACTED = "extracted"
    ANALYZING = "analyzing"
    ANALYZED = "analyzed"
    GENERATING_STORYBOARD = "generating_storyboard"
    STORYBOARD_READY = "storyboard_ready"
    APPROVED_FOR_RENDER = "approved_for_render"
    RENDERING = "rendering"
    COMPLETED = "completed"
    FAILED = "failed"


class DocumentAnalysis(BaseModel):
    title: str
    summary: str
    learning_objectives: List[str]
    key_concepts: List[str]
    definitions: Dict[str, str]
    examples: List[str]
    difficult_topics: List[str]
    estimated_duration_minutes: int
    target_audience: str


class StoryboardScene(BaseModel):
    id: str
    order: int
    title: str
    narration: str
    body_text: str
    visual_type: str
    visual_description: str
    source_reference: str
    duration_seconds: int


class StoryboardResponse(BaseModel):
    scenes: List[StoryboardScene]
    total_duration_seconds: int
    metadata: Dict[str, Any] = {}


class VisualSpecType(str, Enum):
    TITLE = "title"
    CONCEPT = "concept"
    DIAGRAM = "diagram"
    CODE = "code"
    CHART = "chart"
    SUMMARY = "summary"


class VisualSpec(BaseModel):
    type: VisualSpecType
    props: Dict[str, Any] = {}


class Scene(BaseModel):
    id: str
    title: str
    narration: str
    visual_spec: VisualSpec
    duration_sec: int
    order: int


class Storyboard(BaseModel):
    scenes: List[Scene]
    total_duration_sec: int
    metadata: Dict[str, Any] = {}


class ProjectBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    storyboard_json: Optional[Storyboard] = None
    analysis_json: Optional[DocumentAnalysis] = None
    pdf_path: Optional[str] = None
    pdf_size: Optional[int] = None
    pdf_pages: Optional[int] = None
    video_path: Optional[str] = None
    video_duration_sec: Optional[int] = None
    video_size: Optional[int] = None
    thumbnail_path: Optional[str] = None
    error_message: Optional[str] = None


class ProjectResponse(ProjectBase):
    id: UUID
    user_id: UUID
    status: ProjectStatus
    pdf_path: Optional[str] = None
    pdf_size: Optional[int] = None
    pdf_pages: Optional[int] = None
    storyboard_json: Optional[Storyboard] = None
    analysis_json: Optional[DocumentAnalysis] = None
    video_path: Optional[str] = None
    video_duration_sec: Optional[int] = None
    video_size: Optional[int] = None
    thumbnail_path: Optional[str] = None
    error_message: Optional[str] = None
    progress: Optional[int] = None
    progress_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PDFChunkResponse(BaseModel):
    id: UUID
    project_id: UUID
    chunk_index: int
    content: str
    token_count: Optional[int] = None
    page_number: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatMessageBase(BaseModel):
    role: str
    content: str
    metadata: Dict[str, Any] = {}


class ChatMessageCreate(ChatMessageBase):
    pass


class ChatMessageResponse(ChatMessageBase):
    id: UUID
    project_id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    message: str
    project_id: UUID


class ChatResponse(BaseModel):
    message: str
    sources: List[str] = []


class UploadURLRequest(BaseModel):
    project_id: UUID
    file_name: str
    content_type: str


class UploadURLResponse(BaseModel):
    path: str
    signed_url: str


class ProcessPDFRequest(BaseModel):
    project_id: UUID


class RenderVideoRequest(BaseModel):
    project_id: UUID


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str