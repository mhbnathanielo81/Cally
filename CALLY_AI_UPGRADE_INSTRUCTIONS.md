# 🤖 CALLY AI CHATBOT UPGRADE — Instructions for GitHub Agent

## Overview

Replace the current regex-based `callyEngine.ts` chatbot with an LLM-powered assistant using **Claude Haiku** (Anthropic API). This upgrade adds:

1. **Natural language understanding** — Cally can answer ANY calendar question (specific dates, free weekends, week ranges, relative dates, etc.)
2. **Conversation memory** — Cally remembers the last 5 message exchanges within a session for follow-up questions
3. **Event creation via chat** — Users can say "Add dinner at Olive Garden Friday at 7pm" and Cally creates the event directly. If details are ambiguous, Cally asks for clarification first.

## CRITICAL: Do NOT remove or modify `callyEngine.ts`

Keep `callyEngine.ts` as-is for now. It serves as a **fallback** if the API call fails. The new system imports from `callyAI.ts` instead.

---

## Files to CREATE (new files)

### File 1: `src/pages/api/cally-chat.ts`

This is a **Next.js API route** that proxies requests to the Anthropic Claude API. The API key is kept server-side and never exposed to the browser.

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set');
    return res.status(500).json({ error: 'Cally AI is not configured. Set ANTHROPIC_API_KEY in .env.local' });
  }

  const { question, eventsContext, userName, partnerName, today, conversationHistory } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Missing question' });
  }

  const systemPrompt = `You are Cally, a warm and helpful calendar assistant for a couple's shared calendar app called Cally. You use a friendly, concise tone and occasionally use 💚.

## Who you're talking to
- User: ${userName || 'the user'}
- Partner: ${partnerName || 'their partner'}
- Today's date: ${today}

## Calendar events
Here are ALL events currently on the shared calendar:

${eventsContext || '(No events on the calendar yet.)'}

## How to answer questions
- Answer questions about the calendar using ONLY the events listed above.
- For date math (weekends, weeks, "next Friday", "this Thursday", etc.), reason carefully using today's date.
- A weekend is Saturday and Sunday.
- A "free" day or weekend means there are NO events on that day.
- "Second week of May" means May 8–14 (the 7 days starting the second Monday).
- When listing events, include: title, date, time, location (if any), and who added it.
- If no events match the question, say so clearly.
- Keep responses concise — no more than a few sentences unless listing multiple events.
- If the user asks something completely unrelated to the calendar, gently redirect: "I'm Cally, your calendar assistant! I can help with scheduling questions 💚"
- Never make up events that aren't in the list above.

## Event creation via chat
If the user asks to ADD, CREATE, or SCHEDULE an event, you must respond with a JSON block.

**If you have enough information** (at minimum: a title and a date), respond with ONLY this JSON — no other text before or after:
\`\`\`json
{
  "action": "create_event",
  "event": {
    "title": "Event title",
    "day": 27,
    "month": 3,
    "year": 2026,
    "time": "7:00 PM",
    "location": "Location or empty string",
    "notes": "Notes or empty string",
    "type": "event"
  },
  "message": "Done! I added 'Event title' on March 27, 2026 at 7:00 PM 💚"
}
\`\`\`

Rules for event creation:
- "month" must be 1-indexed (1 = January, 12 = December).
- "type" should be "dinner" if the event is clearly a dinner or restaurant reservation, otherwise "event".
- "time" should use "H:MM AM/PM" format. If no time specified, use "12:00 PM".
- If the user says a day of the week (e.g. "Friday"), calculate the actual date using today's date. Always use the NEXT occurrence of that day (not past).
- If the user says "tomorrow", "next Tuesday", "this Saturday", etc., resolve it to an actual date.
- Location and notes should be empty strings if not specified.

**If you do NOT have enough information** (no clear date, ambiguous title, etc.), respond with a normal text message asking for clarification. Do NOT output JSON. For example:
- "Add an event" → ask: "Sure! What's the event called, and when should I put it? 💚"
- "Dinner on Friday" → you have enough: title is "Dinner", day is next Friday. Create it.
- "Something next week" → ask: "I'd love to help! What's the event, and which day next week? 💚"

## Important
- When you create an event, the "message" field is what gets displayed to the user. Make it friendly and confirm what was created.
- Only output the JSON block for event creation. For ALL other responses (questions, listing events, clarifications), respond with plain text only.`;

  // Build messages array with conversation history for memory
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  if (conversationHistory && Array.isArray(conversationHistory)) {
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role === 'cally' ? 'assistant' : 'user',
        content: msg.text,
      });
    }
  }

  messages.push({ role: 'user', content: question });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Claude API error:', response.status, err);
      return res.status(500).json({ error: 'Failed to get response from Cally AI' });
    }

    const data = await response.json();
    const rawReply = data.content?.[0]?.text || '';

    // Check if the response contains an event creation JSON block
    const jsonMatch = rawReply.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        if (parsed.action === 'create_event' && parsed.event) {
          return res.status(200).json({
            action: 'create_event',
            event: parsed.event,
            reply: parsed.message || 'Event created! 💚',
          });
        }
      } catch {
        // JSON parse failed — treat as a normal text reply
      }
    }

    // Also check if the raw reply IS the JSON (without code fences)
    const trimmed = rawReply.trim();
    if (trimmed.startsWith('{') && trimmed.includes('"action"')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.action === 'create_event' && parsed.event) {
          return res.status(200).json({
            action: 'create_event',
            event: parsed.event,
            reply: parsed.message || 'Event created! 💚',
          });
        }
      } catch {
        // JSON parse failed — treat as normal text reply
      }
    }

    return res.status(200).json({ action: 'reply', reply: rawReply });
  } catch (err) {
    console.error('Cally AI error:', err);
    return res.status(500).json({ error: 'Something went wrong with Cally AI' });
  }
}
```

---

### File 2: `src/lib/callyAI.ts`

This is the client-side helper that serializes events and sends requests to the API route.

```typescript
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
```

---

### File 3: `src/components/CallyAssistant.tsx` (REPLACE entire file)

This replaces the existing `CallyAssistant.tsx` with the LLM-powered version. It includes conversation memory (last 5 exchanges), a loading/typing indicator, and event creation via chat.

**IMPORTANT:** This component now requires an `onCreateEvent` callback prop from its parent. The parent component that renders `<CallyAssistant />` must pass an `onCreateEvent` function that writes the event to Firestore. See the "Parent component wiring" section below.

```typescript
import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { CallyEvent, Couple } from '@/types';
import { askCally, ChatMessage, CallyResponse } from '@/lib/callyAI';

interface NewEventData {
  title: string;
  day: number;
  month: number;
  year: number;
  time: string;
  location: string;
  notes: string;
  type: 'event' | 'dinner';
}

interface Props {
  events: CallyEvent[];
  currentUid: string;
  couple: Couple | null;
  currentUserName: string;
  onCreateEvent: (event: NewEventData) => Promise<void>;
}

export default function CallyAssistant({
  events,
  currentUid,
  couple,
  currentUserName,
  onCreateEvent,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'cally', text: "Hi! I'm Cally 💚 Ask me anything about your calendar, or tell me to add an event!" },
  ]);
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function submit() {
    const q = input.trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Pass conversation history (last 10 messages = 5 exchanges) for memory
      const historyForContext = [...messages, userMsg].slice(-10);
      const response: CallyResponse = await askCally(
        q,
        events,
        currentUid,
        couple,
        currentUserName,
        historyForContext,
      );

      // Handle event creation
      if (response.action === 'create_event' && response.event) {
        try {
          await onCreateEvent(response.event);
          const callyMsg: ChatMessage = { role: 'cally', text: response.reply };
          setMessages((prev) => [...prev, callyMsg]);
        } catch {
          const errorMsg: ChatMessage = {
            role: 'cally',
            text: "I tried to create that event but something went wrong. Please try again! 💚",
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
      } else {
        const callyMsg: ChatMessage = { role: 'cally', text: response.reply };
        setMessages((prev) => [...prev, callyMsg]);
      }
    } catch {
      const errorMsg: ChatMessage = {
        role: 'cally',
        text: "Something went wrong. Please try again! 💚",
      };
      setMessages((prev) => [...prev, errorMsg]);
    }

    setLoading(false);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') submit();
  }

  const CALLY_GREEN = '#1DB954';
  const LIGHT_GREEN_BG = 'rgba(29,185,84,0.12)';
  const CHAT_GREEN = 'rgba(29,185,84,0.18)';

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'var(--color-surface)',
        borderBottom: open ? '1px solid var(--color-border)' : 'none',
      }}
    >
      {/* Input bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 16px',
          width: '100%',
          maxWidth: 720,
        }}
      >
        {/* Mascot */}
        <button
          onClick={() => setOpen((o) => !o)}
          title="Ask Cally"
          aria-label="Ask Cally"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <img
            src="https://github.com/user-attachments/assets/20c66a0d-843c-4c14-9fc1-6aaa399d2f7c"
            alt="Cally"
            width={36}
            height={46}
            style={{
              borderRadius: 8,
              objectFit: 'cover',
              border: `2px solid ${CALLY_GREEN}`,
              boxShadow: `0 0 8px rgba(29,185,84,0.4)`,
            }}
          />
        </button>

        {/* Input */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            background: LIGHT_GREEN_BG,
            border: `1.5px solid ${CALLY_GREEN}`,
            borderRadius: 24,
            overflow: 'hidden',
            padding: '0 4px 0 14px',
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            onFocus={() => setOpen(true)}
            placeholder="Ask Cally about your calendar…"
            disabled={loading}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--color-text)',
              fontSize: '0.88rem',
              padding: '7px 0',
              opacity: loading ? 0.5 : 1,
            }}
          />
          <button
            onClick={submit}
            disabled={!input.trim() || loading}
            style={{
              background: CALLY_GREEN,
              border: 'none',
              borderRadius: 20,
              padding: '5px 14px',
              color: '#000',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              opacity: input.trim() && !loading ? 1 : 0.5,
              margin: '4px 0',
              flexShrink: 0,
            }}
          >
            {loading ? '...' : 'Ask'}
          </button>
        </div>
      </div>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            width: '100%',
            maxWidth: 720,
            maxHeight: 280,
            overflowY: 'auto',
            padding: '0 16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? CHAT_GREEN : 'var(--color-bg)',
                border: `1px solid ${msg.role === 'user' ? CALLY_GREEN : 'var(--color-border)'}`,
                borderRadius:
                  msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '8px 14px',
                fontSize: '0.82rem',
                lineHeight: 1.6,
                maxWidth: '88%',
                whiteSpace: 'pre-wrap',
                color: 'var(--color-text)',
              }}
            >
              {msg.role === 'cally' && (
                <span style={{ fontWeight: 700, color: CALLY_GREEN, marginRight: 4 }}>
                  Cally:
                </span>
              )}
              {msg.text}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div
              style={{
                alignSelf: 'flex-start',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: '16px 16px 16px 4px',
                padding: '8px 14px',
                fontSize: '0.82rem',
                color: CALLY_GREEN,
                fontStyle: 'italic',
              }}
            >
              <span style={{ fontWeight: 700, marginRight: 4 }}>Cally:</span>
              thinking… 💭
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
```

---

## Files to MODIFY (existing files)

### Modification 1: Parent component that renders CallyAssistant

Find the parent component that currently renders `<CallyAssistant />`. It is likely in `src/pages/calendar.tsx` or a similar page component. 

**What to change:**

1. Add an import for Firestore helpers:
```typescript
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { getDbInstance } from '@/lib/firebase';
```

2. Add the `onCreateEvent` handler function inside the parent component:
```typescript
async function handleCallyCreateEvent(eventData: {
  title: string;
  day: number;
  month: number;
  year: number;
  time: string;
  location: string;
  notes: string;
  type: 'event' | 'dinner';
}) {
  const db = getDbInstance();
  if (!db || !currentUser || !coupleData?.coupleId) {
    throw new Error('Not connected');
  }

  await addDoc(collection(db, 'events'), {
    ...eventData,
    coupleId: coupleData.coupleId,
    createdBy: currentUser.uid,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}
```

Note: Adjust `currentUser`, `coupleData`, etc. to match whatever variable names are used in the parent component for the current user and couple data.

3. Update the `<CallyAssistant />` JSX to pass the new prop:
```typescript
<CallyAssistant
  events={events}
  currentUid={currentUser.uid}
  couple={coupleData}
  currentUserName={currentUser.displayName || ''}
  onCreateEvent={handleCallyCreateEvent}   // ← ADD THIS PROP
/>
```

### Modification 2: `.env.local.example`

Add this line to the file. It must NOT have the `NEXT_PUBLIC_` prefix because it is a server-side-only secret:

```env
# ── Cally AI Assistant (server-side only) ───────────────────────────────────
# Get your key at https://console.anthropic.com/settings/keys
# Do NOT prefix with NEXT_PUBLIC_ — this key must never be exposed to the browser.
ANTHROPIC_API_KEY=sk-ant-...your-key-here...
```

### Modification 3: `.env.local`

The user must add their real Anthropic API key:

```env
ANTHROPIC_API_KEY=sk-ant-api03-REAL_KEY_HERE
```

### Modification 4: `.gitignore`

Verify that `.env.local` is listed in `.gitignore` (it almost certainly already is, but double-check). The `ANTHROPIC_API_KEY` must never be committed to the repository.

---

## How the conversation memory works

- The component keeps all messages in React state (`useState<ChatMessage[]>`)
- When sending a new question to the API, only the last **10 messages** (5 user + 5 cally = 5 exchanges) are included as `conversationHistory`
- The API route converts these to Claude's `messages` format (`user` / `assistant` roles) and prepends them before the current question
- This allows follow-up questions like:
  - User: "What do I have on Friday?"
  - Cally: "You have dinner at 7pm at Olive Garden."
  - User: "What about Saturday?"  ← Cally knows this is about the same context
  - Cally: "Saturday is free — no events scheduled! 💚"

## How event creation via chat works

Flow:
1. User types "Add brunch on Sunday at 11am at Café Luna"
2. Message is sent to Claude with the system prompt instructing it to output JSON for event creation
3. Claude determines it has enough info (title: "Brunch", date: next Sunday, time: 11:00 AM, location: "Café Luna")
4. Claude responds with a JSON block containing the event data
5. The API route detects the JSON, parses it, and returns `{ action: "create_event", event: {...}, reply: "Done! I added..." }`
6. `CallyAssistant.tsx` receives this, calls `onCreateEvent(event)` which writes to Firestore
7. Cally's confirmation message appears in the chat
8. The Firestore `onSnapshot` listener automatically picks up the new event and it appears on the calendar grid in real-time

If Claude doesn't have enough info:
1. User types "Add an event next week"
2. Claude recognizes this is ambiguous — no title, no specific day
3. Claude responds with plain text: "Sure! What's the event called, and which day next week? 💚"
4. User replies: "Dentist appointment on Tuesday at 2pm"
5. Thanks to conversation memory, Claude knows this is a continuation and now has enough info
6. Claude outputs the JSON to create the event

## Architecture diagram

```
┌─────────────┐     POST /api/cally-chat      ┌──────────────────┐
│  Browser     │ ──────────────────────────────▸│  Next.js API     │
│  (React)     │                                │  Route           │
│              │◂──────────────────────────────  │                  │
│  CallyAI.ts  │     { action, reply, event? }  │  cally-chat.ts   │
└──────┬───────┘                                └────────┬─────────┘
       │                                                 │
       │ onCreateEvent()                                 │ fetch()
       │ writes to Firestore                             │
       ▼                                                 ▼
┌──────────────┐                                ┌──────────────────┐
│  Firestore   │                                │  Anthropic API   │
│  (events     │                                │  Claude Haiku    │
│   collection)│                                │                  │
└──────────────┘                                └──────────────────┘
```

## Testing checklist

After implementation, test these queries:

### Basic questions (should work immediately)
- [ ] "What events do I have on March 27th?" → only March 27 events
- [ ] "List all events in April" → all April events
- [ ] "What's my next event?" → nearest upcoming event
- [ ] "How many events do we have?" → total count

### Date reasoning (the real upgrade)
- [ ] "How many free weekends do I have in April?" → counts Sat/Sun pairs with no events
- [ ] "What's happening this Friday?" → resolves to the actual date
- [ ] "List events in the second week of May" → May 8-14 events
- [ ] "Do I have anything tomorrow?" → checks tomorrow's date

### Conversation memory
- [ ] Ask "What's on Friday?" then follow up with "And Saturday?" → Cally understands the context
- [ ] Ask "Show me April events" then "How many of those are mine?" → Cally remembers April context

### Event creation
- [ ] "Add dinner at Olive Garden on Friday at 7pm" → creates event immediately
- [ ] "Schedule a meeting on April 15 at 3pm" → creates event immediately
- [ ] "Add an event" → Cally asks for details
- [ ] "Add something next week" → Cally asks which day and what it's called
- [ ] "Dentist on Tuesday at 2pm" (after Cally asked for details) → creates event using memory

### Error handling
- [ ] Remove ANTHROPIC_API_KEY from .env.local → Cally shows a friendly error
- [ ] Ask a non-calendar question → Cally redirects gently
```

---

## Summary of all changes

| Action | File | What |
|---|---|---|
| CREATE | `src/pages/api/cally-chat.ts` | API route proxying to Claude Haiku |
| CREATE | `src/lib/callyAI.ts` | Client-side AI helper with event serialization |
| REPLACE | `src/components/CallyAssistant.tsx` | LLM-powered chat with memory + event creation |
| MODIFY | Parent of CallyAssistant (likely `calendar.tsx`) | Add `onCreateEvent` prop and handler |
| MODIFY | `.env.local.example` | Add `ANTHROPIC_API_KEY` entry |
| MODIFY | `.env.local` | Add real Anthropic API key |
| KEEP | `src/lib/callyEngine.ts` | Keep as-is (unused but available as fallback) |
