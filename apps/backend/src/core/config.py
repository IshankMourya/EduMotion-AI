from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "EduMotion AI"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    DATABASE_URL: str

    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen3:27b"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"

    # Piper TTS
    PIPER_BINARY_PATH: str = "/opt/homebrew/bin/piper"
    PIPER_MODEL_PATH: str = "/opt/homebrew/share/piper-voices/en_US-lessac-medium.onnx"
    PIPER_CONFIG_PATH: str = "/opt/homebrew/share/piper-voices/en_US-lessac-medium.onnx.json"

    # Remotion
    REMOTION_SERVE_URL: str = "http://localhost:4000"

    # FFmpeg
    FFMPEG_PATH: str = "ffmpeg"

    # Video settings
    VIDEO_WIDTH: int = 1920
    VIDEO_HEIGHT: int = 1080
    VIDEO_FPS: int = 30
    VIDEO_BITRATE: str = "5000k"
    VIDEO_TARGET_DURATION_MIN: int = 60
    VIDEO_TARGET_DURATION_MAX: int = 180

    # ComfyUI / Wan 2.1
    COMFYUI_URL: str = "http://127.0.0.1:8188"
    RENDER_MODE: str = "remotion"  # "remotion" or "wan21"

    # Processing limits
    MAX_PDF_SIZE_MB: int = 50
    MAX_PDF_PAGES: int = 100
    MAX_CHUNKS_PER_PROJECT: int = 500

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    return Settings()