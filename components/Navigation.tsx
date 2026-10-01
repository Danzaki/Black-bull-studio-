export function Navigation() {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-800/70 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 sm:px-8">
        <a href="#top" className="inline-flex items-center gap-3 text-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-700/90 to-orange-700 text-stone-950 shadow-lg shadow-orange-700/20">
            <span className="text-xl font-black">B</span>
          </span>
          <span className="text-sm font-semibold uppercase tracking-[0.28em] text-stone-100/85">Black Bull Studio</span>
        </a>

        <nav aria-label="Primary navigation" className="hidden items-center gap-8 md:flex">
          <a href="#studio" className="text-sm font-medium text-stone-300 transition hover:text-stone-900">
            Studio
          </a>
          <a href="#features" className="text-sm font-medium text-stone-300 transition hover:text-stone-900">
            Features
          </a>
          <a href="#community" className="text-sm font-medium text-stone-300 transition hover:text-stone-900">
            Community
          </a>
        </nav>

        <a
          href="#studio"
          className="inline-flex items-center justify-center rounded-full bg-orange-700 px-5 py-2.5 text-sm font-semibold text-stone-950 shadow-lg shadow-orange-700/25 transition hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          Launch Studio
        </a>
      </div>
    </header>
  );
}
