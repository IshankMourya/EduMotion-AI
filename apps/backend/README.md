# EduMotion AI Backend

## Development

```bash
# Install dependencies
cd apps/backend
uv sync  # or pip install -e ".[dev]"

# Run development server
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Or with python directly
python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your values.

Required:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
src/
├── api/           # API routes
│   ├── auth.py    # Authentication
│   ├── projects.py # Project CRUD
│   ├── upload.py  # File upload
│   ├── processing.py # PDF processing & video rendering
│   └── chat.py    # Chat/RAG
├── core/          # Core configuration
│   ├── config.py  # Settings
│   └── security.py # JWT auth
├── db/            # Database
│   └── database.py
├── models/        # SQLAlchemy models
├── schemas/       # Pydantic schemas
├── services/      # Business logic (to be added)
└── main.py        # App entry point
```