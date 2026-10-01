import Link from "next/link";

export default function DashboardHeader() {
  return (
    <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-[#f97316] md:text-4xl">
          🐂 Black Bull Studio
        </h1>

        <p className="mt-2 text-sm text-stone-500 md:text-base">
          Welcome back. Build, create and grow your community from one place.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/studio"
          className="rounded-full bg-[#f97316] px-5 py-2.5 text-sm font-bold text-black transition-all duration-200 hover:bg-[#f97316]/90 active:scale-95"
        >
          AI Studio
        </Link>

        <Link
          href="/community"
          className="rounded-full border border-stone-900/10 bg-stone-900/[0.05] px-5 py-2.5 text-sm font-semibold text-stone-900 transition-all duration-200 hover:border-[#f97316]/40 hover:bg-stone-900/[0.05] active:scale-95"
        >
          Community
        </Link>
      </div>
    </header>
  );
}
