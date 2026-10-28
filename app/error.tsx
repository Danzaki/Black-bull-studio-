'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bbl-bg px-6 text-center text-stone-900">
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="max-w-xs text-sm text-stone-500">An unexpected error happened. You can try again.</p>
      <div className="flex gap-3">
        <button onClick={() => reset()} className="rounded-full bg-bbl-accent px-5 py-2 text-sm font-bold text-black active:scale-95">
          Try again
        </button>
        <a href="/community" className="rounded-full border border-stone-900/15 px-5 py-2 text-sm font-semibold active:scale-95">
          Go home
        </a>
      </div>
    </div>
  );
}
