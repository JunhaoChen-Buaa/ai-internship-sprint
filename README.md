# AI Internship Sprint

这是我的 AI 应用开发 20 天冲刺项目仓库。

Day 0 的目标是先打通基础工程链路：

```text
本地开发 -> Next.js 页面 -> 环境变量 -> GitHub -> Vercel 部署
```

当前页面是一个 AI 竞品分析 Agent 工作台壳子，复用了已有项目 `D:\deep-competitive-analyst` 的产品思路：

```text
Scope Agent -> Collection Agent -> Analysis Agent -> Writing Agent -> QA Agent
```

今天先做前端壳子和交互预览。Day 1 开始接入真实 MiniMax API。

## 当前进度

- Day 0 上午：Node.js、npm、pnpm、VS Code、GitHub 仓库、Next.js 项目已准备。
- Day 0 下午：已将默认 Next.js 页面替换为 AI Agent 应用壳子。
- 当前运行方式：本地 Next.js。
- 下一步：填入 MiniMax API Key、提交 GitHub、部署 Vercel。

## 技术栈

- Next.js
- TypeScript
- Tailwind CSS
- pnpm
- MiniMax API，Day 1 接入
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

## 旧项目复用判断

`D:\deep-competitive-analyst` 可以作为后续 Agent 项目的核心素材。

可复用内容：

- LangGraph DAG 工作流。
- 多 Agent 分工：Scope、Collection、Analysis、Writing、QA、Revision。
- SourceRecord、EvidenceRecord、ClaimRecord、QualityReview 等结构化 schema。
- trace.json、artifacts.json、report.md 等可观测性输出。
- “No evidence, no claim”的安全原则。

Day 0 暂不直接迁移 Python 后端。当前策略是先用 Next.js 做 Web UI 壳子，后续再决定是：

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
- [ ] `.env.local` 填入真实 MiniMax API Key。
- [ ] Git 初始化并 push 到 GitHub。
- [ ] 部署到 Vercel。
- [ ] 创建双线投递记录表。
