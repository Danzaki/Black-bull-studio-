export function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-[3rem] border border-amber-400/10 bg-slate-950/95 p-8 shadow-[0_45px_120px_-50px_rgba(251,191,36,0.45)] sm:p-12 lg:px-16 lg:py-16">
      <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.25),_transparent_55%)]" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm uppercase tracking-[0.32em] text-amber-300/80">Premium creative studio</p>
          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Build luxury AI campaigns with a bold gold and black brand experience.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
            Black Bull Studio brings AI-powered storyboarding, meme design, and community workflows into a polished product for bold brands.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <a
              href="#studio"
              className="inline-flex items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/30 transition hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              Explore AI Studio
            </a>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-amber-400 hover:text-white"
            >
              View features
            </a>
          </div>
        </div>

        <div className="relative flex-1 rounded-[2.5rem] border border-amber-400/10 bg-slate-900/90 p-6 shadow-2xl shadow-amber-500/10 sm:p-8">
          <div className="absolute inset-x-6 top-6 hidden h-24 rounded-[2rem] bg-amber-400/5 blur-3xl lg:block" />
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-800/90 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5">
            <div className="flex items-center justify-between rounded-3xl bg-slate-950/90 p-4 text-sm text-slate-300">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="font-medium text-white">Live AI workspace</span>
              <span className="text-slate-500">Preview</span>
            </div>
            <div className="mt-6 grid gap-4">
              <div className="rounded-[1.75rem] bg-slate-950 p-5 shadow-inner shadow-slate-950/20">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Prompt</p>
                <p className="mt-3 text-base text-slate-100">Create a bold campaign concept for a luxury fashion and AI meme launch.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.75rem] bg-slate-900/95 p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Tone</p>
                  <p className="mt-3 text-lg font-semibold text-white">Modern premium</p>
                </div>
                <div className="rounded-[1.75rem] bg-slate-900/95 p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Output</p>
                  <p className="mt-3 text-lg font-semibold text-white">Viral meme concepts</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
