import os
import json
import logging
import subprocess
import asyncio
import uuid
import shutil
from pathlib import Path
from typing import Optional, Dict, Any, List, Callable
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


@dataclass
class RenderResult:
    success: bool
    video_path: Optional[str] = None
    video_size: Optional[int] = None
    duration_seconds: Optional[float] = None
    error: Optional[str] = None


@dataclass
class NarrationResult:
    success: bool
    audio_path: Optional[str] = None
    scene_files: List[str] = None
    error: Optional[str] = None


ProgressCallback = Callable[[int, int, str], None]  # current, total, message


class RenderMode(str, Enum):
    REMOTION = "remotion"
    WAN21 = "wan21"


class VideoRenderer:
    def __init__(
        self,
        remotion_serve_url: str = "http://localhost:4000",
        ffmpeg_path: str = "ffmpeg",
        output_dir: str = "/tmp/edumotion_renders",
        comfyui_url: str = "http://127.0.0.1:8188",
        render_mode: RenderMode = RenderMode.REMOTION,
    ):
        self.remotion_serve_url = remotion_serve_url.rstrip("/")
        self.ffmpeg_path = ffmpeg_path
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.comfyui_url = comfyui_url
        self.render_mode = render_mode
        self._comfyui_client = None

    @property
    def comfyui_client(self):
        if self._comfyui_client is None:
            from src.services.comfyui_client import ComfyUIClient
            self._comfyui_client = ComfyUIClient(base_url=self.comfyui_url)
        return self._comfyui_client

    async def render_video(
        self,
        project_id: str,
        storyboard: Dict[str, Any],
        narration_audio_path: Optional[str] = None,
        progress_callback: Optional[ProgressCallback] = None,
    ) -> RenderResult:
        """Render video using selected mode (Remotion or Wan 2.1) and combine with narration."""
        render_id = str(uuid.uuid4())[:8]
        temp_dir = self.output_dir / f"{project_id}_{render_id}"
        temp_dir.mkdir(parents=True, exist_ok=True)

        def report(step: int, total: int, msg: str):
            if progress_callback:
                progress_callback(step, total, msg)

        try:
            logger.info(f"Starting video render for project {project_id} (mode: {self.render_mode})")

            if self.render_mode == RenderMode.WAN21:
                return await self._render_wan21_video(
                    project_id, storyboard, narration_audio_path, temp_dir, report
                )
            else:
                return await self._render_remotion_video_pipeline(
                    project_id, storyboard, narration_audio_path, temp_dir, report
                )

        except Exception as e:
            logger.exception(f"Video render failed for project {project_id}: {e}")
            return RenderResult(success=False, error=str(e))

    async def _render_remotion_video_pipeline(
        self,
        project_id: str,
        storyboard: Dict[str, Any],
        narration_audio_path: Optional[str],
        temp_dir: Path,
        report: Callable[[int, int, str], None],
    ) -> RenderResult:
        """Render video using Remotion pipeline."""
        report(1, 4, "Rendering silent video with Remotion...")

        # Step 1: Render silent video with Remotion
        silent_video_path = temp_dir / "silent.mp4"
        await self._render_remotion_video(storyboard, silent_video_path)

        # Step 2: Combine with narration if provided
        report(2, 4, "Combining audio and video...")
        final_video_path = temp_dir / "final.mp4"
        if narration_audio_path and os.path.exists(narration_audio_path):
            await self._combine_audio_video(
                silent_video_path, narration_audio_path, final_video_path
            )
        else:
            # No narration, just copy silent video
            final_video_path = silent_video_path

        # Step 3: Generate thumbnail
        report(3, 4, "Generating thumbnail...")
        thumbnail_path = temp_dir / "thumbnail.jpg"
        await self._generate_thumbnail(final_video_path, thumbnail_path)

        # Get video info
        report(4, 4, "Finalizing...")
        video_info = await self._get_video_info(final_video_path)

        logger.info(f"Video render completed for project {project_id}")

        return RenderResult(
            success=True,
            video_path=str(final_video_path),
            video_size=os.path.getsize(final_video_path),
            duration_seconds=video_info.get("duration"),
        )

    async def _render_wan21_video(
        self,
        project_id: str,
        storyboard: Dict[str, Any],
        narration_audio_path: Optional[str],
        temp_dir: Path,
        report: Callable[[int, int, str], None],
    ) -> RenderResult:
        """Render video using Wan 2.1 via ComfyUI."""
        scenes = storyboard.get("scenes", [])
        if not scenes:
            return RenderResult(success=False, error="No scenes in storyboard")

        # Build combined prompt from all scenes
        prompt_parts = []
        for scene in scenes:
            visual_desc = scene.get("visual_description", "")
            if visual_desc:
                prompt_parts.append(visual_desc)

        combined_prompt = " ".join(prompt_parts)
        if not combined_prompt:
            combined_prompt = "Educational animation, smooth motion, cinematic quality"

        # Negative prompt for Wan 2.1
        negative_prompt = (
            "low quality, blurry, distorted, deformed, bad anatomy, extra limbs, "
            "missing limbs, flickering, jittery motion, unstable camera, duplicated objects, "
            "distorted objects, text, subtitles, watermark, artifacts"
        )

        report(1, 4, "Generating video with Wan 2.1...")

        # Generate video with Wan 2.1
        result = await self.comfyui_client.generate_video(
            prompt=combined_prompt,
            project_id=project_id,
            negative_prompt=negative_prompt,
            width=832,
            height=480,
            length=17,
            steps=8,
            cfg=6.0,
            seed=-1,
            fps=16,
            progress_callback=lambda c, t, m: report(1, 4, m),
        )

        if not result.success:
            return RenderResult(success=False, error=result.error)

        wan_video_path = Path(result.video_path)

        # Step 2: Combine with narration if provided
        report(2, 4, "Combining audio and video...")
        final_video_path = temp_dir / "final.mp4"
        if narration_audio_path and os.path.exists(narration_audio_path):
            await self._combine_audio_video(wan_video_path, Path(narration_audio_path), final_video_path)
        else:
            # No narration, copy Wan 2.1 video
            import shutil
            shutil.copy2(wan_video_path, final_video_path)

        # Step 3: Generate thumbnail
        report(3, 4, "Generating thumbnail...")
        thumbnail_path = temp_dir / "thumbnail.jpg"
        await self._generate_thumbnail(final_video_path, thumbnail_path)

        # Get video info
        report(4, 4, "Finalizing...")
        video_info = await self._get_video_info(final_video_path)

        logger.info(f"Wan 2.1 video render completed for project {project_id}")

        return RenderResult(
            success=True,
            video_path=str(final_video_path),
            video_size=os.path.getsize(final_video_path),
            duration_seconds=video_info.get("duration"),
        )

    async def _render_remotion_video(self, storyboard: Dict[str, Any], output_path: Path) -> None:
        """Render video using Remotion CLI."""
        # Write storyboard to temp file for Remotion to read
        storyboard_path = output_path.parent / "storyboard.json"
        with open(storyboard_path, "w") as f:
            json.dump(storyboard, f)

        # Build Remotion render command
        cmd = [
            "npx",
            "remotion",
            "render",
            "src/index.tsx",
            "VideoComposition",
            str(output_path),
            "--props",
            json.dumps({"storyboard": storyboard}),
            "--concurrency",
            "4",
            "--image-format",
            "png",
            "--jpeg-quality",
            "90",
        ]

        logger.info(f"Running Remotion render: {' '.join(cmd)}")

        # Run in video-renderer directory
        video_renderer_dir = Path("/Users/ishankmourya/Downloads/EduMotion AI/apps/video-renderer")

        process = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=video_renderer_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Unknown error"
            logger.error(f"Remotion render failed: {error_msg}")
            raise RuntimeError(f"Remotion render failed: {error_msg}")

        logger.info(f"Remotion render completed: {output_path}")

    async def _combine_audio_video(
        self, video_path: Path, audio_path: Path, output_path: Path
    ) -> None:
        """Combine video and audio using FFmpeg with required encoding parameters."""
        cmd = [
            self.ffmpeg_path,
            "-y",
            "-i", str(video_path),
            "-i", str(audio_path),
            "-c:v", "libx264",           # H.264 encoder
            "-preset", "medium",
            "-pix_fmt", "yuv420p",       # Required for compatibility
            "-b:v", "5000k",
            "-c:a", "aac",               # AAC audio
            "-b:a", "128k",
            "-shortest",
            "-movflags", "+faststart",   # Fast start metadata
            str(output_path),
        ]

        logger.info(f"Running FFmpeg: {' '.join(cmd)}")

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Unknown error"
            logger.error(f"FFmpeg failed: {error_msg}")
            raise RuntimeError(f"FFmpeg audio-video combine failed: {error_msg}")

    async def _generate_thumbnail(self, video_path: Path, thumbnail_path: Path) -> None:
        """Generate thumbnail from first frame of video."""
        cmd = [
            self.ffmpeg_path,
            "-y",
            "-i", str(video_path),
            "-vframes", "1",
            "-vf", "scale=1920:1080",
            str(thumbnail_path),
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        await process.communicate()

    async def _get_video_info(self, video_path: Path) -> Dict[str, Any]:
        """Get video duration and metadata using ffprobe."""
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            str(video_path),
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, _ = await process.communicate()

        try:
            data = json.loads(stdout.decode())
            duration = float(data.get("format", {}).get("duration", 0))
            return {"duration": duration}
        except Exception:
            return {"duration": 0}


class NarrationGenerator:
    """Generate narration audio using Piper TTS (Python API)."""

    def __init__(
        self,
        piper_model: Optional[str] = None,
        output_dir: str = "/tmp/edumotion_narration",
    ):
        # Use environment variable with fallback
        self.piper_model = piper_model or os.getenv("PIPER_MODEL_PATH", "/opt/homebrew/share/piper-voices/en_US-lessac-medium.onnx")
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Validate Piper setup
        self._validate_setup()

    def _validate_setup(self) -> None:
        """Validate Piper model exists."""
        if not os.path.exists(self.piper_model):
            logger.warning(f"Piper model not found at {self.piper_model}")
        config_path = Path(self.piper_model).with_suffix(".onnx.json")
        if not config_path.exists():
            logger.warning(f"Piper config not found at {config_path}")

    async def generate_narration(
        self,
        project_id: str,
        storyboard: Dict[str, Any],
        progress_callback: Optional[ProgressCallback] = None,
    ) -> NarrationResult:
        """Generate narration audio for all scenes and concatenate."""
        scenes = storyboard.get("scenes", [])
        if not scenes:
            return NarrationResult(success=False, error="No scenes in storyboard")

        # Filter scenes with narration
        narrated_scenes = [s for s in scenes if s.get("narration", "").strip()]
        if not narrated_scenes:
            return NarrationResult(success=False, error="No narration text in any scene")

        total_scenes = len(narrated_scenes)
        scene_files = []

        def report(current: int, total: int, msg: str):
            if progress_callback:
                progress_callback(current, total, msg)

        try:
            for i, scene in enumerate(narrated_scenes, 1):
                narration = scene.get("narration", "").strip()
                if not narration:
                    continue

                report(i, total_scenes, f"Generating audio for scene {scene.get('order', i)}: {scene.get('title', 'Unknown')[:50]}...")

                # Save by project ID and scene number
                scene_audio = self.output_dir / f"{project_id}_scene_{scene.get('order', i):02d}.wav"
                success = await self._generate_scene_audio(narration, scene_audio)

                if success and scene_audio.exists() and scene_audio.stat().st_size > 0:
                    scene_files.append(str(scene_audio))
                    logger.info(f"Generated audio for scene {scene.get('order', i)}: {scene_audio}")
                else:
                    logger.warning(f"Failed to generate audio for scene {scene.get('order', i)}")

            if not scene_files:
                return NarrationResult(success=False, error="No audio files generated")

            # Concatenate all audio files
            final_audio = self.output_dir / f"{project_id}_narration.wav"
            await self._concatenate_audio(scene_files, final_audio)

            if not final_audio.exists() or final_audio.stat().st_size == 0:
                return NarrationResult(success=False, error="Final narration file is empty")

            return NarrationResult(
                success=True,
                audio_path=str(final_audio),
                scene_files=scene_files,
            )

        except Exception as e:
            logger.exception(f"Narration generation failed: {e}")
            return NarrationResult(success=False, error=str(e))

    async def _generate_scene_audio(self, text: str, output_path: Path) -> bool:
        """Generate audio for a single scene using Piper TTS (Python API)."""
        try:
            # Ensure output directory exists
            output_path.parent.mkdir(parents=True, exist_ok=True)

            # Load Piper voice using Python API
            from piper.voice import PiperVoice

            # Config path is .onnx.json not .json
            config_path = str(Path(self.piper_model).with_suffix(".onnx.json"))
            voice = PiperVoice.load(self.piper_model, config_path=config_path)

            logger.debug(f"Generating audio with Piper Python API: {output_path}")

            # Synthesize audio
            audio_chunks = list(voice.synthesize(text))

            if not audio_chunks:
                logger.error("Piper synthesis returned no audio chunks")
                return False

            # Write WAV file
            import wave
            with wave.open(str(output_path), "wb") as wav_file:
                wav_file.setnchannels(1)  # mono
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(voice.config.sample_rate)
                for chunk in audio_chunks:
                    wav_file.writeframes(chunk.audio_int16_bytes)

            # Validate output file
            if not output_path.exists():
                logger.error(f"Piper output file not created: {output_path}")
                return False

            if output_path.stat().st_size == 0:
                logger.error(f"Piper output file is empty: {output_path}")
                output_path.unlink(missing_ok=True)
                return False

            logger.debug(f"Piper generated: {output_path} ({output_path.stat().st_size} bytes)")
            return True

        except Exception as e:
            logger.error(f"Piper TTS failed: {e}")
            return False

    async def _concatenate_audio(self, audio_files: list, output_path: Path) -> None:
        """Concatenate multiple WAV files using FFmpeg."""
        if len(audio_files) == 1:
            # Just copy single file
            shutil.copy2(audio_files[0], output_path)
            return

        # Create concat file list
        concat_file = output_path.parent / "concat_list.txt"
        with open(concat_file, "w") as f:
            for af in audio_files:
                f.write(f"file '{af}'\n")

        cmd = [
            "ffmpeg",
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_file),
            "-c", "copy",
            str(output_path),
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Unknown error"
            logger.error(f"FFmpeg concat failed: {error_msg}")
            raise RuntimeError(f"FFmpeg concat failed: {error_msg}")

        # Cleanup concat file
        concat_file.unlink(missing_ok=True)

        # Validate output
        if not output_path.exists() or output_path.stat().st_size == 0:
            raise RuntimeError("Concatenated audio file is empty or missing")