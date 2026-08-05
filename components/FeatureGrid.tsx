type Feature = {
  title: string;
  description: string;
  accent: string;
};

type FeatureGridProps = {
  features: Feature[];
};

export function FeatureGrid({ features }: FeatureGridProps) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {features.map((feature) => (
        <article
          key={feature.title}
          className="group overflow-hidden rounded-[2rem] border border-slate-800/90 bg-slate-900/90 p-8 transition hover:-translate-y-1 hover:border-amber-400/30 hover:bg-slate-900"
        >
          <div className="inline-flex rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-200 shadow-sm shadow-amber-500/10">
            {feature.accent}
          </div>
          <h3 className="mt-6 text-xl font-semibold text-white">{feature.title}</h3>
          <p className="mt-4 text-slate-300">{feature.description}</p>
        </article>
      ))}
    </div>
  );
}
