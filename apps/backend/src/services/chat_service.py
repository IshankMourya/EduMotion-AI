import logging
from typing import List, Optional, Dict, Any
from uuid import UUID

logger = logging.getLogger(__name__)


class ChatService:
    """Chat service with RAG (Retrieval-Augmented Generation)."""

    def __init__(
        self,
        supabase,
        ollama_analyzer,
        embedding_service,
    ):
        self.supabase = supabase
        self.ollama_analyzer = ollama_analyzer
        self.embedding_service = embedding_service

    async def search_relevant_chunks(
        self,
        project_id: UUID,
        query: str,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """Search for relevant chunks using vector similarity."""
        try:
            # Generate embedding for the query
            query_embedding = await self.embedding_service.generate_embedding(query)
            if not query_embedding:
                logger.warning("Failed to generate query embedding")
                return []

            # Use Supabase RPC for vector similarity search
            result = self.supabase.rpc(
                "match_pdf_chunks",
                {
                    "query_embedding": query_embedding,
                    "project_id_filter": str(project_id),
                    "match_threshold": 0.5,
                    "match_count": top_k,
                },
            ).execute()

            return result.data or []
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            return []

    async def chat(
        self,
        project_id: UUID,
        user_id: str,
        message: str,
        top_k: int = 5,
    ) -> Dict[str, Any]:
        """Process a chat message with RAG."""
        try:
            # Get relevant chunks
            chunks = await self.search_relevant_chunks(project_id, message, top_k)

            # Build context from chunks
            context = self._build_context(chunks)

            # Generate response using Qwen3
            response = await self.ollama_analyzer.chat_with_context(
                message=message,
                context=context,
            )

            # Save user message
            self.supabase.table("chat_messages").insert({
                "project_id": str(project_id),
                "user_id": user_id,
                "role": "user",
                "content": message,
            }).execute()

            # Save assistant response
            self.supabase.table("chat_messages").insert({
                "project_id": str(project_id),
                "user_id": user_id,
                "role": "assistant",
                "content": response,
                "metadata": {"chunks_used": len(chunks)},
            }).execute()

            return {
                "success": True,
                "response": response,
                "sources": self._format_sources(chunks),
            }
        except Exception as e:
            logger.exception(f"Chat failed: {e}")
            return {
                "success": False,
                "error": str(e),
            }

    def _build_context(self, chunks: List[Dict[str, Any]]) -> str:
        """Build context string from relevant chunks."""
        if not chunks:
            return "No relevant context found in the document."

        context_parts = []
        for i, chunk in enumerate(chunks):
            page_ref = f" (Page {chunk.get('page_number')})" if chunk.get("page_number") else ""
            context_parts.append(f"[Source {i+1}{page_ref}]\n{chunk['content']}")

        return "\n\n---\n\n".join(context_parts)

    def _format_sources(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format chunk sources for response."""
        sources = []
        for chunk in chunks:
            sources.append({
                "content": chunk["content"][:200] + "..." if len(chunk["content"]) > 200 else chunk["content"],
                "page_number": chunk.get("page_number"),
                "chunk_index": chunk.get("chunk_index"),
            })
        return sources