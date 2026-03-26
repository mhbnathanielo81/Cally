import { CallyEvent, Couple } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'cally';
  text: string;
}

export interface CallyResponse {
  action: 'reply' | 'create_event';
  reply: string;
  event?: {
    title: string;
    day: number;
    month: number;
    year: number;
    time: string;
    location: string;
    notes: string;
    type: 'event' | 'dinner';
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Serialize all events into a plain-text list that Claude can reason about.
 * Includes day-of-week so the LLM can answer weekend/weekday questions.
 */
function serializeEvents(
  events: CallyEvent[],
  currentUid: string,
  couple: Couple | null,
  currentUserName: string,
): string {
  if (events.length === 0) return '(No events on the calendar yet.)';

  const sorted = [...events].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.month !== b.month) return a.month - b.month;
    if (a.day !== b.day) return a.day - b.day;
    return 0;
  });

  return sorted
    .map((e) => {
      const date = `${MONTH_NAMES[e.month - 1]} ${e.day}, ${e.year}`;
      const dayOfWeek = new Date(e.year, e.month - 1, e.day).toLocaleDateString('en-US', {
        weekday: 'long',
      });
      const time = e.time || 'no time set';
      const location = e.location ? ` | Location: ${e.location}` : '';
      const notes = e.notes ? ` | Notes: ${e.notes}` : '';
      const type = e.type === 'dinner' ? ' | Type: dinner reservation' : '';

      let addedBy = 'unknown';
      if (e.createdBy === currentUid) {
        addedBy = currentUserName || 'you';
      } else if (couple) {
        if (e.createdBy === couple.user1) addedBy = couple.user1DisplayName || 'partner';
        if (e.createdBy === couple.user2) addedBy = couple.user2DisplayName || 'partner';
      }

      return `- ${date} (${dayOfWeek}) | ${time} | "${e.title}"${location}${notes}${type} | Added by: ${addedBy}`;
    })
    .join('\n');
}

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Send a question to the Cally AI backend and return a structured response.
 *
 * @param question         The user's message.
 * @param events           All CallyEvent objects currently loaded from Firestore.
 * @param currentUid       UID of the signed-in user.
 * @param couple           Couple document (for resolving partner names).
 * @param currentUserName  Display name of the signed-in user.
 * @param history          Last N messages for conversation memory.
 */
export async function askCally(
  question: string,
  events: CallyEvent[],
  currentUid: string,
  couple: Couple | null,
  currentUserName: string,
  history: ChatMessage[] = [],
): Promise<CallyResponse> {
  const partnerName = couple
    ? (couple.user1 === currentUid
        ? couple.user2DisplayName
        : couple.user1DisplayName) || 'your partner'
    : 'your partner';

  const eventsContext = serializeEvents(events, currentUid, couple, currentUserName);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Send only the last 10 messages (5 exchanges) for memory
  const recentHistory = history.slice(-10);

  try {
    const res = await fetch('/api/cally-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        eventsContext,
        userName: currentUserName,
        partnerName,
        today,
        conversationHistory: recentHistory,
      }),
    });

    if (!res.ok) {
      return {
        action: 'reply',
        reply: "Sorry, I'm having trouble thinking right now. Try again in a moment! 💚",
      };
    }

    const data = await res.json();

    if (data.action === 'create_event' && data.event) {
      return {
        action: 'create_event',
        reply: data.reply || 'Event created! 💚',
        event: data.event,
      };
    }

    return {
      action: 'reply',
      reply: data.reply || "Hmm, I didn't quite get that. Try rephrasing? 💚",
    };
  } catch {
    return {
      action: 'reply',
      reply: "I couldn't reach my brain — check your connection and try again! 💚",
    };
  }
}
