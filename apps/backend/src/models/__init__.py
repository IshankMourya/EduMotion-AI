from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, BigInteger, JSON, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
import uuid
from src.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255))
    avatar_url = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    pdf_path = Column(Text)
    pdf_size = Column(BigInteger)
    pdf_pages = Column(Integer)
    status = Column(String(50), nullable=False, default="draft")
    storyboard_json = Column(JSON)
    video_path = Column(Text)
    video_duration_sec = Column(Integer)
    video_size = Column(BigInteger)
    thumbnail_path = Column(Text)
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="projects")
    pdf_chunks = relationship("PDFChunk", back_populates="project", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="project", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_projects_user_id", "user_id"),
        Index("ix_projects_status", "status"),
        Index("ix_projects_created_at", "created_at"),
    )


class PDFChunk(Base):
    __tablename__ = "pdf_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    token_count = Column(Integer)
    embedding = Column(Vector(768))
    page_number = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="pdf_chunks")

    __table_args__ = (
        Index("ix_pdf_chunks_project_id", "project_id"),
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    metadata = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="chat_messages")
    user = relationship("User", back_populates="chat_messages")

    __table_args__ = (
        Index("ix_chat_messages_project_id", "project_id"),
        Index("ix_chat_messages_created_at", "created_at"),
    )