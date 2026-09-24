import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

function getAdminApp() {
  if (getApps().length) return getApps()[0];

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable');
  }

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
    return response;
  } catch (err) {
    console.error('Push send error:', err);
    return null;
  }
}
