export const demoMetrics = [
  ["Sources", "4"],
  ["Evidence", "4"],
  ["Claims", "4"],
  ["QA", "Passed"],
] as const;

export const demoWorkflowSteps = [
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
