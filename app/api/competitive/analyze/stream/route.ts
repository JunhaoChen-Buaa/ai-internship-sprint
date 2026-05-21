type AnalyzeRequest = {
  message?: string;
};

type MiniMaxChunk = {
  choices?: Array<{
    delta?: {
      content?: string;
    };
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
};

type TraceEvent = {
  agent: string;
  stage: string;
  input: string;
  output: string;
  decision: string;
  warnings: string[];
  durationMs: number;
  modelCall: number;
};

type PythonTraceEvent = {
  agent_name?: string;
  agent?: string;
  stage?: string;
  input_summary?: string;
  input?: string;
  output_summary?: string;
  output?: string;
  decision?: string;
  warnings?: string[];
};

type PythonBackendResponse = {
  mode?: string;
  report?: string;
  qa?: unknown;
  trace?: PythonTraceEvent[];
  sources?: unknown[];
  evidence?: unknown[];
  artifacts?: unknown[];
  claims?: unknown[];
  error?: string;
};

const seedSources = [
  {
    id: "src_linear_features",
    title: "Linear Features",
    url: "https://linear.app/features",
    type: "official",
    credibility: "high / 0.90",
  },
  {
    id: "src_linear_pricing",
    title: "Linear Pricing",
    url: "https://linear.app/pricing",
    type: "official",
    credibility: "high / 0.90",
  },
  {
    id: "src_asana_product",
    title: "Asana Product",
    url: "https://asana.com/product",
    type: "official",
    credibility: "high / 0.90",
  },
  {
    id: "src_asana_pricing",
    title: "Asana Pricing",
    url: "https://asana.com/pricing",
    type: "official",
    credibility: "high / 0.90",
  },
];

const seedEvidence = [
  {
    id: "ev_linear_product",
    company: "Linear",
    topic: "product",
    sourceId: "src_linear_features",
    excerpt:
      "Linear describes its product as purpose-built for planning and building software, with issue tracking, projects, roadmaps, cycles, and integrations for product development teams.",
  },
  {
    id: "ev_linear_pricing",
    company: "Linear",
    topic: "pricing",
    sourceId: "src_linear_pricing",
    excerpt:
      "Linear publishes self-serve pricing tiers for teams, including paid plans with additional workspace, collaboration, and administrative capabilities.",
  },
  {
    id: "ev_asana_product",
    company: "Asana",
    topic: "product",
    sourceId: "src_asana_product",
    excerpt:
      "Asana positions its work management platform around projects, tasks, goals, portfolios, workflow automation, reporting, and cross-functional team coordination.",
  },
  {
    id: "ev_asana_pricing",
    company: "Asana",
    topic: "pricing",
    sourceId: "src_asana_pricing",
    excerpt:
      "Asana publishes pricing tiers for individuals, teams, and enterprises, with higher tiers adding advanced reporting, portfolios, goals, workload, and administrative controls.",
  },
];

function getAgentBackendUrl() {
  const raw = process.env.AGENT_BACKEND_URL?.trim();
  if (!raw || raw === "replace_me") {
    return null;
  }
  return raw.replace(/\/+$/, "");
}

function stringifyForUi(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (!value) {
    return "";
  }
  return JSON.stringify(value, null, 2);
}

function normalizePythonTrace(events: PythonTraceEvent[] = []): TraceEvent[] {
  return events.map((event, index) => ({
    agent: event.agent_name ?? event.agent ?? `python-agent-${index + 1}`,
    stage: event.stage ?? "python",
    input: event.input_summary ?? event.input ?? "",
    output: event.output_summary ?? event.output ?? "",
    decision: event.decision ?? "Python LangGraph workflow step executed.",
    warnings: event.warnings ?? [],
    durationMs: 0,
    modelCall: index + 1,
  }));
}

function writeEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  payload: Record<string, unknown>,
) {
  controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
}

async function callStreamingModel(params: {
  controller: ReadableStreamDefaultController<Uint8Array>;
  encoder: TextEncoder;
  trace: TraceEvent[];
  modelCall: number;
  agent: string;
  stage: string;
  input: string;
  decision: string;
  system: string;
  user: string;
}) {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL ?? "https://api.minimax.io/v1";
  const model = process.env.LLM_MODEL ?? "MiniMax-M2.7";

  if (!apiKey || apiKey === "replace_me") {
    throw new Error("MiniMax API Key is not configured.");
  }

  const startedAt = Date.now();
  let output = "";

  writeEvent(params.controller, params.encoder, {
    type: "agent_start",
    agent: params.agent,
    stage: params.stage,
    modelCall: params.modelCall,
    decision: params.decision,
    input: params.input,
  });

  const upstream = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `${params.system}

Do not reveal private chain-of-thought. Stream concise observable reasoning, decisions, and the artifact you are producing.`,
        },
        {
          role: "user",
          content: params.user,
        },
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const errorText = await upstream.text().catch(() => "");
    throw new Error(errorText || `MiniMax stream failed with HTTP ${upstream.status}`);
  }

  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) {
        continue;
      }

      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") {
        continue;
      }

      try {
        const parsed = JSON.parse(payload) as MiniMaxChunk;
        if (parsed.base_resp?.status_code && parsed.base_resp.status_code !== 0) {
          throw new Error(parsed.base_resp.status_msg || "MiniMax API returned an error.");
        }
        if (parsed.error?.message) {
          throw new Error(parsed.error.message);
        }

        const content =
          parsed.choices?.[0]?.delta?.content ??
          parsed.choices?.[0]?.message?.content ??
          "";

        if (content) {
          output += content;
          writeEvent(params.controller, params.encoder, {
            type: "agent_delta",
            agent: params.agent,
            stage: params.stage,
            modelCall: params.modelCall,
            content,
          });
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          continue;
        }
        throw error;
      }
    }
  }

  const traceEvent = {
    agent: params.agent,
    stage: params.stage,
    input: params.input,
    output: output.trim(),
    decision: params.decision,
    warnings: [],
    durationMs: Date.now() - startedAt,
    modelCall: params.modelCall,
  };

  params.trace.push(traceEvent);
  writeEvent(params.controller, params.encoder, {
    type: "agent_done",
    trace: traceEvent,
  });

  return output.trim();
}

async function streamPythonBackend(params: {
  controller: ReadableStreamDefaultController<Uint8Array>;
  encoder: TextEncoder;
  backendUrl: string;
  message: string;
}) {
  writeEvent(params.controller, params.encoder, {
    type: "meta",
    mode: "python-langgraph-v2",
    pythonBackend: true,
    note: "Calling Python LangGraph backend.",
  });

  writeEvent(params.controller, params.encoder, {
    type: "agent_start",
    agent: "python-langgraph-backend",
    stage: "backend",
    modelCall: 1,
    decision: "Run the real Python competitive_analysis_v2 workflow.",
    input: params.message,
  });

  const response = await fetch(`${params.backendUrl}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      request: params.message,
      use_default_seed_records: true,
      live_collection: process.env.AGENT_BACKEND_LIVE_COLLECTION === "true",
      llm_analysis: process.env.AGENT_BACKEND_LLM_ANALYSIS === "true",
    }),
  });

  const data = (await response.json().catch(() => ({}))) as PythonBackendResponse;

  if (!response.ok) {
    throw new Error(data.error || `Python backend failed with HTTP ${response.status}`);
  }

  const trace = normalizePythonTrace(data.trace ?? []);
  for (const item of trace) {
    writeEvent(params.controller, params.encoder, {
      type: "agent_done",
      trace: item,
    });
  }

  writeEvent(params.controller, params.encoder, {
    type: "done",
    mode: data.mode ?? "python-langgraph-v2",
    pythonBackend: true,
    modelCalls: trace.length,
    report: data.report || "Python backend returned no report.",
    qa: stringifyForUi(data.qa),
    trace,
    sources: data.sources ?? [],
    evidence: data.evidence ?? [],
    artifacts: data.artifacts ?? [],
    claims: data.claims ?? [],
  });
}

async function streamTypeScriptPipeline(params: {
  controller: ReadableStreamDefaultController<Uint8Array>;
  encoder: TextEncoder;
  message: string;
  backendWarning?: string;
}) {
  const trace: TraceEvent[] = [];

  writeEvent(params.controller, params.encoder, {
    type: "meta",
    mode: "live-multi-agent-stream",
    pythonBackend: false,
    backendWarning: params.backendWarning,
  });

  const scope = await callStreamingModel({
    controller: params.controller,
    encoder: params.encoder,
    trace,
    modelCall: 1,
    agent: "scope-agent",
    stage: "scope",
    input: params.message,
    decision: "Extract companies, audience, focus areas, and missing questions.",
    system:
      "You are the Scope Agent in a competitive-intelligence DAG. Return a concise ResearchPlan. Do not perform final analysis.",
    user: `User request:\n${params.message}`,
  });

  const collection = await callStreamingModel({
    controller: params.controller,
    encoder: params.encoder,
    trace,
    modelCall: 2,
    agent: "collection-agent",
    stage: "collection",
    input: `ResearchPlan:\n${scope}`,
    decision: "Use only seeded public evidence in this Vercel demo; do not invent new sources.",
    system:
      "You are the Collection Agent. Summarize the provided source and evidence inventory. Do not add facts beyond the evidence.",
    user: `ResearchPlan:\n${scope}\n\nSources:\n${JSON.stringify(
      seedSources,
      null,
      2,
    )}\n\nEvidence:\n${JSON.stringify(seedEvidence, null, 2)}`,
  });

  const analysis = await callStreamingModel({
    controller: params.controller,
    encoder: params.encoder,
    trace,
    modelCall: 3,
    agent: "analysis-agent",
    stage: "analysis",
    input: `Collection summary:\n${collection}`,
    decision: "Generate claims only when each claim can cite evidence IDs.",
    system:
      "You are the Analysis Agent. Generate evidence-backed claims only. Every claim must include evidence IDs. If evidence is insufficient, say so.",
    user: `User request:\n${params.message}\n\nCollection summary:\n${collection}\n\nEvidence:\n${JSON.stringify(
      seedEvidence,
      null,
      2,
    )}`,
  });

  const report = await callStreamingModel({
    controller: params.controller,
    encoder: params.encoder,
    trace,
    modelCall: 4,
    agent: "writing-agent",
    stage: "writing",
    input: `Claims:\n${analysis}`,
    decision: "Write a structured report from evidence-backed claims.",
    system:
      "You are the Writing Agent. Produce a concise Markdown report with sections: Scope, Findings, Evidence Table, Limitations, Next Steps.",
    user: `User request:\n${params.message}\n\nClaims:\n${analysis}\n\nEvidence:\n${JSON.stringify(
      seedEvidence,
      null,
      2,
    )}\n\nSources:\n${JSON.stringify(seedSources, null, 2)}`,
  });

  const qa = await callStreamingModel({
    controller: params.controller,
    encoder: params.encoder,
    trace,
    modelCall: 5,
    agent: "qa-agent",
    stage: "qa",
    input: `Report:\n${report}`,
    decision:
      "Check citation coverage, source quality, balance, and whether the report invented unsupported facts.",
    system:
      "You are the QA Agent. Review the report. Return pass/fail, key risks, missing evidence, and concrete revision notes.",
    user: `Report:\n${report}\n\nEvidence IDs allowed:\n${seedEvidence
      .map((item) => item.id)
      .join(", ")}`,
  });

  writeEvent(params.controller, params.encoder, {
    type: "done",
    mode: "live-multi-agent-stream",
    pythonBackend: false,
    backendWarning: params.backendWarning,
    modelCalls: trace.length,
    report,
    qa,
    trace,
    sources: seedSources,
    evidence: seedEvidence,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as AnalyzeRequest;
  const message = body.message?.trim();

  if (!message) {
    return new Response(JSON.stringify({ error: "Please enter an analysis request." }), {
      status: 400,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const backendUrl = getAgentBackendUrl();
      let backendWarning: string | undefined;

      try {
        if (backendUrl) {
          try {
            await streamPythonBackend({ controller, encoder, backendUrl, message });
            return;
          } catch (error) {
            backendWarning =
              error instanceof Error ? error.message : "Unknown Python backend error.";

            if (process.env.AGENT_BACKEND_FALLBACK === "false") {
              writeEvent(controller, encoder, {
                type: "error",
                error: backendWarning,
                mode: "python-langgraph-v2",
                pythonBackend: true,
              });
              return;
            }
          }
        }

        await streamTypeScriptPipeline({ controller, encoder, message, backendWarning });
      } catch (error) {
        writeEvent(controller, encoder, {
          type: "error",
          error: error instanceof Error ? error.message : "Unknown streaming pipeline error.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
