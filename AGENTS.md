# cookedUserStory Repository Instructions

## Purpose and architecture status

`cookedUserStory` is an evidence-aware purchasing decision tool that turns a purchasing brief into a structured comparison with visible provenance, explicit uncertainty, deterministic eligibility, and explained trade-offs.

- **Implemented baseline:** The tracked Next.js application is the working compatibility baseline. It uses fixed category configuration, prepared product fixtures, a four-stage workbench, local deterministic weighted scoring, and bounded server-side provider integrations.
- **Approved target, not implemented:** `docs/architecture.md` and accepted ADRs describe owner-approved direction for governed dynamic decision templates, source-bound evidence, and resumable research jobs. They do not prove implementation and do not authorize it.
- Do not begin a migration wave, select infrastructure, or implement a future feature without task-specific owner authorization. Preserve the working baseline during any authorized migration unless the task explicitly says otherwise.

## Instruction and authorization hierarchy

Follow, in order:

1. active platform and user instructions;
2. the applicable `AGENTS.md` or `AGENTS.override.md` files;
3. protocols explicitly incorporated by those instructions;
4. repository documentation as technical context.

The active user request controls authorization to edit, stage, commit, push, publish, deploy, access secrets, or broaden scope. Documentation is context, not permission. Stop when scope, architecture, privacy, security, or ownership is unclear.

## Repository map

- `app/`: Next.js App Router UI and server route handlers.
- `components/`: client workbench and presentation data.
- `lib/contracts/`: central Zod schemas, enums, and inferred TypeScript types.
- `lib/config/`: fixed current category and criterion configuration.
- `lib/domain/`: validated product-fixture loading.
- `lib/scoring/`: authoritative current deterministic scoring engine.
- `lib/providers/`: server-only external-provider adapters.
- `lib/retrieval/`: bounded retrieval targets, validation, and excerpt helpers.
- `data/`: prepared product data and provider fixtures or fallbacks.
- `tests/`: Vitest contract, scoring, provider, route, and integration tests.
- `docs/`: target architecture and accepted-but-unimplemented ADRs.
- `HANDOFF.md`: baseline, approval status, unknowns, and next-gate context.

## Toolchain and commands

`package.json` is the source of truth. Use npm; the repository requires Node.js `>=24.16.0 <25` and npm `>=11.13.0 <12` and declares `npm@11.13.0`.

- `npm run dev`: Next.js development server.
- `npm run build`: production build.
- `npm run start`: serve the production build.
- `npm run lint`: ESLint over the repository.
- `npm run typecheck`: `tsc --noEmit`.
- `npm test`: one Vitest run.
- `npm run test:watch`: Vitest watch mode.
- `npm run verify`: `npm run lint && npm run typecheck && npm test && npm run build`.

Do not claim a command passes unless it ran in the current task. Documentation-only changes normally need diff and Markdown/content inspection, not the full suite. Source, test, dependency, or build-configuration changes normally need focused checks plus `npm run verify`. Live-provider validation is separate from fixture-based automated tests; report it only when it was actually run.

## Implementation conventions

### Current baseline

- Preserve strict TypeScript and existing repository patterns. Reuse or extend `lib/contracts/` rather than creating competing schemas.
- Validate untrusted external data and cross-boundary request, response, provider, fixture, and domain data with Zod before treating it as trusted state.
- Keep provider modules and credentials server-only. Client components must never receive credentials or private provider responses.
- Keep provider status, data origin, fallback, unknown, missing, and conflict states explicit. Provider failure or fallback must never be presented as live success.
- Local deterministic validation, mandatory checks, eligibility, and scoring authority cannot be silently overridden by AI or provider output.

### Approved future boundaries — unimplemented

- Candidate discovery and public-URL retrieval are separate boundaries. Retrieval transports do not discover or recommend products.
- Secondary providers must remain optional, independently removable, and outside the default critical path.
- Target AI reasoning remains subordinate to local schema validation, hard constraints, eligibility, provenance, conflict handling, citation validation, freshness, safety, and target policy.
- Do not introduce a database, queue, authentication system, cloud provider, discovery provider, deployment provider, or new dependency without explicit task authorization and any required architecture decision.

## Security, privacy, and retrieval boundaries

- Use public data only unless a future task explicitly establishes a different approved boundary.
- Never put secrets, credentials, tokens, account data, private provider payloads, private logs, workplace-confidential data, or personal data in this public repository.
- Never expose credentials through browser code, URLs, logs, fixtures, committed excerpts, or error responses.
- Do not claim login bypass, paywall bypass, CAPTCHA bypass, unrestricted crawling, universal access, or universal product coverage.
- Treat URLs, redirects, retrieved content, model output, and provider errors as untrusted input.
- When retrieval is relevant, preserve bounded requests, response-size and decompression limits, content and target-policy checks, redirect revalidation, and SSRF protections. Do not weaken allowlists or other protections for convenience.
- Commit only short, sanitized public evidence excerpts and necessary metadata when explicitly appropriate; never commit full scraped pages.

## Generated and local files

Do not commit `.env*` files except the approved `.env.example`, `node_modules/`, `.next/`, coverage output, logs, generated reports, screenshots, temporary scripts, local databases, caches, or machine-specific paths and artifacts. Keep generated or local material outside the tracked change and remove task-created temporary artifacts before completion.

## Testing and evidence discipline

- Inspect the implementation behind named commands before relying on them, then run checks appropriate to the changed files.
- Distinguish checks run in the current task from historical or documented results. Classify blocked or skipped checks honestly and explain the limitation.
- Never weaken a test, validation boundary, or verification requirement merely to obtain a passing result.
- Before completion, inspect the entire final diff for unrelated changes, secret-like values, generated files, unsupported claims, and accidental future-scope implementation.

## Documentation discipline

Factual documentation must distinguish among:

- implemented or directly demonstrated behavior;
- reported runtime observations that were not reproduced in the current task;
- owner-approved but unimplemented direction;
- unresolved or unknown decisions.

Never describe an architecture proposal, accepted ADR, handoff statement, fixture result, or historical check as implemented or currently validated merely because it is documented. When an authorized change alters underlying facts, keep code claims, tests, `README.md`, `HANDOFF.md`, architecture documentation, and ADRs consistent within the authorized scope.

## Git safety and scope control

- When exact state matters, inspect the remote, branch, commit, divergence, worktree, and index before mutation.
- Report unexpected dirty state; do not erase it. Preserve unrelated user work and avoid modifying files outside the authorized scope.
- Editing, staging, committing, pushing, publishing, and deploying are separate authorizations. Do only the steps explicitly authorized.
- Force-push, reset, clean, rebase, amend, history rewriting, and destructive recovery require explicit authorization.
- Stage only approved files. Before an authorized push, recheck the remote state, branch, divergence, staged diff, and intended destination.

## Definition of done

A change is complete only when:

- it stays within authorized scope;
- required checks ran successfully or limitations were reported accurately;
- the final diff contains only intended changes;
- temporary and generated artifacts are absent;
- secrets and private data are absent;
- documentation accurately matches the resulting state;
- authorized Git delivery steps are complete, when applicable; and
- the agent stops instead of automatically beginning another pass.
