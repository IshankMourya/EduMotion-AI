import json
import logging
import asyncio
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict

import ollama

logger = logging.getLogger(__name__)


@dataclass
class DocumentAnalysis:
    title: str
    summary: str
    learning_objectives: List[str]
    key_concepts: List[str]
    definitions: Dict[str, str]
    examples: List[str]
    difficult_topics: List[str]
    estimated_duration_minutes: int
    target_audience: str


class OllamaAnalyzer:
    def __init__(
        self,
        host: str = "http://localhost:11434",
        model: str = "qwen3:27b",
        temperature: float = 0.1,
    ):
        self.host = host
        self.model = model
        self.temperature = temperature
        self.client = ollama.AsyncClient(host=host)

    async def analyze_document(
        self,
        markdown: str,
        max_retries: int = 1,
    ) -> DocumentAnalysis:
        """Analyze extracted markdown and return structured analysis."""
        prompt = self._build_analysis_prompt(markdown)

        for attempt in range(max_retries + 1):
            try:
                response = await self.client.generate(
                    model=self.model,
                    prompt=prompt,
                    options={
                        "temperature": self.temperature,
                        "top_p": 0.9,
                        "num_predict": 4096,
                    },
                    format="json",
                )

                analysis = self._parse_and_validate_json(response["response"])
                if analysis:
                    logger.info(f"Successfully analyzed document with {self.model}")
                    return analysis

                logger.warning(f"Attempt {attempt + 1}: JSON parsing failed, retrying...")

            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed: {e}")
                if attempt == max_retries:
                    raise

        # Fallback: return basic analysis if all retries fail
        return self._fallback_analysis(markdown)

    def _build_analysis_prompt(self, markdown: str) -> str:
        """Build the analysis prompt for Qwen3."""
        # Truncate markdown if too long (keep first ~12000 chars)
        truncated_md = markdown[:12000] if len(markdown) > 12000 else markdown

        return f"""You are an expert educational content analyst. Analyze the following educational document and extract structured information.

Document content (Markdown):
---
{truncated_md}
---

Return a JSON object with exactly these fields:
- "title": string - Clear, descriptive title for the document
- "summary": string - 2-3 sentence summary of the main content
- "learning_objectives": array of strings - 3-5 specific learning objectives
- "key_concepts": array of strings - 5-8 key concepts/topics covered
- "definitions": object - Key term definitions (term: definition)
- "examples": array of strings - 2-3 concrete examples from the document
- "difficult_topics": array of strings - 2-3 topics that learners might find challenging
- "estimated_duration_minutes": integer - Estimated reading/study time in minutes
- "target_audience": string - Intended audience level (e.g., "beginner", "intermediate", "advanced")

Requirements:
- All fields must be present
- Arrays must not be empty
- Definitions object must have at least 3 entries
- Return ONLY valid JSON, no extra text or markdown formatting"""

    def _parse_and_validate_json(self, response_text: str) -> Optional[DocumentAnalysis]:
        """Parse and validate JSON response from Ollama."""
        try:
            # Clean up common issues
            cleaned = response_text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            data = json.loads(cleaned)

            # Validate required fields
            required_fields = [
                "title", "summary", "learning_objectives", "key_concepts",
                "definitions", "examples", "difficult_topics",
                "estimated_duration_minutes", "target_audience"
            ]

            for field in required_fields:
                if field not in data:
                    logger.error(f"Missing required field: {field}")
                    return None

            # Validate array fields are non-empty
            array_fields = [
                "learning_objectives", "key_concepts", "examples", "difficult_topics"
            ]
            for field in array_fields:
                if not isinstance(data[field], list) or len(data[field]) == 0:
                    logger.error(f"Field {field} must be non-empty array")
                    return None

            # Validate definitions is object with entries
            if not isinstance(data["definitions"], dict) or len(data["definitions"]) < 3:
                logger.error("Definitions must be object with at least 3 entries")
                return None

            # Validate estimated_duration_minutes is int
            if not isinstance(data["estimated_duration_minutes"], int):
                logger.error("estimated_duration_minutes must be integer")
                return None

            return DocumentAnalysis(**data)

        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            return None
        except Exception as e:
            logger.error(f"Validation error: {e}")
            return None

    def _fallback_analysis(self, markdown: str) -> DocumentAnalysis:
        """Generate basic fallback analysis if Ollama fails."""
        # Extract first heading as title
        lines = markdown.split("\n")
        title = "Document Analysis"
        for line in lines:
            if line.startswith("# "):
                title = line[2:].strip()
                break

        return DocumentAnalysis(
            title=title,
            summary=markdown[:300] + "..." if len(markdown) > 300 else markdown,
            learning_objectives=["Understand the main concepts", "Apply key principles"],
            key_concepts=["Concept 1", "Concept 2", "Concept 3"],
            definitions={"term1": "definition1", "term2": "definition2", "term3": "definition3"},
            examples=["Example from document"],
            difficult_topics=["Complex topic 1"],
            estimated_duration_minutes=10,
            target_audience="intermediate",
        )

    async def health_check(self) -> bool:
        """Check if Ollama is available and model is loaded."""
        try:
            models = await self.client.list()
            model_names = [m["name"] for m in models.get("models", [])]
            return self.model in model_names
        except Exception as e:
            logger.error(f"Ollama health check failed: {e}")
            return False

    async def chat_with_context(
        self,
        message: str,
        context: str,
        max_retries: int = 1,
    ) -> str:
        """Chat with the model using document context."""
        prompt = self._build_chat_prompt(message, context)

        for attempt in range(max_retries + 1):
            try:
                response = await self.client.generate(
                    model=self.model,
                    prompt=prompt,
                    options={
                        "temperature": 0.3,
                        "top_p": 0.9,
                        "num_predict": 2048,
                    },
                )

                return response["response"].strip()

            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed: {e}")
                if attempt == max_retries:
                    raise

        # Fallback
        return "I'm unable to answer that question based on the provided context."

    def _build_chat_prompt(self, message: str, context: str) -> str:
        """Build the chat prompt for Qwen3 with document context."""
        return f"""You are a helpful educational assistant. Answer the user's question based ONLY on the provided document context. Do not use external knowledge.

Document Context:
---
{context}
---

User Question: {message}

Instructions:
- Answer based ONLY on the provided context
- If the answer is not in the context, say "I cannot find that information in the document"
- Cite page numbers when available (e.g., "According to page 3...")
- Be concise but thorough
- Do not make up information

Answer:"""