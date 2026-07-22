# ADR-003 — Research-Job State Machine and Idempotency

## Status

Proposed — pending owner approval

## Context

The current application performs a bounded fixture workflow synchronously through route handlers. The target product requires research that can outlive an HTTP request, survive provider failures, report progress, cancel safely, refresh evidence, and reproduce prior recommendations.

At-least-once delivery is the realistic execution model for external work. Without explicit job/stage state, immutable inputs, checkpoints, and idempotency, retries can duplicate claims, budget debits, provider calls, or terminal transitions.

## Decision

Use a durable, provider-independent ResearchJob lifecycle containing separately persisted ResearchStage executions. Confirmed brief, template, and policy snapshots are immutable inputs. External work runs in checkpointed background execution, not as the durability boundary of an HTTP request.

Assume at-least-once delivery. Stage handlers and side effects are idempotent by job revision, stage contract version, input hash, and operation identity. Retries and refreshes create reproducible attempts or child snapshots. No queue, database, worker, cloud, or orchestration vendor is selected by this ADR.

## Decision Details

### Job lifecycle

The proposed job states are:

- draft — mutable brief exists; no external research may start.
- interpreting — brief interpretation is running or being resumed.
- awaiting_confirmation — normalized brief, template, and policy await explicit user confirmation.
- queued — confirmed immutable snapshots exist and work is scheduled.
- running — one or more stages are executing.
- cancel_requested — cancellation has been requested while active work checkpoints.
- completed — output validation succeeded with either a recommendation or an explicit no_recommendation outcome.
- completed_with_gaps — a safe recommendation is validated but optional evidence or non-critical stages are incomplete.
- cancelled — cancellation has been observed at a durable checkpoint.
- failed — no trustworthy output exists because contract, policy, budget, provider, or final validation failure could not be recovered.

Allowed normal transitions are:

draft -> interpreting -> awaiting_confirmation -> queued -> running -> completed or completed_with_gaps or failed;
running -> cancel_requested -> cancelled;
queued -> cancelled when no active external operation exists.

Cancellation is accepted from any non-terminal state: inactive jobs move directly to cancelled; active work moves through cancel_requested. Explicit retry of a terminal failure creates a new execution or child job referencing the same immutable snapshots, rather than silently mutating the historical outcome.

Job lifecycle and recommendation outcome remain separate. A validated no_recommendation result is a truthful completed decision outcome, not a degraded recommendation. completed_with_gaps is prohibited when mandatory evidence is absent, all viable candidates remain unresolved, citations fail, policy is violated, final validation fails, or no safe decision result can be produced; those cases are failed or an explicit validated no_recommendation outcome.

### Stage types and execution states

The target stage types are brief_interpretation, research_plan, candidate_discovery, broad_screening, deterministic_screening, shortlisting, deep_retrieval, claim_extraction, reconciliation, eligibility, comparative_synthesis, output_validation, and refresh.

Each stage has its own execution state:

pending -> queued -> running -> succeeded or succeeded_with_gaps or skipped or failed or cancelled;
running -> retry_scheduled -> queued.

Stage state records entry/exit times, retry eligibility, checkpoint references, progress, error classification, and its effect on job status. A stage cannot report success until its output contract and policy checks pass. A skipped stage records why it was unnecessary or unavailable.

### Confirmation and execution boundary

Draft creation, editing, local validation, confirmation, cancellation requests, and snapshot reads may be synchronous. Interpretation may run before confirmation, but candidate discovery, retrieval, extraction, reconciliation assistance, synthesis, and refresh require confirmed immutable inputs.

Confirmation creates immutable snapshots of DecisionBrief, DecisionTemplate, and ResearchPolicy. Editing a confirmed brief creates a new revision. The frontend reads persisted job/stage snapshots or events; it does not own orchestration.

### Idempotency and delivery

Assume at-least-once delivery. An operation identity includes job ID, job revision, stage type, stage contract version, canonical input hash, and attempt/operation identity. ADR-001 schema versions and criterion-definition hashes are included in the canonical input used for this key.

Before applying a side effect, the stage checks for an existing operation result. Duplicate delivery must not duplicate persisted claims, evidence-pack records, budget debits, or terminal transitions. Provider idempotency keys are used where supported. Where a provider lacks them, attempt identity and duplicate-safe result insertion provide the boundary.

Checkpoint commits and an outbox-style event boundary make stage output, budget accounting, and progress publication recoverable after process interruption. A stage may resume from the latest valid checkpoint using the same immutable input snapshot.

### Checkpoints and budgets

A durable checkpoint includes stage state, input hash, contract version, attempt count, budget ledger, provider/retrieval references, emitted-record identifiers, progress, cancellation observation, error classification, and timestamp. Immutable stage outputs are never rewritten; progress, heartbeat, and retry metadata may update.

Budget accounting is atomic for provider calls, retrieval attempts, bytes, elapsed time, retries, candidates, sources, AI usage, and storage where applicable. A stage cannot schedule new external work after its budget or cancellation boundary is reached. Every retry consumes the applicable budget.

### Retry policy

Retries are bounded by failure class, stage policy, provider policy, remaining traffic/cost/time budget, and cancellation state. Retryable cases may include transient connection failures, timeouts, rate limits, and eligible upstream failures. Retry-After is respected and backoff includes jitter.

Policy blocks, unsafe targets or redirects, unsupported content, contract/schema validation failures, ordinary non-retryable client errors, and cancellation are not retried. Invalid structured output uses validation-aware fallback or a visible gap; it does not trigger unbounded schema retries. An initial operational profile may default to one retry, but exact counts remain configurable and subject to calibration. The same policy applies to AI& stages.

### Cancellation, resumption, and refresh

Cancellation is cooperative for running operations and immediate when no external operation is active. No new stage or retry starts after cancel_requested. Provider cancellation is attempted where supported; bounded in-flight work may settle before the final cancelled checkpoint. Safe partial records may remain stored but cannot be presented as completed research. Cancellation is idempotent.

Authorized retry/resumption uses the same confirmed snapshots and a new attempt identity. A changed brief creates a new job revision. Evidence refresh creates a child job or new research revision and a new EvidencePack version; historical recommendations and evidence packs remain reproducible.

### Progress and events

Persist events or snapshots for state transitions, stage start, stage progress, retry scheduling, budget warnings, degraded stages, cancellation requests, and terminal completion. Progress indicators report stage and evidence coverage without fabricating an exact percentage.

## Alternatives Considered

### One synchronous HTTP request

It matches the current fixture path but cannot provide durable progress, cancellation, retries, or recovery when research exceeds request lifetime. Rejected for the target workflow.

### One flat job-status enum

It is easy to expose but conflates stage execution, retry, and lifecycle semantics, making recovery and user-visible progress ambiguous. Rejected.

### Durable job plus stage state machines

This preserves lifecycle clarity, checkpointed recovery, idempotency, and provider independence at the cost of persistence and orchestration complexity. Proposed.

### Provider-specific orchestration in route handlers

This couples external failures and request lifetimes to product behavior and makes provider removal difficult. Rejected as the target boundary.

## Consequences

The target can resume, cancel, refresh, and audit deep research. It requires durable state, checkpoint/outbox semantics, budget ledgers, idempotent handlers, and a progress model. The current synchronous workflow remains simpler and is retained during migration.

## Risks and Mitigations

- Duplicate delivery: composite operation identity and duplicate-safe writes.
- Stale execution: immutable snapshots and contract/input hashes.
- Budget overspend: atomic debits before scheduling new work.
- Cancellation races: cooperative checkpoints and idempotent cancellation.
- False progress: stage/evidence indicators instead of fabricated percentages.
- Provider coupling: provider-independent stage contracts and adapters.

## Compatibility With Current Baseline

The current synchronous prepared-fixture routes and deterministic scorer remain the default legacy path during initial migration. Current APIs and scoring are untouched by this ADR. The new lifecycle is introduced only behind a compatibility boundary or feature flag and is not implemented by this documentation pass.

## Migration Implications

The first authorized migration wave may add versioned target contracts and a legacy compatibility layer. Later work can project the current fixture workflow into a job/stage model, but no existing behavior is deleted until evaluation and a separate owner-approved migration gate.

## Validation and Acceptance Criteria

- Job and stage transitions are explicit and persisted.
- Confirmed inputs are immutable and reproducible.
- At-least-once delivery cannot duplicate claims, evidence, budget debits, or terminal transitions.
- Checkpoints support interruption and resumption.
- Retry, cancellation, refresh, and budget rules are bounded and visible.
- A safe no-recommendation outcome is separate from lifecycle status.
- completed_with_gaps is restricted to optional gaps.
- Historical evidence and recommendations survive refresh.
- The synchronous fixture path remains compatible.
- No infrastructure vendor is selected.

## Unresolved Implementation Choices

Persistence schema, queue/worker technology, event transport, outbox implementation, locking strategy, scheduler, deployment, authentication, observability, and exact operational budgets remain unresolved.

## Approval Gate

Owner approval is required before implementation. Approval of this ADR is separate from authorization of Migration Wave 1.

See [ADR-001](ADR-001-dynamic-decision-templates-and-contract-versioning.md) for versioned confirmed inputs and hashes, and [ADR-002](ADR-002-evidence-provenance-and-claim-type-authority.md) for the evidence records and immutable packs produced by stages.
