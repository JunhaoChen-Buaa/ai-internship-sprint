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

export default function Home() {
  const [request, setRequest] = useState(
    "Create a competitive analysis comparing Linear and Asana for product development teams.",
  );
  const [reply, setReply] = useState(
    "输入竞品分析需求后，点击按钮会调用本地 Next.js API，再由服务端请求 MiniMax。",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingEnabled, setStreamingEnabled] = useState(false);

  async function runAnalysis() {
    setIsLoading(true);
    setError(null);
    setReply("");

    try {
      if (streamingEnabled) {
        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: request }),
        });

        if (!response.ok || !response.body) {
          throw new Error(await response.text());
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          setReply((current) => current + decoder.decode(value, { stream: true }));
        }

        return;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: request }),
      });
      const data = (await response.json()) as { content?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "请求失败。");
      }

      setReply(data.content || "模型没有返回内容。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "未知错误。");
    } finally {
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
              <span>Day 0</span>
              <span>Next.js</span>
              <span>Agent Shell</span>
              <span>MiniMax ready</span>
            </div>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="space-y-5">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#667a47]">
                Multi-agent competitive intelligence
              </p>
              <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-[#171814] sm:text-5xl">
                AI 竞品分析 Agent 工作台
              </h1>
              <p className="max-w-3xl text-base leading-7 text-[#53594f]">
                这个 Day 0 应用复用了你已有的 deep-competitive-analyst 项目思路：
                用主 Agent、research-agent、Scope、Collection、Analysis、Writing、QA、Revision
                组成可观测的竞品分析协作系统，并已接入 MiniMax 真实 API。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {demoMetrics.map(([label, value]) => (
                <div
                  key={label}
                  className="border border-[#d8ddd2] bg-[#fbfcf8] p-4"
                >
                  <div className="text-sm text-[#687064]">{label}</div>
                  <div className="mt-2 text-2xl font-semibold">{value}</div>
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
              <h2 className="mt-2 text-2xl font-semibold">数字调研小组架构</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-[#60675d]">
                旧项目不是单 Agent 问答。它包含原始 deepagents 层的主 Agent + research-agent，
                也包含 V2 的 Scope、Collection、Analysis、Writing、QA、Revision 专职节点。
                下面这些卡片把子 Agent、职责和产物明确展开。
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

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="space-y-6">
          <div className="border border-[#d8ddd2] bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">分析请求</h2>
                <p className="mt-1 text-sm text-[#60675d]">
                  这里会调用真实 MiniMax API；下方展示旧项目真实运行产物。
                </p>
              </div>
              <span className="border border-[#c8d1bf] px-3 py-1 text-xs font-medium text-[#52623d]">
                {streamingEnabled ? "Streaming" : "Live API"}
              </span>
            </div>

            <textarea
              value={request}
              onChange={(event) => setRequest(event.target.value)}
              className="min-h-32 w-full resize-none border border-[#cfd6c8] bg-[#fbfcf8] p-3 text-sm leading-6 outline-none focus:border-[#667a47]"
            />

            <label className="mt-4 flex items-center justify-between gap-4 border border-[#e2e6dd] bg-[#fbfcf8] p-3 text-sm text-[#3f453c]">
              <span>流式输出</span>
              <input
                type="checkbox"
                checked={streamingEnabled}
                onChange={(event) => setStreamingEnabled(event.target.checked)}
                className="h-4 w-4 accent-[#667a47]"
              />
            </label>

            <button
              type="button"
              onClick={runAnalysis}
              disabled={isLoading}
              className="mt-4 w-full bg-[#1f2a1d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#33422d] disabled:cursor-not-allowed disabled:bg-[#8e9588]"
            >
              {isLoading ? "正在调用 MiniMax..." : "运行真实 API 分析"}
            </button>

            <div className="mt-4 border border-[#d8ddd2] bg-[#f6f7f4] p-4 text-sm leading-6 text-[#3f453c]">
              {error ? (
                <span className="text-[#9f2d20]">{error}</span>
              ) : (
                <span className="whitespace-pre-wrap">{reply}</span>
              )}
            </div>
          </div>

          <div className="border border-[#d8ddd2] bg-white p-5">
            <h2 className="text-lg font-semibold">Day 0 状态</h2>
            <div className="mt-4 grid gap-3 text-sm">
              {[
                "Node.js / npm / pnpm 已可用",
                "Next.js 项目已创建并能本地运行",
                "MiniMax API 已接入，支持普通响应和流式输出",
                "旧项目真实 report / trace / artifacts 已接入页面展示",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 border border-[#e2e6dd] bg-[#fbfcf8] p-3"
                >
                  <span className="mt-1 h-2 w-2 bg-[#667a47]" />
                  <span>{item}</span>
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
            <h2 className="text-lg font-semibold">Trace Preview</h2>
            <div className="mt-4 overflow-hidden border border-[#e2e6dd]">
              {demoTraceEvents.map((event) => (
                <div
                  key={event.id}
                  className="grid gap-2 border-b border-[#e2e6dd] p-3 text-sm last:border-b-0 md:grid-cols-[0.35fr_1fr]"
                >
                  <span className="font-medium text-[#394235]">{event.agent}</span>
                  <div>
                    <p className="text-[#171814]">{event.decision}</p>
                    <p className="mt-1 text-[#667a47]">{event.output}</p>
                    {event.warnings.length > 0 ? (
                      <p className="mt-1 text-[#9f6b20]">{event.warnings.join(" ")}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="border border-[#d8ddd2] bg-white p-5">
          <h2 className="text-lg font-semibold">Original DeepAgents Runtime</h2>
          <p className="mt-2 text-sm leading-6 text-[#60675d]">
            这一层来自原始项目代码：`agent.py` 创建主 Deep Agent，`sub_agents.py`
            定义 research-agent，子 Agent 通过 task tool 被调度。
          </p>
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

        <div className="border border-[#d8ddd2] bg-white p-5">
          <h2 className="text-lg font-semibold">Schema 协作与审查闭环</h2>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {demoSchemaFlow.map((schema, index) => (
              <div key={schema} className="flex items-center gap-2">
                <span className="border border-[#c8d1bf] bg-[#fbfcf8] px-3 py-2 text-sm font-medium text-[#394235]">
                  {schema}
                </span>
                {index < demoSchemaFlow.length - 1 ? (
                  <span className="text-[#8a947f]">→</span>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
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
              <h2 className="text-lg font-semibold">Report Preview</h2>
              <p className="mt-1 text-sm text-[#60675d]">
                来源于旧项目的 seed evidence demo，下午先用于展示壳子。
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
                      {row.id} · {row.company} · {row.topic}
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
                      {row.type} · credibility {row.credibility}
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
