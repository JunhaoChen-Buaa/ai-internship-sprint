"use client";

import { useState } from "react";

import {
  demoArtifactLinks,
  demoEvidenceRows,
  demoFindings,
  demoMetrics,
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
                这个 Day 0 壳子复用了你已有的 deep-competitive-analyst 项目思路：
                用 Scope、Collection、Analysis、Writing、QA 多 Agent 流程生成可追踪的竞品分析报告。
                今天先完成前端壳子，Day 1 再接入真实大模型 API。
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

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="space-y-6">
          <div className="border border-[#d8ddd2] bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">分析请求</h2>
                <p className="mt-1 text-sm text-[#60675d]">
                  Day 0 使用假回复验证交互。Day 1 替换为真实 LLM API。
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
                "MiniMax API 已准备，等待 Day 1 接入",
                "下一步：创建 .env.local、写 README、push GitHub、部署 Vercel",
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
