import asyncio
import logging
import json
from typing import List, Optional
import httpx

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Generate embeddings using Ollama."""

    def __init__(
        self,
        host: str = "http://localhost:11434",
        model: str = "nomic-embed-text",
    ):
        self.host = host.rstrip("/")
        self.model = model
        self.client = httpx.AsyncClient(timeout=60.0)

    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding for a single text."""
        try:
            response = await self.client.post(
                f"{self.host}/api/embeddings",
                json={"model": self.model, "prompt": text},
            )
            response.raise_for_status()
            data = response.json()
            return data.get("embedding")
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            return None

    async def generate_embeddings(self, texts: List[str]) -> List[Optional[List[float]]]:
        """Generate embeddings for multiple texts."""
        results = []
        for text in texts:
            embedding = await self.generate_embedding(text)
            results.append(embedding)
        return results

    async def close(self):
        await self.client.aclose()