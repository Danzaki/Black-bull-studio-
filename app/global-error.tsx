'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#f7f5f2', color: '#1c1917', fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: 24 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Something went wrong</h1>
        <button onClick={() => reset()} style={{ background: '#f97316', color: '#000', border: 0, borderRadius: 999, padding: '10px 20px', fontWeight: 700 }}>
          Try again
        </button>
      </body>
    </html>
  );
}
