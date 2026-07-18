"use client";

import { useMemo, useState, type FormEvent } from "react";

import type { EvidenceRecord, ProductCategory, ProductRecord, QualificationStatus, Requirement } from "@/lib/contracts";
import { categoryConfigs, categoryConfigById } from "@/lib/config/categories";

import {
  claimLabel,
  confidenceLabel,
  criteriaForCategory,
  originLabel,
  productsByCategory,
  providerLabels,
  providersForCategory,
  scoreDemoProducts,
} from "./decision-data";

const stages = ["Describe", "Confirm", "Compare", "Recommend"] as const;

const categoryLabels: Record<ProductCategory, string> = {
  laptop: "Laptop",
  air_purifier: "Air purifier",
  lab_oven: "Lab oven",
};

const statusClasses: Record<string, string> = {
  live: "border-emerald-300 bg-emerald-50 text-emerald-800",
  cached: "border-sky-300 bg-sky-50 text-sky-800",
  fallback: "border-amber-300 bg-amber-50 text-amber-800",
  unavailable: "border-slate-300 bg-slate-100 text-slate-600",
  error: "border-rose-300 bg-rose-50 text-rose-800",
};

const qualificationClasses: Record<QualificationStatus, string> = {
  qualified: "border-emerald-300 bg-emerald-50 text-emerald-800",
  disqualified: "border-rose-300 bg-rose-50 text-rose-800",
  needs_confirmation: "border-amber-300 bg-amber-50 text-amber-900",
};

const formatValue = (value: number | string | boolean | null, unit: string | null) => {
  if (value === null) return "Missing";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return `${value}${unit && unit !== "electrical_profile" ? ` ${unit}` : ""}`;
};

const initialWeights = (requirements: Requirement[]) =>
  Object.fromEntries(requirements.filter((requirement) => requirement.kind === "preferred").map((requirement) => [requirement.id, requirement.weight]));

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${className}`}>{children}</span>;
}

function StageStepper({ activeStage, onSelect }: { activeStage: number; onSelect: (stage: number) => void }) {
  return (
    <nav aria-label="Decision workflow stages" className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <ol className="grid gap-2 sm:grid-cols-4">
        {stages.map((stage, index) => {
          const isActive = index === activeStage;
          const isAvailable = index <= activeStage;
          return (
            <li key={stage}>
              <button
                type="button"
                onClick={() => isAvailable && onSelect(index)}
                disabled={!isAvailable}
                aria-current={isActive ? "step" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${isActive ? "bg-slate-950 text-white" : isAvailable ? "text-slate-800 hover:bg-slate-100" : "cursor-not-allowed text-slate-400"}`}
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${isActive ? "bg-lime-300 text-slate-950" : "bg-slate-100 text-slate-600"}`}>{String(index + 1).padStart(2, "0")}</span>
                <span>
                  <span className="block text-sm font-bold">{stage}</span>
                  <span className={`block text-xs ${isActive ? "text-slate-300" : "text-slate-500"}`}>{index === 0 ? "Shape the need" : index === 1 ? "Check the brief" : index === 2 ? "See the trade-offs" : "Make the call"}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ProviderStatusStrip({ category }: { category: ProductCategory }) {
  return (
    <section aria-labelledby="providers-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Technical status</p>
          <h2 id="providers-heading" className="mt-1 text-lg font-bold text-slate-950">Provider runway</h2>
        </div>
        <p className="text-xs text-slate-500">Prepared fixtures stay honest about where they came from.</p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {providersForCategory(category).map(({ provider, label, result }) => (
          <div key={provider} className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-slate-900">{label}</span>
              <Badge className={statusClasses[result.status]}>{result.status}</Badge>
            </div>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{originLabel(result.origin)}</p>
            {result.warning ? <p className="mt-1 text-xs leading-5 text-slate-600">{result.warning}</p> : <p className="mt-1 text-xs leading-5 text-slate-600">{result.data?.note ?? "Provider result ready."}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function DescribeStage({ category, need, loading, error, onCategoryChange, onNeedChange, onSubmit, onExample }: {
  category: ProductCategory;
  need: string;
  loading: boolean;
  error: string | null;
  onCategoryChange: (category: ProductCategory) => void;
  onNeedChange: (need: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onExample: (prompt: string) => void;
}) {
  const config = categoryConfigById[category];
  return (
    <section aria-labelledby="describe-heading" className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">Stage 01 / Describe</p>
        <h2 id="describe-heading" className="mt-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Tell us what would make this purchase feel like a win.</h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">cookedUserStory turns a slightly messy need into a brief you can inspect before comparing products.</p>
        <form onSubmit={onSubmit} className="mt-8">
          <label htmlFor="need" className="text-sm font-bold text-white">Your need</label>
          <textarea id="need" value={need} onChange={(event) => onNeedChange(event.target.value)} rows={6} placeholder="For example: I need a quiet purifier for a 45 m² room under S$600..." className="mt-2 w-full resize-y rounded-2xl border border-slate-700 bg-slate-900 p-4 text-sm leading-6 text-white outline-none ring-lime-300 placeholder:text-slate-500 focus:ring-2" />
          {error ? <p role="alert" className="mt-3 rounded-xl border border-rose-300 bg-rose-950/60 px-3 py-2 text-sm text-rose-100">{error}</p> : null}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={loading} className="rounded-full bg-lime-300 px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-lime-200 disabled:cursor-wait disabled:opacity-60">{loading ? "Cooking the brief…" : "Continue to confirm →"}</button>
            <span className="text-xs text-slate-400">No provider call is required for this local demo.</span>
          </div>
        </form>
      </div>
      <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Supported category</p>
        <label htmlFor="category" className="sr-only">Category</label>
        <select id="category" value={category} onChange={(event) => onCategoryChange(event.target.value as ProductCategory)} className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-950">
          {categoryConfigs.map((candidate) => <option key={candidate.category} value={candidate.category}>{candidate.label}</option>)}
        </select>
        <p className="mt-6 text-sm font-bold text-slate-950">Example prompts</p>
        <div className="mt-3 space-y-3">
          {categoryConfigs.map((candidate) => <button key={candidate.category} type="button" onClick={() => { onCategoryChange(candidate.category); onExample(candidate.examplePrompt); }} className={`w-full rounded-2xl border p-4 text-left text-sm leading-6 transition ${candidate.category === category ? "border-slate-950 bg-slate-50 text-slate-950" : "border-slate-200 text-slate-600 hover:border-slate-400"}`}><span className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{candidate.label}</span><span className="mt-1 block">{candidate.examplePrompt}</span></button>)}
        </div>
        <p className="mt-6 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">Current category preview: <strong className="text-slate-800">{config.label}</strong>. We only support these three categories in this MVP.</p>
      </aside>
    </section>
  );
}

function WeightEditor({ requirements, weights, onWeightChange }: { requirements: Requirement[]; weights: Record<string, number>; onWeightChange: (id: string, weight: number) => void }) {
  const preferred = requirements.filter((requirement) => requirement.kind === "preferred");
  const total = preferred.reduce((sum, requirement) => sum + (weights[requirement.id] ?? requirement.weight), 0);
  return (
    <section aria-labelledby="weights-heading" className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Preferences</p><h3 id="weights-heading" className="mt-1 text-lg font-bold text-slate-950">What should matter more?</h3></div><span className="text-right text-sm font-bold text-slate-700">{total} points<br /><span className="text-xs font-normal text-slate-500">normalised at scoring</span></span></div>
      <div className="mt-5 space-y-4">
        {preferred.map((requirement) => <label key={requirement.id} className="grid gap-2 sm:grid-cols-[1fr_100px] sm:items-center"><span className="text-sm text-slate-800">{requirement.label}<span className="ml-2 text-xs text-slate-500">{requirement.unit}</span></span><input type="number" min="0" step="1" value={weights[requirement.id] ?? requirement.weight} onChange={(event) => onWeightChange(requirement.id, Math.max(0, Number(event.target.value) || 0))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-right text-sm font-bold text-slate-950 outline-none focus:ring-2 focus:ring-slate-950" /></label>)}
      </div>
    </section>
  );
}

function ConfirmStage({ category, need, requirements, weights, onRequirementChange, onWeightChange, onContinue }: { category: ProductCategory; need: string; requirements: Requirement[]; weights: Record<string, number>; onRequirementChange: (id: string, target: number | string | boolean) => void; onWeightChange: (id: string, weight: number) => void; onContinue: () => void }) {
  const config = criteriaForCategory(category);
  const mandatory = requirements.filter((requirement) => requirement.kind === "mandatory");
  return (
    <section aria-labelledby="confirm-heading" className="space-y-6">
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Stage 02 / Confirm</p><h2 id="confirm-heading" className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Make the brief yours before the products get a vote.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">These are local extracted defaults. Edit the targets and weights; the shared data contract stays fixed.</p></div>
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Selected category</p><h3 className="mt-1 text-xl font-bold text-slate-950">{config.label}</h3></div><Badge className="border-sky-300 bg-sky-50 text-sky-800">inferred</Badge></div><p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">“{need || config.examplePrompt}”</p></section>
          <section aria-labelledby="requirements-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Guardrails</p><h3 id="requirements-heading" className="mt-1 text-xl font-bold text-slate-950">Mandatory requirements</h3><div className="mt-5 space-y-4">{mandatory.map((requirement) => <label key={requirement.id} className="block rounded-xl border border-slate-200 p-4"><span className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-bold text-slate-900">{requirement.label}</span><span className="text-xs font-semibold text-slate-500">{requirement.operator} {requirement.unit}</span></span><input aria-label={`${requirement.label} target`} type={typeof requirement.target === "number" ? "number" : "text"} value={String(requirement.target ?? "")} onChange={(event) => onRequirementChange(requirement.id, typeof requirement.target === "number" ? Number(event.target.value) : event.target.value)} className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-950 outline-none focus:ring-2 focus:ring-slate-950" /><span className="mt-2 block text-xs text-slate-500">Required · target is editable · source: {requirement.source.replace("_", " ")}</span></label>)}</div></section>
        </div>
        <div className="space-y-6"><WeightEditor requirements={requirements} weights={weights} onWeightChange={onWeightChange} /><section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">Assumptions & review</p><h3 className="mt-1 text-xl font-bold text-slate-950">A few things to keep in view</h3><ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700"><li className="flex gap-2"><span className="font-bold text-amber-700">●</span> Demo values are prepared or synthetic fixtures, not a live product feed.</li><li className="flex gap-2"><span className="font-bold text-amber-700">●</span> Unknown mandatory values can only produce “needs confirmation”.</li><li className="flex gap-2"><span className="font-bold text-amber-700">●</span> Weights can total any amount; the scoring step normalises them.</li></ul><div className="mt-5 border-t border-amber-200 pt-4 text-sm font-bold text-amber-900">Confirmation needed: product evidence may be cached, missing, or conflicting.</div></section><button type="button" onClick={onContinue} className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800">Compare three products →</button></div>
      </div>
    </section>
  );
}

function EvidenceDrawer({ evidence: record, onClose }: { evidence: EvidenceRecord; onClose: () => void }) {
  const caution = record.claimStatus === "missing" || record.claimStatus === "conflicting";
  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="evidence-heading" className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Evidence record</p><h2 id="evidence-heading" className="mt-1 text-2xl font-bold text-slate-950">{record.sourceTitle}</h2></div><button type="button" onClick={onClose} aria-label="Close evidence drawer" className="rounded-full border border-slate-300 px-3 py-1 text-xl leading-none text-slate-700 hover:bg-slate-100">×</button></div><div className="mt-8 space-y-5"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Excerpt</p><p className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{record.excerpt}</p></div><dl className="grid gap-4 text-sm"><div><dt className="font-bold text-slate-500">Source URL</dt><dd className="mt-1 break-all text-slate-800">{record.sourceUrl ? <a href={record.sourceUrl} target="_blank" rel="noreferrer" className="underline decoration-slate-300 underline-offset-4 hover:decoration-slate-950">{record.sourceUrl}</a> : "Not available"}</dd></div><div><dt className="font-bold text-slate-500">Retrieved</dt><dd className="mt-1 text-slate-800">{new Date(record.retrievedAt).toLocaleString()}</dd></div><div><dt className="font-bold text-slate-500">Claim status</dt><dd className="mt-1 capitalize text-slate-800">{claimLabel(record.claimStatus)}</dd></div><div><dt className="font-bold text-slate-500">Origin</dt><dd className="mt-1 capitalize text-slate-800">{originLabel(record.origin)}</dd></div></dl>{caution ? <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">Warning: this evidence is {claimLabel(record.claimStatus)}. Confirm it before relying on the value.</p> : <p className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-900">Confidence note: this claim is available for the prepared comparison.</p>}</div></section></div>;
}

function CompareProductCard({ product, result, criteria, onEvidence }: { product: ProductRecord; result: ReturnType<typeof scoreDemoProducts>["rankedProducts"][number]; criteria: ReturnType<typeof criteriaForCategory>["criteria"]; onEvidence: (evidence: EvidenceRecord) => void }) {
  const valueFor = (key: string) => key === "price_sgd" ? product.price.amount : product.specifications[key]?.value ?? null;
  return <article className={`rounded-2xl border bg-white p-5 shadow-sm ${result.qualification === "qualified" ? "border-emerald-200" : "border-slate-200"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{product.manufacturer}</p><h3 className="mt-1 text-xl font-bold text-slate-950">{product.model}</h3></div><Badge className={qualificationClasses[result.qualification]}>{result.qualification.replace("_", " ")}</Badge></div><p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950">{product.price.amount === null ? "—" : `S$${product.price.amount.toLocaleString()}`}</p><p className="mt-1 text-xs text-slate-500">prepared comparison price</p><div className="mt-5 space-y-3">{criteria.map((criterion) => { const spec = product.specifications[criterion.key]; const missing = spec?.claimStatus === "missing" || valueFor(criterion.key) === null; const conflict = spec?.claimStatus === "conflicting"; return <div key={criterion.key} className="border-t border-slate-100 pt-3"><div className="flex items-start justify-between gap-3"><span className="text-xs font-semibold text-slate-600">{criterion.label}</span><span className="text-right text-sm font-bold text-slate-950">{formatValue(valueFor(criterion.key), criterion.unit)}</span></div><div className="mt-1 flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{originLabel(spec?.origin ?? "synthetic_fixture")}</span>{missing ? <Badge className="border-amber-300 bg-amber-50 text-amber-900">missing data</Badge> : conflict ? <Badge className="border-rose-300 bg-rose-50 text-rose-800">conflicting data</Badge> : <span className="text-[10px] text-slate-400">{confidenceLabel(spec?.confidence ?? "low")}</span>}</div></div>; })}</div>{result.failures.length > 0 ? <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3"><p className="text-xs font-bold uppercase tracking-[0.12em] text-rose-800">Mandatory failures</p><ul className="mt-2 space-y-1 text-xs leading-5 text-rose-900">{result.failures.map((failure) => <li key={failure}>{failure}</li>)}</ul></div> : null}{result.unknowns.length > 0 ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-800">Mandatory unknowns</p><ul className="mt-2 space-y-1 text-xs leading-5 text-amber-900">{result.unknowns.map((unknown) => <li key={unknown}>{unknown}</li>)}</ul></div> : null}<div className="mt-5 flex items-end justify-between gap-3 border-t border-slate-100 pt-4"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Preferred score</p><p className="mt-1 text-2xl font-extrabold text-slate-950">{result.weightedScore === null ? "—" : result.weightedScore.toFixed(1)}<span className="text-sm font-bold text-slate-400"> / 10</span></p></div><button type="button" onClick={() => onEvidence(product.evidence[0])} className="rounded-full border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 hover:border-slate-950">View evidence</button></div></article>;
}

function CompareStage({ category, products, score, onEvidence, onContinue }: { category: ProductCategory; products: ProductRecord[]; score: ReturnType<typeof scoreDemoProducts>; onEvidence: (evidence: EvidenceRecord) => void; onContinue: () => void }) {
  const criteria = criteriaForCategory(category).criteria;
  const resultById = new Map(score.rankedProducts.map((result) => [result.productId, result]));
  return <section aria-labelledby="compare-heading" className="space-y-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Stage 03 / Compare</p><h2 id="compare-heading" className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Three products. Their caveats included.</h2><p className="mt-3 text-sm leading-6 text-slate-600">Qualified options can win. Disqualified and confirmation-needed options stay visible for a fair audit trail.</p></div><Badge className="border-slate-300 bg-white text-slate-700">{categoryLabels[category]} · 3 products</Badge></div><ProviderStatusStrip category={category} /><div className="grid gap-5 lg:grid-cols-3">{products.map((product) => <CompareProductCard key={product.id} product={product} result={resultById.get(product.id)!} criteria={criteria} onEvidence={onEvidence} />)}</div><div className="flex justify-end"><button type="button" onClick={onContinue} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-extrabold text-white hover:bg-slate-800">See recommendation →</button></div></section>;
}

function RecommendStage({ products, score, onEvidence, onRestart }: { products: ProductRecord[]; score: ReturnType<typeof scoreDemoProducts>; onEvidence: (evidence: EvidenceRecord) => void; onRestart: () => void }) {
  const recommended = products.find((product) => product.id === score.recommendedProductId);
  const recommendedResult = score.rankedProducts.find((result) => result.productId === score.recommendedProductId);
  const confirmationProducts = score.rankedProducts.filter((result) => result.qualification === "needs_confirmation");
  const recommendedPrice = recommended?.price.amount;
  const valueIndex = recommended && recommendedResult?.weightedScore !== null && recommendedResult?.weightedScore !== undefined && recommendedPrice !== null && recommendedPrice !== undefined && recommendedPrice > 0 ? (recommendedResult.weightedScore * 1000) / recommendedPrice : null;
  return <section aria-labelledby="recommend-heading" className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Stage 04 / Recommend</p><h2 id="recommend-heading" className="mt-2 text-3xl font-bold tracking-tight text-slate-950">The useful answer, with the footnotes still attached.</h2></div>{score.noRecommendation ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-7 sm:p-9"><Badge className="border-rose-300 bg-white text-rose-800">no safe recommendation</Badge><h3 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950">Nothing clears the brief safely yet.</h3><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">At least one product failed a mandatory requirement or has an unresolved mandatory value. Relax a target or confirm the missing evidence before buying.</p></div> : <div className="rounded-3xl bg-slate-950 p-7 text-white shadow-xl sm:p-9"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><Badge className="border-lime-300 bg-lime-300 text-slate-950">primary recommendation</Badge><h3 className="mt-4 text-4xl font-extrabold tracking-tight">{recommended?.displayName}</h3><p className="mt-2 text-slate-300">{recommended?.manufacturer} · {recommended?.model}</p></div><div className="sm:text-right"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Weighted score</p><p className="mt-1 text-4xl font-extrabold text-lime-300">{recommendedResult?.weightedScore?.toFixed(1)}<span className="text-base text-slate-400"> / 10</span></p></div></div><p className="mt-7 max-w-2xl text-base leading-7 text-slate-200">It is the highest-scoring option that satisfies every currently known mandatory requirement. That makes it the best safe starting point—not a magical prophecy.</p><div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs uppercase tracking-[0.12em] text-slate-400">Price</p><p className="mt-1 text-xl font-bold">S${recommendedPrice?.toLocaleString() ?? "—"}</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs uppercase tracking-[0.12em] text-slate-400">Value index</p><p className="mt-1 text-xl font-bold">{valueIndex === null ? "Unavailable" : valueIndex.toFixed(2)}</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs uppercase tracking-[0.12em] text-slate-400">Evidence</p><p className="mt-1 text-xl font-bold">{recommended?.evidence.length ?? 0} records</p></div></div></div>}<div className="grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Key trade-offs</p><h3 className="mt-1 text-xl font-bold text-slate-950">What you give up</h3><ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">{score.rankedProducts.filter((result) => result.productId !== score.recommendedProductId).map((result) => <li key={result.productId} className="flex gap-2"><span className="font-bold text-slate-400">→</span><span><strong>{products.find((product) => product.id === result.productId)?.displayName}</strong>: {result.qualification === "disqualified" ? result.failures[0] : result.unknowns[0] ?? "lower preferred score"}</span></li>)}</ul></section><section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">Unresolved confirmations</p><h3 className="mt-1 text-xl font-bold text-slate-950">Before you place the order</h3>{confirmationProducts.length === 0 ? <p className="mt-4 text-sm leading-6 text-slate-700">No mandatory confirmations are blocking the primary recommendation.</p> : <ul className="mt-4 space-y-3 text-sm leading-6 text-amber-950">{confirmationProducts.map((result) => <li key={result.productId}>{products.find((product) => product.id === result.productId)?.displayName}: {result.unknowns.join(" ")}</li>)}</ul>}</section></div>{recommended ? <button type="button" onClick={() => onEvidence(recommended.evidence[0])} className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-extrabold text-slate-900 hover:border-slate-950">Open primary evidence →</button> : null}<div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5"><button type="button" onClick={onRestart} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-extrabold text-white hover:bg-slate-800">Start another brief</button><span className="text-sm text-slate-500">Next action: confirm the highest-impact unknown, then re-run the comparison.</span></div></section>;
}

export default function DecisionWorkbench() {
  const [activeStage, setActiveStage] = useState(0);
  const [category, setCategory] = useState<ProductCategory>("laptop");
  const [need, setNeed] = useState(categoryConfigById.laptop.examplePrompt);
  const [requirements, setRequirements] = useState<Requirement[]>(categoryConfigById.laptop.defaultRequirements);
  const [weights, setWeights] = useState<Record<string, number>>(initialWeights(categoryConfigById.laptop.defaultRequirements));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceRecord | null>(null);

  const products = productsByCategory[category];
  const score = useMemo(() => scoreDemoProducts(category, requirements, products, weights), [category, products, requirements, weights]);

  const changeCategory = (nextCategory: ProductCategory) => {
    const nextRequirements = categoryConfigById[nextCategory].defaultRequirements;
    setCategory(nextCategory);
    setRequirements(nextRequirements);
    setWeights(initialWeights(nextRequirements));
    setError(null);
  };

  const handleDescribeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!need.trim()) { setError("Please describe the purchase need before continuing."); return; }
    setError(null);
    setLoading(true);
    window.setTimeout(() => { setLoading(false); setActiveStage(1); }, 350);
  };

  const updateRequirement = (id: string, target: number | string | boolean) => setRequirements((current) => current.map((requirement) => requirement.id === id ? { ...requirement, target, needsConfirmation: false } : requirement));
  const updateWeight = (id: string, weight: number) => setWeights((current) => ({ ...current, [id]: weight }));
  const restart = () => { setActiveStage(0); setNeed(categoryConfigById[category].examplePrompt); };

  return <main className="mx-auto min-h-screen w-full max-w-[1440px] px-4 py-6 sm:px-8 lg:px-10 lg:py-10"><header className="flex flex-col gap-6 border-b border-slate-200 pb-8 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Decision workbench / MVP</p><h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-6xl">cookedUserStory</h1><p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">A friendly, evidence-aware product comparison for the moment when “I need a thing” needs to become “here’s the safest option.”</p></div><div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm"><span className="font-bold text-slate-950">Local demo mode</span><br />Providers are labelled, never implied.</div></header><div className="mt-8"><StageStepper activeStage={activeStage} onSelect={setActiveStage} /></div><div className="mt-8">{activeStage === 0 ? <DescribeStage category={category} need={need} loading={loading} error={error} onCategoryChange={changeCategory} onNeedChange={setNeed} onSubmit={handleDescribeSubmit} onExample={setNeed} /> : activeStage === 1 ? <ConfirmStage category={category} need={need} requirements={requirements} weights={weights} onRequirementChange={updateRequirement} onWeightChange={updateWeight} onContinue={() => setActiveStage(2)} /> : activeStage === 2 ? <CompareStage category={category} products={products} score={score} onEvidence={setSelectedEvidence} onContinue={() => setActiveStage(3)} /> : <RecommendStage products={products} score={score} onEvidence={setSelectedEvidence} onRestart={restart} />}</div><footer className="mt-12 flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>Prepared fixtures · synthetic fixtures · cached provider results · local calculation</span><span>{providerLabels.aiand} · {providerLabels.oxylabs} · {providerLabels.doubleword} · {providerLabels.daytona} · {providerLabels.nosana}</span></footer>{selectedEvidence ? <EvidenceDrawer evidence={selectedEvidence} onClose={() => setSelectedEvidence(null)} /> : null}</main>;
}
