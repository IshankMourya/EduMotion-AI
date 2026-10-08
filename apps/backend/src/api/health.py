from fastapi import APIRouter
from src.schemas import HealthResponse
from src.core.config import get_settings

router = APIRouter()
settings = get_settings()


@router.get("/", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="ok",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )