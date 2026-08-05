import { FeatureCard } from '@/components/FeatureCard';
import { Hero } from '@/components/Hero';

const features = [
  {
    title: 'Supabase backend ready',
    description: 'Built with Supabase client integration for authentication, storage, and realtime data.',
  },
  {
    title: 'OpenAI creative tools',
    description: 'A prepared OpenAI service layer for generative content and AI workflow support.',
  },
  {
    title: 'Modern App Router',
    description: 'Next.js App Router with TypeScript, Tailwind CSS, and ESLint configured.',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12 lg:px-8">
        <Hero />

        <section className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} title={feature.title} description={feature.description} />
          ))}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/20">
          <h2 className="text-2xl font-semibold text-white">Ready for launch</h2>
          <p className="mt-4 max-w-2xl text-slate-300">
            Black Bull Studio is initialized with a clean, production-ready structure and
            integration points for Supabase and OpenAI. Add your environment variables and
            start building your AI creative studio.
          </p>
        </section>
      </div>
    </main>
  );
}
