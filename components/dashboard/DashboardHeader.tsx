export default function DashboardHeader() {
  return (
    <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
      <div>
        <h1 className="text-4xl font-bold text-yellow-400">
          🐂 Black Bull Dashboard
        </h1>

        <p className="mt-2 text-zinc-400">
          Welcome back. Build, create and grow your community from one place.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button className="rounded-xl bg-yellow-500 px-5 py-3 font-semibold text-black transition hover:bg-yellow-400">
          AI Studio
        </button>

        <button className="rounded-xl border border-zinc-700 px-5 py-3 text-white transition hover:border-yellow-500">
          Community
        </button>
      </div>
    </header>
  );
}