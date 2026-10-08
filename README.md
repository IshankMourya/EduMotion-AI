# EduMotion AI

Local-first AI educational video generator. Transform PDF notes into animated narrated videos using local LLMs and programmatic animation or AI video generation (Wan 2.1).

## Architecture Overview

```
PDF Upload → Docling Extract → Qwen3 27B (Ollama) → Storyboard → Remotion Render → Piper TTS → FFmpeg → MP4
                                     ↓                              ↓
                               Chat/RAG (pgvector)          Wan 2.1 (ComfyUI) → FFmpeg → MP4
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | FastAPI, Python 3.11, Supabase (PostgreSQL + pgvector) |
| **Video** | Remotion, FFmpeg |
| **AI Video** | ComfyUI, Wan 2.1 T2V 1.3B |
| **Local AI** | Ollama (Qwen3 27B), Piper TTS |
| **PDF** | Docling |
| **Auth/Storage** | Supabase Cloud |

## Project Structure

```
edumotion-ai/
├── apps/
│   ├── frontend/          # Next.js dashboard
│   ├── backend/           # FastAPI server
│   └── video-renderer/    # Remotion compositions
├── packages/
│   ├── shared/            # Shared TypeScript types
│   └── supabase/          # Supabase client utilities
├── supabase/
│   └── schema.sql         # Database schema
├── .env.example           # Environment template
├── turbo.json             # Turborepo config
└── package.json           # Root workspace
```

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9
- **Python** ≥ 3.11
- **uv** (recommended) or pip
- **Ollama** with `qwen3:27b` and `nomic-embed-text` models
- **Piper TTS** with `en_US-lessac-medium` voice
- **FFmpeg** (with VideoToolbox support on macOS)
- **ComfyUI** with Wan 2.1 T2V 1.3B model
- **Supabase Cloud** account

### Install Local Dependencies (macOS)

```bash
# Ollama
brew install ollama
ollama pull qwen3:27b
ollama pull nomic-embed-text

# Piper TTS
brew install piper
# Download voice model manually or via piper-phonemize

# FFmpeg (with hardware acceleration)
brew install ffmpeg

# ComfyUI (for Wan 2.1 AI video generation)
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
pip install -r requirements.txt
# Download Wan 2.1 models to models/diffusion_models/, models/text_encoders/, models/vae/
# See https://github.com/Wan-Video/Wan2.1 for model downloads

# Docling (for backend)
pip install docling[full]
```

## Getting Started

### 1. Clone and Install

```bash
cd edumotion-ai
pnpm install
cd apps/backend && uv sync  # or pip install -e ".[dev]"
```

### 2. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials and local paths
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (Supabase PostgreSQL connection string)
- `OLLAMA_BASE_URL` (default: http://localhost:11434)
- `OLLAMA_MODEL` (your exact model name from `ollama list`)
- `PIPER_BINARY_PATH` and `PIPER_MODEL_PATH`

### 3. Set Up Supabase

1. Create a new Supabase project
2. Run the SQL in `supabase/schema.sql` in the SQL Editor
3. Create storage buckets: `pdfs`, `videos`, `thumbnails`
4. Enable pgvector extension
5. Configure RLS policies (included in schema)

### 4. Run Development Servers

```bash
# Terminal 1: Frontend (Next.js)
pnpm --filter=frontend dev

# Terminal 2: Backend (FastAPI)
pnpm --filter=backend dev

# Terminal 3: Video Renderer (Remotion Studio)
pnpm --filter=video-renderer dev

# Terminal 4: ComfyUI (for Wan 2.1)
cd /path/to/ComfyUI && python main.py --port 8188 --listen 127.0.0.1
```

Or run all at once:
```bash
pnpm dev
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Remotion Studio: http://localhost:4000
- ComfyUI: http://127.0.0.1:8188

## Development Stages

| Stage | Description | Status |
|-------|-------------|--------|
| 1 | Foundation: Repo, Supabase, Auth, Project CRUD | ✅ Complete |
| 2 | PDF Upload & Docling Extraction | ⏳ Pending |
| 3 | Qwen3 Storyboard Generation | ⏳ Pending |
| 4 | Remotion Animation Engine | ⏳ Pending |
| 5 | Piper TTS Integration | ⏳ Pending |
| 6 | FFmpeg Composition & Delivery | ⏳ Pending |
| 7 | Chat/RAG Interface | ⏳ Pending |
| 8 | Polish & Production Hardening | ⏳ Pending |

## Key Commands

```bash
# Run all dev servers
pnpm dev

# Build all apps
pnpm build

# Lint all apps
pnpm lint

# Typecheck all apps
pnpm typecheck

# Frontend only
pnpm --filter=frontend dev
pnpm --filter=frontend build
pnpm --filter=frontend lint

# Backend only
pnpm --filter=backend dev
cd apps/backend && uv run pytest

# Video Renderer only
pnpm --filter=video-renderer dev
pnpm --filter=video-renderer render

# Database
pnpm db:push      # Push schema changes
pnpm db:studio    # Open Supabase Studio
```

## Video Rendering Pipeline

### Remotion Path (Programmatic Animations)
1. **Storyboard Generation**: Qwen3 creates JSON with scenes, narration, visual specs
2. **Remotion Render**: Each scene renders to silent MP4 (programmatic animations)
3. **Piper TTS**: Narration text → WAV audio files per scene
4. **FFmpeg Compose**: Combine silent video + audio → final MP4

### Wan 2.1 Path (AI Video Generation)
1. **Storyboard Generation**: Qwen3 creates JSON with scenes, narration, visual descriptions
2. **Prompt Building**: Visual descriptions combined into Wan 2.1 prompt
3. **Wan 2.1 Generation**: ComfyUI generates video from text prompt (T2V)
4. **Piper TTS**: Narration text → WAV audio files per scene
5. **FFmpeg Compose**: Combine AI video + audio → final MP4

Switch between modes via `RENDER_MODE` environment variable (`remotion` or `wan21`) or API endpoint `POST /api/render/mode`.

## MacBook Air M5 Optimizations

- Ollama: `OLLAMA_NUM_PARALLEL=1`, `OLLAMA_MAX_LOADED_MODELS=1`
- Use Q4_K_M quantization for Qwen3 27B (~16GB RAM)
- FFmpeg: Use `h264_videotoolbox` encoder for hardware acceleration
- Limit concurrent renders to 1
- Monitor memory with `sudo powermetrics --samplers smc`

## Environment Variables

See `.env.example` for all configuration options.

### Video Rendering Modes
- `RENDER_MODE=remotion` - Use Remotion for programmatic animations (default)
- `RENDER_MODE=wan21` - Use Wan 2.1 via ComfyUI for AI video generation
- `COMFYUI_URL=http://127.0.0.1:8188` - ComfyUI API endpoint

## License

MIT