# V2 Demo Prompt

Use this prompt for the deterministic seed demo:

```text
Create a competitive analysis comparing Linear and Asana for product development teams.
```

Recommended command:

```powershell
cd D:\deep-competitive-analyst\src
$env:PYTHONIOENCODING='utf-8'
& 'E:\ProgramData\anaconda3\envs\deep-competitive-analyst\python.exe' v2_cli.py "Create a competitive analysis comparing Linear and Asana for product development teams." --seed-records ..\examples\v2_seed_records.json --llm-analysis
```

Expected behavior:

1. Scope Agent extracts `Linear` and `Asana`.
2. Collection Agent loads seed source/evidence records.
3. Analysis Agent attempts LLM claim generation if `OPENAI_API_KEY` is real.
4. If no OpenAI key exists, Analysis Agent falls back to deterministic evidence-backed claims.
5. Writing Agent creates report sections:
   - Evidence-Backed Findings
   - Company Fact Sheets
   - Evidence Table
   - Source Inventory
   - Source Quality
6. QA Agent passes because all claims have evidence and all sources are official.

