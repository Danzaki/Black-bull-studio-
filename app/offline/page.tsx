export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f7f5f2] px-6 text-center text-stone-900">
      <p className="text-5xl">📡</p>
      <h1 className="text-xl font-bold">You are offline</h1>
      <p className="max-w-xs text-sm text-stone-500">
        Check your connection. Posts you already loaded are still available once you reopen the app.
      </p>
      <a href="/community" className="rounded-full bg-[#f97316] px-5 py-2 text-sm font-bold text-black">
        Try again
      </a>
    </div>
  );
}
