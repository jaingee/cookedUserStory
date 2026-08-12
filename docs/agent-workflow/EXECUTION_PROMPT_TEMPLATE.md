# Compact Execution Prompt Template

Use this template for bounded Codex execution tasks. It supplements the applicable
repository instructions; it does not replace them.

Before execution, confirm that the root and any path-applicable `AGENTS.md` or
override files are present, readable, and loaded. If the expected instructions are
absent or inaccessible, stop without mutation and request the missing instructions.

The compact default is the normal path. Add conditional blocks only when
triggered; never paste empty boilerplate. Task-specific authorization and
authorized edit scope are never optional.

## Compact default

```markdown
# Task: <short outcome>

Applicable repository instructions loaded: <yes, or stop>

## Objective and acceptance

Objective: <one outcome-focused sentence>

- <requirement ID, when useful>: <observable acceptance condition>
  - Evidence: <specific check, artifact, or inspection>

## Authorization

- Inspect: <allowed boundaries>
- Edit: <yes/no> — <exact files, directories, or component boundary>
- Stage: <yes/no> — <approved files if yes>
- Commit: <yes/no> — <commit boundary/message if yes>
- Push: <yes/no> — <remote and branch if yes>
- Publish/release: <yes/no> — <destination if yes>
- Deploy: <yes/no> — <environment if yes>
- External network/provider/credential access: <yes/no> — <boundary if yes>
- Host mutation or installation: <yes/no> — <target and boundary if yes>

Any unlisted mutation or delivery action is not authorized.

## Validation and return evidence

- Required checks or inspection: <task-specific list>.
- Return: <requirement-to-evidence result, changed/untracked/staged-file
  inventory, commands and results, limitations, remaining unknowns, and final
  stage/commit/push/publish/deploy state>.
```

For a trivial task, combine objective and acceptance into one line and validation
into one line. It may omit requirement IDs and every conditional block below. Do
not omit authorization, authorized edit scope, observable acceptance, or
evidence.

## Conditional blocks

Add a block only when its condition applies.

### Exact repository baseline

Use when identity, branch, SHA, worktree/index state, concurrency, or delivery
matters.

```markdown
## Expected repository baseline

<Remote, branch, SHA, divergence, worktree, and index expectation.>

On mismatch: <stop/report action unique to this task>.
```

### Status-bearing context

Use when the task relies on architecture, an ADR, a handoff, provider history,
or another source whose implementation/evidence status could be misread.

```markdown
## Task context

- <path or section> — <implemented | approved-unimplemented |
  reported-observation | unresolved> — <why it matters>
```

If architecture, an ADR, a handoff, provider history, or another status-bearing
document is referenced, the context entry and its status label are required.
`approved-unimplemented` material is direction, not current behavior or
implementation authority. `reported-observation` is not current proof.

### Change budget, task invariant, or unique stop

Use only the entries that add task-local control.

```markdown
## Change budget

<Allowed breadth, files/subsystems, dependency budget, and architecture-decision
budget.>

## Task-specific invariants

- <Invariant not already governed by repository instructions.>

## Unique stop conditions

- <Only a condition introduced by this task.>
```

## Optional extensions

Add only the fields needed by the selected extension.

### Migration

- Authorized migration wave and approval reference
- Source state, target state, and compatibility baseline
- Data/state preservation, cutover, backout, and deprecation boundaries
- Decisions that are approved and decisions that must remain unresolved
- Migration-specific verification and acceptance evidence

### Release or deployment

- Exact ref or artifact, destination, and environment
- Separate tag, release, publish, rollout, and deployment authorizations
- Release gate, smoke checks, rollback trigger, and post-release evidence

### External-provider verification

- Provider, endpoint/environment, account boundary, and live-versus-fixture intent
- Network and credential authorization; permitted public data
- Traffic, time, cost, and retry budget
- Fallback behavior and evidence required to call a result live or current

### Host or network mutation

- Exact host/resource and authorized mutation
- Blast radius, downtime, pre-state evidence, backup, and rollback
- Restart, credential, cleanup, and post-state-check authorization

### Generated-artifact provenance

- Generator and version; public/licensed source inputs
- Options or regeneration command and output allowlist
- Tracked/untracked disposition and deterministic review expectations

### Complex cleanup

- Exact task-owned targets and reference inventory
- Retention, recovery, deletion, and cleanup-verification boundaries
- Prohibited broad patterns or destructive fallbacks

### Security acceptance

- Threat boundary, required properties, abuse cases, and fail-closed behavior
- Negative tests and stronger review evidence
- Residual risks and the named authority allowed to accept them

### Multi-workstream orchestration

- Workstreams, dependencies, and read-only/editor roles
- Disjoint file ownership and shared-contract gates
- Synchronization points, reconciliation owner, and per-workstream evidence
- Final integration and delivery authorization

## Compression guardrails

Do not compress away:

- granular mutation and delivery authorization;
- the authorized edit boundary;
- observable acceptance conditions;
- required current-task evidence;
- an exact baseline when the task depends on one; or
- the status of referenced future, historical, or unresolved material.

Do not repeat the repository command catalog, general Git safety, privacy,
security, retrieval, generated-file, documentation, or definition-of-done rules
already governed by `AGENTS.md`. Point to the narrow relevant source instead of
copying it.

## Evidence vocabulary

- `Verified`: directly inspected in the current task; record the method and,
  when relevant, the exact SHA and environment.
- `Reported`: asserted by an Implementer, user, document, provider report, or
  historical result; identify the source.
- `Inferred`: a conclusion drawn from identified evidence; state the basis.
- `Unknown`: not established or not assessed.

Authorization is a governing input, not technical evidence.

## Future deterministic candidates

Potential later scripts include repository preflight, changed/staged/untracked
inventory, allowed-path checks, generated/local-artifact checks,
secret-like-value checks, cleanup postconditions, remote-state recheck, and
standard evidence capture.

Such scripts should be evidence producers: read-only by default, bounded and
redacted, with no fetch, delete, stage, commit, or delivery behavior unless that
operation is separately and explicitly authorized. No script is implemented by
this template.
