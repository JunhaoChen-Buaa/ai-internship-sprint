# Running The HTTP Backend

This file is for the current integrated repo.

The backend service wraps the existing LangGraph workflow:

```text
competitive_analysis_v2.invoke(...)
```

and exposes it as:

```text
GET  /health
POST /api/analyze
POST /analyze
```

## Local Run

Install dependencies first:

```powershell
cd D:\Career\ai-internship-sprint\agent-backend
uv sync
```

Start the backend:

```powershell
cd D:\Career\ai-internship-sprint\agent-backend\src
$env:PORT='8011'
uv run python server.py
```

Health check:

```powershell
curl.exe http://127.0.0.1:8011/health
```

Run an analysis:

```powershell
curl.exe -X POST http://127.0.0.1:8011/api/analyze `
  -H "Content-Type: application/json" `
  -d "{\"request\":\"Create a competitive analysis comparing Linear and Asana for product development teams.\",\"use_default_seed_records\":true}"
```

## Connect Next.js To This Backend

In the repo root `.env.local`, set:

```text
AGENT_BACKEND_URL=http://127.0.0.1:8011
AGENT_BACKEND_FALLBACK=true
```

Then run the frontend:

```powershell
cd D:\Career\ai-internship-sprint
pnpm dev
```

The Next.js route `app/api/competitive/analyze/route.ts` will call the Python backend first. If no backend URL is configured, it uses the Vercel-compatible TypeScript MiniMax pipeline.

## Request Body

```json
{
  "request": "Create a competitive analysis comparing Linear and Asana for product development teams.",
  "use_default_seed_records": true,
  "live_collection": false,
  "llm_analysis": false,
  "include_state": false
}
```

## Response Shape

```json
{
  "mode": "python-langgraph-v2",
  "workflow": "competitive_analysis_v2",
  "report": "...markdown...",
  "qa": {},
  "trace": [],
  "artifacts": [],
  "sources": [],
  "evidence": [],
  "claims": []
}
```

## Production Deployment

Vercel should keep hosting the Next.js app. This Python backend should be deployed as a separate service, then the Vercel project should set:

```text
AGENT_BACKEND_URL=https://your-python-backend.example.com
```

