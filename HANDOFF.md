# cookedUserStory — Hackathon Handoff

## 1. Operating status

This file is the operational source of truth for the 3.5-hour `cookedUserStory` hackathon build. It is project context, not proof that repository state, provider access, tests, commits, or runtime behaviour are valid.

- Project: `cookedUserStory`
- Local repository: `C:\Users\User\Desktop\cookedUserStory`
- Remote: `https://github.com/jaingee/cookedUserStory`
- Primary branch: `main`
- Repository visibility: public
- Reviewer and Orchestrator: ChatGPT
- Implementer: Codex
- Product priority: usefulness first
- Tone: friendly and lightly funny only where it does not reduce clarity

ChatGPT may inspect pushed GitHub content when available. It cannot inspect local-only files, unpushed changes, local runtime behaviour, or command output that has not been supplied.

## 2. Single MVP success condition

The MVP succeeds when a user can enter a purchasing need, confirm extracted requirements, compare three products in one of three supported categories, see mandatory failures and unknowns, change weights, receive a deterministic recommendation, and open evidence and provider-status details in a working frontend.

The supported categories are exactly:

1. `laptop`
2. `air_purifier`
3. `lab_oven`

The application must not claim universal product support.

### Required demo path

The primary live demo path is `laptop`.

The same frontend and scoring engine must also run prepared `air_purifier` and `lab_oven` fixtures. These two categories prove category extensibility; they do not need full live research during the presentation.

Each category contains three prepared products.

`air_purifier` replaces the earlier 3D-printer category because it is more broadly relatable and offers clearer consumer-facing comparison fields such as CADR, room coverage, noise, filter cost, power use, and price.

## 3. Fixed decisions

- Use a single Next.js TypeScript application with App Router and server-side route handlers.
- Use local JSON or TypeScript fixtures. No database and no authentication.
- Use one shared deterministic scoring library.
- Use category configurations rather than category-specific application forks.
- Failed mandatory requirements disqualify a product.
- An unknown mandatory value places the product in `needs_confirmation`; it cannot be the primary recommendation.
- Missing preferred values receive a score of `0` and remain visibly labelled.
- Provider failures must not crash the demo.
- Every displayed claim must be labelled as live, cached, fixture, synthetic, estimated, calculated, reported, missing, or conflicting as applicable.
- Secrets remain server-side and are never committed.
- No Codex thread begins another pass automatically.

## 4. Provisional assumptions

These assumptions must be tested before relying on them:

- Sponsor credentials are available.
- AI& and Doubleword support the selected models and structured outputs.
- Oxylabs Residential Proxies can retrieve at least one selected public product page.
- Daytona latency is acceptable for one scoring call.
- Nosana has a pre-deployed or already validated workload.
- Hackathon rules permit prepared fixtures and cached provider responses.
- A public deployment is either unnecessary or can be completed without exposing secrets.

If a provisional assumption fails, use the documented fallback or stop for an owner decision.

## 5. Decisions required before Wave 0

The Reviewer must settle:

1. Package manager: recommended `npm`.
2. Styling: recommended Tailwind from the initial scaffold; otherwise plain global CSS.
3. Test runner: recommended Vitest.
4. Demo region and currency: recommended Singapore and SGD.
5. Exact three products per category.
6. Exact category criteria and default weights.
7. AI& model ID and environment-variable names.
8. Doubleword model ID and environment-variable names.
9. Daytona runtime: recommended TypeScript.
10. Nosana task: recommended evidence-quality review.
11. Provider timeout values and whether one retry is allowed.
12. Whether the judging rules require every sponsor call to be live.
13. Whether preparation before the 3.5-hour timer is permitted.
14. Deployment target, if required.
15. Exact air-purifier criteria and units. Recommended:
    - mandatory: maximum budget, minimum CADR, minimum room coverage;
    - preferred: price, CADR, room coverage, noise level, filter replacement cost, and power consumption.

Do not launch parallel implementation until the shared contracts and file ownership are accepted.

## 6. Sponsor roles and fallback policy

| Sponsor | Minimum credible role | Preferred demo mode | Required fallback |
|---|---|---|---|
| AI& | Classify category and extract requirements into a strict schema | Live | Cached validated requirement result |
| Oxylabs | Retrieve one known public product URL through Residential Proxies | Live for one laptop source | Cached text excerpt and retrieval metadata |
| Doubleword | Extract structured claims from the retrieved text | Live if prevalidated | Cached structured extraction |
| Daytona | Execute the same versioned scoring payload in an isolated sandbox | Live | Local deterministic scoring |
| Nosana | Review evidence and return confirmation warnings | Live only if predeployed | Cached result from a previously successful run |

Residential Proxies are a retrieval transport, not a product-search database. Product candidate discovery for the MVP comes from prepared category fixtures. Oxylabs enriches one selected source.

A cached response may be shown only when it was captured from a real successful provider call or is explicitly labelled `synthetic_fixture`. The UI must show the actual mode.

At least three providers should run live in the final demo when credentials and latency allow. Recommended live set: AI&, Oxylabs, and Daytona. Doubleword and Nosana remain live-preferred but non-blocking.

## 7. Shared contracts

Wave 0 must create and freeze equivalent TypeScript contracts before parallel work begins.

```ts
export type ProductCategory = "laptop" | "air_purifier" | "lab_oven";

export type ProviderStatus =
  | "live"
  | "cached"
  | "fallback"
  | "unavailable"
  | "error";

export type DataOrigin =
  | "live"
  | "cached"
  | "fixture"
  | "synthetic";

export type ClaimStatus =
  | "manufacturer_reported"
  | "retailer_reported"
  | "user_supplied"
  | "estimated"
  | "calculated"
  | "missing"
  | "conflicting";

export type QualificationStatus =
  | "qualified"
  | "disqualified"
  | "needs_confirmation";

export interface ProviderResult<T> {
  provider: "aiand" | "oxylabs" | "doubleword" | "daytona" | "nosana";
  status: ProviderStatus;
  origin: DataOrigin;
  data: T | null;
  durationMs?: number;
  warning?: string;
  errorCode?: string;
}

export interface Requirement {
  id: string;
  key: string;
  label: string;
  kind: "mandatory" | "preferred";
  operator: "gte" | "lte" | "eq" | "includes";
  target: number | string | boolean;
  unit?: string;
  weight?: number;
}

export interface EvidenceRecord {
  id: string;
  sourceUrl: string;
  sourceTitle: string;
  retrievedAt: string;
  excerpt: string;
  origin: DataOrigin;
  claimStatus: ClaimStatus;
}

export interface SpecValue {
  value: number | string | boolean | null;
  unit?: string;
  origin: DataOrigin;
  claimStatus: ClaimStatus;
  confidence: "high" | "medium" | "low";
  evidenceIds: string[];
}

export interface ProductRecord {
  id: string;
  category: ProductCategory;
  manufacturer: string;
  model: string;
  price: number | null;
  currency: "SGD";
  specifications: Record<string, SpecValue>;
  evidence: EvidenceRecord[];
}

export interface CriterionConfig {
  key: string;
  label: string;
  mode: "higher" | "lower" | "threshold";
  unit?: string;
  defaultWeight: number;
}

export interface CategoryConfig {
  category: ProductCategory;
  criteria: CriterionConfig[];
}

export interface RankedProduct {
  productId: string;
  qualification: QualificationStatus;
  failures: string[];
  unknowns: string[];
  criterionScores: Record<string, number>;
  weightedScore: number | null;
  valueIndex: number | null;
}
```

Parallel threads may not change these contracts. If a change is necessary, stop and return a proposed contract diff to the Reviewer.

## 8. Deterministic scoring rules

The canonical implementation is a pure local function under `lib/scoring`. Daytona executes the same versioned input and logic as a sponsor integration. If Daytona and local outputs differ, the local result is displayed with a mismatch warning.

Rules:

1. Evaluate mandatory requirements first.
2. `fail` makes the product `disqualified`.
3. `unknown` makes the product `needs_confirmation`.
4. Rank only `qualified` products.
5. A missing or invalid preferred value scores `0`.
6. Normalise positive weights automatically. If all weights are zero, use category defaults.
7. Clamp every criterion score to `0–10`.
8. For higher-is-better:

```text
all equal -> 10
otherwise -> 10 × (value - minimum) / (maximum - minimum)
```

9. For lower-is-better:

```text
all equal -> 10
otherwise -> 10 × (maximum - value) / (maximum - minimum)
```

10. Threshold preferred criterion: `10` when met, otherwise `0`.
11. Weighted score is the sum of score × normalised weight.
12. Value index, when price is a positive known number:

```text
weighted score × 1000 / price
```

13. Tie-break order:
    - more complete evidence;
    - lower known price;
    - stable product ID.

Do not implement target-distance, confidence-adjusted scoring, financial forecasting, or sensitivity analysis during the hackathon.

## 9. Frontend acceptance path

Use one page with four visible stages:

1. **Describe** — text input and three example prompts.
2. **Confirm** — category, goal, requirements, assumptions, and editable weights.
3. **Compare** — three product cards or a table, qualification status, scores, and provider status.
4. **Recommend** — winner, reason, trade-offs, unknowns, evidence drawer, and next action.

Required interactions:

- submit one laptop prompt;
- confirm or edit extracted requirements;
- compare three products;
- change at least one weight and recalculate;
- open one evidence record;
- switch to the prepared air-purifier and oven examples;
- visibly identify live, cached, fallback, and synthetic data.

Friendly copy is allowed around the workflow. Technical labels and errors remain plain.

## 10. Branch and file ownership

### Foundation

Branch: `hackathon/foundation`

Owns:

```text
package.json
package-lock.json
tsconfig.json
next.config.*
eslint.config.*
postcss.config.*
app/layout.tsx
app/page.tsx
app/globals.css
public/**
vitest.config.*
lib/contracts/**
lib/config/**
data/categories/**
tests/contracts/**
.env.example
.gitignore
README.md
HANDOFF.md
```

Wave 0 must install all approved dependencies. Later workstreams do not edit package or lock files.

### Frontend

Branch: `hackathon/frontend`

After the foundation commit is accepted, ownership of `app/page.tsx` transfers to this workstream.

Allowlist:

```text
app/page.tsx
components/**
```

### Domain and scoring

Branch: `hackathon/domain`

Allowlist:

```text
lib/domain/**
lib/scoring/**
data/products/**
tests/scoring/**
```

### AI providers

Branch: `hackathon/ai-providers`

Allowlist:

```text
lib/providers/aiand.ts
lib/providers/doubleword.ts
app/api/requirements/**
app/api/extract/**
data/provider-fixtures/aiand/**
data/provider-fixtures/doubleword/**
tests/providers/ai/**
```

### Oxylabs retrieval

Branch: `hackathon/oxylabs`

Allowlist:

```text
lib/providers/oxylabs.ts
lib/retrieval/**
app/api/retrieve/**
data/provider-fixtures/oxylabs/**
tests/providers/oxylabs/**
```

### Daytona and Nosana

Branch: `hackathon/infrastructure`

Allowlist:

```text
lib/providers/daytona.ts
lib/providers/nosana.ts
app/api/score/**
app/api/review-evidence/**
data/provider-fixtures/daytona/**
data/provider-fixtures/nosana/**
tests/providers/infrastructure/**
```

### Integration

Branch: `hackathon/integration`

The integration owner merges or cherry-picks accepted branches from the same foundation commit. Only the integration owner may change files outside a workstream allowlist after parallel work starts.

Merge order:

1. domain;
2. AI providers;
3. Oxylabs;
4. Daytona/Nosana;
5. frontend;
6. integration fixes.

No concurrent workstream edits `main`.

## 11. Security requirements

- Keep credentials in `.env.local` or the deployment secret store.
- `.gitignore` must ignore `.env*` and explicitly allow `.env.example`.
- Provider modules must be server-only.
- Do not send provider credentials to client components.
- Validate every provider response before use.
- Cache only short public excerpts and metadata, not full scraped pages.
- Do not commit account details, private logs, screenshots with credentials, or workplace-confidential information.
- Review the staged diff for secret-like values before every push.
- If an available secret scanner is already installed, run it. Do not spend hackathon time installing a complex scanner.
- Stop immediately if a secret is staged or browser exposure is required.

## 12. Reviewer–Implementer workflow

ChatGPT:

- defines the next bounded outcome;
- selects model, reasoning, and `/plan` usage;
- protects shared contracts and file ownership;
- reviews supplied evidence;
- labels findings as demonstrated, reported, inferred, or unknown;
- accepts, corrects, stops, or routes the next pass.

Codex:

- inspects and edits the authorised repository scope;
- runs applicable checks;
- commits and pushes only when authorised;
- stops on contract, ownership, security, or scope conflicts;
- does not begin another pass automatically.

Model-routing default:

- unresolved architecture or contracts: Sol high with `/plan`;
- normal bounded implementation: Luna high, direct;
- difficult integration or deterministic debugging: Luna xHigh, direct;
- Max or Ultra: not used during the hackathon without explicit owner approval.

If the requested model or reasoning control is unavailable in the active Codex interface, report that limitation and use the lowest available safe equivalent approved by the Reviewer.

## 13. Evidence proportional to the pass

### Lightweight workstream report

Return:

- branch and base SHA;
- files changed;
- concise result;
- commands run;
- test/typecheck result relevant to the pass;
- blockers;
- commit SHA and push result, if authorised.

### Full integration report

Additionally return:

- complete changed-file list;
- `npm test`, `npm run lint`, and `npm run build` results;
- one end-to-end smoke result;
- live/fallback status for all five providers;
- secret-review result;
- final branch divergence and Git status;
- known demo limitations.

Never claim a check ran when it did not.

## 14. Stop conditions

Stop and report when:

- shared contracts need to change;
- a required dependency was not approved in Wave 0;
- another thread owns the required file;
- provider credentials or endpoints are unavailable;
- a live call cannot be made without exposing secrets;
- repository state differs from the expected base;
- unrelated changes exist;
- a force push, reset, rebase, or history rewrite would be required;
- scope exceeds the defined MVP;
- tests expose an architectural decision rather than a local defect;
- the remaining time is below the final freeze threshold.

## 15. 3.5-hour execution and freeze

Assuming provider preflight and fixtures are allowed before the timer:

- 0:00–0:15 — approve Wave 0 plan and fixed decisions
- 0:15–0:35 — implement and accept foundation
- 0:35–1:35 — parallel workstreams
- 1:35–2:15 — merge and integrate
- 2:15–2:45 — provider verification and fallbacks
- 2:45–3:10 — UI hardening and demo script
- 3:10–3:30 — final freeze, restart, smoke test, and rehearsal

At 3:10, stop feature work. Only fixes that block the prepared demo path are allowed.

## 16. Cut order

When time slips, cut in this order:

1. live Nosana call; use a cached validated result;
2. live Doubleword call; use cached extraction;
3. Oxylabs retrieval for more than one page;
4. multiple user-story variants;
5. advanced editing of requirements;
6. detailed calculation trace UI;
7. live research for air purifier and oven;
8. nonessential animation and humour;
9. Daytona live execution; use local scoring and show fallback status.

Do not cut:

- working frontend;
- three selectable categories;
- three prepared products per category;
- mandatory pass/fail/unknown handling;
- deterministic scoring;
- editable weights;
- recommendation;
- evidence and origin labels;
- secret protection.

## 17. Immediate post-hackathon roadmap

1. Stabilise schemas, tests, accessibility, and setup.
2. Improve evidence provenance, conflict handling, and unit normalisation.
3. Formalise a category-plugin framework.
4. Add saved projects and persistence only after architecture approval.
5. Expand live discovery and source coverage.
6. Add advanced decision support, exports, and collaboration.
7. Address enterprise security and privacy before confidential-data workflows.
