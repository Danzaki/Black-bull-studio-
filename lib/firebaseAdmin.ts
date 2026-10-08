import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

function getAdminApp() {
  if (getApps().length) return getApps()[0];

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_B64
    ? Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8')
    : process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable');
  }

  console.log('Firebase key source:', process.env.FIREBASE_SERVICE_ACCOUNT_B64 ? 'B64' : 'JSON', 'length:', serviceAccountJson.length, 'starts:', serviceAccountJson.slice(0, 1));
  const serviceAccount = JSON.parse(serviceAccountJson);

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

export async function sendPushNotification(
  tokens: string[],
  title: string,
  body: string,
  url?: string
) {
  if (tokens.length === 0) return;

  const app = getAdminApp();
  const messaging = getMessaging(app);

  try {
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      webpush: {
        fcmOptions: url ? { link: url } : undefined,
      },
    });
    response.responses.forEach((r, i) => {
      if (!r.success) console.error('Push failed for token', i, r.error?.code, r.error?.message);
    });
    return response;
  } catch (err) {
    console.error('Push send error:', err);
    throw err;
  }
}
