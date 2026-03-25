import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingInstance } from './firebase';
import { updateFcmToken } from './firestore';

export async function requestNotificationPermission(uid: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const messaging = await getMessagingInstance();
    if (!messaging) return;
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const token = await getToken(messaging, { vapidKey });
    if (token) await updateFcmToken(uid, token);
  } catch {
    // Silently fail — notifications are optional
  }
}

export async function setupForegroundMessages(): Promise<() => void> {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  const unsubscribe = onMessage(messaging, (payload) => {
    const title = payload.notification?.title ?? 'Cally';
    const body = payload.notification?.body ?? '';
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icons/icon-192x192.png' });
    }
  });
  return unsubscribe;
}
