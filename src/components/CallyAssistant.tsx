import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { CallyEvent, Couple } from '@/types';
import { answer } from '@/lib/callyEngine';

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
          aria-label="Ask Cally"
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
