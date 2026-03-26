import { CallyEvent } from '@/types';
import { getEventColor } from '@/lib/colors';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

interface Props {
  day: number;
  month: number;
  year: number;
  events: CallyEvent[];
  currentUid: string;
  onClose: () => void;
  onAddEvent: () => void;
  onEventClick: (event: CallyEvent) => void;
}

export default function DayDetailModal({
  day, month, year, events, currentUid, onClose, onAddEvent, onEventClick,
}: Props) {
  const dayEvents = events
    .filter((e) => e.day === day && e.month === month && e.year === year)
    .sort((a, b) => {
      function toMins(t: string) {
        const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!m) return 0;
        let h = parseInt(m[1], 10);
        const min = parseInt(m[2], 10);
        if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
        if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
        return h * 60 + min;
      }
      return toMins(a.time) - toMins(b.time);
    });

  const DOW = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const weekday = DOW[new Date(year, month - 1, day).getDay()];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, width: '90%' }}>
        <button className="close-btn" onClick={onClose}>×</button>
        <h2 style={{ marginBottom: 2 }}>
          {weekday}, {MONTH_NAMES[month - 1]} {day}, {year}
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
          {dayEvents.length === 0
            ? 'No events scheduled for this day.'
            : `${dayEvents.length} event${dayEvents.length !== 1 ? 's' : ''} scheduled`}
        </p>

        {dayEvents.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {dayEvents.map((ev) => (
              <button
                key={ev.id}
                onClick={() => { onEventClick(ev); onClose(); }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              >
                <span style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                  background: getEventColor(ev.createdBy, currentUid, ev.type),
                }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                    {ev.title}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                    {ev.time}{ev.location ? ` · ${ev.location}` : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        <button className="btn-primary" onClick={() => { onAddEvent(); onClose(); }} style={{ width: '100%' }}>
          + Add Event
        </button>
      </div>
    </div>
  );
}
