import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDbInstance, getStorageInstance } from './firebase';
import { CallyEvent, Couple, UserProfile, AddEventPayload, EventHistoryEntry } from '@/types';

/* ---- Users ---- */
export async function upsertUser(user: User): Promise<void> {
  const db = getDbInstance();
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? '',
      photoURL: user.photoURL ?? '',
      bio: '',
      coupleId: null,
      fcmToken: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, {
      displayName: user.displayName ?? '',
      photoURL: user.photoURL ?? '',
      updatedAt: serverTimestamp(),
    });
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = getDbInstance();
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function updateFcmToken(uid: string, token: string): Promise<void> {
  const db = getDbInstance();
  await updateDoc(doc(db, 'users', uid), { fcmToken: token, updatedAt: serverTimestamp() });
}

export async function updateUserProfile(uid: string, updates: { bio?: string; photoURL?: string }): Promise<void> {
  const db = getDbInstance();
  await updateDoc(doc(db, 'users', uid), { ...updates, updatedAt: serverTimestamp() });
}

export async function uploadProfilePhoto(uid: string, file: File): Promise<string> {
  const storage = getStorageInstance();
  const photoRef = storageRef(storage, `users/${uid}/profile`);
  await uploadBytes(photoRef, file);
  return getDownloadURL(photoRef);
}

/* ---- Couples ---- */
function generateInviteCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createCouple(user: User): Promise<string> {
  const db = getDbInstance();
  const coupleRef = doc(collection(db, 'couples'));
  const inviteCode = generateInviteCode();
  const coupleId = coupleRef.id;
  await setDoc(coupleRef, {
    coupleId,
    user1: user.uid,
    user1DisplayName: user.displayName ?? '',
    user1PhotoURL: user.photoURL ?? '',
    user2: null,
    user2DisplayName: null,
    user2PhotoURL: null,
    inviteCode,
    status: 'pending' as const,
    createdAt: serverTimestamp(),
    linkedAt: null,
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'users', user.uid), { coupleId, updatedAt: serverTimestamp() });
  return inviteCode;
}

export async function joinCouple(user: User, inviteCode: string): Promise<void> {
  const db = getDbInstance();
  const q = query(
    collection(db, 'couples'),
    where('inviteCode', '==', inviteCode),
    where('status', '==', 'pending'),
  );
  const snaps = await getDocs(q);
  if (snaps.empty) throw new Error('Invalid or expired invite code.');
  const coupleDoc = snaps.docs[0];
  const couple = coupleDoc.data() as Couple;
  // Check expiry (24 hours) — createdAt is a server Timestamp on reads
  const createdAt = couple.createdAt as Timestamp | null;
  if (!createdAt) throw new Error('Invalid invite code data.');
  const created = createdAt.toDate();
  if (Date.now() - created.getTime() > 24 * 60 * 60 * 1000) {
    throw new Error('Invite code has expired.');
  }
  if (couple.user1 === user.uid) throw new Error('You cannot join your own couple.');
  await updateDoc(coupleDoc.ref, {
    user2: user.uid,
    user2DisplayName: user.displayName ?? '',
    user2PhotoURL: user.photoURL ?? '',
    status: 'linked',
    linkedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    inviteCode: '',
  });
  await updateDoc(doc(db, 'users', user.uid), {
    coupleId: couple.coupleId,
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToCouple(coupleId: string, callback: (couple: Couple | null) => void) {
  const db = getDbInstance();
  return onSnapshot(doc(db, 'couples', coupleId), (snap) => {
    callback(snap.exists() ? (snap.data() as Couple) : null);
  });
}

/* ---- Events ---- */

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatEventDate(day: number, month: number, year: number): string {
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

interface HistoryContext {
  changedBy: string;
  changedByName: string;
  previousEvent?: CallyEvent;
}

async function writeEventHistory(
  db: ReturnType<typeof getDbInstance>,
  entry: Omit<EventHistoryEntry, 'id' | 'changedAt'>,
): Promise<void> {
  try {
    await addDoc(collection(db, 'eventHistory'), {
      ...entry,
      changedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[Cally] writeEventHistory error:', err);
  }
}

export async function addEvent(
  coupleId: string,
  createdBy: string,
  payload: AddEventPayload,
  ctx?: Pick<HistoryContext, 'changedByName'>,
): Promise<string> {
  const db = getDbInstance();
  const docRef = await addDoc(collection(db, 'events'), {
    coupleId,
    createdBy,
    type: 'event',
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await writeEventHistory(db, {
    coupleId,
    eventId: docRef.id,
    eventTitle: payload.title,
    eventDate: formatEventDate(payload.day, payload.month, payload.year),
    action: 'created',
    changedBy: createdBy,
    changedByName: ctx?.changedByName ?? '',
  });
  return docRef.id;
}

export async function updateEvent(
  eventId: string,
  payload: Partial<AddEventPayload>,
  ctx?: HistoryContext,
): Promise<void> {
  const db = getDbInstance();
  await updateDoc(doc(db, 'events', eventId), { ...payload, updatedAt: serverTimestamp() });
  if (ctx?.changedBy && ctx?.previousEvent) {
    const prev = ctx.previousEvent;
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    (Object.keys(payload) as (keyof AddEventPayload)[]).forEach((key) => {
      const oldVal = prev[key as keyof CallyEvent];
      const newVal = payload[key];
      if (oldVal !== newVal) {
        changes[key] = { from: oldVal ?? null, to: newVal ?? null };
      }
    });
    await writeEventHistory(db, {
      coupleId: prev.coupleId,
      eventId,
      eventTitle: payload.title ?? prev.title,
      eventDate: formatEventDate(prev.day, prev.month, prev.year),
      action: 'updated',
      changedBy: ctx.changedBy,
      changedByName: ctx.changedByName,
      changes,
    });
  }
}

export async function deleteEvent(eventId: string, ctx?: HistoryContext & { event?: CallyEvent }): Promise<void> {
  const db = getDbInstance();
  await deleteDoc(doc(db, 'events', eventId));
  if (ctx?.changedBy && ctx?.event) {
    const ev = ctx.event;
    await writeEventHistory(db, {
      coupleId: ev.coupleId,
      eventId,
      eventTitle: ev.title,
      eventDate: formatEventDate(ev.day, ev.month, ev.year),
      action: 'deleted',
      changedBy: ctx.changedBy,
      changedByName: ctx.changedByName,
    });
  }
}

export function subscribeToEvents(coupleId: string, callback: (events: CallyEvent[]) => void) {
  const db = getDbInstance();
  const q = query(collection(db, 'events'), where('coupleId', '==', coupleId));
  return onSnapshot(
    q,
    (snap) => {
      const events = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CallyEvent));
      callback(events);
    },
    (error) => {
      console.error('[Cally] subscribeToEvents error:', error);
      callback([]);
    },
  );
}

/* ---- Event History ---- */
export function subscribeToEventHistory(
  coupleId: string,
  callback: (entries: EventHistoryEntry[]) => void,
) {
  const db = getDbInstance();
  const q = query(
    collection(db, 'eventHistory'),
    where('coupleId', '==', coupleId),
    orderBy('changedAt', 'desc'),
    limit(100),
  );
  return onSnapshot(
    q,
    (snap) => {
      const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventHistoryEntry));
      callback(entries);
    },
    (error) => {
      console.error('[Cally] subscribeToEventHistory error:', error);
      callback([]);
    },
  );
}
