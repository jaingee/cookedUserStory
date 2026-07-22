# ADR-001 — Dynamic Decision Templates and Contract Versioning

## Status

Accepted — owner-approved; not yet implemented

## Context

The current application has fixed configurations for laptop, air purifier, and lab oven and a deterministic weighted scorer. The target product must interpret additional categories without adding a separate hardcoded scoring module for each one, while still preventing arbitrary model output from becoming trusted domain state.

The target needs reusable category knowledge, request-specific criteria, explicit confirmation, reproducible research inputs, and compatibility with the current fixture workflow. Contract evolution must not silently reinterpret historical jobs or evidence.

## Decision

Use a governed dynamic decision model:

reviewed common product ontology + immutable curated template versions + request-specific AI-generated proposals + local normalization and validation + explicit user confirmation.

Runtime schemas are authoritative. TypeScript types are inferred from those schemas where practical. Every persisted target record carries a schema version, and every confirmed decision snapshot is immutable. The current three categories are represented through a legacy compatibility layer; weighted scoring remains available only on that legacy path and is not the target recommendation authority.

## Decision Details

### Runtime authority and versions

Untrusted user, provider, or AI objects are parsed before entering trusted state. A failed or unsupported schema version is an explicit validation error; it is never coerced into the newest meaning.

Contract versions use semantic numbering:

- major: breaking structural or semantic incompatibility;
- minor: backward-compatible additive change;
- patch: implementation correction that does not change the contract meaning.

Readers advertise the schema versions they support. Historical records retain the version that created them. A migration produces an explicit new version or snapshot and records the source version. Provider prompt, model, and adapter versions are separate from domain schema versions.

### Identity and lifecycle

DecisionTemplate, DecisionCriterion, DecisionBrief, and ResearchPolicy use stable opaque identifiers, schemaVersion, version, revision, createdAt, updatedAt, provenance, and lifecycle status. A criterion-definition hash covers canonical criterion identity and semantics.

A curated template is a reviewed reusable definition and is never mutated in place. An AI proposal is an untrusted draft. A user-confirmed snapshot records the normalized values and confirmation revision. A research job freezes references to the confirmed brief, template, and policy; later edits create a new revision or child job.

Illustrative lifecycle states are template draft/reviewed/retired, brief draft/confirmed/superseded, and research snapshot frozen. These are conceptual states, not current TypeScript schemas.

### Canonical criteria

Criteria use stable namespaced keys. Illustrative keys include common.price.amount, common.availability.region, audio.anc.supported, audio.battery.runtime_hours, and audio.microphone.call_quality. These examples do not define a complete ontology.

Each criterion defines its canonical key, aliases, localized label, value type, canonical unit, display unit, allowed operators, mandatory or comparative role, qualitative scale where applicable, support state, and provenance. Support is explicitly three-way: supported, supported_with_confirmation, or unsupported.

Supported conceptual value types are number, boolean, enum, ordinal, text, and set. Deterministic hard constraints may use numbers, booleans, enums, and sets. Ordinals may be deterministic only when a reviewed scale is explicit, the user confirms it, and evidence can be normalized reliably. Free text is comparative context only and never a hard constraint.

Canonical storage units are distinct from display units. Reviewed conversions are applied only within compatible unit families. Unsupported units, dimensionally incompatible units, non-finite values, and ambiguous conversions are rejected or flagged. Raw reported values and units remain alongside normalized values.

### Confirmation and unknown categories

AI& may propose a product type, criteria, operators, units, roles, and questions. Local code maps proposals to the ontology where possible, rejects duplicates and unsafe or unsupported criteria, and flags ambiguous mappings. The normalized draft is shown to the user before expensive research.

For a category without a curated template, the confirmed request-specific template may be retained as a user or project snapshot but does not automatically become globally curated. Headphones are an illustrative example.

User edits create a new brief revision or confirmed snapshot. Curated templates are not silently mutated. A running job always uses immutable confirmed inputs.

### Legacy compatibility

The existing laptop, air_purifier, and lab_oven configurations are exposed to the target boundary as legacy-backed templates. The compatibility adapter preserves current IDs, criteria, fixtures, routes, and deterministic weighted scoring while the target contracts are introduced. New category support must not depend on adding another fixed scorer module.

## Alternatives Considered

### Fully hardcoded category modules

This matches the current baseline and is easy to test initially, but every new category requires code and release changes. It cannot provide governed request-specific criteria efficiently. Rejected as the target model; retained only as the legacy compatibility path.

### Unrestricted AI-generated schemas

This maximizes flexibility but allows unstable identifiers, unsafe operators, incompatible units, and unverifiable hard constraints into the domain. Rejected because validation and reproducibility would be weak.

### One universal untyped attribute map

This avoids template work but loses criterion semantics, operator validation, unit safety, provenance, and stable compatibility. Rejected.

### Governed ontology plus templates and confirmation

This preserves semantic control while supporting new categories and user-specific needs. It is the proposed decision, with explicit confirmation as the trust boundary.

## Consequences

Positive consequences include stable historical interpretation, safer AI extensibility, reusable curated knowledge, explicit user control, and a migration path that leaves the current demo functional.

Costs include ontology governance, schema migration work, confirmation UX, criterion-hash maintenance, and more explicit version metadata. New categories may be flagged for confirmation rather than accepted immediately.

## Risks and Mitigations

- Ontology gaps: preserve unsupported status and require confirmation instead of inventing semantics.
- Semantic drift: hash criterion definitions and freeze confirmed snapshots.
- Unit errors: use reviewed conversions and reject incompatible dimensions.
- AI overreach: keep all proposals untrusted until local validation and confirmation.
- Legacy divergence: retain a versioned compatibility adapter and evaluate old and target paths separately.

## Compatibility With Current Baseline

No current route, schema, fixture, scorer, or UI changes are made by this ADR. Existing fixed categories and weighted results remain the baseline behavior. The adapter represents those configurations as legacy-backed templates without claiming that target contracts already exist.

## Migration Implications

The first implementation step after separate authorization is versioned target contracts plus the legacy compatibility layer. Existing snapshots must retain legacy identifiers and scorer semantics. No migration wave is authorized by this draft.

## Validation and Acceptance Criteria

- Criterion identity is stable across equivalent requests and revisions.
- Curated templates and confirmed snapshots are immutable and versioned.
- Unsupported schema versions fail explicitly.
- New categories can produce a normalized, user-confirmed request-specific template.
- Values, units, operators, duplicates, and roles are validated locally.
- The three current categories remain usable through the compatibility boundary.
- New category support does not require weighted-scoring implementation.
- Provider/model versions remain distinct from domain contract versions.

## Unresolved Implementation Choices

The ontology registry, storage format, schema library layout, migration tooling, localization strategy, and exact curated-template review workflow remain open. No vendor or production TypeScript contract is selected here.

## Approval Gate

This ADR is accepted and owner-approved.

It remains unimplemented. Approval of this ADR does not authorize Migration Wave 1 or any application change. Migration Wave 1 requires a separate owner authorization after the approved ADR status has been recorded and reviewed.

See [ADR-002](ADR-002-evidence-provenance-and-claim-type-authority.md) for canonical criterion references in evidence claims and [ADR-003](ADR-003-research-job-state-machine-and-idempotency.md) for versioned snapshot inputs and stage hashes.
