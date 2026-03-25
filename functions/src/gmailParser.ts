import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { google } from 'googleapis';

if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();

interface DinnerReservation {
  restaurant: string;
  date: string;
  time: string;
  partySize: number;
  rawSubject: string;
  detectedAt: FirebaseFirestore.FieldValue;
}

function parseOpenTableEmail(subject: string, body: string): Omit<DinnerReservation, 'detectedAt'> | null {
  // Extract restaurant name
  const restaurantMatch = subject.match(/reservation at (.+?) /i) ?? body.match(/at (.+?) on /i);
  const restaurant = restaurantMatch?.[1]?.trim() ?? 'Unknown Restaurant';

  // Extract date (e.g. "March 15, 2025" or "3/15/2025")
  const dateMatch = body.match(/(\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b)/i)
    ?? body.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  const date = dateMatch?.[1]?.trim() ?? '';

  // Extract time
  const timeMatch = body.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
  const time = timeMatch?.[1]?.trim() ?? '';

  // Extract party size
  const partySizeMatch = body.match(/party of (\d+)/i) ?? body.match(/(\d+) (?:guests?|people|persons?)/i);
  const partySize = partySizeMatch ? parseInt(partySizeMatch[1], 10) : 2;

  if (!date || !time) return null;
  return { restaurant, date, time, partySize, rawSubject: subject };
}

export const pollGmail = functions.pubsub.schedule('every 15 minutes').onRun(async () => {
  // Get all users with Gmail tokens stored in protected subcollection
  const usersSnap = await db.collection('users').get();

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;

    // Get Gmail token from protected subcollection
    const tokenSnap = await db.doc(`users/${uid}/private/gmailToken`).get();
    if (!tokenSnap.exists) continue;

    const { refreshToken } = tokenSnap.data()!;
    if (!refreshToken) continue;

    try {
      const oauth2Client = new google.auth.OAuth2(
        functions.config().gmail?.client_id,
        functions.config().gmail?.client_secret,
        functions.config().gmail?.redirect_uri,
      );
      oauth2Client.setCredentials({ refresh_token: refreshToken });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Search for OpenTable emails from the last 15 minutes
      const since = Math.floor((Date.now() - 16 * 60 * 1000) / 1000);
      const listRes = await gmail.users.messages.list({
        userId: 'me',
        q: `from:no-reply@opentable.com after:${since}`,
      });

      const messages = listRes.data.messages ?? [];

      for (const msg of messages) {
        if (!msg.id) continue;
        const msgRes = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
        const payload = msgRes.data.payload;
        if (!payload) continue;

        const headers = payload.headers ?? [];
        const subject = headers.find((h) => h.name === 'Subject')?.value ?? '';

        let body = '';
        const parts = payload.parts ?? [payload];
        for (const part of parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body += Buffer.from(part.body.data, 'base64').toString('utf-8');
          }
        }

        const parsed = parseOpenTableEmail(subject, body);
        if (!parsed) continue;

        // Check for duplicate
        const existing = await db.collection(`pendingDinners/${uid}/items`)
          .where('rawSubject', '==', subject)
          .limit(1)
          .get();
        if (!existing.empty) continue;

        await db.collection(`pendingDinners/${uid}/items`).add({
          ...parsed,
          detectedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (err) {
      console.error(`Gmail poll error for user ${uid}:`, err);
    }
  }
});
