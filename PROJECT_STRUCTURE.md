# AI Internship Sprint Project Structure

This repository is now a complete Day 0 project instead of a frontend-only demo.

## What Is In This Repo

- `app/`: Next.js 16 frontend and API routes.
- `app/api/chat/`: simple MiniMax chat API route.
- `app/api/competitive/analyze/`: integration route. If `AGENT_BACKEND_URL` is configured, it calls the Python LangGraph backend first. If not, it uses the Vercel-compatible TypeScript MiniMax pipeline.
- `app/data/competitive-demo.ts`: replay data extracted from the previous competitive-analysis project.
- `public/demo/competitive-analysis-v2/`: generated report, trace, and artifact JSON from the previous LangGraph workflow.
- `agent-backend/`: the original Python backend project with Deep Agents, LangChain, LangGraph, schemas, CLI, examples, and running docs.

## Backend Architecture

The Python backend has two layers:

- Original Deep Agents layer:
  `Main Deep Agent -> research-agent -> internet_search -> Perplexity`.

- V2 typed LangGraph DAG layer:
  `Scope Agent -> Collection Agent -> Analysis Agent -> Writing Agent -> QA Agent`.
  If QA fails, the graph routes to `Revision Agent` and then back to QA.

The backend keeps typed artifacts such as:

- `ResearchPlan`
- `SourceRecord`
- `EvidenceRecord`
- `ClaimRecord`
- `ReportDraft`
- `QualityReview`
- `AgentTraceEvent`

## Important Deployment Boundary

Vercel can deploy the Next.js app in this repository, but it does not automatically run the Python LangGraph backend.

Current production behavior:

- The frontend can call MiniMax through Next.js API routes.
- The competitive-analysis UI can call a separately deployed Python LangGraph backend when `AGENT_BACKEND_URL` is set.
- If the Python backend is not configured, the UI can run a Vercel-compatible multi-agent MiniMax pipeline.
- The UI can replay real artifacts produced by the Python backend.

Future production backend options:

- Deploy `agent-backend/` as a separate Python service and call it from Next.js.
- Migrate the LangGraph workflow to LangGraph JS / TypeScript.
- Keep the Python backend for local/CLI research and use Next.js for the deployed product demo.

## Run Frontend Locally

```powershell
cd D:\Career\ai-internship-sprint
pnpm install
pnpm dev
```

Open:

```text
http://localhost:3000
```

Required frontend environment variables:

```text
LLM_PROVIDER=minimax
LLM_BASE_URL=https://api.minimax.io/v1
LLM_API_KEY=replace_me
LLM_MODEL=MiniMax-M2.7
AGENT_BACKEND_URL=http://127.0.0.1:8011
AGENT_BACKEND_FALLBACK=true
```

## Run Backend Locally

```powershell
cd D:\Career\ai-internship-sprint\agent-backend
uv sync
```

Copy the backend env example:

```powershell
Copy-Item .env.example .env
```

Then fill in:

```text
OPENAI_API_KEY=<your-openai-api-key>
PERPLEXITY_API_KEY=<your-perplexity-api-key>
LANGSMITH_API_KEY=<your-langsmith-api-key>
LANGSMITH_TRACING=true
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
LANGSMITH_PROJECT=deep_competitive_analyst
```

Run the LangGraph dev server:

```powershell
cd D:\Career\ai-internship-sprint\agent-backend\src
uv run langgraph dev
```

Run the V2 CLI demo:

```powershell
cd D:\Career\ai-internship-sprint\agent-backend\src
uv run python v2_cli.py "Create a competitive analysis comparing Linear and Asana for product development teams." --seed-records ..\examples\v2_seed_records.json
```

Run the HTTP backend:

```powershell
cd D:\Career\ai-internship-sprint\agent-backend\src
$env:PORT='8011'
uv run python server.py
```

Then set this in the Next.js `.env.local` file:

```text
AGENT_BACKEND_URL=http://127.0.0.1:8011
```
