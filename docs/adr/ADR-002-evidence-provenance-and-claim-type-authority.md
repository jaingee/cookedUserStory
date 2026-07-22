# ADR-002 — Evidence, Provenance, and Claim-Type Authority

## Status

Proposed — pending owner approval

## Context

Recommendations must be explainable and auditable across multiple public sources, regional variants, provider executions, extraction attempts, and refreshes. A merged text blob or a model-generated summary cannot establish which source supports which product assertion.

The current baseline exposes fixture and provider origins and validates provider envelopes, but it does not implement the target multi-source evidence model. The target must retain enough provenance to validate citations, expose freshness, preserve conflicts, and distinguish synthetic demonstrations from live research.

## Decision

Use source-bound, claim-level evidence as the recommendation authority. Every recommendation assertion must resolve to one or more preserved EvidenceClaim records and their source excerpts. Source text is never merged into a provenance-free authority blob.

Evidence is immutable by research-job revision. Refresh creates a new evidence-pack version or child-job snapshot. Local validation, normalization, citation checks, policy checks, conflict preservation, and eligibility remain authoritative; AI may assist extraction or reconciliation but cannot override them.

## Decision Details

### Conceptual entities

- CandidateSource identifies a proposed product/source relationship from discovery and remains untrusted until policy validation.
- SourceRecord represents one retrieved public source with canonical identity, provenance, policy result, freshness, and sanitized artifact references.
- RetrievalAttempt records one bounded provider operation, its execution context, result classification, traffic metadata, and timestamps.
- EvidenceClaim is one product/variant/criterion assertion tied to a SourceRecord and excerpt.
- EvidenceConflict groups materially competing claims and records resolution state, rule, and limitations.
- EvidencePack is an immutable, versioned evidence snapshot for one candidate and research-job revision.
- ProviderExecutionRecord captures sanitized adapter status, contract version, timing, and origin without credentials or private responses.
- ConfidenceAssessment records observable evidence factors and the policy/model version used to interpret them.

These are proposed conceptual roles, not final TypeScript schemas.

### Source records and provenance

A SourceRecord includes source ID, canonical and original URL, domain, source organization, source type, authority class, region, language, publication time when known, retrieval time, content hash, sanitized excerpt reference, retrieval origin, freshness state, policy result, traffic metadata, and source version.

The traceability chain is:

research job -> research stage -> provider execution -> retrieval attempt -> source record -> evidence claim -> evidence pack -> recommendation citation.

Audit metadata may retain status, duration, HTTP classification, byte counts, cache information, policy outcomes, and correlation IDs. It must not retain credentials, proxy usernames, secret-bearing headers, private provider bodies, or unnecessary full-page content.

### Claims and status dimensions

An EvidenceClaim includes product identity, regional variant, canonical criterion key, raw value, raw unit, normalized value, canonical unit, source ID, excerpt reference, extraction origin, extractor version, retrieved time, applicable region, and status metadata.

Statuses are separated to avoid one ambiguous enum:

- extraction/support status: reported, normalized, supported, unsupported, missing, needs_review;
- freshness status: current, stale, unknown;
- reconciliation status: uncontested, confirmed, conflicting, resolved.

An implementation may refine names, but must preserve the separate dimensions and their meanings. A claim never becomes authoritative merely because extraction succeeded.

### Claim-type authority

There is no universal source hierarchy. Initial proposed authority is claim-specific:

- manufacturer pages and official manuals for official technical specifications;
- official support or warranty sources for warranty and compatibility policy;
- regional retailers or authorized distributors for their current price, stock, and local offer;
- independent technical reviews for measured performance;
- user reports for subjective comfort, reliability patterns, or ownership experience.

No single user report is sufficient for a deterministic hard requirement. Authority is evaluated with freshness, independence, regional relevance, variant applicability, and claim type. A highly authoritative but stale source does not automatically defeat a current regional source for a time-sensitive commercial claim.

### Independence and conflicts

Independent corroboration requires more than different URLs. The policy considers distinct organizations, original reporting, syndication, mirrored specifications, shared upstream feeds, common content hashes, and affiliated retailers. Replicated content is not counted as independent confirmation.

A material conflict is assessed using canonical criterion, normalized values, tolerance, region, variant, effective date, source authority, source independence, and freshness. All competing claims remain stored. A resolution may select a preferred claim for a specific use, but retains competing IDs, the resolution rule, unresolved limitations, and the reason for preference.

### Evidence packs and citations

An EvidencePack contains source references, claim references, conflicts, criterion coverage, freshness summary, regional applicability, unresolved questions, policy gaps, and extraction gaps. It is immutable for the job revision. A refresh creates a new version or child-job snapshot rather than overwriting history.

Every product assertion in a recommendation cites claim IDs or evidence references supplied to synthesis. Local output validation confirms that cited claims exist, apply to the correct product and criterion, and have supporting excerpts. A general product page without a supporting extracted claim is not sufficient citation authority. Material unresolved conflicts must be disclosed.

### Fixture, cached, and synthetic origin

Prepared fixtures and synthetic fixtures are valid for automated tests and demonstrations when their origin is visible. They cannot support a published target-product recommendation presented as live research. Cached evidence preserves its original origin and retrieval metadata; fallback is never labelled current live retrieval.

### Confidence inputs

Confidence derives from observable policy inputs: important-criterion coverage, mandatory coverage, source authority, independent-source count, recency, regional relevance, conflict severity, extraction reliability, and unresolved unknowns. This ADR does not define the final confidence formula or bands; those belong to a later recommendation/confidence decision.

## Alternatives Considered

### Flattened product specification record

This is simple and compatible with the current fixtures, but loses source-level support, conflict history, freshness, and regional context. Rejected as the target authority.

### Model-generated summary without preserved claims

This is convenient but cannot reliably validate citations or prevent unsupported assertions. Rejected.

### Source-bound claims with reconciliation and immutable packs

This preserves auditability, enables claim-type authority, and supports refresh/reproducibility at the cost of more storage and reconciliation logic. Proposed.

### Full pages as primary evidence

This increases retention, privacy, and storage risk and makes citation boundaries less precise. Bounded excerpts and hashes are preferred; full pages are not the primary committed evidence.

## Consequences

Recommendations become auditable and freshness/region-aware. Conflicts and unsupported claims remain visible. The system must maintain more records, hashes, source metadata, reconciliation logic, and citation validation than the current fixture path.

## Risks and Mitigations

- Source drift: preserve retrieval times, hashes, versions, and immutable packs.
- False independence: detect syndication, shared feeds, affiliation, and identical content.
- Authority misuse: evaluate claim type, freshness, region, variant, and independence together.
- Prompt leakage or secret retention: sanitize excerpts and audit metadata before persistence.
- Fixture confusion: make origin labels mandatory in UI and output contracts.

## Compatibility With Current Baseline

Current ProductRecord specifications, EvidenceRecord values, provider envelopes, prepared fixtures, cached-real fixtures, and synthetic fallbacks remain usable through an origin-aware compatibility adapter. Existing routes and tests remain unchanged by this ADR. The target evidence model is not yet implemented.

## Migration Implications

A later migration can wrap existing fixture/provider artifacts as SourceRecord and EvidenceClaim projections while preserving their prepared, cached, synthetic, or live origins. No claim should be upgraded to live solely by projection. Evidence-pack creation must be introduced before target comparative synthesis.

## Validation and Acceptance Criteria

- Every recommendation assertion has a valid source-bound citation.
- Provenance reaches the source, retrieval, provider execution, stage, and job.
- Extraction, freshness, support, and reconciliation statuses remain distinct.
- Conflicts are retained and material resolutions are explained.
- Source authority is claim-type-specific and independence-aware.
- Evidence packs are immutable and refreshable without overwriting history.
- Synthetic and fixture origins cannot masquerade as live evidence.
- Local validation can reject unsupported citations and wrong-product claims.

## Unresolved Implementation Choices

Exact evidence schemas, excerpt storage, retention, source-authority policy tables, conflict tolerances, freshness thresholds, extractor implementations, and confidence formula remain open. No database, object-storage, cache, or provider vendor is selected.

## Approval Gate

Owner approval is required before implementation. Approval of this ADR is separate from Migration Wave 1 authorization.

See [ADR-001](ADR-001-dynamic-decision-templates-and-contract-versioning.md) for canonical criterion identity and [ADR-003](ADR-003-research-job-state-machine-and-idempotency.md) for idempotent production and refresh of evidence packs.
