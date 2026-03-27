import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, getAuth, connectAuthEmulator } from 'firebase/auth';
import { Firestore, getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase is only initialized client-side. During SSR / build the module
// exports stubs so that Next.js page rendering never throws.
//
// Use globalThis to persist emulator-connection flags across Next.js Fast
// Refresh hot reloads.  Module-level `let` variables are re-initialised on
// every hot reload, which would cause `connectFirestoreEmulator` /
// `connectAuthEmulator` to be called a second time on an already-connected
// instance — throwing "Firestore has already been started" in dev mode.
declare const globalThis: {
  _callyApp?: FirebaseApp;
  _callyAuth?: Auth;
  _callyDb?: Firestore;
  _callyStorage?: FirebaseStorage;
  _callyAuthEmulatorConnected?: boolean;
  _callyFirestoreEmulatorConnected?: boolean;
} & typeof global;

let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;
const isAuthEmulatorConnected = () => !!globalThis._callyAuthEmulatorConnected;
const setAuthEmulatorConnected = () => { globalThis._callyAuthEmulatorConnected = true; };
const isFirestoreEmulatorConnected = () => !!globalThis._callyFirestoreEmulatorConnected;
const setFirestoreEmulatorConnected = () => { globalThis._callyFirestoreEmulatorConnected = true; };

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getAuthInstance(): Auth {
  if (!_auth) {
    _auth = getAuth(getFirebaseApp());
    if (process.env.NEXT_PUBLIC_USE_EMULATORS === 'true' && !isAuthEmulatorConnected()) {
      connectAuthEmulator(_auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      setAuthEmulatorConnected();
    }
  }
  return _auth;
}

export function getDbInstance(): Firestore {
  if (!_db) {
    _db = getFirestore(getFirebaseApp());
    if (process.env.NEXT_PUBLIC_USE_EMULATORS === 'true' && !isFirestoreEmulatorConnected()) {
      connectFirestoreEmulator(_db, '127.0.0.1', 8080);
      setFirestoreEmulatorConnected();
    }
  }
  return _db;
}

export function getStorageInstance(): FirebaseStorage {
  if (!_storage) {
    _storage = getStorage(getFirebaseApp());
  }
  return _storage;
}

// Convenience re-exports that are safe for SSR — they lazily initialize.
// Use getAuthInstance() / getDbInstance() in lib modules to avoid top-level calls.
export const auth = typeof window !== 'undefined' ? getAuthInstance() : null;
export const db = typeof window !== 'undefined' ? getDbInstance() : null;

export const getMessagingInstance = async () => {
  if (typeof window === 'undefined') return null;
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(getFirebaseApp());
};
