# cookedUserStory architecture

## Wave 0 foundation

This repository is one Next.js App Router application written in TypeScript. It uses npm, React, Tailwind CSS, Zod, Vitest, and ESLint. There is no database, authentication, state-management package, form package, animation package, icon package, or browser-test package.

The manually created App Router shell follows the official [Next.js installation guidance](https://nextjs.org/docs/app/getting-started/installation). Tailwind uses its official [Next.js PostCSS setup](https://tailwindcss.com/docs/installation/framework-guides/nextjs), and foundation tests use [Vitest](https://vitest.dev/guide/).

## Exact package baseline

Runtime packages are frozen at:

- `next@16.2.10`
- `react@19.2.7`
- `react-dom@19.2.7`
- `zod@4.4.3`
- `@daytona/sdk@0.199.0`
- `undici@8.7.0`
- `server-only@0.0.1`

Development packages are frozen at:

- `typescript@6.0.3`
- `@types/node@24.13.3`
- `@types/react@19.2.17`
- `@types/react-dom@19.2.3`
- `tailwindcss@4.3.3`
- `@tailwindcss/postcss@4.3.3`
- `vitest@4.1.10`
- `eslint@9.39.5`
- `eslint-config-next@16.2.10`

Later workstreams must not modify `package.json`, `package-lock.json`, `.npmrc`, `.nvmrc`, or any tool configuration without stopping and reporting the proposed change.

## Authority and boundaries

- `lib/contracts/**` owns shared Zod schemas. Zod schemas are runtime authority; TypeScript types are inferred from them where practical. Parallel workstreams must stop and report a contract diff instead of editing these files.
- `lib/config/categories.ts` owns the three category definitions and defaults. Parallel workstreams must stop and report a configuration diff instead of editing it.
- `lib/scoring/**` will own one deterministic, pure local scoring entry point. Local output remains canonical; Daytona verifies the same source and canonical payload. A mismatch becomes a warning and never replaces local authority.
- `lib/providers/**` and all provider-facing route handlers are server-only. Provider modules must import `server-only`, read credentials only from server-side environment variables, validate responses with Zod, and return status/origin envelopes.
- Provider failure falls back immediately to an eligible sanitised cache or clearly labelled synthetic fixture. Fallback must not crash the workflow or misrepresent origin.
- Product fixtures will live under `data/products/**`; provider fallbacks will live under `data/provider-fixtures/**`. Neither exists in Wave 0.
- The reducer-driven client workflow will live in `components/**` and `lib/client/**`. Neither exists in Wave 0.

## Wave 1 branches and ownership

Every branch and worktree starts directly from the accepted foundation SHA `F`.

| Branch | Owner allowlist |
| --- | --- |
| `hackathon/frontend` | `app/page.tsx`, `components/**`, `lib/client/**` |
| `hackathon/domain` | `lib/domain/**`, `lib/scoring/**`, `data/products/**`, `tests/scoring/**` |
| `hackathon/ai-providers` | `lib/providers/aiand.ts`, `lib/providers/doubleword.ts`, `app/api/requirements/**`, `app/api/extract/**`, `data/provider-fixtures/aiand/**`, `data/provider-fixtures/doubleword/**`, `tests/providers/ai/**` |
| `hackathon/oxylabs` | `lib/providers/oxylabs.ts`, `lib/retrieval/**`, `app/api/retrieve/**`, `data/provider-fixtures/oxylabs/**`, `tests/providers/oxylabs/**` |
| `hackathon/infrastructure` | `lib/providers/daytona.ts`, `lib/providers/nosana.ts`, `app/api/score/**`, `app/api/review-evidence/**`, `data/provider-fixtures/daytona/**`, `data/provider-fixtures/nosana/**`, `tests/providers/infrastructure/**` |
| `hackathon/integration` | Integration fixes approved by the integration owner; no package, lockfile, contract, or category-config changes |

The integration owner alone merges accepted workstream commits and resolves cross-stream conflicts. Merge order is domain, AI providers, Oxylabs, Daytona/Nosana, frontend, then bounded integration fixes.

`HANDOFF.md` and `OptiPlan.txt.txt` are governance inputs and remain read-only. No later workstream may modify them during implementation. `.env.example` may contain variable names with blank values only; `.env.local` and all other `.env*` files remain ignored.

## Freeze rule

At 3:10, feature work stops. Until 3:20, only fixes blocking the prepared laptop demo path are allowed and must preserve the frozen contracts, category configuration, dependency graph, and security boundaries. At 3:20, all code changes stop; only a clean restart and final rehearsal remain.
