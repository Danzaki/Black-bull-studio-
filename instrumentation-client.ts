import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    ignoreErrors: ['ResizeObserver loop limit exceeded', 'Failed to fetch', 'Load failed', 'NetworkError'],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
