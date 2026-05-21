export const demoMetrics = [
  ["Sources", "4"],
  ["Evidence", "4"],
  ["Claims", "4"],
  ["QA", "Passed"],
] as const;

export const demoWorkflowSteps = [
  {
    name: "Main Deep Agent",
    status: "orchestrator",
    description:
      "Plans the competitive-analysis task, delegates focused research through the task tool, and synthesizes final deliverables.",
  },
  {
    name: "Research Sub-Agent",
    status: "sub-agent",
    description:
      "Runs isolated deep-dive research jobs with internet_search, tool-call limits, and context summarization middleware.",
  },
  {
    name: "Scope Agent",
    status: "done",
    description:
      "Extracted the compared companies, audience, focus areas, and open questions from the request.",
  },
  {
    name: "Collection Agent",
    status: "done",
    description:
      "Loaded seeded public sources and converted them into SourceRecord and EvidenceRecord objects.",
  },
  {
    name: "Analysis Agent",
    status: "done",
    description:
      "Generated evidence-backed ClaimRecord objects. Every claim is tied to evidence_ids.",
  },
  {
    name: "Writing Agent",
    status: "done",
    description:
      "Produced a Markdown report with findings, company fact sheets, evidence table, and source inventory.",
  },
  {
    name: "QA Agent",
    status: "done",
    description:
      "Checked citation coverage, source quality, balance, and report format. The seeded demo passed QA.",
  },
  {
    name: "Revision Agent",
    status: "conditional",
    description:
      "Runs only if QA fails. It revises the report from QA findings without inventing missing evidence.",
  },
] as const;

export const demoAgentTeam = [
  {
    name: "Main Deep Agent",
    layer: "Original deepagents layer",
    responsibility:
      "Acts as project manager and senior analyst: decomposes the task, maintains todos, delegates research, and writes final files.",
    output: "Company profiles and competitive analysis report",
  },
  {
    name: "research-agent",
    layer: "Original deepagents layer",
    responsibility:
      "Receives focused research tasks through the task tool, calls internet_search, and returns cited factual findings.",
    output: "Topic-level research result with source URLs",
  },
  {
    name: "Scope Agent",
    layer: "V2 typed DAG layer",
    responsibility:
      "Extracts companies, audience, focus areas, depth, and open questions from the user request.",
    output: "ResearchPlan",
  },
  {
    name: "Collection Agent",
    layer: "V2 typed DAG layer",
    responsibility:
      "Loads seeded records or live search results and converts them into source and evidence records.",
    output: "CompetitorKnowledgeBase",
  },
  {
    name: "Analysis Agent",
    layer: "V2 typed DAG layer",
    responsibility:
      "Generates claims only when evidence_ids are available, preserving the no-evidence-no-claim rule.",
    output: "ClaimRecord[]",
  },
  {
    name: "Writing Agent",
    layer: "V2 typed DAG layer",
    responsibility:
      "Turns structured claims into a report with findings, fact sheets, evidence table, and source inventory.",
    output: "ReportDraft",
  },
  {
    name: "QA Agent",
    layer: "V2 typed DAG layer",
    responsibility:
      "Checks citation coverage, source quality, evidence balance, and required report sections.",
    output: "QualityReview",
  },
  {
    name: "Revision Agent",
    layer: "V2 typed DAG layer",
    responsibility:
      "Handles QA failure loops and records transparent revision notes instead of fabricating evidence.",
    output: "Revised ReportDraft",
  },
] as const;

export const demoSchemaFlow = [
  "ResearchPlan",
  "SourceRecord",
  "EvidenceRecord",
  "ClaimRecord",
  "ReportDraft",
  "QualityReview",
  "AgentTraceEvent",
] as const;

export const demoCollaborationPrinciples = [
  {
    title: "DAG task flow",
    text:
      "The workflow is not a loose chat. Nodes run in order, and QA conditionally routes failed reports to Revision.",
  },
  {
    title: "Evidence chain",
    text:
      "Every business claim is linked to evidence_ids, and evidence links back to source URLs.",
  },
  {
    title: "Observable artifacts",
    text:
      "Each node emits trace events and artifacts, so the intermediate decisions are inspectable.",
  },
  {
    title: "Cross-review loop",
    text:
      "QA can block weak reports. Revision can only annotate or revise from findings; it cannot invent missing sources.",
  },
] as const;

export const demoOriginalRuntime = [
  {
    label: "Main Agent",
    value: "create_deep_agent",
    note: "Planning, delegation, synthesis, and final file writing.",
  },
  {
    label: "Sub-Agent",
    value: "research-agent",
    note: "CompiledSubAgent invoked through the task tool for focused research.",
  },
  {
    label: "Tool",
    value: "internet_search",
    note: "Perplexity-backed public information search with rate limiting.",
  },
  {
    label: "Middleware",
    value: "Summarization + ToolCallLimit",
    note: "Controls long context growth and caps search-heavy runs.",
  },
] as const;

export const demoTraceEvents = [
  {
    id: "trace_d1c8c04675d9",
    agent: "scope-agent",
    stage: "scope",
    input:
      "Create a competitive analysis comparing Linear and Asana for product development teams.",
    output: "Research plan created for companies: ['Linear', 'Asana']",
    decision:
      "Proceed with transparent placeholder workflow; ask clarifying questions if companies are missing.",
    warnings: [] as string[],
  },
  {
    id: "trace_82af2b9195a2",
    agent: "collection-agent",
    stage: "collection",
    input: "Plan plan_be455f9bfa6e with companies: ['Linear', 'Asana']",
    output: "Knowledge base initialized with 4 sources and 4 evidence records.",
    decision: "Use live or seeded evidence only; do not invent sources.",
    warnings: ["Loaded 4 seeded source/evidence records."],
  },
  {
    id: "trace_23044b25404b",
    agent: "analysis-agent",
    stage: "analysis",
    input: "Knowledge base kb_aeb7c4caf7dc with 4 evidence records.",
    output: "4 claims available after analysis.",
    decision:
      "Claims require evidence_ids; optional LLM analysis falls back to deterministic evidence summaries.",
    warnings: ["LLM analysis was requested, but OPENAI_API_KEY is missing or placeholder."],
  },
  {
    id: "trace_7343e30e3782",
    agent: "writing-agent",
    stage: "writing",
    input: "Writing from 4 claims.",
    output: "Report draft report_444b04bb81cc created.",
    decision: "Unsupported claims are excluded from the report.",
    warnings: [] as string[],
  },
  {
    id: "trace_ab0149ccd424",
    agent: "qa-agent",
    stage: "qa",
    input: "Reviewing report report_444b04bb81cc.",
    output: "QA passed=True, citation_coverage=1.00.",
    decision:
      "Route to revision if high-severity findings exist and revision budget remains.",
    warnings: [] as string[],
  },
] as const;

export const demoFindings = [
  {
    category: "Product",
    items: [
      {
        company: "Linear",
        text:
          "Linear describes its product as purpose-built for planning and building software, with issue tracking, projects, roadmaps, cycles, and integrations for product development teams.",
        evidence: "ev_e5d173c077a5",
      },
      {
        company: "Asana",
        text:
          "Asana positions its work management platform around projects, tasks, goals, portfolios, workflow automation, reporting, and cross-functional team coordination.",
        evidence: "ev_9cf43b1bb503",
      },
    ],
  },
  {
    category: "Pricing",
    items: [
      {
        company: "Linear",
        text:
          "Linear publishes self-serve pricing tiers for teams, including paid plans with additional workspace, collaboration, and administrative capabilities.",
        evidence: "ev_b4d503c9b4c2",
      },
      {
        company: "Asana",
        text:
          "Asana publishes pricing tiers for individuals, teams, and enterprises, with higher tiers adding advanced reporting, portfolios, goals, workload, and administrative controls.",
        evidence: "ev_a5ad8dbfe1d1",
      },
    ],
  },
] as const;

export const demoEvidenceRows = [
  {
    id: "ev_e5d173c077a5",
    company: "Linear",
    topic: "product",
    excerpt:
      "Linear describes its product as purpose-built for planning and building software, with issue tracking, projects, roadmaps, cycles, and integrations...",
    source: "https://linear.app/features",
  },
  {
    id: "ev_b4d503c9b4c2",
    company: "Linear",
    topic: "pricing",
    excerpt:
      "Linear publishes self-serve pricing tiers for teams, including paid plans with additional workspace, collaboration, and administrative capabilities...",
    source: "https://linear.app/pricing",
  },
  {
    id: "ev_9cf43b1bb503",
    company: "Asana",
    topic: "product",
    excerpt:
      "Asana positions its work management platform around projects, tasks, goals, portfolios, workflow automation, reporting, and cross-functional coordination...",
    source: "https://asana.com/product",
  },
  {
    id: "ev_a5ad8dbfe1d1",
    company: "Asana",
    topic: "pricing",
    excerpt:
      "Asana publishes pricing tiers for individuals, teams, and enterprises, with higher tiers adding advanced reporting, portfolios, goals, workload...",
    source: "https://asana.com/pricing",
  },
] as const;

export const demoSourceRows = [
  {
    id: "src_1e3d35172c53",
    title: "Linear Features",
    type: "official",
    credibility: "high / 0.90",
    url: "https://linear.app/features",
  },
  {
    id: "src_a182ffebe3e5",
    title: "Linear Pricing",
    type: "official",
    credibility: "high / 0.90",
    url: "https://linear.app/pricing",
  },
  {
    id: "src_08d80d5a2d38",
    title: "Asana Product",
    type: "official",
    credibility: "high / 0.90",
    url: "https://asana.com/product",
  },
  {
    id: "src_0125482f2660",
    title: "Asana Pricing",
    type: "official",
    credibility: "high / 0.90",
    url: "https://asana.com/pricing",
  },
] as const;

export const demoArtifactLinks = [
  {
    label: "Raw report.md",
    href: "/demo/competitive-analysis-v2/report.md",
  },
  {
    label: "Raw trace.json",
    href: "/demo/competitive-analysis-v2/trace.json",
  },
  {
    label: "Raw artifacts.json",
    href: "/demo/competitive-analysis-v2/artifacts.json",
  },
] as const;
