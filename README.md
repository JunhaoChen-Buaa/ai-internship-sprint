# AI Internship Sprint

这是我的 AI 应用开发 20 天冲刺项目仓库。

Day 0 的目标是打通基础工程链路：

```text
本地开发 -> Next.js 页面 -> API Route -> MiniMax API -> GitHub -> Vercel 部署
```

当前页面是一个 AI 竞品分析 Agent 工作台，复用了已有项目 `D:\deep-competitive-analyst` 的产品思路：

```text
Scope Agent -> Collection Agent -> Analysis Agent -> Writing Agent -> QA Agent
```

当前已经完成基础真实 API 闭环：

```text
前端输入 -> /api/chat -> MiniMax OpenAI-compatible API -> 前端展示
```

同时，项目已接入旧项目 `D:\deep-competitive-analyst` 的真实 demo 输出：

```text
public/demo/competitive-analysis-v2/report.md
public/demo/competitive-analysis-v2/trace.json
public/demo/competitive-analysis-v2/artifacts.json
```

页面中的 Trace、Evidence Table、Source Quality、Report Preview 来自这组真实输出，不再只是手写展示文案。

## Agent 协作结构

原项目包含两层 Agent 设计：

```text
Original deepagents layer:
Main Deep Agent -> task tool -> research-agent -> internet_search -> Perplexity

V2 typed DAG layer:
Scope Agent -> Collection Agent -> Analysis Agent -> Writing Agent -> QA Agent
QA Agent -> Revision Agent -> QA Agent，只有 QA 失败时进入修订闭环
```

当前前端页面已经把这两层都展示出来：

- 主 Deep Agent 和 research-agent 的调度关系。
- V2 中 6 个专职 Agent 节点。
- ResearchPlan、SourceRecord、EvidenceRecord、ClaimRecord、ReportDraft、QualityReview、AgentTraceEvent 等 Schema 流转。
- Evidence chain、QA feedback loop、trace 和 artifacts。

## 当前进度

- Day 0 上午：Node.js、npm、pnpm、VS Code、GitHub 仓库、Next.js 项目已准备。
- Day 0 下午：已将默认 Next.js 页面替换为 AI Agent 应用壳子。
- Day 0 下午：已新增 `/api/chat`，通过服务端调用 MiniMax API。
- Day 0 下午：已接入旧项目真实输出文件，展示 evidence-backed report 和 trace。
- 当前运行方式：本地 Next.js。
- 下一步：填入真实 MiniMax API Key，验证本地真实调用，部署 Vercel。

## 技术栈

- Next.js
- TypeScript
- Tailwind CSS
- pnpm
- MiniMax API
- LangChain / LangGraph，后续项目阶段接入

## 本地运行

```bash
pnpm install
pnpm dev
```

打开：

```text
http://localhost:3000
```

## 环境变量

复制 `.env.example` 为 `.env.local`：

```text
LLM_PROVIDER=minimax
LLM_BASE_URL=https://api.minimax.io/v1
LLM_API_KEY=replace_me
LLM_MODEL=MiniMax-M2.7
```

注意：

- `.env.local` 不要提交到 GitHub。
- 真实 API Key 只放在本地或 Vercel Environment Variables。
- 修改 `.env.local` 后需要重启 `pnpm dev`。

## 旧项目复用判断

`D:\deep-competitive-analyst` 可以作为后续 Agent 项目的核心素材。

可复用内容：

- LangGraph DAG 工作流。
- 多 Agent 分工：Scope、Collection、Analysis、Writing、QA、Revision。
- SourceRecord、EvidenceRecord、ClaimRecord、QualityReview 等结构化 schema。
- trace.json、artifacts.json、report.md 等可观测性输出。
- “No evidence, no claim”的安全原则。

Day 0 暂不直接迁移 Python 后端。当前策略是先用 Next.js 做 Web UI 壳子和真实 MiniMax 调用，后续再决定是：

1. 把 Python LangGraph 后端做成 API 服务。
2. 用 TypeScript / LangGraph JS 重写核心流程。
3. 先用静态 seed data 做可展示 Demo。

## GitHub

目标仓库：

```text
https://github.com/JunhaoChen-Buaa/ai-internship-sprint.git
```

## Day 0 验收

- [x] Next.js 项目可运行。
- [x] 首页已替换为 AI 应用壳子。
- [x] `.env.example` 已创建。
- [x] `/api/chat` 已接入 MiniMax OpenAI-compatible API。
- [x] 旧项目真实输出已整理到 `public/demo/competitive-analysis-v2/`。
- [ ] `.env.local` 填入真实 MiniMax API Key。
- [x] Git 初始化并 push 到 GitHub。
- [ ] 本地真实 API 调用验证通过。
- [ ] 部署到 Vercel。
- [ ] 创建双线投递记录表。
