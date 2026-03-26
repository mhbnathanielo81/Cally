import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { getAuthInstance } from './firebase';
import { upsertUser } from './firestore';

const provider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<void> {
  const auth = getAuthInstance();
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
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getAuthInstance());
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(getAuthInstance(), callback);
}
