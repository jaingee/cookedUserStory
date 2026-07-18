const categories = ["Laptop", "Air purifier", "Lab oven"];
const stages = ["Describe", "Confirm", "Compare", "Recommend"];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-12 sm:px-10 lg:py-16">
      <header className="max-w-3xl border-l-4 border-sky-500 pl-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
          Wave 0 foundation
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          cookedUserStory
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          A technical product decision assistant for useful, evidence-aware comparisons.
        </p>
      </header>

      <section className="mt-12" aria-labelledby="categories-heading">
        <h2 id="categories-heading" className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Supported categories
        </h2>
        <ul className="mt-4 flex flex-wrap gap-3" aria-label="Supported product categories">
          {categories.map((category) => (
            <li key={category} className="border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800">
              {category}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="workflow-heading">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="workflow-heading" className="text-2xl font-semibold tracking-tight text-slate-950">
              Planned decision path
            </h2>
            <p className="mt-2 text-slate-600">Four clear stages, currently placeholders.</p>
          </div>
          <p className="text-sm font-medium text-amber-800">Implementation has not yet begun.</p>
        </div>

        <ol className="mt-6 grid gap-px overflow-hidden border border-slate-300 bg-slate-300 md:grid-cols-4">
          {stages.map((stage, index) => (
            <li key={stage} className="bg-white p-5">
              <span className="text-xs font-bold tabular-nums text-sky-700">0{index + 1}</span>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">{stage}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">Placeholder for the Wave 1 workflow.</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-auto pt-14 text-sm text-slate-500">
        Foundation only. No recommendations are being cooked yet.
      </footer>
    </main>
  );
}
