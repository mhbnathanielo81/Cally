import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { CallyEvent } from '@/types';
import { Couple } from '@/types';

interface Props {
  events: CallyEvent[];
  currentUid: string;
  couple: Couple | null;
  currentUserName: string;
}

interface Message {
  role: 'user' | 'cally';
  text: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(e: CallyEvent) {
  return `${MONTH_NAMES[e.month - 1]} ${e.day}, ${e.year}`;
}

function formatTime(t: string) {
  return t || '—';
}

/** Return a plain-text summary of an event for display in Cally's reply */
function describeEvent(e: CallyEvent, currentUid: string, couple: Couple | null, currentUserName: string): string {
  const who = creatorLabel(e.createdBy, currentUid, couple, currentUserName);
  const loc = e.location ? ` @ ${e.location}` : '';
  return `• ${e.title}${loc} — ${formatDate(e)} ${formatTime(e.time)} (added by ${who})`;
}

function creatorLabel(uid: string, currentUid: string, couple: Couple | null, currentUserName: string): string {
  if (uid === currentUid) return currentUserName || 'you';
  if (couple) {
    if (uid === couple.user1) return couple.user1DisplayName || 'your partner';
    if (uid === couple.user2) return couple.user2DisplayName || 'your partner';
  }
  return 'your partner';
}

// ── core query engine ─────────────────────────────────────────────────────────

function answer(
  query: string,
  events: CallyEvent[],
  currentUid: string,
  couple: Couple | null,
  currentUserName: string,
): string {
  const q = query.toLowerCase().trim();
  const currentYear = new Date().getFullYear();

  // Parse year intent
  const yearMatch = q.match(/\b(20\d{2})\b/);
  let targetYear: number | null = yearMatch ? parseInt(yearMatch[1], 10) : null;
  if (!targetYear) {
    if (q.includes('this year')) targetYear = currentYear;
    else if (q.includes('next year')) targetYear = currentYear + 1;
    else if (q.includes('last year')) targetYear = currentYear - 1;
  }

  // Filter events by year when mentioned
  let pool = targetYear ? events.filter((e) => e.year === targetYear) : [...events];

  // --- location queries -------------------------------------------------------
  // e.g. "how many times michigan", "events in michigan", "list michigan events"
  const locationPattern = extractLocationFromQuery(q);

  if (locationPattern) {
    const matched = pool.filter((e) =>
      (e.location?.toLowerCase().includes(locationPattern) ?? false) ||
      e.title.toLowerCase().includes(locationPattern),
    );

    if (matched.length === 0) {
      const yearStr = targetYear ? ` in ${targetYear}` : '';
      return `I don't see any events in "${locationPattern}"${yearStr} on the calendar. Try checking the location field when adding events!`;
    }

    matched.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      if (a.month !== b.month) return a.month - b.month;
      if (a.day !== b.day) return a.day - b.day;
      return timeToMinutes(a.time) - timeToMinutes(b.time);
    });

    const yearStr = targetYear ? ` in ${targetYear}` : '';
    const lines = matched.map((e) => describeEvent(e, currentUid, couple, currentUserName));
    return (
      `You have ${matched.length} event${matched.length !== 1 ? 's' : ''} related to "${locationPattern}"${yearStr}:\n\n` +
      lines.join('\n')
    );
  }

  // --- count all events -------------------------------------------------------
  if (/how many events|total events|number of events/.test(q)) {
    const yearStr = targetYear ? ` in ${targetYear}` : '';
    return `There ${pool.length === 1 ? 'is' : 'are'} ${pool.length} event${pool.length !== 1 ? 's' : ''} on the calendar${yearStr}.`;
  }

  // --- list all events --------------------------------------------------------
  if (/list all|show all|all events/.test(q)) {
    if (pool.length === 0) {
      const yearStr = targetYear ? ` in ${targetYear}` : '';
      return `No events found on the calendar${yearStr}.`;
    }
    pool.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      if (a.month !== b.month) return a.month - b.month;
      if (a.day !== b.day) return a.day - b.day;
      return timeToMinutes(a.time) - timeToMinutes(b.time);
    });
    const lines = pool.slice(0, 20).map((e) => describeEvent(e, currentUid, couple, currentUserName));
    const more = pool.length > 20 ? `\n…and ${pool.length - 20} more.` : '';
    return `Here are all your events:\n\n${lines.join('\n')}${more}`;
  }

  // --- events by month --------------------------------------------------------
  const monthMatch = MONTH_NAMES.findIndex((m) => q.includes(m.toLowerCase()));
  if (monthMatch >= 0) {
    const monthNum = monthMatch + 1;
    const byMonth = pool.filter((e) => e.month === monthNum);
    if (byMonth.length === 0) {
      return `No events found in ${MONTH_NAMES[monthMatch]}${targetYear ? ' ' + targetYear : ''}.`;
    }
    byMonth.sort((a, b) => a.day - b.day || timeToMinutes(a.time) - timeToMinutes(b.time));
    const lines = byMonth.map((e) => describeEvent(e, currentUid, couple, currentUserName));
    return `You have ${byMonth.length} event${byMonth.length !== 1 ? 's' : ''} in ${MONTH_NAMES[monthMatch]}:\n\n${lines.join('\n')}`;
  }

  // --- my events vs partner events -------------------------------------------
  if (/my events|events i (added|created)/.test(q)) {
    const mine = pool.filter((e) => e.createdBy === currentUid);
    if (mine.length === 0) return "You haven't added any events yet.";
    const lines = mine.map((e) => describeEvent(e, currentUid, couple, currentUserName));
    return `Your events (${mine.length}):\n\n${lines.join('\n')}`;
  }
  if (/partner|their events|his events|her events/.test(q)) {
    const theirs = pool.filter((e) => e.createdBy !== currentUid);
    if (theirs.length === 0) return "Your partner hasn't added any events yet.";
    const lines = theirs.map((e) => describeEvent(e, currentUid, couple, currentUserName));
    return `Your partner's events (${theirs.length}):\n\n${lines.join('\n')}`;
  }

  // --- next upcoming event ---------------------------------------------------
  if (/next event|upcoming/.test(q)) {
    const now = new Date();
    const upcoming = events
      .filter((e) => {
        const d = new Date(e.year, e.month - 1, e.day);
        return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
      })
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        if (a.month !== b.month) return a.month - b.month;
        if (a.day !== b.day) return a.day - b.day;
        return timeToMinutes(a.time) - timeToMinutes(b.time);
      });
    if (upcoming.length === 0) return 'No upcoming events found on the calendar.';
    const next = upcoming[0];
    return `Your next event is:\n\n${describeEvent(next, currentUid, couple, currentUserName)}`;
  }

  // --- help / catch-all -------------------------------------------------------
  return (
    "Hi! I'm Cally 💚 I can help you explore your calendar. Try asking me:\n" +
    '• "How many times are we going to Michigan this year?"\n' +
    '• "List all events in June"\n' +
    '• "What is my next upcoming event?"\n' +
    '• "Show me my partner\'s events"\n' +
    '• "How many events do we have in 2026?"'
  );
}

/** Extract a location keyword from the query string */
function extractLocationFromQuery(q: string): string | null {
  // patterns: "going to X", "events in X", "in X", "at X", "trip to X", "michigan", "new york", etc.
  const patterns = [
    /(?:going to|trip to|travel(?:ing)? to|fly(?:ing)? to|drive(?:n)? to|events? in|times? in|visits? to|headed to|in|at)\s+([a-z][a-z ]{1,30}?)(?:\s+this|\s+next|\s+last|\s+in|\?|$)/i,
  ];
  for (const pat of patterns) {
    const m = q.match(pat);
    if (m) return m[1].trim().toLowerCase();
  }
  // If query is very short (< 4 words) and no verbs, treat the whole thing as a location search
  const words = q.split(/\s+/);
  if (words.length <= 3 && !/^(list|show|how|what|when|who|tell|count|find)/.test(q)) {
    return q.replace(/[?.!]/g, '').trim().toLowerCase();
  }
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CallyAssistant({ events, currentUid, couple, currentUserName }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'cally', text: "Hi! I'm Cally 💚 Ask me anything about your calendar!" },
  ]);
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  function submit() {
    const q = input.trim();
    if (!q) return;
    const userMsg: Message = { role: 'user', text: q };
    const callyMsg: Message = { role: 'cally', text: answer(q, events, currentUid, couple, currentUserName) };
    setMessages((prev) => [...prev, userMsg, callyMsg]);
    setInput('');
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') submit();
  }

  const CALLY_GREEN = '#1DB954';
  const LIGHT_GREEN_BG = 'rgba(29,185,84,0.12)';
  const CHAT_GREEN = 'rgba(29,185,84,0.18)';

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--color-surface)', borderBottom: open ? '1px solid var(--color-border)' : 'none' }}>
      {/* Input bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', width: '100%', maxWidth: 720 }}>
        {/* Mascot */}
        <button
          onClick={() => setOpen((o) => !o)}
          title="Ask Cally"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center' }}
        >
          <img
            src="https://github.com/user-attachments/assets/20c66a0d-843c-4c14-9fc1-6aaa399d2f7c"
            alt="Cally"
            width={36}
            height={46}
            style={{ borderRadius: 8, objectFit: 'cover', border: `2px solid ${CALLY_GREEN}`, boxShadow: `0 0 8px rgba(29,185,84,0.4)` }}
          />
        </button>

        {/* Input */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: LIGHT_GREEN_BG, border: `1.5px solid ${CALLY_GREEN}`, borderRadius: 24, overflow: 'hidden', padding: '0 4px 0 14px' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            onFocus={() => setOpen(true)}
            placeholder="Ask Cally about your calendar…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--color-text)',
              fontSize: '0.88rem',
              padding: '7px 0',
            }}
          />
          <button
            onClick={submit}
            disabled={!input.trim()}
            style={{
              background: CALLY_GREEN,
              border: 'none',
              borderRadius: 20,
              padding: '5px 14px',
              color: '#000',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: input.trim() ? 'pointer' : 'default',
              opacity: input.trim() ? 1 : 0.5,
              margin: '4px 0',
              flexShrink: 0,
            }}
          >
            Ask
          </button>
        </div>
      </div>

      {/* Chat panel */}
      {open && (
        <div style={{ width: '100%', maxWidth: 720, maxHeight: 280, overflowY: 'auto', padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? CHAT_GREEN : 'var(--color-bg)',
                border: `1px solid ${msg.role === 'user' ? CALLY_GREEN : 'var(--color-border)'}`,
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '8px 14px',
                fontSize: '0.82rem',
                lineHeight: 1.6,
                maxWidth: '88%',
                whiteSpace: 'pre-wrap',
                color: 'var(--color-text)',
              }}
            >
              {msg.role === 'cally' && (
                <span style={{ fontWeight: 700, color: CALLY_GREEN, marginRight: 4 }}>Cally:</span>
              )}
              {msg.text}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
