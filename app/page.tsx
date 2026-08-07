import { CommunitySection } from '@/components/CommunitySection';
import { FeatureGrid } from '@/components/FeatureGrid';
import { Footer } from '@/components/Footer';
import { HeroSection } from '@/components/HeroSection';
import { Navigation } from '@/components/Navigation';
import { SectionHeader } from '@/components/SectionHeader';
import { StudioShowcase } from '@/components/StudioShowcase';

const features = [
  {
    accent: 'AI-first',
    title: 'Instant concept generation',
    description: 'Generate polished campaign ideas, meme narratives, and visual prompts in one sleek workflow.',
  },
  {
    accent: 'Brand-ready',
    title: 'Premium design system',
    description: 'Gold and black theme tokens, responsive layouts, and elegant motion designed for luxury brands.',
  },
  {
    accent: 'Collaboration',
    title: 'Community workflows',
    description: 'Share assets, templates, and prompts with creative teams while keeping a polished production cadence.',
  },
];

export default function Home() {
  return (
    <main id="top" className="min-h-screen bg-slate-950 text-slate-100">
      <Navigation />

      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-6 py-10 sm:px-8 lg:gap-20 lg:px-12">
        <HeroSection />

        <section id="features" aria-labelledby="features-heading" className="space-y-10 motion-safe:animate-fade-in-up">
 ]         <SectionHeader
            eyebrow="What we build"
            title="A high-end AI studio for meaningful brand storytelling."
            description="Black Bull Studio is crafted to help creative leaders build premium campaigns, digital activations, and meme content with consistency, speed, and polish."
          />
          <FeatureGrid features={features} />
        </section>

        <StudioShowcase />

        <CommunitySection />

        <section className="rounded-[2.5rem] border border-slate-800/90 bg-slate-950/90 p-8 shadow-2xl shadow-slate-950/30 sm:p-10 motion-safe:animate-fade-in-up">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-amber-300/80">Ready to scale</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Move from concept to launch with a studio designed for premium AI campaigns.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Start building with the structure, design system, and growth-focused storytelling support needed for high-impact brand activations.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-end">
              <a
                href="#studio"
                className="inline-flex items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/30 transition hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                Start building
              </a>
              <a
                href="#community"
                className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-amber-400 hover:text-white"
              >
                Join the collective
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}
