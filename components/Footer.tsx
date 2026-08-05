export function Footer() {
  return (
    <footer className="rounded-[2rem] border border-slate-800/90 bg-slate-950/95 px-6 py-10 shadow-2xl shadow-slate-950/20 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-8 text-slate-300">
        <div className="flex flex-col gap-4 border-b border-slate-800/90 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-amber-300/80">Black Bull Studio</p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
              AI creative workflows for brands that want a refined, premium presence across social and digital experiences.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
            <a href="#top" className="transition hover:text-white">
              Back to top
            </a>
            <a href="#community" className="transition hover:text-white">
              Community
            </a>
            <a href="#studio" className="transition hover:text-white">
              Studio
            </a>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">Product</h4>
            <ul className="mt-4 space-y-3 text-sm text-slate-400">
              <li>AI Meme Studio</li>
              <li>Brand generator</li>
              <li>Campaign assets</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">Company</h4>
            <ul className="mt-4 space-y-3 text-sm text-slate-400">
              <li>Privacy</li>
              <li>Terms</li>
              <li>Contact</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">Stay updated</h4>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">Receive design drops, campaign previews, and AI creative insight releases.</p>
          </div>
        </div>

        <p className="border-t border-slate-800/90 pt-6 text-xs uppercase tracking-[0.3em] text-slate-600">
          © 2026 Black Bull Studio. Crafted for premium creative teams.
        </p>
      </div>
    </footer>
  );
}
