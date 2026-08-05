export function Hero() {
  return (
    <section className="rounded-[2rem] border border-slate-800 bg-slate-900/90 p-10 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.2em] text-sky-400/90">Black Bull Studio</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Build the next AI creative studio with Supabase and OpenAI.
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          A clean Next.js foundation built with App Router, TypeScript, Tailwind CSS, and ESLint.
          Deploy faster with ready-to-use Supabase and OpenAI integration points.
        </p>
      </div>
    </section>
  );
}
