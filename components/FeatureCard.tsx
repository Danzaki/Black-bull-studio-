type FeatureCardProps = {
  title: string;
  description: string;
};

export function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <article className="rounded-[1.75rem] border border-slate-800 bg-slate-900/85 p-6 transition hover:border-sky-400/40 hover:bg-slate-900">
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <p className="mt-3 text-slate-400">{description}</p>
    </article>
  );
}
