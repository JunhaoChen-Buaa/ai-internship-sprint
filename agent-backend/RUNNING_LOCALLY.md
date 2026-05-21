# Running Locally

This file records the working local setup for this machine.

## Environment

Conda environment:

```powershell
conda activate deep-competitive-analyst
```

Environment location:

```text
E:\ProgramData\anaconda3\envs\deep-competitive-analyst
```

Python version verified:

```text
Python 3.13.13
```

Installed with:

```powershell
conda create -n deep-competitive-analyst python=3.13 pip -y
conda run -n deep-competitive-analyst pip install -e .
```

## Environment Variables

Create a local `.env` file from `.env.example`:

```powershell
Copy-Item .env.example .env
```

Then fill in:

```text
OPENAI_API_KEY
PERPLEXITY_API_KEY
LANGSMITH_API_KEY
```

For local smoke tests that only import and validate the graph, placeholder values work. To actually run a competitive analysis, real OpenAI and Perplexity keys are required.

## Verified Commands

Core imports:

```powershell
& 'E:\ProgramData\anaconda3\envs\deep-competitive-analyst\python.exe' -c "import deepagents, langgraph, langchain_openai, perplexity; print('direct env imports ok')"
```

Agent import smoke test:

```powershell
cd D:\deep-competitive-analyst\src
$env:PYTHONIOENCODING='utf-8'
$env:OPENAI_API_KEY='sk-placeholder'
$env:PERPLEXITY_API_KEY='pplx-placeholder'
& 'E:\ProgramData\anaconda3\envs\deep-competitive-analyst\python.exe' -c "import agent; print(type(agent.competitive_analysis_agent)); print('agent import ok')"
```

LangGraph config validation:

```powershell
cd D:\deep-competitive-analyst\src
$env:PYTHONIOENCODING='utf-8'
$env:OPENAI_API_KEY='sk-placeholder'
$env:PERPLEXITY_API_KEY='pplx-placeholder'
& 'E:\ProgramData\anaconda3\envs\deep-competitive-analyst\Scripts\langgraph.exe' validate
```

Expected result:

```text
Configuration file D:\deep-competitive-analyst\src\langgraph.json is valid. (1 graph found)
```

Start local dev server:

```powershell
cd D:\deep-competitive-analyst\src
$env:PYTHONIOENCODING='utf-8'
& 'E:\ProgramData\anaconda3\envs\deep-competitive-analyst\Scripts\langgraph.exe' dev --no-browser --host 127.0.0.1 --port 8123 --no-reload
```

Verified local URLs:

```text
API: http://127.0.0.1:8123
Studio UI: https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:8123
API Docs: http://127.0.0.1:8123/docs
```

## Windows Notes

On this machine, `langgraph --help` can fail in the default Windows GBK console because the help text contains emoji. Set this before running LangGraph CLI:

```powershell
$env:PYTHONIOENCODING='utf-8'
```

Avoid running multiple `conda run` commands in parallel on Windows. It can collide on temporary activation files. Use direct executable paths from the environment when possible.

