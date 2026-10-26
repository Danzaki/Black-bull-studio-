'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function MainError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h2 className="text-lg font-bold text-bbl-text">This page failed to load</h2>
      <p className="max-w-xs text-sm text-bbl-muted">The rest of the app still works. Try again.</p>
      <button onClick={() => reset()} className="rounded-full bg-bbl-accent px-5 py-2 text-sm font-bold text-black active:scale-95">
        Try again
      </button>
    </div>
  );
}
