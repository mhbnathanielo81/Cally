import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { getAuthInstance } from './firebase';
import { upsertUser } from './firestore';

const provider = new GoogleAuthProvider();

const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

export async function signInWithGoogle(): Promise<void> {
  const auth = getAuthInstance();

  if (isLocalhost) {
    // Popup works fine on localhost
    try {
      const result = await signInWithPopup(auth, provider);
      await upsertUser(result.user);
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (
        error.code === 'auth/popup-blocked' ||
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/cancelled-popup-request'
      ) {
        await signInWithRedirect(auth, provider);
      } else {
        throw err;
      }
    }
  } else {
    // Redirect works reliably on deployed sites
    await signInWithRedirect(auth, provider);
  }
}

export async function handleRedirectResult(): Promise<void> {
  const auth = getAuthInstance();
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      await upsertUser(result.user);
    }
  } catch (err) {
    console.error('[Cally] redirect sign-in error:', err);
  }
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getAuthInstance());
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(getAuthInstance(), callback);
}
