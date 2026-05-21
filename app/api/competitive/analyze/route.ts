import { NextResponse } from "next/server";

type AnalyzeRequest = {
  message?: string;
};

type MiniMaxChoice = {
  message?: {
    content?: string;
  };
};

type MiniMaxResponse = {
  choices?: MiniMaxChoice[];
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

async function callModel(params: {
  system: string;
  user: string;
  temperature?: number;
}) {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL ?? "https://api.minimax.io/v1";
  const model = process.env.LLM_MODEL ?? "MiniMax-M2.7";

  if (!apiKey || apiKey === "replace_me") {
    throw new Error("MiniMax API Key is not configured.");
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: params.temperature ?? 0.2,
      messages: [
        {
          role: "system",
          content: params.system,
        },
        {
          role: "user",
          content: params.user,
        },
      ],
    }),
  });

  const data = (await response.json().catch(() => ({}))) as MiniMaxResponse;

  if (!response.ok) {
    throw new Error(
      data.error?.message ??
        data.base_resp?.status_msg ??
        `MiniMax API request failed with HTTP ${response.status}`,
    );
  }

  if (data.base_resp?.status_code && data.base_resp.status_code !== 0) {
    throw new Error(data.base_resp.status_msg || "MiniMax API returned a business error.");
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("MiniMax API returned no content.");
  }

  return content;
}

async function runAgent(params: {
  trace: TraceEvent[];
  modelCall: number;
  agent: string;
  stage: string;
  input: string;
  decision: string;
  system: string;
  user: string;
}) {
  const startedAt = Date.now();
  const output = await callModel({
    system: params.system,
    user: params.user,
  });

  params.trace.push({
    agent: params.agent,
    stage: params.stage,
    input: params.input,
    output,
    decision: params.decision,
    warnings: [],
    durationMs: Date.now() - startedAt,
    modelCall: params.modelCall,
  });

  return output;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as AnalyzeRequest;
  const message = body.message?.trim();

  if (!message) {
    return NextResponse.json({ error: "Please enter an analysis request." }, { status: 400 });
  }

  const trace: TraceEvent[] = [];

  try {
    const scope = await runAgent({
      trace,
      modelCall: 1,
      agent: "scope-agent",
      stage: "scope",
      input: message,
      decision: "Extract companies, audience, focus areas, and missing questions.",
      system:
        "You are the Scope Agent in a competitive-intelligence DAG. Return a concise ResearchPlan. Do not perform analysis.",
      user: `User request:\n${message}`,
    });

    const collection = await runAgent({
      trace,
      modelCall: 2,
      agent: "collection-agent",
      stage: "collection",
      input: `ResearchPlan:\n${scope}`,
      decision:
        "Use only seeded public evidence in this Vercel demo; do not invent new sources.",
      system:
        "You are the Collection Agent. Summarize the provided source and evidence inventory. Do not add facts beyond the evidence.",
      user: `ResearchPlan:\n${scope}\n\nSources:\n${JSON.stringify(
        seedSources,
        null,
        2,
      )}\n\nEvidence:\n${JSON.stringify(seedEvidence, null, 2)}`,
    });

    const analysis = await runAgent({
      trace,
      modelCall: 3,
      agent: "analysis-agent",
      stage: "analysis",
      input: `Collection summary:\n${collection}`,
      decision: "Generate claims only when each claim can cite evidence IDs.",
      system:
        "You are the Analysis Agent. Generate evidence-backed claims only. Every claim must include evidence IDs. If evidence is insufficient, say so.",
      user: `User request:\n${message}\n\nCollection summary:\n${collection}\n\nEvidence:\n${JSON.stringify(
        seedEvidence,
        null,
        2,
      )}`,
    });

    const report = await runAgent({
      trace,
      modelCall: 4,
      agent: "writing-agent",
      stage: "writing",
      input: `Claims:\n${analysis}`,
      decision: "Write a structured report from evidence-backed claims.",
      system:
        "You are the Writing Agent. Produce a concise Markdown report with sections: Scope, Findings, Evidence Table, Limitations, Next Steps.",
      user: `User request:\n${message}\n\nClaims:\n${analysis}\n\nEvidence:\n${JSON.stringify(
        seedEvidence,
        null,
        2,
      )}\n\nSources:\n${JSON.stringify(seedSources, null, 2)}`,
    });

    const qa = await runAgent({
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

    return NextResponse.json({
      mode: "live-multi-agent",
      modelCalls: 5,
      report,
      qa,
      trace,
      sources: seedSources,
      evidence: seedEvidence,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown multi-agent pipeline error.",
        trace,
      },
      { status: 500 },
    );
  }
}
