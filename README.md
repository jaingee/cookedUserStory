# cookedUserStory

An evidence-aware purchasing decision tool. Enter a vague purchasing need, confirm structured requirements, compare three prepared products with visible evidence and weighted scoring, and receive a deterministic recommendation with explained trade-offs.

---

## Overview

cookedUserStory turns a natural-language purchasing request into a structured comparison. It extracts requirements, evaluates mandatory and preferred criteria against prepared product data, and produces a scored, explainable recommendation — with every displayed claim labelled by origin and confidence.

The application is designed to be honest about what it knows and what it does not. Provider failures do not crash the workflow. Synthetic or fallback results are never presented as live.

---

## Why It Exists

Purchasing decisions frequently involve vague needs, incomparable product specs, and hidden trade-offs. cookedUserStory makes those trade-offs explicit: what fails mandatory requirements, what is unknown, what scores better on which criterion, and why a recommendation was or was not possible.

---

## What It Does

- Interprets a natural-language purchasing request using AI& and falls back to category defaults if the provider is unavailable or returns unusable structured output.
- Presents the interpreted category, requirements, and editable preferred-criterion weights for user review before scoring begins.
- Evaluates three prepared products per category against mandatory and preferred criteria using a deterministic local TypeScript scoring engine.
- Labels every displayed specification value with its data origin (`live_provider`, `cached_provider`, `prepared_fixture`, `synthetic_fixture`, or `local_calculation`) and claim status (e.g. `manufacturer_reported`, `estimated`, `missing`, `conflicting`).
- Optionally verifies the scoring calculation in a Daytona isolated sandbox and falls back to the local result if the sandbox is unavailable or returns a mismatch.
- Calls Oxylabs Residential Proxies to retrieve bounded product-page content for the active laptop demo target and passes the excerpt to Doubleword for structured claim extraction.
- Calls Nosana to review evidence quality and surface confirmation risks.
- Exposes actual provider execution mode (live, cached, fallback, unavailable, or error) in the UI for every provider.

---

## Supported Categories

Exactly three categories are supported. The application does not claim universal product research capability.

| Category | Label | Demo path |
|---|---|---|
| `laptop` | Laptop | Primary live demo — Oxylabs and Doubleword run against this category |
| `air_purifier` | Air purifier | Prepared fixtures |
| `lab_oven` | Lab oven | Prepared fixtures |

Each category contains exactly three prepared products.

---

## Workflow

The interface has four sequential stages.

### 1. Describe

Enter a purchasing request in natural language, or select one of the built-in example prompts. AI& attempts to classify the category and extract structured requirements. If AI& is unavailable or returns invalid structured output, category defaults are used transparently.

### 2. Confirm

Review the interpreted category, goal summary, mandatory guardrails, and preferred-criterion weights. Edit mandatory targets or adjust weights before scoring begins. Any edits are reflected immediately in the next stage.

### 3. Compare

Three prepared products are evaluated. Each product card shows:
- qualification status: `qualified`, `disqualified`, or `needs_confirmation`
- mandatory pass/fail/unknown results
- criterion-level scores and raw values
- data origin and claim status for each specification
- weighted score out of 10
- a link to open any attached evidence record

The provider status strip shows the actual execution mode for all five providers.

### 4. Recommend

The highest-ranked qualified product is presented as the primary recommendation, along with:
- the weighted score that justified the result
- trade-offs for the other products
- unresolved confirmations that prevented those products from winning
- primary evidence record
- an option to start another brief

If no product clears mandatory requirements, a "no safe recommendation" state is shown instead.

---

## Architecture

```
Next.js App Router (TypeScript)
│
├── app/page.tsx              — Mounts the single-page client component
├── components/
│   └── DecisionWorkbench.tsx — Full client workflow (Describe → Confirm → Compare → Recommend)
│
├── app/api/
│   ├── requirements/         — AI& requirement extraction
│   ├── retrieve/             — Oxylabs product-page retrieval
│   ├── extract/              — Doubleword claim extraction
│   ├── score/                — Local scoring + optional Daytona verification
│   └── review-evidence/      — Nosana evidence-quality review
│
├── lib/
│   ├── contracts/            — Zod schemas and TypeScript types (shared truth)
│   ├── config/               — Category and criterion definitions
│   ├── domain/               — Product record loading
│   ├── scoring/              — Deterministic local scoring engine
│   ├── providers/            — Server-only provider adapters
│   ├── retrieval/            — Oxylabs retrieval helpers
│   └── client/               — Type-safe API client for the frontend
│
├── data/
│   ├── products/             — Prepared product fixtures (3 per category)
│   └── provider-fixtures/    — Cached and synthetic provider responses
│
└── tests/                    — Vitest test suites for all layers
```

- No database. No authentication. No external persistence.
- Provider modules are server-only and never exposed to the client.
- All provider responses are validated with Zod before use.

---

## Provider Integrations

### AI& — Requirement extraction

Sends the user's natural-language description to an AI& chat completions endpoint and requests structured output matching a strict JSON schema. Extracted requirements include category, mandatory guardrails, preferred criteria, and assumptions.

If AI& is not configured, returns an invalid structured schema, or times out, the workflow continues with category defaults and the provider status is shown as `unavailable` or `fallback`.

**Last reported validation:** Successful upstream response, but returned content failed the expected structured schema; synthetic fallback used.

### Oxylabs — Product-page retrieval

Retrieves a known public product URL through Oxylabs Residential Proxies. The response body is bounded, a plain-text excerpt is extracted, and retrieval metadata (source URL, final URL, HTTP status, timestamp) is preserved in a validated artifact.

**Current implementation:**
- Retrieves one known product URL (ASUS Zenbook UX3405MA for the laptop demo path).
- Processes a size-bounded response.
- Preserves retrieval metadata and origin provenance.
- Falls back to a synthetic fixture when retrieval is unavailable or not configured.

**Planned expansion (not yet implemented):**
- Manufacturer product pages, Singapore retailer pages, regional prices, and availability.
- Technical manuals, datasheets, and warranty information.
- Filter, consumable, and replacement-part cost data.
- Multiple sources per product with conflict detection and evidence freshness policies.

Residential Proxies are a retrieval transport, not a product-search database or structured extraction service.

**Last reported validation:** Live provider result validated.

### Doubleword — Claim extraction

Sends the retrieved plain-text excerpt to a Doubleword chat completions endpoint and requests structured claims matching the category's known criteria. Claims are validated, deduplicated, sanitised, and rejected if they reference unsupported criteria or incompatible units.

Doubleword result status is shown explicitly. A live result does not replace prepared product specifications; it provides evidence records for the comparison.

**Last reported validation:** Live provider result validated.

### Daytona — Scoring verification

Executes the same versioned scoring payload in an isolated Daytona TypeScript sandbox. The sandbox output is compared field-by-field against the local result. If all comparisons match, the proof is marked `live`. If there is a mismatch, the local result remains authoritative and a mismatch warning is shown.

The local TypeScript scoring engine is always authoritative. Daytona confirms the calculation but does not silently replace it.

**Last reported validation:** Sandbox creation was reached, but code execution did not complete successfully; local deterministic scoring used.

### Nosana — Evidence review

Posts the scoring context (qualification statuses, unknown and conflicting criterion keys, evidence counts) to a Nosana review endpoint. The response identifies missing mandatory evidence, conflicting sources, and confirmation risks.

Nosana warnings are advisory only. They cannot change qualification, scoring, or the recommendation.

**Last reported validation:** Active live review endpoint was not validated; synthetic fallback used.

---

## Deterministic Scoring

The canonical scoring engine is a pure local TypeScript function in `lib/scoring/`. All results displayed in the UI come from this engine.

### Qualification

Mandatory requirements are evaluated first:
- A failed mandatory requirement → `disqualified`
- An unknown mandatory value → `needs_confirmation`
- A product requiring confirmation cannot become the primary recommendation

### Preferred scoring

- Missing preferred values score `0` and remain visible with a "missing" label.
- Positive weights are normalised across preferred criteria before scoring.
- If all weights are zero, category defaults are used.
- Each criterion score is clamped to `0–10`.
- Only `qualified` products are ranked.

### Scoring modes

| Mode | Formula |
|---|---|
| `higher_is_better` | `10 × (value − min) / (max − min)`; `10` if all equal |
| `lower_is_better` | `10 × (max − value) / (max − min)`; `10` if all equal |
| `threshold` | `10` if met, `0` otherwise |

### Final score

```
weighted score = Σ (criterion score × normalised weight)
```

Tie-break order: more complete evidence → lower known price → stable product ID.

---

## Evidence and Provenance

Every displayed specification value carries a data origin and claim status label.

**Data origins:**
`live_provider` · `cached_provider` · `prepared_fixture` · `synthetic_fixture` · `local_calculation`

**Claim statuses:**
`manufacturer_reported` · `retailer_reported` · `third_party_reported` · `user_supplied` · `estimated` · `calculated` · `missing` · `conflicting`

Successful retrieval does not automatically prove claim correctness. Missing information remains visible. Conflicting information is flagged. Provider failures never crash the full workflow.

---

## Current Provider Status

Provider availability depends on configured credentials, endpoints, network conditions, and upstream behaviour. The interface exposes the actual execution mode rather than presenting cached, fixture, synthetic, or local results as live.

| Provider | Last reported runtime result |
|---|---|
| AI& | Successful upstream response; returned content failed the expected structured schema; synthetic fallback used |
| Oxylabs | Live provider result validated |
| Doubleword | Live provider result validated |
| Daytona | Sandbox creation was reached; code execution did not complete successfully; local deterministic scoring used |
| Nosana | Active live review endpoint was not validated; synthetic fallback used |

These are runtime observations from the last reported provider check. The automated test suite uses fixtures and synthetic data and does not perform live provider calls. This README-writing pass did not revalidate provider access.

---

## Technology Stack

Versions are derived from `package.json`.

| Dependency | Version |
|---|---|
| Next.js | 16.2.10 |
| React | 19.2.7 |
| TypeScript | 6.0.3 |
| Tailwind CSS | 4.3.3 |
| Zod | 4.4.3 |
| Vitest | 4.1.10 |
| ESLint | 9.39.5 |
| @daytona/sdk | 0.199.0 |
| undici | 8.7.0 |
| npm | 11.13.0 |

- Runtime: Next.js App Router with server-side route handlers
- Styling: Tailwind CSS
- Validation: Zod throughout (contracts, provider responses, API boundaries)
- Tests: Vitest
- No database, no authentication, no external persistence

---

## Getting Started

### Prerequisites

- Node.js `>=24.16.0 <25`
- npm `>=11.13.0 <12`

### Installation

```bash
npm install
```

### Environment Configuration

Copy the example file and fill in your provider credentials:

```bash
# macOS / Linux
cp .env.example .env.local

# Windows
copy .env.example .env.local
```

`.env.local` must not be committed. All credentials remain server-side.

The application will run with prepared fixtures and synthetic fallbacks when live credentials are not present. Set `DEMO_PROVIDER_MODE=cache_only` to skip all live provider calls explicitly.

**Variable reference:**

```
# Global
DEMO_PROVIDER_MODE=        # Set to "cache_only" to disable all live calls

# AI& — requirement extraction
AIAND_API_KEY=
AIAND_BASE_URL=
AIAND_MODEL=
AIAND_TIMEOUT_MS=

# Oxylabs — product-page retrieval via Residential Proxies
OXYLABS_USERNAME=
OXYLABS_PASSWORD=
OXYLABS_PROXY_URL=
OXYLABS_COUNTRY=
OXYLABS_TIMEOUT_MS=

# Doubleword — structured claim extraction
DOUBLEWORD_API_KEY=
DOUBLEWORD_BASE_URL=
DOUBLEWORD_MODEL=
DOUBLEWORD_TIMEOUT_MS=

# Daytona — isolated scoring verification
DAYTONA_API_KEY=
DAYTONA_API_URL=
DAYTONA_TARGET=
DAYTONA_TIMEOUT_MS=

# Nosana — evidence-quality review
NOSANA_REVIEW_URL=
NOSANA_API_KEY=
NOSANA_TIMEOUT_MS=
```

### Run Locally

```bash
npm run dev
```

The application starts at `http://localhost:3000`. No deployed URL is currently available.

---

## Verification

Run the full verification suite:

```bash
npm run verify
```

This executes lint, type-check, tests, and production build in sequence:

```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # vitest run (10 test files, 108 tests)
npm run build       # Next.js production build
```

All checks pass on the current `main` commit. Tests use fixtures and synthetic data only — no live provider credentials are required to run the suite.

---

## Current Limitations

- Exactly three supported categories: `laptop`, `air_purifier`, `lab_oven`.
- Three prepared products per category.
- Product candidates come from prepared fixtures, not unrestricted live discovery.
- Live provider calls require valid external credentials and endpoints.
- Of the five providers, only Oxylabs and Doubleword were validated live in the last reported runtime check.
- AI& response compatibility is unresolved — structured output reached the application but failed schema validation.
- Daytona live code execution is unresolved — sandbox creation succeeded but execution did not complete.
- A real Nosana workload has not been validated in this deployment.
- Expanded multi-source Oxylabs retrieval is planned and not yet implemented.
- The local deterministic scoring engine remains authoritative for all displayed results.
- No persistence, user accounts, or saved projects.
- Not production-ready.

---

## AI-Assisted Development

OpenAI GPT-5.6 was used through Codex during the project for architecture review, implementation planning, debugging, testing guidance, and repository changes. After the available Codex usage limits were exhausted, continued repository work moved to Kiro. AI-assisted changes were still reviewed through repository inspection, automated checks, and human decision-making.

---

## Project Background

cookedUserStory began as a time-bounded hackathon prototype. Although it was not submitted before the final deadline, development continued to complete the integration work, strengthen evidence handling, and turn the prototype into a more credible portfolio project.

---

## Roadmap

- Complete live AI& structured requirement extraction.
- Complete Daytona sandbox execution and output comparison.
- Deploy and validate the Nosana evidence-review workload.
- Expand Oxylabs into multi-source regional evidence acquisition.
- Improve source reconciliation, unit normalisation, and conflict handling.
- Add evidence freshness and refresh policies.
- Formalise a category plugin framework for additional product types.
- Improve accessibility and add UI-level testing.
- Consider persistence and saved decisions only after architecture review.
- Prepare a public deployment without exposing provider secrets.

---

## Security and Data Handling

- Credentials are stored in `.env.local` or a deployment secret store and are never committed.
- Provider modules use `server-only` and credentials are never exposed to client components.
- All provider responses are validated with Zod before use.
- Retrieved content is bounded in size; only short public excerpts and metadata are processed.
- When a provider is unavailable, the fallback mode is shown to users explicitly.
- Secrets and private provider response bodies must not be committed to the repository.
