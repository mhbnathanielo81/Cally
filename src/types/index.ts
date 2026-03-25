import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  coupleId: string | null;
  fcmToken: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Couple {
  coupleId: string;
  user1: string;
  user1DisplayName: string;
  user1PhotoURL: string;
  user2: string | null;
  user2DisplayName: string | null;
  user2PhotoURL: string | null;
  inviteCode: string;
  status: 'pending' | 'linked';
  createdAt: Timestamp;
  linkedAt: Timestamp | null;
  updatedAt: Timestamp;
}

export interface CallyEvent {
  id: string;
  coupleId: string;
  title: string;
  time: string;
  location?: string;
  notes?: string;
  day: number;
  month: number;
  year: number;
  createdBy: string;
  type: 'event' | 'dinner';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AddEventPayload {
  title: string;
  time: string;
  location?: string;
  notes?: string;
  day: number;
  month: number;
  year: number;
}
