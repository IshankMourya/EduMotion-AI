# EduMotion AI Video Renderer

Remotion-based video renderer for creating educational animations.

## Development

```bash
# Install dependencies
cd apps/video-renderer
pnpm install

# Start Remotion Studio (visual editor)
pnpm dev

# Render a video
pnpm render src/index.tsx VideoComposition out/video.mp4 --props='{"storyboard": {...}}'
```

## Project Structure

```
src/
├── components/       # Scene components
│   ├── TitleScene.tsx
│   ├── ConceptScene.tsx
│   ├── DiagramScene.tsx
│   ├── CodeScene.tsx
│   ├── ChartScene.tsx
│   └── SummaryScene.tsx
├── compositions/     # Composition definitions
│   └── VideoComposition.tsx
├── utils/           # Animation utilities
│   ├── animation.ts
│   └── helpers.ts
├── types/           # TypeScript types
│   └── index.ts
└── index.tsx        # Entry point
```

## Scene Types

- **title** - Opening title screen
- **concept** - Bullet points with optional typewriter effect
- **diagram** - Node-based diagrams with connections
- **code** - Syntax-highlighted code blocks
- **chart** - Bar charts (extensible to line, pie)
- **summary** - Key takeaways with CTA

## Storyboard Format

```json
{
  "scenes": [
    {
      "id": "scene-1",
      "title": "Introduction",
      "narration": "Welcome to this lesson...",
      "visual_spec": {
        "type": "title",
        "props": {
          "title": "Machine Learning Basics",
          "subtitle": "Understanding the Fundamentals"
        }
      },
      "duration_sec": 10,
      "order": 0
    }
  ],
  "total_duration_sec": 60,
  "metadata": {}
}
```

## Rendering from Backend

The FastAPI backend will call Remotion's render API:

```bash
npx remotion render src/index.tsx VideoComposition out/video.mp4 \
  --props='{"storyboard": {...}}' \
  --concurrency=4
```