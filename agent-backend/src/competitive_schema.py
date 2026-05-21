from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field


SourceType = Literal[
    "official",
    "press",
    "analyst",
    "review",
    "social",
    "database",
    "unknown",
]

ClaimCategory = Literal[
    "company_fundamentals",
    "product",
    "pricing",
    "market_presence",
    "customer_sentiment",
    "strength",
    "weakness",
    "opportunity",
    "threat",
    "recommendation",
]

AgentStage = Literal[
    "scope",
    "collection",
    "analysis",
    "writing",
    "qa",
    "revision",
]


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class SourceRecord(BaseModel):
    id: str = Field(default_factory=lambda: new_id("src"))
    url: str
    title: str | None = None
    publisher: str | None = None
    source_type: SourceType = "unknown"
    search_query: str | None = None
    rank: int | None = None
    credibility_score: float = 0.0
    credibility_label: Literal["high", "medium", "low", "unknown"] = "unknown"
    retrieved_at: datetime = Field(default_factory=utc_now)
    reliability_note: str | None = None


class EvidenceRecord(BaseModel):
    id: str = Field(default_factory=lambda: new_id("ev"))
    source_id: str
    company: str | None = None
    topic: str
    excerpt: str
    source_url: str | None = None
    relevance_note: str | None = None
    captured_at: datetime = Field(default_factory=utc_now)


class ClaimRecord(BaseModel):
    id: str = Field(default_factory=lambda: new_id("claim"))
    text: str
    company: str | None = None
    category: ClaimCategory
    evidence_ids: list[str] = Field(default_factory=list)
    confidence: Literal["low", "medium", "high"] = "medium"
    reasoning_summary: str | None = None
    source_agent: str = "analysis-agent"


class ClaimDraft(BaseModel):
    text: str
    company: str | None = None
    category: ClaimCategory
    evidence_ids: list[str] = Field(default_factory=list)
    confidence: Literal["low", "medium", "high"] = "medium"
    reasoning_summary: str | None = None


class ClaimGenerationResult(BaseModel):
    claims: list[ClaimDraft] = Field(default_factory=list)
    skipped_evidence_ids: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


class CompanyFactSheet(BaseModel):
    company: str
    website: str | None = None
    founded: str | None = None
    headquarters: str | None = None
    company_size: str | None = None
    positioning: str | None = None
    target_market: str | None = None
    products: list[str] = Field(default_factory=list)
    pricing_notes: list[str] = Field(default_factory=list)
    notable_customers: list[str] = Field(default_factory=list)
    recent_developments: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)


class ResearchPlan(BaseModel):
    id: str = Field(default_factory=lambda: new_id("plan"))
    request: str
    companies: list[str] = Field(default_factory=list)
    focus_areas: list[str] = Field(default_factory=list)
    audience: str | None = None
    region: str | None = None
    depth: Literal["light", "standard", "deep"] = "standard"
    open_questions: list[str] = Field(default_factory=list)


class CompetitorKnowledgeBase(BaseModel):
    id: str = Field(default_factory=lambda: new_id("kb"))
    plan_id: str | None = None
    companies: list[CompanyFactSheet] = Field(default_factory=list)
    sources: list[SourceRecord] = Field(default_factory=list)
    evidence: list[EvidenceRecord] = Field(default_factory=list)
    claims: list[ClaimRecord] = Field(default_factory=list)


class ReportDraft(BaseModel):
    id: str = Field(default_factory=lambda: new_id("report"))
    title: str
    markdown: str
    claim_ids: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=utc_now)
    revision: int = 0


class QAFinding(BaseModel):
    id: str = Field(default_factory=lambda: new_id("qa"))
    severity: Literal["low", "medium", "high"]
    category: Literal[
        "missing_evidence",
        "citation_gap",
        "source_quality",
        "recency",
        "balance",
        "format",
        "scope",
    ]
    message: str
    related_claim_ids: list[str] = Field(default_factory=list)


class QualityReview(BaseModel):
    id: str = Field(default_factory=lambda: new_id("review"))
    passed: bool = False
    citation_coverage: float = 0.0
    balance_score: float = 0.0
    findings: list[QAFinding] = Field(default_factory=list)
    reviewed_at: datetime = Field(default_factory=utc_now)


class AgentArtifact(BaseModel):
    id: str = Field(default_factory=lambda: new_id("artifact"))
    agent_name: str
    artifact_type: str
    summary: str
    payload: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utc_now)


class AgentTraceEvent(BaseModel):
    id: str = Field(default_factory=lambda: new_id("trace"))
    agent_name: str
    stage: AgentStage
    input_summary: str
    output_summary: str
    decision: str | None = None
    artifact_ids: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)
