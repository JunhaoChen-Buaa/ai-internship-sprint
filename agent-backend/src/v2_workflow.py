from __future__ import annotations

import re
import os
from collections import Counter
from typing import Literal, TypedDict
from urllib.parse import urlparse

from langgraph.graph import END, START, StateGraph

from competitive_schema import (
    AgentArtifact,
    AgentTraceEvent,
    ClaimGenerationResult,
    ClaimRecord,
    CompanyFactSheet,
    CompetitorKnowledgeBase,
    QAFinding,
    QualityReview,
    ReportDraft,
    ResearchPlan,
    SourceRecord,
    EvidenceRecord,
)
from v2_cache import QueryCache


class CompetitiveAnalysisV2State(TypedDict, total=False):
    request: str
    live_collection: bool
    llm_analysis: bool
    query_cache: bool
    query_cache_dir: str
    max_search_queries: int
    seed_records: list[dict]
    research_plan: dict
    knowledge_base: dict
    report_draft: dict
    quality_review: dict
    revision_count: int
    artifacts: list[dict]
    trace: list[dict]


def _append_artifact(
    state: CompetitiveAnalysisV2State,
    *,
    agent_name: str,
    artifact_type: str,
    summary: str,
    payload: dict | None = None,
) -> tuple[CompetitiveAnalysisV2State, AgentArtifact]:
    artifact = AgentArtifact(
        agent_name=agent_name,
        artifact_type=artifact_type,
        summary=summary,
        payload=payload or {},
    )
    state["artifacts"] = [*state.get("artifacts", []), artifact.model_dump(mode="json")]
    return state, artifact


def _append_trace(
    state: CompetitiveAnalysisV2State,
    *,
    agent_name: str,
    stage: Literal["scope", "collection", "analysis", "writing", "qa", "revision"],
    input_summary: str,
    output_summary: str,
    decision: str | None = None,
    artifact_ids: list[str] | None = None,
    warnings: list[str] | None = None,
) -> CompetitiveAnalysisV2State:
    event = AgentTraceEvent(
        agent_name=agent_name,
        stage=stage,
        input_summary=input_summary,
        output_summary=output_summary,
        decision=decision,
        artifact_ids=artifact_ids or [],
        warnings=warnings or [],
    )
    state["trace"] = [*state.get("trace", []), event.model_dump(mode="json")]
    return state


def _guess_companies(request: str) -> list[str]:
    quoted = re.findall(r'"([^"]+)"|“([^”]+)”|`([^`]+)`', request)
    companies = [next(filter(None, match)) for match in quoted if any(match)]
    if companies:
        return companies[:4]

    compare_match = re.search(
        r"comparing\s+(.+?)\s+(?:and|vs\.?|versus)\s+(.+?)(?:\s+as|\s+for|\.|$)",
        request,
        flags=re.IGNORECASE,
    )
    if compare_match:
        return [compare_match.group(1).strip(), compare_match.group(2).strip()]

    cn_match = re.search(r"比较(.+?)(?:和|与|vs|VS)(.+?)(?:的|在|作为|$)", request)
    if cn_match:
        return [cn_match.group(1).strip(), cn_match.group(2).strip()]

    return []


def _has_real_perplexity_key() -> bool:
    key = os.getenv("PERPLEXITY_API_KEY", "").strip()
    if not key:
        return False
    return "placeholder" not in key.lower() and not key.startswith("<")


def _has_real_openai_key() -> bool:
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        return False
    return "placeholder" not in key.lower() and not key.startswith("<")


def _source_type_from_url(url: str) -> Literal[
    "official", "press", "analyst", "review", "social", "database", "unknown"
]:
    host = urlparse(url).netloc.lower()
    if not host:
        return "unknown"
    if any(domain in host for domain in ["g2.com", "capterra.com", "trustpilot.com"]):
        return "review"
    if any(domain in host for domain in ["linkedin.com", "x.com", "twitter.com", "reddit.com"]):
        return "social"
    if any(domain in host for domain in ["gartner.com", "forrester.com", "idc.com"]):
        return "analyst"
    if any(domain in host for domain in ["crunchbase.com", "pitchbook.com"]):
        return "database"
    if any(domain in host for domain in ["businesswire.com", "prnewswire.com", "techcrunch.com"]):
        return "press"
    return "unknown"


def _credibility_for_source(
    url: str,
    source_type: Literal["official", "press", "analyst", "review", "social", "database", "unknown"],
) -> tuple[float, Literal["high", "medium", "low", "unknown"], str]:
    host = urlparse(url).netloc.lower()
    if source_type == "official":
        return 0.9, "high", "Official company material or owned domain."
    if source_type == "analyst":
        return 0.82, "high", "Analyst or research source; usually reliable but may be gated or summarized."
    if source_type == "database":
        return 0.72, "medium", "Structured company database; useful but may need freshness checks."
    if source_type == "press":
        return 0.68, "medium", "News or press source; useful for recent developments, verify important claims."
    if source_type == "review":
        return 0.55, "medium", "Review source; useful for sentiment, may be biased or anecdotal."
    if source_type == "social":
        return 0.35, "low", "Social source; treat as anecdotal unless corroborated."
    if host.endswith(".edu") or host.endswith(".gov"):
        return 0.8, "high", "Institutional domain."
    return 0.45, "unknown", "Unclassified source; manual review recommended."


def _source_record(
    *,
    url: str,
    title: str | None = None,
    publisher: str | None = None,
    source_type: Literal["official", "press", "analyst", "review", "social", "database", "unknown"] | None = None,
    search_query: str | None = None,
    rank: int | None = None,
    reliability_note: str | None = None,
) -> SourceRecord:
    resolved_type = source_type or _source_type_from_url(url)
    score, label, note = _credibility_for_source(url, resolved_type)
    return SourceRecord(
        url=url,
        title=title,
        publisher=publisher,
        source_type=resolved_type,
        search_query=search_query,
        rank=rank,
        credibility_score=score,
        credibility_label=label,
        reliability_note=reliability_note or note,
    )


def _safe_get(obj: object, *names: str) -> object | None:
    for name in names:
        if isinstance(obj, dict) and name in obj:
            return obj[name]
        value = getattr(obj, name, None)
        if value is not None:
            return value
    return None


def _normalize_search_results(raw_results: object) -> list[dict]:
    if raw_results is None:
        return []
    if isinstance(raw_results, str):
        return []
    if isinstance(raw_results, dict):
        raw_results = raw_results.get("results", [])
    normalized = []
    for raw in raw_results if isinstance(raw_results, list) else []:
        url = _safe_get(raw, "url", "link", "source_url")
        if not url:
            continue
        title = _safe_get(raw, "title", "name")
        snippet = _safe_get(raw, "snippet", "summary", "description")
        content = _safe_get(raw, "content", "text", "page_content")
        normalized.append(
            {
                "url": str(url),
                "title": str(title) if title else None,
                "excerpt": str(content or snippet or title or url)[:1200],
            }
        )
    return normalized


def _query_plan(plan: ResearchPlan) -> list[tuple[str, str, str]]:
    topic_queries = [
        (
            "company_fundamentals",
            "{company} official website company overview founding headquarters employees target market",
        ),
        (
            "product",
            "{company} product features integrations positioning for product development teams",
        ),
        (
            "pricing",
            "{company} pricing tiers packages billing model current",
        ),
        (
            "market_presence",
            "{company} customers case studies partnerships recent product launches last 12 months",
        ),
        (
            "customer_sentiment",
            "{company} customer reviews praise complaints product management software",
        ),
    ]
    queries: list[tuple[str, str, str]] = []
    for company in plan.companies:
        for topic, template in topic_queries:
            queries.append((company, topic, template.format(company=company)))
    return queries


def _seed_records_to_knowledge_base(plan: ResearchPlan, kb: CompetitorKnowledgeBase, seed_records: list[dict]) -> None:
    for seed in seed_records:
        url = seed.get("url")
        excerpt = seed.get("excerpt") or seed.get("content") or seed.get("snippet")
        if not url or not excerpt:
            continue
        source = _source_record(
            url=url,
            title=seed.get("title"),
            publisher=seed.get("publisher"),
            source_type=seed.get("source_type") or _source_type_from_url(url),
            search_query=seed.get("search_query"),
            reliability_note=seed.get("reliability_note"),
        )
        evidence = EvidenceRecord(
            source_id=source.id,
            company=seed.get("company") or (plan.companies[0] if len(plan.companies) == 1 else None),
            topic=seed.get("topic", "seeded_evidence"),
            excerpt=str(excerpt)[:1200],
            source_url=source.url,
            relevance_note=seed.get("relevance_note", "Seeded evidence supplied to the workflow."),
        )
        kb.sources.append(source)
        kb.evidence.append(evidence)


def _deterministic_claims(kb: CompetitorKnowledgeBase) -> list[ClaimRecord]:
    category_by_topic = {
        "company_fundamentals": "company_fundamentals",
        "product": "product",
        "pricing": "pricing",
        "market_presence": "market_presence",
        "customer_sentiment": "customer_sentiment",
        "seeded_evidence": "product",
    }
    claims: list[ClaimRecord] = []
    seen_claim_keys: set[tuple[str | None, str, str]] = set()
    for evidence in kb.evidence:
        category = category_by_topic.get(evidence.topic, "product")
        excerpt_summary = " ".join(evidence.excerpt.split())[:220]
        text = f"{evidence.company or 'Market'} evidence for {evidence.topic}: {excerpt_summary}"
        key = (evidence.company, category, text)
        if key in seen_claim_keys:
            continue
        seen_claim_keys.add(key)
        claims.append(
            ClaimRecord(
                text=text,
                company=evidence.company,
                category=category,  # type: ignore[arg-type]
                evidence_ids=[evidence.id],
                confidence="medium",
                reasoning_summary="Deterministic fallback generated only from one available EvidenceRecord.",
                source_agent="analysis-agent:fallback",
            )
        )
    return claims


def _generate_claims_with_llm(plan: ResearchPlan, kb: CompetitorKnowledgeBase) -> ClaimGenerationResult:
    from langchain_openai import ChatOpenAI

    model = ChatOpenAI(
        model=os.getenv("DCA_V2_ANALYSIS_MODEL", "gpt-5-2025-08-07"),
        max_retries=2,
    )
    structured_model = model.with_structured_output(ClaimGenerationResult)
    evidence_payload = [
        {
            "id": evidence.id,
            "company": evidence.company,
            "topic": evidence.topic,
            "excerpt": evidence.excerpt[:800],
            "source_url": evidence.source_url,
        }
        for evidence in kb.evidence
    ]
    prompt = f"""You are the Analysis Agent in a competitive intelligence DAG.

User request:
{plan.request}

Companies:
{", ".join(plan.companies)}

Evidence records:
{evidence_payload}

Generate concise, business-useful ClaimDraft objects.

Rules:
- Every claim must include at least one evidence_id from the provided evidence records.
- Do not create claims from prior knowledge.
- Use categories from the schema only.
- Prefer comparative, decision-relevant wording, but do not overstate evidence.
- If evidence is insufficient, put the evidence id in skipped_evidence_ids or add a limitation.
"""
    return structured_model.invoke(prompt)


def _update_company_fact_sheets(kb: CompetitorKnowledgeBase) -> None:
    evidence_by_id = {evidence.id: evidence for evidence in kb.evidence}
    company_index = {company.company: company for company in kb.companies}
    for claim in kb.claims:
        if claim.company not in company_index:
            continue
        fact_sheet = company_index[claim.company]
        for evidence_id in claim.evidence_ids:
            if evidence_id not in fact_sheet.evidence_ids:
                fact_sheet.evidence_ids.append(evidence_id)
            evidence = evidence_by_id.get(evidence_id)
            if evidence is None:
                continue
            excerpt_summary = " ".join(evidence.excerpt.split())[:220]
            if claim.category == "product" and excerpt_summary not in fact_sheet.products:
                fact_sheet.products.append(excerpt_summary)
            elif claim.category == "pricing" and excerpt_summary not in fact_sheet.pricing_notes:
                fact_sheet.pricing_notes.append(excerpt_summary)
            elif claim.category == "market_presence" and excerpt_summary not in fact_sheet.recent_developments:
                fact_sheet.recent_developments.append(excerpt_summary)


def scope_agent(state: CompetitiveAnalysisV2State) -> CompetitiveAnalysisV2State:
    request = state.get("request", "").strip()
    companies = _guess_companies(request)
    open_questions: list[str] = []

    if len(companies) < 2:
        open_questions.append("请明确至少两个需要比较的公司或产品。")
    if not request:
        open_questions.append("请提供竞品分析需求。")

    plan = ResearchPlan(
        request=request,
        companies=companies,
        focus_areas=[
            "company_fundamentals",
            "product",
            "pricing",
            "market_presence",
            "customer_sentiment",
            "strategy",
        ],
        audience="product and business stakeholders",
        depth="standard",
        open_questions=open_questions,
    )
    state["research_plan"] = plan.model_dump(mode="json")
    state["revision_count"] = state.get("revision_count", 0)

    state, artifact = _append_artifact(
        state,
        agent_name="scope-agent",
        artifact_type="research_plan",
        summary=f"Identified {len(companies)} companies and {len(open_questions)} open questions.",
        payload=state["research_plan"],
    )
    return _append_trace(
        state,
        agent_name="scope-agent",
        stage="scope",
        input_summary=request[:240],
        output_summary=f"Research plan created for companies: {companies or 'unknown'}",
        decision="Proceed with transparent placeholder workflow; ask clarifying questions if companies are missing.",
        artifact_ids=[artifact.id],
        warnings=open_questions,
    )


def collection_agent(state: CompetitiveAnalysisV2State) -> CompetitiveAnalysisV2State:
    plan = ResearchPlan.model_validate(state["research_plan"])
    kb = CompetitorKnowledgeBase(
        plan_id=plan.id,
        companies=[CompanyFactSheet(company=company) for company in plan.companies],
    )

    warnings = []
    seed_records = state.get("seed_records", [])
    if seed_records:
        _seed_records_to_knowledge_base(plan, kb, seed_records)
        warnings.append(f"Loaded {len(seed_records)} seeded source/evidence records.")

    if not plan.companies:
        warnings.append("No companies were identified, so no source collection was attempted.")
    else:
        live_requested = bool(state.get("live_collection")) or os.getenv("DCA_V2_LIVE_COLLECTION", "").lower() in {
            "1",
            "true",
            "yes",
        }
        live_enabled = live_requested and _has_real_perplexity_key()
        if live_requested and not live_enabled:
            warnings.append("Live collection was requested, but PERPLEXITY_API_KEY is missing or placeholder.")

        if live_enabled:
            from tools import internet_search

            cache_enabled = state.get("query_cache", True)
            cache = QueryCache(state.get("query_cache_dir", "../.dca_cache/v2_queries")) if cache_enabled else None
            queries = _query_plan(plan)[: state.get("max_search_queries", 6)]
            cache_hits = 0
            cache_misses = 0
            for company, topic, query in queries:
                normalized_results = None
                if cache is not None:
                    cached = cache.get(query)
                    if cached is not None:
                        normalized_results = cached.get("results", [])
                        cache_hits += 1
                if normalized_results is None:
                    raw_results = internet_search(query)
                    if isinstance(raw_results, str):
                        warnings.append(f"Search returned no structured results for query: {query[:120]}")
                        continue
                    normalized_results = _normalize_search_results(raw_results)
                    if cache is not None:
                        cache.set(query, normalized_results)
                    cache_misses += 1
                for rank, item in enumerate(normalized_results, start=1):
                    source = _source_record(
                        url=item["url"],
                        title=item.get("title"),
                        source_type=_source_type_from_url(item["url"]),
                        search_query=query,
                        rank=rank,
                    )
                    evidence = EvidenceRecord(
                        source_id=source.id,
                        company=company,
                        topic=topic,
                        excerpt=item["excerpt"],
                        source_url=source.url,
                        relevance_note=f"Collected for query: {query}",
                    )
                    kb.sources.append(source)
                    kb.evidence.append(evidence)
            if cache is not None:
                warnings.append(f"Query cache stats: hits={cache_hits}, misses={cache_misses}.")
            if not kb.sources:
                warnings.append("Live collection completed but produced no usable SourceRecord objects.")
        elif not seed_records:
            warnings.append(
                "Collection ran in evidence-safe mode without live search or seed records. No sources were invented."
            )

    state["knowledge_base"] = kb.model_dump(mode="json")
    state, artifact = _append_artifact(
        state,
        agent_name="collection-agent",
        artifact_type="knowledge_base",
        summary=(
            f"Knowledge base has {len(kb.companies)} companies, "
            f"{len(kb.sources)} sources, and {len(kb.evidence)} evidence records."
        ),
        payload=state["knowledge_base"],
    )
    return _append_trace(
        state,
        agent_name="collection-agent",
        stage="collection",
        input_summary=f"Plan {plan.id} with companies: {plan.companies}",
        output_summary=(
            f"Knowledge base initialized with {len(kb.sources)} sources "
            f"and {len(kb.evidence)} evidence records."
        ),
        decision="Use live or seeded evidence only; do not invent sources.",
        artifact_ids=[artifact.id],
        warnings=warnings,
    )


def analysis_agent(state: CompetitiveAnalysisV2State) -> CompetitiveAnalysisV2State:
    plan = ResearchPlan.model_validate(state["research_plan"])
    kb = CompetitorKnowledgeBase.model_validate(state["knowledge_base"])
    warnings = []

    if not kb.evidence:
        warnings.append("No evidence records available; analysis claims were not generated.")
    else:
        use_llm = bool(state.get("llm_analysis")) or os.getenv("DCA_V2_LLM_ANALYSIS", "").lower() in {
            "1",
            "true",
            "yes",
        }
        llm_used = False
        if use_llm and not _has_real_openai_key():
            warnings.append("LLM analysis was requested, but OPENAI_API_KEY is missing or placeholder.")
        elif use_llm:
            try:
                generated = _generate_claims_with_llm(plan, kb)
                valid_evidence_ids = {evidence.id for evidence in kb.evidence}
                for draft in generated.claims:
                    evidence_ids = [evidence_id for evidence_id in draft.evidence_ids if evidence_id in valid_evidence_ids]
                    if not evidence_ids:
                        warnings.append(f"Skipped LLM claim without valid evidence: {draft.text[:120]}")
                        continue
                    kb.claims.append(
                        ClaimRecord(
                            text=draft.text,
                            company=draft.company,
                            category=draft.category,
                            evidence_ids=evidence_ids,
                            confidence=draft.confidence,
                            reasoning_summary=draft.reasoning_summary,
                            source_agent="analysis-agent:llm",
                        )
                    )
                warnings.extend(generated.limitations)
                if generated.skipped_evidence_ids:
                    warnings.append(f"LLM skipped evidence ids: {generated.skipped_evidence_ids}")
                llm_used = bool(kb.claims)
            except Exception as exc:
                warnings.append(f"LLM analysis failed; falling back to deterministic claims: {exc}")

        if not llm_used:
            kb.claims.extend(_deterministic_claims(kb))

        _update_company_fact_sheets(kb)

    state["knowledge_base"] = kb.model_dump(mode="json")
    state, artifact = _append_artifact(
        state,
        agent_name="analysis-agent",
        artifact_type="claims",
        summary=f"Generated {len(kb.claims)} evidence-backed claims.",
        payload={"claims": [claim.model_dump(mode="json") for claim in kb.claims]},
    )
    return _append_trace(
        state,
        agent_name="analysis-agent",
        stage="analysis",
        input_summary=f"Knowledge base {kb.id} with {len(kb.evidence)} evidence records.",
        output_summary=f"{len(kb.claims)} claims available after analysis.",
        decision="Claims require evidence_ids; optional LLM analysis falls back to deterministic evidence summaries.",
        artifact_ids=[artifact.id],
        warnings=warnings,
    )


def writing_agent(state: CompetitiveAnalysisV2State) -> CompetitiveAnalysisV2State:
    plan = ResearchPlan.model_validate(state["research_plan"])
    kb = CompetitorKnowledgeBase.model_validate(state["knowledge_base"])

    title_companies = " vs ".join(plan.companies) if plan.companies else "Unscoped Competitors"
    source_by_id = {source.id: source for source in kb.sources}
    if kb.claims:
        claims_by_category: dict[str, list[ClaimRecord]] = {}
        for claim in kb.claims:
            claims_by_category.setdefault(claim.category, []).append(claim)
        sections = []
        for category, claims in claims_by_category.items():
            claim_lines_for_category = "\n".join(
                f"- {claim.text} (confidence: {claim.confidence}; evidence: {', '.join(claim.evidence_ids)})"
                for claim in claims
            )
            sections.append(f"### {category.replace('_', ' ').title()}\n{claim_lines_for_category}")
        claim_lines = "\n\n".join(sections)
    else:
        claim_lines = "- No evidence-backed claims are available yet."

    if kb.companies:
        company_rows = []
        for company in kb.companies:
            company_rows.append(
                "| "
                + " | ".join(
                    [
                        company.company,
                        str(len(company.evidence_ids)),
                        "; ".join(company.products[:2]) or "-",
                        "; ".join(company.pricing_notes[:2]) or "-",
                    ]
                ).replace("\n", " ")
                + " |"
            )
        company_table = "\n".join(
            [
                "| Company | Evidence Count | Product Signals | Pricing Signals |",
                "|---|---:|---|---|",
                *company_rows,
            ]
        )
    else:
        company_table = "No scoped companies are available yet."

    if kb.evidence:
        evidence_rows = []
        for evidence in kb.evidence[:20]:
            source = source_by_id.get(evidence.source_id)
            source_url = source.url if source else evidence.source_url or "missing-source"
            evidence_rows.append(
                "| "
                + " | ".join(
                    [
                        evidence.id,
                        evidence.company or "-",
                        evidence.topic,
                        (evidence.excerpt.replace("|", "\\|").replace("\n", " ")[:120] + "..."),
                        source_url,
                    ]
                )
                + " |"
            )
        evidence_table = "\n".join(
            [
                "| Evidence ID | Company | Topic | Excerpt | Source |",
                "|---|---|---|---|---|",
                *evidence_rows,
            ]
        )
    else:
        evidence_table = "No evidence records are available yet."

    if kb.sources:
        source_lines = "\n".join(
            (
                f"- {source.id}: {source.title or source.url} "
                f"({source.source_type}, credibility={source.credibility_label}/{source.credibility_score:.2f}) "
                f"- {source.url}"
            )
            for source in kb.sources[:20]
        )
    else:
        source_lines = "- No source records are available yet."

    if kb.sources:
        source_quality_rows = [
            "| "
            + " | ".join(
                [
                    source.id,
                    source.source_type,
                    source.credibility_label,
                    f"{source.credibility_score:.2f}",
                    (source.reliability_note or "-").replace("|", "\\|"),
                ]
            )
            + " |"
            for source in kb.sources[:20]
        ]
        source_quality_table = "\n".join(
            [
                "| Source ID | Type | Label | Score | Reliability Note |",
                "|---|---|---|---:|---|",
                *source_quality_rows,
            ]
        )
    else:
        source_quality_table = "No source quality records are available yet."

    markdown = f"""# Competitive Analysis V2: {title_companies}

## Scope
Request: {plan.request or "No request provided."}

Companies: {", ".join(plan.companies) if plan.companies else "Not yet specified."}

## Evidence-Backed Findings
{claim_lines}

## Company Fact Sheets
{company_table}

## Evidence Table
{evidence_table}

## Source Inventory
{source_lines}

## Source Quality
{source_quality_table}

## Limitations
This system does not invent competitive conclusions without SourceRecord and EvidenceRecord inputs.

## Next Required Step
If evidence is missing, run the Collection Agent with real search credentials or provide seed_records, then regenerate claims and the report.
"""
    report = ReportDraft(
        title=f"Competitive Analysis V2: {title_companies}",
        markdown=markdown,
        claim_ids=[claim.id for claim in kb.claims],
        evidence_ids=sorted({evidence_id for claim in kb.claims for evidence_id in claim.evidence_ids}),
        revision=state.get("revision_count", 0),
    )
    state["report_draft"] = report.model_dump(mode="json")
    state, artifact = _append_artifact(
        state,
        agent_name="writing-agent",
        artifact_type="report_draft",
        summary=f"Draft report created with {len(report.claim_ids)} claims.",
        payload=state["report_draft"],
    )
    return _append_trace(
        state,
        agent_name="writing-agent",
        stage="writing",
        input_summary=f"Writing from {len(kb.claims)} claims.",
        output_summary=f"Report draft {report.id} created.",
        decision="Unsupported claims are excluded from the report.",
        artifact_ids=[artifact.id],
    )


def qa_agent(state: CompetitiveAnalysisV2State) -> CompetitiveAnalysisV2State:
    kb = CompetitorKnowledgeBase.model_validate(state["knowledge_base"])
    report = ReportDraft.model_validate(state["report_draft"])
    findings: list[QAFinding] = []

    claims_with_evidence = [claim for claim in kb.claims if claim.evidence_ids]
    citation_coverage = len(claims_with_evidence) / len(kb.claims) if kb.claims else 0.0
    evidence_counts = Counter(evidence.company for evidence in kb.evidence if evidence.company)
    if len(kb.companies) >= 2 and evidence_counts:
        expected_companies = [company.company for company in kb.companies]
        min_count = min(evidence_counts.get(company, 0) for company in expected_companies)
        max_count = max(evidence_counts.get(company, 0) for company in expected_companies)
        balance_score = 1.0 if max_count == 0 else min_count / max_count
    else:
        balance_score = 0.0

    if not kb.sources:
        findings.append(
            QAFinding(
                severity="high",
                category="missing_evidence",
                message="No SourceRecord objects are available; final report cannot be considered evidence-backed.",
            )
        )
    if not kb.evidence:
        findings.append(
            QAFinding(
                severity="high",
                category="missing_evidence",
                message="No EvidenceRecord objects are available; analysis claims should not be generated.",
            )
        )
    if any(not source.url for source in kb.sources):
        findings.append(
            QAFinding(
                severity="high",
                category="source_quality",
                message="Some SourceRecord objects are missing URLs.",
            )
        )
    unsupported_claim_ids = [claim.id for claim in kb.claims if not claim.evidence_ids]
    if unsupported_claim_ids:
        findings.append(
            QAFinding(
                severity="high",
                category="citation_gap",
                message="Some claims do not have evidence_ids.",
                related_claim_ids=unsupported_claim_ids,
            )
        )
    evidence_id_set = {evidence.id for evidence in kb.evidence}
    missing_evidence_ids = [
        evidence_id
        for claim in kb.claims
        for evidence_id in claim.evidence_ids
        if evidence_id not in evidence_id_set
    ]
    if missing_evidence_ids:
        findings.append(
            QAFinding(
                severity="high",
                category="citation_gap",
                message="Some claims reference evidence_ids that do not exist in the knowledge base.",
            )
        )
    if kb.sources and all(source.source_type == "unknown" for source in kb.sources):
        findings.append(
            QAFinding(
                severity="medium",
                category="source_quality",
                message="All sources are marked unknown; classify source types before final delivery.",
            )
        )
    low_credibility_sources = [source.id for source in kb.sources if source.credibility_label in {"low", "unknown"}]
    if low_credibility_sources and len(low_credibility_sources) == len(kb.sources):
        findings.append(
            QAFinding(
                severity="medium",
                category="source_quality",
                message="All sources have low or unknown credibility labels; corroborate with official or analyst sources.",
            )
        )
    elif low_credibility_sources:
        findings.append(
            QAFinding(
                severity="low",
                category="source_quality",
                message=f"{len(low_credibility_sources)} sources have low or unknown credibility labels.",
            )
        )
    if len(kb.companies) >= 2 and balance_score < 0.5:
        findings.append(
            QAFinding(
                severity="medium",
                category="balance",
                message="Evidence is unevenly distributed across compared companies.",
            )
        )
    if kb.claims and "Evidence Table" not in report.markdown:
        findings.append(
            QAFinding(
                severity="high",
                category="format",
                message="Report contains claims but does not include an Evidence Table.",
            )
        )
    if kb.claims and "Source Inventory" not in report.markdown:
        findings.append(
            QAFinding(
                severity="high",
                category="format",
                message="Report contains claims but does not include a Source Inventory.",
            )
        )
    if kb.claims and "Source Quality" not in report.markdown:
        findings.append(
            QAFinding(
                severity="medium",
                category="format",
                message="Report contains claims but does not include a Source Quality section.",
            )
        )
    if "Limitations" not in report.markdown:
        findings.append(
            QAFinding(
                severity="medium",
                category="format",
                message="Report should include a limitations section.",
            )
        )

    review = QualityReview(
        passed=not any(finding.severity == "high" for finding in findings),
        citation_coverage=citation_coverage,
        balance_score=balance_score,
        findings=findings,
    )
    state["quality_review"] = review.model_dump(mode="json")
    state, artifact = _append_artifact(
        state,
        agent_name="qa-agent",
        artifact_type="quality_review",
        summary=f"QA {'passed' if review.passed else 'failed'} with {len(findings)} findings.",
        payload=state["quality_review"],
    )
    return _append_trace(
        state,
        agent_name="qa-agent",
        stage="qa",
        input_summary=f"Reviewing report {report.id}.",
        output_summary=f"QA passed={review.passed}, citation_coverage={review.citation_coverage:.2f}.",
        decision="Route to revision if high-severity findings exist and revision budget remains.",
        artifact_ids=[artifact.id],
        warnings=[finding.message for finding in findings],
    )


def revision_agent(state: CompetitiveAnalysisV2State) -> CompetitiveAnalysisV2State:
    report = ReportDraft.model_validate(state["report_draft"])
    review = QualityReview.model_validate(state["quality_review"])
    revision_count = state.get("revision_count", 0) + 1

    finding_lines = "\n".join(f"- [{finding.severity}] {finding.message}" for finding in review.findings)
    report.markdown += f"""

## QA Revision Notes
Revision {revision_count} did not fabricate missing evidence. Outstanding QA findings:

{finding_lines or "- No outstanding findings."}
"""
    report.revision = revision_count
    state["revision_count"] = revision_count
    state["report_draft"] = report.model_dump(mode="json")
    state, artifact = _append_artifact(
        state,
        agent_name="revision-agent",
        artifact_type="report_revision",
        summary=f"Applied revision {revision_count} with transparent QA notes.",
        payload=state["report_draft"],
    )
    return _append_trace(
        state,
        agent_name="revision-agent",
        stage="revision",
        input_summary=f"Revision requested for report {report.id}.",
        output_summary=f"Revision {revision_count} added QA notes without inventing evidence.",
        decision="Return to QA for one more review.",
        artifact_ids=[artifact.id],
    )


def qa_router(state: CompetitiveAnalysisV2State) -> Literal["revise", "finish"]:
    review = QualityReview.model_validate(state["quality_review"])
    if review.passed:
        return "finish"
    if state.get("revision_count", 0) < 1:
        return "revise"
    return "finish"


def create_competitive_analysis_v2_graph():
    graph = StateGraph(CompetitiveAnalysisV2State)
    graph.add_node("scope_agent", scope_agent)
    graph.add_node("collection_agent", collection_agent)
    graph.add_node("analysis_agent", analysis_agent)
    graph.add_node("writing_agent", writing_agent)
    graph.add_node("qa_agent", qa_agent)
    graph.add_node("revision_agent", revision_agent)

    graph.add_edge(START, "scope_agent")
    graph.add_edge("scope_agent", "collection_agent")
    graph.add_edge("collection_agent", "analysis_agent")
    graph.add_edge("analysis_agent", "writing_agent")
    graph.add_edge("writing_agent", "qa_agent")
    graph.add_conditional_edges(
        "qa_agent",
        qa_router,
        {"revise": "revision_agent", "finish": END},
    )
    graph.add_edge("revision_agent", "qa_agent")
    return graph.compile()


competitive_analysis_v2 = create_competitive_analysis_v2_graph()
