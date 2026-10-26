import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f7f5f2] px-6 text-center text-stone-900">
      <p className="text-5xl font-black text-[#f97316]">404</p>
      <h1 className="text-lg font-bold">Page not found</h1>
      <p className="max-w-xs text-sm text-stone-500">This page does not exist or was removed.</p>
      <Link href="/community" className="rounded-full bg-[#f97316] px-5 py-2 text-sm font-bold text-black active:scale-95">
        Go home
      </Link>
    </div>
  );
}
