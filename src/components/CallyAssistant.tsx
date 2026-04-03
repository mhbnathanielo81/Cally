import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { CallyEvent, Couple } from '@/types';
import { askCally, ChatMessage, CallyResponse } from '@/lib/callyAI';

interface NewEventData {
  title: string;
  day: number;
  month: number;
  year: number;
  time: string;
  endTime?: string;
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
  onUpdateEvent: (eventId: string, changes: Partial<NewEventData>) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
}

export default function CallyAssistant({
  events,
  currentUid,
  couple,
  currentUserName,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'cally', text: "Hi! I'm Cally 💚 Ask me anything about your calendar, or tell me to add an event!" },
  ]);
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /** Maximum textarea height in pixels before a scrollbar appears. */
  const MAX_TEXTAREA_HEIGHT = 120;

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function submit() {
    const q = input.trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setLoading(true);

    try {
      // Pass conversation history (last 10 messages = 5 exchanges) for memory
      const historyForContext = [...messages].slice(-10);
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
      } else if (response.action === 'create_events' && response.events) {
        try {
          for (const event of response.events) {
            await onCreateEvent(event);
          }
          const callyMsg: ChatMessage = { role: 'cally', text: response.reply };
          setMessages((prev) => [...prev, callyMsg]);
        } catch {
          const errorMsg: ChatMessage = {
            role: 'cally',
            text: "I created some events but hit a problem. Check your calendar and try again for any missing ones! 💚",
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
      } else if (response.action === 'update_event' && response.update) {
        const matchedEvent = findEventByTitle(response.update.eventTitle);
        if (matchedEvent?.id) {
          try {
            await onUpdateEvent(matchedEvent.id, response.update.changes);
            setMessages((prev) => [...prev, { role: 'cally', text: response.reply }]);
          } catch {
            setMessages((prev) => [...prev, { role: 'cally', text: "Something went wrong updating that event. Try again! 💚" }]);
          }
        } else {
          setMessages((prev) => [...prev, { role: 'cally', text: `I couldn't find "${response.update!.eventTitle}" on your calendar. Double-check the name? 💚` }]);
        }
      } else if (response.action === 'delete_event' && response.deleteEventTitle) {
        const matchedEvent = findEventByTitle(response.deleteEventTitle);
        if (matchedEvent?.id) {
          try {
            await onDeleteEvent(matchedEvent.id);
            setMessages((prev) => [...prev, { role: 'cally', text: response.reply }]);
          } catch {
            setMessages((prev) => [...prev, { role: 'cally', text: "Something went wrong deleting that event. Try again! 💚" }]);
          }
        } else {
          setMessages((prev) => [...prev, { role: 'cally', text: `I couldn't find "${response.deleteEventTitle}" on your calendar. Double-check the name? 💚` }]);
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

  function findEventByTitle(title: string): CallyEvent | undefined {
    return events.find(e => e.title.toLowerCase() === title.toLowerCase());
  }

  function autoResize(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT) + 'px';
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
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
          alignItems: 'flex-end',
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
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            onInput={autoResize}
            onFocus={() => setOpen(true)}
            placeholder="Ask Cally about your calendar…"
            disabled={loading}
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--color-text)',
              fontSize: '0.88rem',
              padding: '7px 0',
              opacity: loading ? 0.5 : 1,
              resize: 'none',
              overflow: 'hidden',
              lineHeight: 1.5,
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
        <div style={{ width: '100%', maxWidth: 720, padding: '0 16px 12px' }}>
          {/* Close bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close Cally chat"
              style={{
                background: 'none',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                padding: '2px 10px',
                cursor: 'pointer',
                fontSize: '0.78rem',
                color: 'var(--color-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              ✕ Close
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              maxHeight: 260,
              overflowY: 'auto',
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
        </div>
      )}
    </div>
  );
}



