import type { FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

let started = false;

// Must run BEFORE getAI(). Without a site key it is skipped (dev only).
export function ensureAppCheck(app: FirebaseApp) {
  if (started || typeof window === 'undefined') return;
  const key = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!key) {
    console.warn('[AI] NEXT_PUBLIC_RECAPTCHA_SITE_KEY missing: App Check is OFF.');
    return;
  }
  if (process.env.NODE_ENV !== 'production') {
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(key),
    isTokenAutoRefreshEnabled: true,
  });
  started = true;
}
