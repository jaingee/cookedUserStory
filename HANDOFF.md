# cookedUserStory — Product and Architecture Handoff

## 1. Operating Status

The hackathon has ended. `cookedUserStory` is now being developed as a real product and portfolio-quality engineering project.

This document records the current implemented baseline, owner-approved product direction, proposed target architecture, evidence classification, open decisions, and the next approval gate. The detailed target specification is drafted in [`docs/architecture.md`](docs/architecture.md), remains pending owner approval, and is not implemented; the conceptual contracts below are not frozen TypeScript contracts.

The repository is public. Public-repository security, provenance, and responsible-retrieval requirements apply to every future change. This document is a planning and governance handoff, not proof of runtime provider access or production readiness.

## 2. Current Implemented Baseline

The tracked repository currently contains:

- One Next.js App Router application written in TypeScript with React, Tailwind CSS, Zod, Vitest, ESLint, and server-side route handlers.
- Exactly three configured categories: `laptop`, `air_purifier`, and `lab_oven`.
- Exactly three local product fixtures for each configured category, loaded and validated by the domain layer.
- Fixed category criteria and default requirements held in `lib/config/categories.ts`.
- A four-stage frontend: Describe, Confirm, Compare, and Recommend.
- Editable mandatory targets and preferred weights in the current workflow.
- A pure local deterministic weighted scoring engine with mandatory qualification, preferred-criterion normalization, stable tie-breaking, and local authority over displayed results.
- Five server-only provider adapters and route handlers for AI&, Oxylabs, Doubleword, Daytona, and Nosana.
- Local product fixtures and provider fixtures or fallbacks, with data-origin and provider-mode labels exposed in the workflow.
- A product-ID-to-URL allowlist for one bounded ASUS laptop retrieval path through Oxylabs.
- Automated contract, category, scoring, provider, route, and integration tests based on fixtures and mocks.
- No database, authentication, saved research jobs, resumability, queue, unrestricted candidate discovery, or multi-source research scheduler.

The current baseline is functional for a bounded prepared-fixture comparison. It does not represent the approved target product architecture. In particular, fixed weighted scoring is current behavior, not the target recommendation authority.

## 3. Evidence and Repository Status

Evidence in this handoff is classified explicitly:

### Demonstrated in repository

Tracked files directly demonstrate the stack, three current categories, three fixture records per category, fixed category configuration, deterministic scoring, five server-only adapters, API routes, origin/status envelopes, bounded Oxylabs targeting, local fallback fixtures, and automated tests.

The tracked code also demonstrates that provider results are schema-validated, credentials are read server-side, and provider failures are represented without replacing the local scoring result.

### Reported by Implementer

The repository’s previously reported runtime checks state that Oxylabs and Doubleword returned validated live results, AI& reached the application but returned structured content that failed the expected schema, Daytona reached sandbox creation but did not complete code execution, and Nosana did not have a validated active review endpoint. These observations were not reproduced during this documentation pass and remain runtime reports, not current proof.

### Reported by owner

The owner approved the post-hackathon product direction below and reports access to an Oxylabs Advanced Residential Proxy plan. Plan quotas, pricing, targeting, restricted targets, and account-specific capabilities remain externally changing facts that must be verified before implementation.

### Proposed architecture

Dynamic governed categories, progressive research, research jobs, evidence reconciliation, AI& comparative synthesis, persistence, and the conceptual contracts in [`docs/architecture.md`](docs/architecture.md) are proposed and not implemented. No migration wave is authorized by the drafted specification.

### Unknown

Candidate discovery, persistence, queueing, authentication, AI& structured-output compatibility, claim-extraction boundaries, source authority, research budgets, regional handling, policy enforcement, dynamic-content strategy, evaluation data, deployment, and observability remain unresolved unless explicitly marked otherwise.

## 4. Owner-Approved Product Direction

The product owner has approved these decisions:

1. The hackathon has ended.
2. `cookedUserStory` is now a real product and portfolio-quality engineering project.
3. The target must not remain limited to laptops, air purifiers, lab ovens, or three products per category.
4. The target should support dynamically interpreted product categories, including examples such as headphones.
5. Research depth must be configurable and may include substantially more candidates and sources than the current workflow.
6. Oxylabs Residential Proxies and AI& are the two primary external providers.
7. Oxylabs is the primary public-evidence retrieval layer.
8. AI& is the primary requirement-interpretation and comparative-reasoning layer.
9. Doubleword, Daytona, and Nosana are secondary optional integrations and must not complicate or block the default product path.
10. The current hardcoded weighted scoring engine is not the desired primary recommendation mechanism.
11. Local deterministic logic remains appropriate for schema validation, hard constraints, eligibility, unit normalization, duplicate detection, evidence provenance, conflict detection, citation validation, cache/freshness policy, safety, and target policy.
12. AI& should perform evidence-grounded comparative reasoning rather than return a pseudo-precise numerical winner.
13. The proposed architecture must be planned and approved before implementation begins.

These are owner decisions, not evidence that the proposed architecture has been validated.

## 5. Product Scope and Boundaries

The target product helps people turn an uncertain purchasing brief into a defensible, evidence-grounded comparison. It should support ordinary consumer products and ordinary business equipment when useful public information is available.

The product is dynamic but governed. It should use a reviewed common product ontology, curated templates where available, request-specific criteria proposed by AI&, and explicit user confirmation. It must not accept arbitrary unvalidated schemas or claim universal product coverage.

Categories involving unsafe use, regulated decisions, or inadequate public evidence should be rejected or deferred until an explicit policy and review path exists. Regional availability, currency, and source policy are part of the decision context rather than afterthoughts.

## 6. Target User Workflow

The target workflow is progressive and user-confirmed:

1. **Decision brief** — AI& interprets the use case, region, budget, mandatory constraints, priorities, assumptions, clarifying questions, and proposed research depth.
2. **Candidate discovery** — a separate, not-yet-selected mechanism produces candidates, canonical identifiers, regional variants when known, source URLs, and discovery provenance.
3. **Broad screening** — Oxylabs retrieves bounded evidence for identity, approximate price, regional availability, obvious mandatory specifications, and duplicate or variant signals.
4. **Deterministic screening** — local logic removes or flags hard-constraint failures, duplicates, unsupported regions, missing mandatory evidence, malformed claims, and prohibited targets.
5. **Adaptive shortlist** — the shortlist responds to research mode, available candidates, eligibility results, evidence quality, budget, and diminishing information gain; it is not a fixed three- or five-product invariant.
6. **Deep evidence packs** — finalists receive separate manufacturer, technical, manual, retailer, distributor, warranty, consumables, and reputable independent-review sources where available.
7. **Claim extraction and reconciliation** — claims retain source-level provenance, regional context, retrieval time, excerpts, hashes, statuses, and conflicts.
8. **Comparative synthesis** — AI& compares only viable products against confirmed priorities and validated evidence.
9. **Output validation** — local code confirms citations, eligibility, visible unknowns, conflict disclosure, fallback/stale labels, and recommendation support before results are shown.

No single AI call has unlimited authority. Each stage has its own structured contract, validation boundary, and evidence references.

## 7. Provider Roles

### Oxylabs Residential Proxies

Oxylabs Residential Proxies are public-web retrieval infrastructure. The target responsibilities are approved public URL retrieval, regional and geo-targeted evidence, rotated IPs for independent retrievals, scoped sticky sessions when continuity is required, source refresh, and request and traffic metadata.

Potential source types include manufacturer, retailer, distributor, support, manual, warranty, consumables, and reputable review pages where permitted.

Oxylabs is not a product database, search engine, recommendation model, extraction model, complete browser-automation product, or universal-access mechanism. It cannot be assumed to access every website.

```text
Candidate discovery selects products and source URLs.
Oxylabs retrieves approved public URLs.
```

Candidate discovery remains unresolved. Possible future inputs include controlled search providers, manufacturer catalogues, retailer catalogues, curated domain registries, user-provided URLs, and existing cached records. This handoff does not choose a discovery provider.

### AI&

AI& is the proposed primary layer for brief interpretation, decision-template proposals, ambiguity detection, follow-up questions, research-plan generation, structured claim extraction, source-level reconciliation, evidence-grounded comparative recommendations, trade-off explanations, and uncertainty communication.

AI& outputs must be schema-validated, citation-bound, and constrained to the confirmed brief and validated evidence. The current structured-output compatibility problem remains an explicit blocker before AI& can be relied upon as the primary product reasoning layer.

### Secondary providers

- Doubleword is an optional extraction benchmark or fallback.
- Daytona is an optional isolated-verification or development integration.
- Nosana is an optional evidence-review experiment.

Each secondary provider must remain behind an adapter or feature flag, be independently removable, stay outside the default critical path, and never block normal research.

## 8. Dynamic Decision Architecture

The target category model is:

```text
reviewed common product ontology
+ curated templates where available
+ request-specific AI-generated criteria
+ explicit user confirmation
```

AI& may propose criteria for a new category, but local code must normalize and validate criterion identifiers, labels, value types, units, operators, mandatory versus comparative importance, duplicates, and unsupported criteria. Curated templates remain useful for frequently requested categories without requiring separate hardcoded scoring modules.

The conceptual AI stages are deliberately separate:

1. brief interpretation;
2. research-plan generation;
3. claim extraction;
4. evidence reconciliation;
5. comparative synthesis;
6. final output validation.

The target recommendation is evidence-grounded rather than a fixed weighted `0–10` winner. Outputs should support best overall, best value, best for a named priority, viable alternatives, rejected candidates and reasons, key trade-offs, unresolved questions, evidence conflicts, and what could change the recommendation.

Local deterministic code remains the trust and eligibility layer. It owns schema validation, hard constraints, eligibility, unit conversion, malformed-value handling, duplicate detection, source conflicts, unsupported citations, cache/freshness policy, safety policy, and target policy. AI& synthesis cannot override those checks.

## 9. Research Depth and Budgeting

The target should expose conceptual modes such as:

- `quick`
- `standard`
- `detailed`
- `extensive`
- `custom`

Each research job should carry budgets for maximum candidates, maximum finalists, maximum sources per finalist, maximum bytes or traffic, maximum elapsed time, maximum retries, and minimum evidence coverage. Any numeric examples introduced during implementation are initial planning defaults, not permanent product limits.

Stopping conditions include required evidence coverage, remaining candidates failing hard constraints, materially repetitive additional sources, exhausted time or traffic budget, blocked target policy, and user cancellation.

## 10. Evidence, Provenance, and Confidence

Every source remains separate. The target evidence model records:

- criterion key, value, and unit;
- source identifier, URL, source type, and authority;
- retrieval time and regional context;
- excerpt reference and content hash;
- claim status and conflict status;
- freshness and policy metadata.

Evidence-derived confidence is based on observable factors: important-criterion coverage, source authority, independent-source count, evidence recency, regional relevance, unresolved conflicts, and mandatory unknowns. AI& may explain the confidence assessment but is not the sole authority that invents it.

## 11. Research Jobs and Persistence Requirements

The current no-database, no-authentication architecture is insufficient for deep research. The target product is expected to require resumable research jobs, progress tracking, cancellation, bounded retries, evidence caching, content hashes, freshness timestamps, source refresh, traffic and cost accounting, saved research results, and failure recovery.

The database vendor, queue vendor, orchestration technology, cloud platform, authentication provider, deployment provider, and observability platform are intentionally unresolved.

## 12. Target Policy, Privacy, and Security

The target must enforce:

- public data only;
- no credentials in client code or client-visible responses;
- no login or paywall bypass;
- no CAPTCHA-bypass claims;
- per-domain rate limits and bounded concurrency;
- bounded retries and explicit cancellation;
- source allowlists and denylists;
- restricted-target handling;
- user-visible retrieval failures;
- secret protection and staged-diff scanning;
- short public evidence excerpts rather than committed full pages;
- provider terms and target policies;
- rejection or deferral of unsafe and regulated categories.

## 13. Proposed Conceptual Contracts

The following are proposed, illustrative contracts. They are not implemented, approved TypeScript schemas, or compatibility commitments.

| Contract | Purpose | Key fields |
|---|---|---|
| `DecisionBrief` | User-confirmed purchasing intent | brief ID, product type, use case, region, currency, budget, constraints, priorities, assumptions, questions, research depth |
| `DecisionTemplate` | Governed category decision model | template ID/version, ontology mapping, criteria, operators, units, source policy, confirmation requirements |
| `DecisionCriterion` | One normalized decision dimension | identifier, label, value type, unit, operators, mandatory/comparative importance, support status, provenance |
| `ResearchPolicy` | Research limits and safety policy | mode, candidate/finalist/source budgets, bytes, time, retries, coverage target, region, allowlists, denylists, freshness |
| `ResearchJob` | Resumable orchestration state | job ID, brief/template/policy references, lifecycle status, progress, budget usage, timestamps, cancellation, failure state |
| `CandidateProduct` | Discovered product identity | canonical ID, manufacturer, model, regional variant, candidate URLs, discovery provenance, duplicate links |
| `SourceRecord` | One retrieved public source | source ID, URL, domain, source type, authority, region, retrieved time, hash, excerpt reference, policy result, traffic metadata |
| `EvidenceClaim` | One source-bound product claim | product ID, criterion, value, unit, source ID, excerpt reference, retrieved time, region, claim status, conflict status |
| `EvidencePack` | Reconciled evidence for a product | product ID, source records, claims, coverage, freshness, conflicts, unresolved questions |
| `EligibilityResult` | Deterministic trust decision | product ID, pass/fail/unknown checks, hard-constraint reasons, missing evidence, policy violations, provenance |
| `ComparativeRecommendation` | Evidence-grounded decision output | best overall/value/priority options, viable alternatives, rejected candidates, trade-offs, conflicts, unresolved questions, change triggers, citations, confidence factors |

## 14. Migration Strategy

Every stage below is proposed and unauthorized for implementation until the next architecture approval gate is passed:

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

This is a staged migration from the current baseline, not authorization for a full rewrite.

## 15. Evaluation Strategy

Future evaluation must cover:

- requirement-extraction accuracy;
- candidate relevance;
- duplicate detection;
- regional-variant detection;
- retrieval success;
- claim-extraction accuracy;
- unit normalization;
- citation correctness;
- conflict detection;
- mandatory-constraint enforcement;
- recommendation consistency;
- unsupported-claim rate;
- evidence freshness;
- latency;
- traffic consumption;
- cost per completed job;
- cancellation behaviour;
- retry and recovery behaviour.

Exact ranking tests alone will no longer be sufficient after fixed weighted scoring stops being the primary recommendation mechanism. The future system will need benchmark briefs and reviewed expected outcomes, but this handoff does not design the benchmark dataset.

## 16. Secondary Providers

Doubleword, Daytona, and Nosana remain optional integrations. They may provide extraction comparison, isolated verification, or evidence-review experiments, but they must not define the core product architecture, block normal research, or be required for the default product path. Their adapters and feature flags may be removed independently after the target architecture is approved.

## 17. Risks and Unknowns

The following decisions remain open:

1. Candidate-discovery mechanism.
2. Persistence technology.
3. Job queue and orchestration technology.
4. Authentication and ownership model.
5. AI& structured-output compatibility.
6. Claim-extraction architecture.
7. Source-authority policy by claim type.
8. Cache storage and retention.
9. Research-depth defaults.
10. Bandwidth and cost budgets.
11. Region and currency handling.
12. Supported and prohibited product categories.
13. Source-policy enforcement.
14. Dynamic-content retrieval strategy.
15. Benchmark and evaluation dataset.
16. Recommendation reproducibility requirements.
17. Migration and backward-compatibility strategy.
18. Deployment and observability platform.

No vendor, provider, database, queue, authentication, cloud, discovery, or deployment choice is settled here.

## 18. Current Blockers

Before implementation of the target architecture, the following blockers need resolution:

- AI& structured-output compatibility must be verified against the intended stage contracts.
- Candidate discovery must be separated from retrieval and assigned an approved boundary.
- Research-job persistence, queueing, cancellation, and recovery need approved lifecycle and infrastructure decisions.
- Source authority, claim reconciliation, dynamic-content, regional, currency, and target-policy rules need explicit policy.
- Oxylabs account quotas, targeting, restricted targets, and traffic economics must be verified from the owner’s current plan.
- A benchmark and reviewed evaluation set must be defined before broad category expansion.

## 19. Next Approval Gate

```text
Review and approve the target architecture specification.
After approval, authorize a documentation-only pass to draft ADR-001 through ADR-003.
```

## 20. Exact Next Route

The target architecture specification has been drafted in [`docs/architecture.md`](docs/architecture.md), but remains pending owner approval. Implementation has not begun and no migration wave is authorized. The next planned pass is a documentation-only ADR drafting pass after the owner approves the specification.

```text
Model: GPT-5.6 Sol
Reasoning: xHigh
Mode: /plan
```

That pass should draft ADR-001 through ADR-003 for dynamic decision templates and contract versioning, evidence/provenance and claim-type authority, and the research-job state machine and idempotency. It must not begin implementation or Migration Wave 1.
