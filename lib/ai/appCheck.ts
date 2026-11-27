import type { FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

let started = false;

// Must run BEFORE getAI().
// Preview builds (NODE_ENV=production on Vercel) can use a registered debug token:
//   NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN=<uuid>  (Preview scope ONLY, never Production)
export function ensureAppCheck(app: FirebaseApp) {
  if (started || typeof window === 'undefined') return;
  const key = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const dbg = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;
  if (!key && !dbg) {
    console.warn('[AI] NEXT_PUBLIC_RECAPTCHA_SITE_KEY missing: App Check is OFF.');
    return;
  }
  if (dbg) (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = dbg;
  else if (process.env.NODE_ENV !== 'production') (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(key || 'debug'),
    isTokenAutoRefreshEnabled: true,
  });
  started = true;
}
