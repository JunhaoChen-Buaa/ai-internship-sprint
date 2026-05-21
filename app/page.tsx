"use client";

import { useState } from "react";

import {
  demoAgentTeam,
  demoArtifactLinks,
  demoCollaborationPrinciples,
  demoEvidenceRows,
  demoFindings,
  demoMetrics,
  demoOriginalRuntime,
  demoSchemaFlow,
  demoSourceRows,
  demoTraceEvents,
  demoWorkflowSteps,
} from "./data/competitive-demo";

type LiveTraceEvent = {
  agent: string;
  stage: string;
  input: string;
  output: string;
  decision: string;
  warnings: string[];
  durationMs: number;
  modelCall: number;
};

type MultiAgentResponse = {
  mode?: string;
  pythonBackend?: boolean;
  backendWarning?: string;
  report?: string;
  qa?: string;
  trace?: LiveTraceEvent[];
  modelCalls?: number;
  error?: string;
};

type StreamEvent =
  | {
      type: "meta";
      mode?: string;
      pythonBackend?: boolean;
      backendWarning?: string;
      note?: string;
    }
  | {
      type: "agent_start";
      agent: string;
      stage: string;
      input: string;
      decision: string;
      modelCall: number;
    }
  | {
      type: "agent_delta";
      agent: string;
      stage: string;
      modelCall: number;
      content: string;
    }
  | {
      type: "agent_done";
      trace: LiveTraceEvent;
    }
  | {
      type: "done";
      mode?: string;
      pythonBackend?: boolean;
      backendWarning?: string;
      report?: string;
      qa?: string;
      trace?: LiveTraceEvent[];
      modelCalls?: number;
    }
  | {
      type: "error";
      error: string;
    };

export default function Home() {
  const [request, setRequest] = useState(
    "Create a competitive analysis comparing Linear and Asana for product development teams.",
  );
  const [report, setReport] = useState(
    "Run the live pipeline to call MiniMax multiple times through Scope, Collection, Analysis, Writing, and QA agents.",
  );
  const [qaReview, setQaReview] = useState("");
  const [liveTrace, setLiveTrace] = useState<LiveTraceEvent[]>([]);
  const [modelCalls, setModelCalls] = useState(0);
  const [runMode, setRunMode] = useState("Next.js MiniMax pipeline");
  const [backendWarning, setBackendWarning] = useState("");
  const [activeAgent, setActiveAgent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function upsertLiveTrace(event: LiveTraceEvent) {
    setLiveTrace((current) => {
      const existingIndex = current.findIndex(
        (item) => item.agent === event.agent && item.modelCall === event.modelCall,
      );

      if (existingIndex === -1) {
        return [...current, event];
      }

      return current.map((item, index) => (index === existingIndex ? event : item));
    });
  }

  function appendAgentOutput(agent: string, modelCall: number, content: string) {
    setLiveTrace((current) =>
      current.map((item) =>
        item.agent === agent && item.modelCall === modelCall
          ? { ...item, output: item.output + content }
          : item,
      ),
    );
  }

  function handleStreamEvent(event: StreamEvent) {
    if (event.type === "meta") {
      setRunMode(event.pythonBackend ? "Python LangGraph backend" : "Next.js MiniMax streaming pipeline");
      setBackendWarning(event.backendWarning ?? "");
      return;
    }

    if (event.type === "agent_start") {
      setActiveAgent(event.agent);
      setModelCalls((current) => Math.max(current, event.modelCall));
      upsertLiveTrace({
        agent: event.agent,
        stage: event.stage,
        input: event.input,
        output: "",
        decision: event.decision,
        warnings: [],
        durationMs: 0,
        modelCall: event.modelCall,
      });
      return;
    }

    if (event.type === "agent_delta") {
      appendAgentOutput(event.agent, event.modelCall, event.content);
      if (event.stage === "writing") {
        setReport((current) => current + event.content);
      }
      if (event.stage === "qa") {
        setQaReview((current) => current + event.content);
      }
      return;
    }

    if (event.type === "agent_done") {
      upsertLiveTrace(event.trace);
      return;
    }

    if (event.type === "done") {
      setActiveAgent("");
      setReport(event.report || "The pipeline returned no report.");
      setQaReview(event.qa || "");
      setLiveTrace(event.trace ?? []);
      setModelCalls(event.modelCalls ?? event.trace?.length ?? 0);
      setRunMode(event.pythonBackend ? "Python LangGraph backend" : "Next.js MiniMax streaming pipeline");
      setBackendWarning(event.backendWarning ?? "");
      return;
    }

    if (event.type === "error") {
      throw new Error(event.error);
    }
  }

  async function runAnalysis() {
    setIsLoading(true);
    setError(null);
    setReport("");
    setQaReview("");
    setLiveTrace([]);
    setModelCalls(0);
    setBackendWarning("");
    setActiveAgent("");

    try {
      const response = await fetch("/api/competitive/analyze/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: request }),
      });

      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => ({}))) as MultiAgentResponse;
        throw new Error(data.error || "Multi-agent stream failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
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
          if (!trimmed) {
            continue;
          }
          handleStreamEvent(JSON.parse(trimmed) as StreamEvent);
        }
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error.");
    } finally {
      setActiveAgent("");
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-[#171814]">
      <section className="border-b border-[#d8ddd2] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:px-8">
          <nav className="flex flex-wrap items-center justify-between gap-4 text-sm text-[#5e6658]">
            <span className="font-semibold text-[#171814]">AI Internship Sprint</span>
            <div className="flex flex-wrap gap-3">
              <span>Next.js</span>
              <span>MiniMax</span>
              <span>Multi-agent DAG</span>
              <span>Evidence-backed</span>
            </div>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="space-y-5">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#667a47]">
                Multi-agent competitive intelligence
              </p>
              <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-[#171814] sm:text-5xl">
                AI Competitive Analysis Agent Workbench
              </h1>
              <p className="max-w-3xl text-base leading-7 text-[#53594f]">
                This app now has two layers: a live Vercel-compatible multi-agent
                pipeline that calls MiniMax multiple times, and a replay of the
                original deep-competitive-analyst artifacts.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {demoMetrics.map(([label, value]) => (
                <div key={label} className="border border-[#d8ddd2] bg-[#fbfcf8] p-4">
                  <div className="text-sm text-[#687064]">{label}</div>
                  <div className="mt-2 text-2xl font-semibold">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="space-y-6">
          <div className="border border-[#d8ddd2] bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Live Multi-Agent Run</h2>
                <p className="mt-1 text-sm text-[#60675d]">
                  Runs Scope, Collection, Analysis, Writing, and QA as separate
                  MiniMax calls. The Collection step uses seeded public evidence in
                  this Vercel demo.
                </p>
              </div>
              <span className="border border-[#c8d1bf] px-3 py-1 text-xs font-medium text-[#52623d]">
                {activeAgent || (modelCalls > 0 ? `${modelCalls} model calls` : "Ready")}
              </span>
            </div>

            <textarea
              value={request}
              onChange={(event) => setRequest(event.target.value)}
              className="min-h-32 w-full resize-none border border-[#cfd6c8] bg-[#fbfcf8] p-3 text-sm leading-6 outline-none focus:border-[#667a47]"
            />

            <button
              type="button"
              onClick={runAnalysis}
              disabled={isLoading}
              className="mt-4 w-full bg-[#1f2a1d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#33422d] disabled:cursor-not-allowed disabled:bg-[#8e9588]"
            >
              {isLoading ? "Running multi-agent pipeline..." : "Run Multi-Agent Analysis"}
            </button>

            <div className="mt-4 border border-[#d8ddd2] bg-[#f6f7f4] p-4 text-sm leading-6 text-[#3f453c]">
              {error ? (
                <span className="text-[#9f2d20]">{error}</span>
              ) : (
                <span className="whitespace-pre-wrap">
                  {report || (isLoading ? "Waiting for Writing Agent output..." : "")}
                </span>
              )}
            </div>

            {qaReview ? (
              <div className="mt-4 border border-[#d8ddd2] bg-white p-4">
                <h3 className="text-sm font-semibold">QA Agent Review</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#4d5449]">
                  {qaReview}
                </p>
              </div>
            ) : null}

            <div className="mt-4 border border-[#d8ddd2] bg-[#fbfcf8] p-3 text-xs leading-5 text-[#60675d]">
              Runtime: {runMode}
              {activeAgent ? (
                <span className="mt-1 block text-[#52623d]">Active call: {activeAgent}</span>
              ) : null}
              {backendWarning ? (
                <span className="mt-1 block text-[#9f6b20]">
                  Python backend fallback: {backendWarning}
                </span>
              ) : null}
            </div>
          </div>

          <div className="border border-[#d8ddd2] bg-white p-5">
            <h2 className="text-lg font-semibold">Live Trace</h2>
            <p className="mt-1 text-sm text-[#60675d]">
              This trace is returned by the live API route, not the static artifact replay.
            </p>
            <div className="mt-4 space-y-3">
              {(liveTrace.length > 0 ? liveTrace : demoTraceEvents).map((event, index) => (
                <div
                  key={`${event.agent}-${index}`}
                  className="border border-[#e2e6dd] bg-[#fbfcf8] p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-[#171814]">
                      {index + 1}. {event.agent}
                    </span>
                    <span className="text-xs font-medium uppercase text-[#667a47]">
                      {"modelCall" in event
                        ? `call ${event.modelCall} · ${event.durationMs}ms`
                        : event.stage}
                    </span>
                  </div>
                  <p className="mt-2 leading-6 text-[#4d5449]">{event.decision}</p>
                  <p className="mt-1 text-[#667a47]">{event.output}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-[#d8ddd2] bg-white p-5">
            <h2 className="text-lg font-semibold">Agent DAG</h2>
            <div className="mt-4 space-y-3">
              {demoWorkflowSteps.map((step, index) => (
                <div key={step.name} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center bg-[#667a47] text-sm font-semibold text-white">
                      {index + 1}
                    </div>
                    {index < demoWorkflowSteps.length - 1 ? (
                      <div className="h-full w-px bg-[#cfd6c8]" />
                    ) : null}
                  </div>
                  <div className="flex-1 border border-[#e2e6dd] bg-[#fbfcf8] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold">{step.name}</h3>
                      <span className="text-xs font-medium uppercase text-[#667a47]">
                        {step.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-[#60675d]">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[#d8ddd2] bg-white p-5">
            <h2 className="text-lg font-semibold">Original Runtime Layer</h2>
            <div className="mt-4 space-y-3">
              {demoOriginalRuntime.map((item) => (
                <div key={item.label} className="border border-[#e2e6dd] bg-[#fbfcf8] p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-[#171814]">{item.label}</span>
                    <span className="text-[#667a47]">{item.value}</span>
                  </div>
                  <p className="mt-1 leading-6 text-[#60675d]">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
        <div className="border border-[#d8ddd2] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#667a47]">
                Agent collaboration system
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Digital Research Team</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-[#60675d]">
                The original project has a main Deep Agent and research-agent layer,
                while V2 adds typed DAG nodes for scope, collection, analysis,
                writing, QA, and revision.
              </p>
            </div>
            <div className="border border-[#c8d1bf] px-3 py-2 text-sm font-medium text-[#52623d]">
              Main Agent + Sub-Agent + V2 DAG
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {demoAgentTeam.map((agent) => (
              <div key={agent.name} className="border border-[#e2e6dd] bg-[#fbfcf8] p-4">
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-[#667a47]">
                  {agent.layer}
                </div>
                <h3 className="mt-2 font-semibold text-[#171814]">{agent.name}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4d5449]">{agent.responsibility}</p>
                <p className="mt-3 border-t border-[#e2e6dd] pt-3 text-xs text-[#60675d]">
                  output: {agent.output}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="border border-[#d8ddd2] bg-white p-5">
          <h2 className="text-lg font-semibold">Schema Flow</h2>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {demoSchemaFlow.map((schema, index) => (
              <div key={schema} className="flex items-center gap-2">
                <span className="border border-[#c8d1bf] bg-[#fbfcf8] px-3 py-2 text-sm font-medium text-[#394235]">
                  {schema}
                </span>
                {index < demoSchemaFlow.length - 1 ? (
                  <span className="text-[#8a947f]">-&gt;</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="border border-[#d8ddd2] bg-white p-5">
          <h2 className="text-lg font-semibold">Review Principles</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {demoCollaborationPrinciples.map((item) => (
              <div key={item.title} className="border border-[#e2e6dd] bg-[#fbfcf8] p-3">
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-[#60675d]">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-10 lg:px-8">
        <div className="border border-[#d8ddd2] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Original Artifact Replay</h2>
              <p className="mt-1 text-sm text-[#60675d]">
                This section replays real files generated by the previous project.
              </p>
            </div>
            <span className="border border-[#c8d1bf] px-3 py-1 text-xs font-medium text-[#52623d]">
              Evidence-backed
            </span>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {demoFindings.map((section) => (
              <div key={section.category} className="border border-[#e2e6dd] bg-[#fbfcf8] p-4">
                <h3 className="font-semibold">{section.category}</h3>
                <ul className="mt-3 space-y-3 text-sm leading-6 text-[#4d5449]">
                  {section.items.map((item) => (
                    <li key={item.evidence} className="border-l-2 border-[#9aaa81] pl-3">
                      <span className="font-medium text-[#171814]">{item.company}: </span>
                      {item.text}
                      <span className="mt-1 block text-xs text-[#667a47]">
                        evidence: {item.evidence}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="border border-[#e2e6dd] bg-[#fbfcf8] p-4">
              <h3 className="font-semibold">Evidence Table</h3>
              <div className="mt-3 space-y-3 text-sm">
                {demoEvidenceRows.map((row) => (
                  <div key={row.id} className="border-l-2 border-[#9aaa81] pl-3">
                    <div className="font-medium text-[#171814]">
                      {row.id} / {row.company} / {row.topic}
                    </div>
                    <p className="mt-1 leading-6 text-[#4d5449]">{row.excerpt}</p>
                    <a
                      href={row.source}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-xs text-[#52623d] underline underline-offset-4"
                    >
                      {row.source}
                    </a>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-[#e2e6dd] bg-[#fbfcf8] p-4">
              <h3 className="font-semibold">Source Quality</h3>
              <div className="mt-3 space-y-3 text-sm">
                {demoSourceRows.map((row) => (
                  <div key={row.id} className="border-l-2 border-[#9aaa81] pl-3">
                    <div className="font-medium text-[#171814]">{row.title}</div>
                    <p className="mt-1 text-[#4d5449]">
                      {row.type} / credibility {row.credibility}
                    </p>
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-xs text-[#52623d] underline underline-offset-4"
                    >
                      {row.url}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {demoArtifactLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="border border-[#c8d1bf] px-3 py-2 text-sm font-medium text-[#52623d] transition hover:bg-[#f0f3ea]"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
