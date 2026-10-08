import json
import logging
import asyncio
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict, field

import ollama

logger = logging.getLogger(__name__)


@dataclass
class StoryboardScene:
    id: str
    order: int
    title: str
    narration: str
    body_text: str
    visual_type: str  # title, concept, diagram, code, chart, summary
    visual_description: str
    source_reference: str  # chunk index or page reference
    duration_seconds: int


@dataclass
class Storyboard:
    scenes: List[StoryboardScene]
    total_duration_seconds: int
    metadata: Dict[str, Any] = field(default_factory=dict)


class StoryboardGenerator:
    VISUAL_TYPES = ["title", "concept", "diagram", "code", "chart", "summary"]

    def __init__(
        self,
        host: str = "http://localhost:11434",
        model: str = "qwen3:27b",
        temperature: float = 0.2,
    ):
        self.host = host
        self.model = model
        self.temperature = temperature
        self.client = ollama.AsyncClient(host=host)

    async def generate_storyboard(
        self,
        analysis: Dict[str, Any],
        markdown: str,
        max_scenes: int = 12,
        min_scenes: int = 6,
        target_duration_min: int = 60,
        target_duration_max: int = 180,
        max_retries: int = 1,
    ) -> Storyboard:
        """Generate a storyboard from document analysis and markdown."""

        prompt = self._build_storyboard_prompt(
            analysis, markdown, max_scenes, min_scenes,
            target_duration_min, target_duration_max
        )

        for attempt in range(max_retries + 1):
            try:
                response = await self.client.generate(
                    model=self.model,
                    prompt=prompt,
                    options={
                        "temperature": self.temperature,
                        "top_p": 0.9,
                        "num_predict": 8192,
                    },
                    format="json",
                )

                storyboard = self._parse_and_validate_storyboard(
                    response["response"], min_scenes, max_scenes,
                    target_duration_min, target_duration_max
                )
                if storyboard:
                    logger.info(f"Successfully generated storyboard with {len(storyboard.scenes)} scenes")
                    return storyboard

                logger.warning(f"Attempt {attempt + 1}: Storyboard validation failed, retrying...")

            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed: {e}")
                if attempt == max_retries:
                    raise

        # Fallback
        return self._fallback_storyboard(analysis, markdown, min_scenes, max_scenes)

    def _build_storyboard_prompt(
        self,
        analysis: Dict[str, Any],
        markdown: str,
        max_scenes: int,
        min_scenes: int,
        target_duration_min: int,
        target_duration_max: int,
    ) -> str:
        """Build the storyboard generation prompt."""

        # Truncate markdown
        truncated_md = markdown[:10000] if len(markdown) > 10000 else markdown

        # Calculate target duration per scene
        target_duration = (target_duration_min + target_duration_max) // 2
        avg_duration = target_duration // max_scenes

        visual_types_desc = """
Visual types available:
- "title": Opening title screen with main title and subtitle
- "concept": Key concepts with bullet points and explanations
- "diagram": Visual diagrams showing relationships, flows, or processes
- "code": Code examples or algorithm pseudocode
- "chart": Data visualizations, comparisons, or statistics
- "summary": Key takeaways and concluding points
"""

        return f"""You are an expert educational video storyboard creator. Create a detailed storyboard for an educational video based on the document analysis and content.

Document Analysis:
- Title: {analysis.get('title', 'Unknown')}
- Summary: {analysis.get('summary', '')}
- Key Concepts: {', '.join(analysis.get('key_concepts', []))}
- Learning Objectives: {', '.join(analysis.get('learning_objectives', []))}
- Difficult Topics: {', '.join(analysis.get('difficult_topics', []))}
- Target Audience: {analysis.get('target_audience', 'intermediate')}

Document Content (Markdown):
---
{truncated_md}
---

Requirements:
1. Create {min_scenes} to {max_scenes} scenes
2. Total duration: {target_duration_min}-{target_duration_max} seconds (target ~{target_duration}s)
3. Average duration per scene: ~{avg_duration} seconds
4. Each scene must have a unique visual type from the available types
5. Distribute visual types evenly across scenes

{visual_types_desc}

Return a JSON object with this exact structure:
{{
  "scenes": [
    {{
      "id": "scene_1",
      "order": 1,
      "title": "Scene title",
      "narration": "Full narration script for voiceover (1-3 sentences)",
      "body_text": "Main text content to display on screen",
      "visual_type": "title|concept|diagram|code|chart|summary",
      "visual_description": "Detailed description of visual elements, animations, layout",
      "source_reference": "Page X / Chunk Y / Section Z",
      "duration_seconds": 10
    }}
  ],
  "total_duration_seconds": 90,
  "metadata": {{
    "model": "{self.model}",
    "generated_at": "ISO timestamp",
    "source_document_title": "{analysis.get('title', 'Unknown')}"
  }}
}}

Constraints:
- All scenes must have valid visual_type from the list
- duration_seconds must be between 5-30
- total_duration_seconds must be between {target_duration_min}-{target_duration_max}
- narration should be natural spoken language
- visual_description must be specific enough for programmatic rendering
- source_reference should reference actual document sections

Return ONLY valid JSON."""

    def _parse_and_validate_storyboard(
        self,
        response_text: str,
        min_scenes: int,
        max_scenes: int,
        target_duration_min: int,
        target_duration_max: int,
    ) -> Optional[Storyboard]:
        """Parse and validate storyboard JSON."""
        try:
            cleaned = response_text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            data = json.loads(cleaned)

            # Validate top-level structure
            if "scenes" not in data or not isinstance(data["scenes"], list):
                logger.error("Missing or invalid 'scenes' array")
                return None

            scenes_data = data["scenes"]
            if len(scenes_data) < min_scenes or len(scenes_data) > max_scenes:
                logger.error(f"Scene count {len(scenes_data)} outside range [{min_scenes}, {max_scenes}]")
                return None

            # Validate each scene
            scenes = []
            total_duration = 0
            used_visual_types = set()

            for i, scene_data in enumerate(scenes_data):
                scene = self._validate_scene(scene_data, i + 1)
                if not scene:
                    return None
                scenes.append(scene)
                total_duration += scene.duration_seconds
                used_visual_types.add(scene.visual_type)

            # Validate total duration
            if total_duration < target_duration_min or total_duration > target_duration_max:
                logger.error(f"Total duration {total_duration} outside range [{target_duration_min}, {target_duration_max}]")
                return None

            # Build metadata
            metadata = data.get("metadata", {})
            metadata["model"] = self.model
            metadata["scene_count"] = len(scenes)
            metadata["visual_types_used"] = list(used_visual_types)

            return Storyboard(
                scenes=scenes,
                total_duration_seconds=total_duration,
                metadata=metadata
            )

        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            return None
        except Exception as e:
            logger.error(f"Validation error: {e}")
            return None

    def _validate_scene(self, data: Dict[str, Any], order: int) -> Optional[StoryboardScene]:
        """Validate a single scene."""
        required_fields = [
            "id", "title", "narration", "body_text",
            "visual_type", "visual_description", "source_reference", "duration_seconds"
        ]

        for field in required_fields:
            if field not in data:
                logger.error(f"Scene {order}: Missing required field '{field}'")
                return None

        # Validate visual_type
        if data["visual_type"] not in self.VISUAL_TYPES:
            logger.error(f"Scene {order}: Invalid visual_type '{data['visual_type']}'")
            return None

        # Validate duration
        duration = data["duration_seconds"]
        if not isinstance(duration, int) or duration < 5 or duration > 30:
            logger.error(f"Scene {order}: duration_seconds must be 5-30, got {duration}")
            return None

        # Ensure ID follows pattern
        scene_id = data["id"]
        if not scene_id or not isinstance(scene_id, str):
            logger.error(f"Scene {order}: Invalid id")
            return None

        return StoryboardScene(
            id=scene_id,
            order=order,
            title=str(data["title"]),
            narration=str(data["narration"]),
            body_text=str(data["body_text"]),
            visual_type=data["visual_type"],
            visual_description=str(data["visual_description"]),
            source_reference=str(data["source_reference"]),
            duration_seconds=duration,
        )

    def _fallback_storyboard(
        self,
        analysis: Dict[str, Any],
        markdown: str,
        min_scenes: int,
        max_scenes: int,
    ) -> Storyboard:
        """Generate a basic fallback storyboard."""
        scenes = []
        concepts = analysis.get("key_concepts", ["Concept 1", "Concept 2", "Concept 3"])
        objectives = analysis.get("learning_objectives", ["Learn the basics"])

        visual_types = ["title", "concept", "concept", "diagram", "chart", "summary"]
        duration_per_scene = 15

        for i in range(min(max_scenes, len(visual_types))):
            vt = visual_types[i]
            scenes.append(StoryboardScene(
                id=f"scene_{i+1}",
                order=i+1,
                title=f"{vt.title()} Scene {i+1}",
                narration=f"This scene covers {vt} content from the document.",
                body_text=concepts[i] if i < len(concepts) else f"Content for {vt}",
                visual_type=vt,
                visual_description=f"Visual {vt} showing key points",
                source_reference=f"Section {i+1}",
                duration_seconds=duration_per_scene,
            ))

        total = sum(s.duration_seconds for s in scenes)
        return Storyboard(
            scenes=scenes,
            total_duration_seconds=total,
            metadata={"fallback": True, "model": self.model}
        )