import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();

export const onEventWrite = functions.firestore
  .document('events/{eventId}')
  .onWrite(async (change, context) => {
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    let action: 'added' | 'updated' | 'deleted';
    let eventData: FirebaseFirestore.DocumentData;

    if (!before && after) {
      action = 'added';
      eventData = after;
    } else if (before && !after) {
      action = 'deleted';
      eventData = before;
    } else if (before && after) {
      action = 'updated';
      eventData = after;
    } else {
      return;
    }

    const { coupleId, createdBy, title, day, month, year } = eventData;

    // Get the couple to find the partner
    const coupleSnap = await db.doc(`couples/${coupleId}`).get();
    if (!coupleSnap.exists) return;
    const couple = coupleSnap.data()!;

    const partnerId = couple.user1 === createdBy ? couple.user2 : couple.user1;
    if (!partnerId) return;

    // Get partner FCM token
    const partnerSnap = await db.doc(`users/${partnerId}`).get();
    if (!partnerSnap.exists) return;
    const partner = partnerSnap.data()!;
    const fcmToken: string | null = partner.fcmToken ?? null;
    if (!fcmToken) return;

    const dateStr = `${month}/${day}/${year}`;
    const body = action === 'deleted'
      ? `"${title}" on ${dateStr} was removed.`
      : action === 'added'
        ? `"${title}" added on ${dateStr}.`
        : `"${title}" on ${dateStr} was updated.`;

    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: 'Cally — Calendar Update',
        body,
      },
      data: { action, coupleId, eventId: context.params.eventId },
      webpush: { notification: { icon: '/icons/icon-192x192.png' } },
    });
  });
