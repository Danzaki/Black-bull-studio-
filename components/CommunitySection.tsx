export function CommunitySection() {
  return (
    <section id="community" className="rounded-[2.5rem] border border-slate-800/90 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/30 sm:p-10">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.28em] text-amber-300/80">Community</p>
          <h3 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Join a growing creative collective.</h3>
          <p className="leading-8 text-slate-300 sm:text-lg">
            Connect with designers, marketers, and builders shaping new AI-first workflows. Share memes, brand systems, prompt templates, and design tokens built for premium campaigns.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              label: 'Monthly sessions',
              value: '4k+',
              detail: 'Live reviews and prompt labs built for creative teams.',
            },
            {
              label: 'Template library',
              value: '120+',
              detail: 'Brand-safe templates for rapid campaign ideation.',
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-3xl border border-slate-800/90 bg-slate-950/90 p-6">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{stat.label}</p>
              <p className="mt-4 text-3xl font-semibold text-white">{stat.value}</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">{stat.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
