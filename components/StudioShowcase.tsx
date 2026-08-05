export function StudioShowcase() {
  return (
    <section id="studio" className="relative overflow-hidden rounded-[2.5rem] border border-amber-400/10 bg-slate-900/90 px-6 py-10 shadow-2xl shadow-slate-950/30 sm:px-10 sm:py-14">
      <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-amber-500/15 to-transparent" />
      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-amber-300/80">AI Meme Studio</p>
          <h3 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Generate premium memes with AI, brand energy, and viral-ready themes.
          </h3>
          <p className="mt-4 text-base leading-8 text-slate-300 sm:text-lg">
            Black Bull Studio blends generative creativity and polished design so teams can prototype social campaigns, viral assets, and branded digital moments faster.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-slate-950/90 p-6 ring-1 ring-slate-800/90">
              <p className="text-sm uppercase tracking-[0.26em] text-slate-400">Use case</p>
              <p className="mt-3 text-lg font-semibold text-white">Create brand-safe memes with AI prompts.</p>
            </div>
            <div className="rounded-3xl bg-slate-950/90 p-6 ring-1 ring-slate-800/90">
              <p className="text-sm uppercase tracking-[0.26em] text-slate-400">Benefit</p>
              <p className="mt-3 text-lg font-semibold text-white">Save production time while keeping premium creative control.</p>
            </div>
          </div>
        </div>

        <div className="relative rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-1 shadow-2xl shadow-amber-500/15">
          <div className="rounded-[1.75rem] bg-slate-950 p-6 sm:p-8">
            <div className="flex items-center justify-between rounded-3xl border border-slate-800/90 bg-slate-900/90 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Prompt</p>
                <p className="mt-2 text-sm text-slate-200">“Dynamic cyberpunk bull celebrating a brand launch.”</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                AI
              </span>
            </div>

            <div className="mt-6 space-y-5">
              <div className="rounded-3xl border border-slate-800/90 bg-slate-900/90 p-5">
                <p className="text-sm text-slate-400">Theme</p>
                <p className="mt-3 text-base font-semibold text-white">Bold, sophisticated, modern.</p>
              </div>
              <div className="rounded-3xl border border-slate-800/90 bg-slate-900/90 p-5">
                <p className="text-sm text-slate-400">Style</p>
                <p className="mt-3 text-base font-semibold text-white">Dark luxury with gold highlights.</p>
              </div>
            </div>

            <div className="mt-8 rounded-[1.5rem] bg-gradient-to-br from-slate-950 to-slate-900 p-6 text-slate-200 shadow-inner shadow-slate-950/30">
              <h4 className="text-sm uppercase tracking-[0.3em] text-amber-300/80">Meme preview</h4>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                A premium interface for drafting social-first visual campaigns, remixing captions, and generating engaging meme concepts for brand storytelling.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
