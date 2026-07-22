# cookedUserStory — Target Product Architecture Specification

> **Status: Owner-approved target architecture — implementation not authorized**
> **Architecture specification — not yet implemented**

This document is the detailed target architecture for the post-hackathon product. The product owner approved this specification after commit 54a73f51f8753530d15dc7f37c04c0c309e4c1ff (docs: define target product architecture). The approval records direction only: it does not authorize implementation, select infrastructure vendors, approve any ADR, or authorize a migration wave.

## 1. Status and scope

The hackathon baseline remains the reference implementation. The target is a governed, evidence-grounded product research system that can interpret new product categories, research a configurable set of candidates, and explain recommendations with source-level evidence. No target component described here is implemented by this documentation pass.

## 2. Current implemented baseline

The tracked application is a Next.js App Router TypeScript application using React, Tailwind CSS, Zod, Vitest, and ESLint. It currently has exactly three configured categories (`laptop`, `air_purifier`, and `lab_oven`), exactly three validated prepared products per category, fixed category configuration, a four-stage Describe/Confirm/Compare/Recommend UI, and a pure local deterministic weighted scorer. It also contains five server-only provider adapters and routes for AI&, Oxylabs, Doubleword, Daytona, and Nosana, local product/provider fixtures or fallbacks, schema-validated status/origin envelopes, and one bounded ASUS laptop retrieval path. There is no database, authentication, saved research job, resumability, queue, unrestricted candidate discovery, or multi-source research scheduler.

The baseline is functional for a bounded prepared-fixture comparison. Its fixed weighted scorer is current behavior, not the target recommendation authority. Current data uses prepared product fixtures and provider fixtures or fallbacks, with data-origin and provider-mode labels exposed in the workflow.

## 3. Goals and non-goals

Goals are dynamically interpreted but governed categories, progressive research, resumable jobs, bounded public retrieval, claim-level provenance, deterministic trust checks, evidence-grounded comparative reasoning, transparent uncertainty, and a migration path that preserves the working baseline during rollout.

Non-goals are universal product coverage, arbitrary unvalidated schemas, unrestricted crawling, login or paywall access, CAPTCHA bypass, a new mandatory sponsor path, or selecting a database, queue, cloud, discovery, authentication, deployment, or observability vendor in this specification.

## 4. Binding architecture principles

1. Zod/runtime validation and provider-independent contracts are authoritative at every boundary.
2. The common product ontology plus curated templates govern AI-proposed criteria; users explicitly confirm the normalized decision template.
3. Candidate discovery is a separate boundary from retrieval. Oxylabs retrieves approved public URLs; it does not discover or recommend products.
4. No AI stage can override confirmed hard constraints, source policy, eligibility, provenance, or output validation.
5. Local deterministic logic owns normalization, hard constraints, duplicates, conflicts, citations, freshness policy, and safety policy.
6. Every claim and recommendation is traceable to source records, excerpts, timestamps, regions, and content hashes.
7. Provider failures are visible, bounded, and non-blocking where safe; fabricated live success is prohibited.
8. HTTPS is preferred and required for final retrieval whenever available; all targets remain untrusted until policy validation.
9. Security, traffic, time, cost, and cancellation budgets are first-class job constraints.
10. Proposed contracts are versioned and reviewed before implementation.

## 5. System context and trust boundaries

```text
User/browser
  -> application API and job UI
  -> decision brief, confirmation, progress, evidence, recommendation

Application trust layer
  -> contract validation, policy checks, normalization, eligibility, provenance,
     cache/freshness, citation validation, audit, and deterministic checkpoints

Provider adapters (server-only)
  -> AI& for interpretation/synthesis
  -> Oxylabs for approved public URL retrieval
  -> optional ClaimExtractor (Doubleword or another implementation)
  -> optional Daytona verification
  -> optional Nosana review

Persistence and orchestration (vendor unresolved)
  -> job state, checkpoints, source/claim records, snapshots, budgets, events
```

Browser code never receives credentials or private provider responses. Provider adapters are server-side. Untrusted brief text, candidate URLs, retrieved content, model output, and provider errors are validated and policy-filtered before crossing into trusted domain state.

## 6. Domain model

The core entities are a confirmed `DecisionBrief`, versioned `DecisionTemplate`, `DecisionCriterion`, `ResearchPolicy`, resumable `ResearchJob`, `CandidateProduct`, `SourceRecord`, `EvidenceClaim`, `EvidencePack`, `EligibilityResult`, and `ComparativeRecommendation`. All entities carry stable IDs, schema versions, timestamps, and provenance where applicable. Product identity and regional variant are separate concepts so duplicate detection cannot silently merge incompatible offers.

## 7. Dynamic decision templates

The target category model is:

```text
reviewed common product ontology
+ curated templates where available
+ request-specific AI-generated criteria
+ local normalization and validation
+ explicit user confirmation
```

AI& may propose criterion identifiers, labels, value types, units, operators, mandatory/comparative importance, and follow-up questions. Local code rejects duplicates, unsupported types/units/operators, ambiguous identifiers, non-finite values, unsafe criteria, and criteria that cannot be mapped to the ontology. A template is versioned and immutable once a research job starts; edits create a new confirmed version. Frequently used categories can use curated templates without separate hardcoded scoring modules.

## 8. Candidate-discovery boundary

Candidate discovery selects products and source URLs. Oxylabs retrieves approved public URLs. Discovery is a separate adapter boundary that must return canonical product IDs, manufacturer/model, regional variant when known, candidate URLs, and discovery provenance. Possible future inputs include controlled search providers, manufacturer or retailer catalogues, curated domain registries, user-provided URLs, and cached records. No discovery provider is selected in this pass.

## 9. Research-job lifecycle

The proposed lifecycle is:

```text
draft -> interpreting -> awaiting_confirmation -> queued -> running
running -> cancel_requested -> cancelled
running -> completed | completed_with_gaps | failed
```

Stages are explicit: brief interpretation, discovery, broad screening, deterministic screening, adaptive shortlist, deep retrieval, extraction, reconciliation, eligibility, synthesis, and output validation. A job records current stage, progress, budget usage, cancellation state, retry history, and last durable checkpoint. Stage operations are idempotent by job/stage/input version; external calls use idempotency keys where supported. A cancellation request prevents new work and lets in-flight bounded operations settle before the job becomes `cancelled`. Recoverable failures resume from the latest checkpoint; unrecoverable policy or contract failures become visible `failed` or `completed_with_gaps` outcomes.

## 10. Research depth and stopping policy

Expose conceptual modes `quick`, `standard`, `detailed`, `extensive`, and `custom`. A `ResearchPolicy` carries maximum candidates, finalists, sources per finalist, bytes/traffic, elapsed time, provider calls, retry budget, and minimum evidence coverage. Counts are configurable planning defaults, not permanent product invariants. Stop when important evidence coverage is reached, remaining candidates fail hard constraints, new sources are materially repetitive, traffic/time budgets are exhausted, target policy blocks access, or the user cancels.

## 11. Oxylabs retrieval architecture

Residential Proxies are public-web retrieval infrastructure. The scheduler accepts only policy-approved candidate URLs, applies regional targeting, uses rotating IPs for independent retrievals and scoped sticky sessions when continuity is needed, records request/traffic metadata, and writes bounded source artifacts and freshness timestamps. Broad screening is followed by deep finalist retrieval across separate source types (manufacturer, technical specification, manual/datasheet, retailer, distributor, warranty/support, consumables, and reputable independent review) where permitted.

Each domain has bounded concurrency and rate limits; global job budgets bound bytes, time, provider calls, and cost. Cache keys include normalized URL, policy/region context, and retrieval version. Cached content is short, sanitized evidence, never a committed full page. Oxylabs is not a database, search engine, extraction model, recommendation model, complete browser automation product, or universal-access mechanism.

## 12. URL, redirect, transport, and SSRF policy

Binding retrieval requirements:

- HTTPS is preferred and required for final retrieval whenever available.
- An HTTP input URL may be accepted only when target policy explicitly permits it.
- DNS and destination safety are checked before connection.
- Every redirect target is revalidated; HTTPS-to-HTTP downgrade redirects are rejected.
- Private, loopback, link-local, metadata-service, reserved, and otherwise prohibited destinations are rejected.
- URL credentials and unsafe schemes are rejected.
- Candidate URLs remain untrusted proposals until target-policy validation succeeds.

Host allowlists/denylists, response-size limits, content-type policy, decompression limits, and excerpt sanitization apply before claims are extracted. Retrieval never follows a redirect into a newly prohibited destination.

## 13. Retry and budgeting policy

Retries are bounded by failure class, research policy, provider policy, remaining job budget, elapsed-time budget, and cancellation state. Retryable failures may include transient connection failures, timeouts, rate limits, and eligible upstream failures; `Retry-After` is respected and backoff includes jitter. Policy blocks, unsafe redirects, unsupported content, ordinary non-retryable client errors, and cancellation are not retried. Every attempt consumes the job's traffic, time, and provider-call budgets. An initial operational profile may default to one retry, but exact counts remain configurable and subject to calibration.

The same rule applies to AI& stages: model/transport retries are bounded by stage policy and budget, while invalid structured output is handled through validation-aware fallback or a visible gap rather than unbounded retry.

## 14. Evidence, provenance, and freshness

Every source is a separate `SourceRecord` with source ID, URL, domain, source type, authority class, region, retrieved time, content hash, excerpt reference, policy result, traffic metadata, and freshness state. `EvidenceClaim` records criterion key, normalized value/unit, source ID, excerpt reference, retrieval time, regional context, claim status, and conflict status. Source text is not merged into a provenance-free prompt. Stale, missing, or conflicting commercial evidence remains visible to users.

Source-authority policy is claim-type-specific and unresolved at final policy level. Initial recommendations may prefer manufacturer/manual evidence for technical specifications, local retailer/distributor evidence for regional price/availability, and reputable independent reviews for experiential claims; this is a proposed hierarchy pending approval.

## 15. Claim extraction and reconciliation

Extraction is behind a provider-independent `ClaimExtractor` adapter. AI& may implement the preferred target for relevant stages, while Doubleword or another implementation may satisfy the same contract. The adapter receives a bounded evidence pack and returns schema-validated claim candidates with source and excerpt references. Local normalization converts units and detects malformed values, duplicate claims, incompatible regional variants, and source conflicts. Reconciliation preserves all competing claims, applies approved claim-type authority rules, marks `confirmed`, `conflicting`, `unsupported`, `stale`, or `needs_review`, and never invents a value.

## 16. AI& stages and authority boundaries

AI& is proposed for six separate structured stages: brief interpretation, research-plan generation, claim extraction, evidence reconciliation assistance, comparative synthesis, and final output explanation. Each stage has an independent versioned schema and citation-bound input/output. AI& cannot enter the default live path until its structured-output compatibility gate passes against the exact stage schemas. AI& may remain the preferred implementation for reasoning and extraction, but all provider-independent contracts remain authoritative. No AI stage can override confirmed hard constraints, source policy, deterministic eligibility, or output validation.

## 17. Deterministic trust and eligibility

The local trust layer owns schema validation, unit normalization, hard constraints, missing mandatory evidence, duplicate/variant detection, unsupported citations, source conflicts, freshness policy, target policy, and safety checks. Proposed eligibility states are `eligible`, `ineligible`, `needs_confirmation`, `insufficient_evidence`, and `policy_blocked`. Hard failures take precedence over unknowns; only eligible products may be selected as recommendations. A product with stale or missing price may not qualify as a current best-value or purchase-now recommendation even if its underlying product value remains comparable.

## 18. Recommendation and confidence

The target output supports best overall, best value, best for a named priority, viable alternatives, rejected candidates with reasons, key trade-offs, unresolved questions, evidence conflicts, and what could change the recommendation. Fixed weighted `0–10` scoring is not the target primary authority. AI& synthesizes only viable products and cites reconciled claims; local validation checks every citation and eligibility assertion.

Confidence is evidence-derived from important-criterion coverage, source authority, independent-source count, recency, regional relevance, unresolved conflicts, and mandatory unknowns. Suggested bands are `high`, `medium`, `low`, and `insufficient`; the factors are observable and reproducible, and AI& can explain them but cannot invent the level. Stale stock affects purchase-now availability and confidence; stale stock alone does not necessarily invalidate a product's underlying value comparison. A product may be described as good value but not confirmed currently purchasable. Purchase-now recommendations require sufficiently fresh regional price and availability evidence, and stale/missing/conflicting commercial evidence must be visible.

## 19. Persistence boundary

The target requires resumable jobs, progress, cancellation, retries, evidence caching, hashes, freshness, refresh, traffic/cost accounting, saved results, and recovery. A logical relational system of record is the recommended shape because ownership relationships, job/stage state, candidates/variants, sources/claims, conflicts, recommendations, audit records, and transactional checkpoints are relational. This is an architectural recommendation, not a database-vendor selection. Immutable versioned snapshots should be retained for reproducibility; large bounded evidence artifacts may use an object/blob boundary. Exact database, object-storage, cache, retention, and deployment products remain unresolved.

## 20. Queue and orchestration boundary

Research jobs run outside the request/response critical path through a provider-independent orchestration boundary. The queue must support durable enqueue, idempotency, visibility timeouts, cancellation, bounded concurrency, retries by failure class, dead-letter or terminal-failure handling, checkpoint commits, and progress events. The exact queue and worker technology, hosting, and autoscaling model are unresolved. HTTP APIs may start/cancel/retry jobs and read snapshots; workers own stage execution and budget accounting.

## 21. API boundary

The proposed versioned API exposes separate resources for decision briefs, confirmed templates, research jobs, progress/events, candidates, evidence packs, conflicts, and recommendations. Representative operations are create brief, confirm template, start job, read job/events, cancel, retry an eligible stage, refresh sources, and read the immutable result snapshot. Every request and response is schema-validated with a version and correlation/job ID. Errors distinguish validation, policy, provider, budget, cancellation, and internal invariant classes without leaking credentials or raw upstream content. The exact route names and wire schemas require ADR approval.

## 22. Frontend implications

The future UI should preserve explicit confirmation and show progressive job status, stage progress, budgets, cancellation, evidence coverage, source links/excerpts, conflicts, stale commercial data, unresolved questions, rejected candidates, trade-offs, confidence factors, and what could change the recommendation. It should consume snapshots/events rather than own orchestration. The current four-stage fixture workbench remains a compatibility baseline until a migration plan is approved.

## 23. Secondary providers

Doubleword remains an optional extraction benchmark/fallback; Daytona an optional isolated verification/development tool; Nosana an optional evidence-review experiment. Each stays behind an adapter or feature flag, outside the default critical path, independently removable, and unable to block normal research or alter deterministic eligibility/recommendation authority. Existing code is retained during this documentation pass.

## 24. Security and responsible retrieval

Only public data is in scope. Credentials remain server-only and never appear in client bundles, URLs, logs, fixtures, or committed excerpts. The product must not claim login/paywall access or CAPTCHA bypass. Per-domain rate limits, bounded concurrency, bounded configurable retries, allowlists/denylists, restricted-target handling, content/redirect/SSRF controls, short excerpts, provider terms, user-visible failures, and secret scanning are required. Unsafe or regulated categories are rejected or deferred until policy and review exist. Ordinary consumer products and ordinary business equipment with publicly available information are the initial scope; universal coverage is not claimed.

## 25. Observability and cost controls

Record correlation/job/stage IDs, provider status, failure class, duration, retries, bytes, traffic, cache hit/miss, source domain, freshness, and policy outcomes without secrets or full page bodies. Budgets are enforced before each stage and provider attempt. Dashboards/alerts, retention, tracing, and observability vendor remain unresolved. Cost accounting must attribute provider calls, traffic, retries, and stored evidence to a research job.

## 26. Evaluation strategy

Future evaluation covers requirement-extraction accuracy, candidate relevance, duplicate detection, regional-variant detection, retrieval success, claim-extraction accuracy, unit normalization, citation correctness, conflict detection, mandatory-constraint enforcement, recommendation consistency, unsupported-claim rate, evidence freshness, latency, traffic consumption, cost per completed job, cancellation behaviour, and retry/recovery behaviour. Exact ranking tests alone are insufficient after fixed weighted scoring stops being the primary recommendation mechanism; reviewed benchmark briefs and expected outcomes are required, but the dataset is not designed here.

## 27. Migration waves

Every wave below is proposed and unauthorized until the owner approves this specification and the required ADRs:

1. Freeze and document current baseline behaviour.
2. Design and approve dynamic decision and evidence contracts.
3. Introduce provider-independent research-job orchestration.
4. Separate candidate discovery from retrieval.
5. Build Oxylabs scheduling, target policy, caching, traffic accounting, and bounded concurrency.
6. Implement dynamic but governed decision templates.
7. Add claim-level evidence extraction and reconciliation.
8. Introduce deterministic eligibility and citation validation.
9. Add AI& comparative synthesis.
10. Add detailed research progress and evidence interfaces.
11. Add persistence, resumability, cancellation, and recovery.
12. Place secondary providers behind optional adapters or feature flags.
13. Migrate or retire the fixed weighted-recommendation interface.
14. Evaluate quality before expanding broad category coverage.

## 28. ADR sequence and approval gates

The first three ADR drafts are linked below. Each remains Proposed — pending owner approval; no ADR is approved merely because this specification was approved:

1. [ADR-001 — Dynamic Decision Templates and Contract Versioning](adr/ADR-001-dynamic-decision-templates-and-contract-versioning.md)
2. [ADR-002 — Evidence, Provenance, and Claim-Type Authority](adr/ADR-002-evidence-provenance-and-claim-type-authority.md)
3. [ADR-003 — Research-Job State Machine and Idempotency](adr/ADR-003-research-job-state-machine-and-idempotency.md)

The complete proposed sequence is:

1. Dynamic decision templates and contract versioning.
2. Evidence, provenance, and claim-type authority.
3. Research-job state machine and idempotency.
4. Candidate-discovery boundary.
5. Oxylabs retrieval policy and scheduling.
6. AI and extraction authority boundaries.
7. Deterministic trust and eligibility authority.
8. Persistence boundary.
9. Queue and orchestration boundary.
10. Recommendation and confidence model.
11. Migration and deprecation strategy.

ADR-001 through ADR-003 must be reviewed and approved first because later storage, API, provider, orchestration, and migration decisions depend on their contracts. Their status remains proposed until the owner approves them through a later documentation-only pass. This documentation pass creates drafts only.

## 29. Approved decisions, unresolved choices, and acceptance criteria

The owner-approved product direction and this specification are now approved as architectural direction, but the target remains unimplemented. The following remain unresolved: candidate-discovery mechanism; persistence technology; job queue/orchestration technology; authentication/ownership; AI& structured-output compatibility; claim-extraction architecture; source authority by claim type; cache storage/retention; research-depth defaults; bandwidth/cost budgets; region/currency handling; supported/prohibited categories; source-policy enforcement; dynamic-content strategy; benchmark/evaluation dataset; recommendation reproducibility; migration/backward compatibility; deployment/observability platform.

The architecture specification is acceptable for review when it preserves the current baseline boundary, keeps discovery separate from retrieval, defines versioned provider-independent contracts, makes trust/eligibility deterministic, bounds retrieval and retries, makes evidence and freshness visible, keeps secondary providers optional, and leaves unresolved vendor/owner choices explicit. Acceptance of this document does not authorize implementation.

## 30. Next approval gate

```text
Review and approve ADR-001 through ADR-003.
After all three ADRs are approved, the owner may separately authorize only
Migration Wave 1: versioned target contracts and a legacy compatibility layer.
```

The next route is owner review of the three ADR drafts. No migration wave, application implementation, provider rollout, or infrastructure selection is authorized. If the ADRs are approved, the owner must make a separate authorization decision for Migration Wave 1:

```text
Model: GPT-5.6 Sol
Reasoning: xHigh
Mode: /plan
```

The ADR drafts are documentation only. They do not freeze production schemas, approve vendors, or begin implementation.
