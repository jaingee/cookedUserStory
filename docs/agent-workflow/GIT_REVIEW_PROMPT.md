# Independent Git-Change Review Prompt

Use this prompt to review one commit, a commit range, a branch comparison, or a
pull request independently of its Implementer. The review is evidence-first and
review-only by default.

```markdown
# Independent Git-change review

Apply the root and every path-applicable `AGENTS.md` or override. If expected
repository instructions are absent or inaccessible, do not guess; return
`INCONCLUSIVE`.

Treat the Implementer's summary, PR prose, handoff, and reported checks as claims
to assess, not proof of correctness. Do not implement corrections or mutate the
repository, Git metadata, remote, or host unless the review authorization below
expressly permits the specific action.

## Review inputs

- Form: <one_commit | commit_range | branch_comparison | pull_request>
- Selector: <commit, exact range endpoints, branch refs, or PR URL/number>
- Comparison semantics: <base/parent choice; base excluded and head included>
- Original task: <verbatim task or authoritative reference>
- Acceptance requirements/IDs: <list>
- Authorized implementation and delivery scope: <list>
- Relevant specification/architecture:
  - <source> — <implemented | approved-unimplemented |
    reported-observation | unresolved>
- Expected validation: <task-specific checks and evidence>
- Known limitations: <none or list>

## Reviewer authorization

Default: local read-only inspection of existing immutable objects only.

- Remote/API inspection: <yes/no and boundary>
- Fetch or other Git-metadata mutation: <yes/no and exact remote/ref>
- Checkout, worktree, or temporary clone creation: <yes/no and location/boundary>
- Test, build, or script execution: <yes/no; artifact and cleanup boundary>
- External write action such as PR comment, approval, merge, or label: <yes/no
  and exact action>

Anything not listed is not authorized. If a required object or risk-appropriate
check is unavailable under this authorization, record the gap; do not mutate
around it.

## Review protocol

1. Resolve and record immutable reviewed objects:
   - One commit: exact commit SHA and its selected parent. A merge commit requires
     an explicit parent choice; inspect other-parent implications where material.
   - Commit range: exact base and head SHAs; the commit set is base-exclusive and
     head-inclusive, and the aggregate tree change is base to head.
   - Branch comparison: exact base-tip and head-tip SHAs plus their merge base;
     review the aggregate change from merge base to head.
   - Pull request: exact PR base/head SHAs and merge base; review merge base to
     head and record the PR snapshot used.
2. For every multi-commit review, inspect the per-commit path inventory as well
   as the aggregate patch. Inspect per-commit content wherever add-then-delete,
   secret/private history, unauthorized scope, or misleading intermediate state
   could be hidden by the aggregate diff.
3. Inspect the complete changed-file inventory, aggregate patch, resulting files,
   commit list, and relevant surrounding implementation. Include deletions,
   renames, binaries, submodules, generated files, dependency/lock changes, and
   documentation.
4. Trace every acceptance requirement to implementation and current evidence.
   Identify omitted requirements, invented behavior, and work beyond authority.
5. Review in this priority order:
   correctness; security/privacy; destructive or data-loss risk; architecture and
   invariants; task acceptance; unauthorized scope; evidence honesty; tests;
   maintainability; documentation accuracy.
6. Inspect relevant tests and assertions, not only a green status. Check whether
   they exercise acceptance and likely failure paths, ran against the reviewed
   object, or were weakened to manufacture success.
7. Classify claims:
   - `Verified`: directly inspected in this review; record method, SHA, and
     environment where relevant.
   - `Reported`: asserted by an Implementer, user, document, provider report, or
     historical result; name the source.
   - `Inferred`: a conclusion drawn from identified evidence; state the basis.
   - `Unknown`: not established or not assessed.
   Authorization is governing input, not technical evidence.
8. When architecture material is relevant, preserve its status. Do not treat an
   accepted-but-unimplemented target as current behavior, a missing target feature
   as a current defect, or architecture direction as implementation authorization.
9. Inspect for unrelated work, unsafe Git behavior, secrets/private data,
   generated/local artifacts, unsupported factual claims, and incomplete cleanup.
10. For a moving branch or PR, re-resolve the head through an authorized method
    immediately before the decision. If it moved, the review covers only the
    recorded old SHA and cannot approve the new head.
11. Produce the required output below. Green checks alone do not justify approval.

## Finding format

[Critical | High | Medium] <path:line, changed object, or commit>
Issue: <specific defect>
Impact: <concrete failure or risk>
Correction: <smallest adequate remedy>
Evidence: <diff, implementation, test, task, instruction, or specification fact>

A material finding requires evidence establishing a defect in the reviewed
change, delivery, committed artifact, or explicitly required acceptance
deliverable. Examples include incorrect implementation, a current failing test
attributable to the change, unauthorized code or delivery, a security/privacy or
architecture-invariant violation, a committed factual documentation error, or a
demonstrably absent required acceptance artifact. Such findings may require
`CORRECTION_REQUIRED`.

An evidence gap means proof needed to determine correctness is unavailable, stale,
tied to another immutable object, or otherwise insufficient. Examples include a
missing current-head result, prior-SHA evidence, unavailable required live-provider
validation or environment, and a missing selector or immutable evidence boundary.
An evidence gap by itself is not a material defect in the reviewed change. Record
it under `Evidence gaps`; when it is required for approval, return `INCONCLUSIVE`.

Unsupported Implementer, PR, or handoff prose is normally `Reported`, not a
material finding merely because current proof is unavailable. It may become a
material finding when the misleading claim is itself a committed or explicitly
required deliverable, or independent evidence establishes that it is false rather
than merely unverified.

Severity:

- Critical: credible secret exposure, severe security/privacy breach,
  irreversible data loss, or fundamentally unsafe behavior.
- High: likely correctness/acceptance failure, unauthorized scope, or a major
  invariant or architecture violation.
- Medium: a bounded but established implementation or delivery defect, test
  weakness, maintainability regression, or committed factual documentation error
  that requires correction.

Omit cosmetic preferences and speculative nits.

## Required output

### Review decision

`APPROVE | CORRECTION_REQUIRED | INCONCLUSIVE`

State the exact reviewed base/parent, head SHA, and selector snapshot.

### Material findings

Order findings by severity. If none, state exactly:

`No material findings.`

### Evidence gaps

Classify each as `Verified`, `Reported`, `Inferred`, or `Unknown`; identify
its consequence and whether it prevents approval. Even with no material findings,
list remaining unverified areas explicitly.

### Tests/evidence inspected

List exact artifacts and commands, the reviewed SHA/environment, result, and
whether the reviewer reran a check or inspected existing evidence.

### Scope assessment

State whether the actual change matches task authorization and acceptance scope.

### Architecture/security assessment

State the applicable invariants examined and preserve implemented,
approved-unimplemented, reported-observation, and unresolved status.

### Commit assessment

Assess comparison boundaries, commit coherence, messages, intermediate history,
base/head stability, and whether reviewed objects match the requested target.

### Confidence

`High | Medium | Low`, with the coverage reason and remaining unverified areas.

### Required correction or next action

Name the smallest required action, or `None` for an approval. A correction must
be reviewed as a new immutable SHA or patch-set identifier; this does not authorize
anyone to create a commit.
```

## Decision precedence

1. `CORRECTION_REQUIRED` when at least one material defect in the reviewed change
   or delivery is established.
2. Otherwise, `INCONCLUSIVE` when evidence required to determine approval is
   missing, stale, tied to another immutable object, unavailable, or otherwise
   insufficient.
3. `APPROVE` only when there are no material findings, the evidence minimum is
   met, and every remaining unknown is explicitly non-material.

Do not manufacture a material finding solely to avoid returning `INCONCLUSIVE`.
Do not downgrade an established defect to an evidence gap merely because more
evidence could also be collected.

A reported correction never converts the prior decision automatically. Review the
new immutable object.

## Confidence semantics

Confidence describes review coverage, not the probability that the change is
correct.

- `High`: complete immutable scope, relevant context, and risk-appropriate
  current evidence were inspected.
- `Medium`: the complete change and core evidence were inspected; remaining
  gaps are explicitly non-material.
- `Low`: meaningful context or evidence is unavailable. A low-confidence review
  cannot approve.

## Minimum evidence

Normally require:

- original task, acceptance requirements, and authorization boundary;
- exact immutable base/parent and head with unambiguous semantics;
- complete file inventory, aggregate diff, resulting content, and commit list;
- per-commit path inventory for multi-commit changes;
- applicable instructions and relevant current implementation/specification;
- requirement-to-change-and-evidence trace;
- relevant test definitions and current results tied to the reviewed object, or
  an explicit material limitation; and
- inspection for unauthorized scope, secret/private content, generated artifacts,
  dependency changes, deletions, and inaccurate documentation.

A dirty worktree must not be erased or allowed to contaminate evidence for
committed objects. Use an expressly authorized isolated environment or classify
the unavailable proof.

## Stronger evidence for high-risk changes

- Security/privacy: abuse cases, negative authorization and boundary tests,
  secret scanning, client/server exposure inspection, and dependency review.
- Destructive/data changes: migration dry run, rollback/restore evidence,
  compatibility and partial-failure tests, and irreversibility analysis.
- Concurrent/job work: duplicate-delivery, idempotency, cancellation, retry,
  checkpoint, and race tests.
- Retrieval/provider work: SSRF, redirect, size/decompression, content-policy,
  timeout, and honest fallback tests; live checks only when authorized.
- Dependencies: upstream change evidence, lock/transitive review, vulnerability
  and licensing evidence.
- Release/configuration: checks against the exact artifact and environment,
  rollout/rollback evidence, and delivery-state verification.
- UI behavior: browser, accessibility, and loading/error/fallback evidence.

## Failure modes this review must detect

- Wrong parent, range, merge base, base branch, or stale PR head
- Review of prose, a staged diff, or a dirty working tree instead of immutable objects
- Intermediate secret/private or unauthorized content hidden by an aggregate diff
- Missing path-applicable instructions or documentation treated as authorization
- Future architecture presented as implemented
- Historical, fixture, cached, fallback, or provider reports presented as current proof
- Green tests that miss acceptance, were weakened, or ran against another object
- Hidden deletions, binaries, submodules, generated files, dependencies, or lock changes
- Unauthorized product scope, migration, infrastructure, delivery, or destructive recovery
- Credentials, private payloads, machine paths, logs, full retrieved pages, or reports in history
- Provider or AI output overriding deterministic validation or eligibility authority
- Documentation claiming behavior the change and evidence do not demonstrate
- Approval despite material evidence gaps or after the reviewed head moved
