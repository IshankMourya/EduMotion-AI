import os
import json
import logging
import asyncio
import uuid
import aiohttp
from pathlib import Path
from typing import Optional, Dict, Any, List, Callable
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ComfyUIResult:
    success: bool
    video_path: Optional[str] = None
    error: Optional[str] = None


ProgressCallback = Callable[[int, int, str], None]


class ComfyUIClient:
    def __init__(
        self,
        base_url: str = "http://127.0.0.1:8188",
        workflow_path: str = "/Users/ishankmourya/AI/EduMotion-AI/apps/backend/workflows/wan21_t2v_api.json",
        output_dir: str = "/tmp/edumotion_comfyui",
    ):
        self.base_url = base_url.rstrip("/")
        self.workflow_path = Path(workflow_path)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._workflow_cache: Optional[Dict[str, Any]] = None

    def _load_workflow(self) -> Dict[str, Any]:
        if self._workflow_cache is None:
            with open(self.workflow_path, "r") as f:
                self._workflow_cache = json.load(f)
        return self._workflow_cache

    def _prepare_workflow(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 832,
        height: int = 480,
        length: int = 17,
        steps: int = 8,
        cfg: float = 6.0,
        seed: int = -1,
        fps: int = 16,
    ) -> Dict[str, Any]:
        workflow = self._load_workflow()
        workflow = json.loads(json.dumps(workflow))

        if seed == -1:
            seed = int(uuid.uuid4().int & 0xFFFFFFFF)

        workflow["70"]["inputs"]["seed"] = seed
        workflow["70"]["inputs"]["steps"] = steps
        workflow["70"]["inputs"]["cfg"] = cfg
        workflow["76"]["inputs"]["width"] = width
        workflow["76"]["inputs"]["height"] = height
        workflow["76"]["inputs"]["length"] = length
        workflow["73"]["inputs"]["fps"] = fps

        workflow["67"]["inputs"]["text"] = prompt
        if negative_prompt:
            workflow["71"]["inputs"]["text"] = negative_prompt

        return workflow

    async def _queue_prompt(self, workflow: Dict[str, Any]) -> str:
        async with aiohttp.ClientSession() as session:
            payload = {"prompt": workflow}
            async with session.post(f"{self.base_url}/prompt", json=payload) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    raise RuntimeError(f"Failed to queue prompt: {text}")
                data = await resp.json()
                return data.get("prompt_id", "")

    async def _wait_for_completion(self, prompt_id: str, progress_callback: Optional[ProgressCallback] = None, timeout: int = 300) -> Dict[str, Any]:
        start_time = asyncio.get_event_loop().time()
        last_progress = 0

        async with aiohttp.ClientSession() as session:
            while True:
                if asyncio.get_event_loop().time() - start_time > timeout:
                    raise TimeoutError(f"ComfyUI generation timed out after {timeout}s")

                async with session.get(f"{self.base_url}/history/{prompt_id}") as resp:
                    if resp.status != 200:
                        await asyncio.sleep(1)
                        continue
                    history = await resp.json()

                if prompt_id in history:
                    prompt_history = history[prompt_id]
                    if prompt_history.get("status", {}).get("completed", False):
                        outputs = prompt_history.get("outputs", {})
                        return outputs

                    status = prompt_history.get("status", {})
                    progress = status.get("progress", 0)
                    if progress != last_progress:
                        last_progress = progress
                        if progress_callback:
                            progress_callback(progress, 100, f"Generating video... {progress}%")

                await asyncio.sleep(1)

    def _find_output_video(self, outputs: Dict[str, Any]) -> Optional[str]:
        for node_id, node_output in outputs.items():
            # Check both "videos" and "images" keys (ComfyUI uses "images" for video outputs)
            for key in ["videos", "images"]:
                if key in node_output:
                    for video in node_output[key]:
                        filename = video.get("filename", "")
                        subfolder = video.get("subfolder", "")
                        if subfolder:
                            return f"/Users/ishankmourya/AI/ComfyUI/output/{subfolder}/{filename}"
                        else:
                            return f"/Users/ishankmourya/AI/ComfyUI/output/{filename}"
        return None

    async def generate_video(
        self,
        prompt: str,
        project_id: str,
        negative_prompt: str = "",
        width: int = 832,
        height: int = 480,
        length: int = 17,
        steps: int = 8,
        cfg: float = 6.0,
        seed: int = -1,
        fps: int = 16,
        progress_callback: Optional[ProgressCallback] = None,
    ) -> ComfyUIResult:
        def report(step: int, total: int, msg: str):
            if progress_callback:
                progress_callback(step, total, msg)

        try:
            logger.info(f"Starting Wan 2.1 video generation for project {project_id}")
            report(1, 4, "Preparing workflow...")

            workflow = self._prepare_workflow(
                prompt=prompt,
                negative_prompt=negative_prompt,
                width=width,
                height=height,
                length=length,
                steps=steps,
                cfg=cfg,
                seed=seed,
                fps=fps,
            )

            report(2, 4, "Queueing generation...")
            prompt_id = await self._queue_prompt(workflow)
            logger.info(f"Queued prompt {prompt_id}")

            report(3, 4, "Generating video with Wan 2.1...")
            outputs = await self._wait_for_completion(prompt_id, progress_callback)

            report(4, 4, "Locating output...")
            video_path = self._find_output_video(outputs)

            if not video_path or not os.path.exists(video_path):
                return ComfyUIResult(success=False, error="Output video not found")

            logger.info(f"Wan 2.1 generation completed: {video_path}")
            return ComfyUIResult(success=True, video_path=video_path)

        except Exception as e:
            logger.exception(f"Wan 2.1 generation failed for project {project_id}: {e}")
            return ComfyUIResult(success=False, error=str(e))