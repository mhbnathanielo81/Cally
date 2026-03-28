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
  try {
    const result = await signInWithPopup(auth, provider);
    await upsertUser(result.user);
  } catch (err: unknown) {
    console.error('[Cally Auth] popup error:', err);
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
}

export async function handleRedirectResult(): Promise<void> {
  const auth = getAuthInstance();
  console.log('[Cally Auth] checking redirect result...');
  try {
    const result = await getRedirectResult(auth);
    console.log('[Cally Auth] redirect result:', result);
    if (result?.user) {
      await upsertUser(result.user);
      console.log('[Cally Auth] user upserted after redirect');
    }
  } catch (err) {
    console.error('[Cally Auth] redirect result error:', err);
  }
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getAuthInstance());
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(getAuthInstance(), callback);
}
