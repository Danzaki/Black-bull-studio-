type FeatureCardProps = {
  title: string;
  description: string;
};

export function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <article className="rounded-[1.75rem] border border-stone-800 bg-stone-900/85 p-6 transition hover:border-sky-400/40 hover:bg-stone-900">
      <h3 className="text-xl font-semibold text-stone-900">{title}</h3>
      <p className="mt-3 text-stone-400">{description}</p>
    </article>
  );
}
