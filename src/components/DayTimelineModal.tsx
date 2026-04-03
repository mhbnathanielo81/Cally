import { useMemo } from 'react';
import { CallyEvent, Couple } from '@/types';
import { getEventColor } from '@/lib/colors';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DOW = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

/** Convert "H:MM AM/PM" to minutes since midnight. */
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

/** Convert minutes since midnight to "H:MM AM/PM". */
function minutesToTime(mins: number): string {
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const period = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

interface Props {
  day: number;
  month: number;
  year: number;
  events: CallyEvent[];
  currentUid: string;
  couple: Couple | null;
  currentUserName: string;
  onClose: () => void;
  onEventClick: (event: CallyEvent) => void;
  onAddEvent: (startTime?: string) => void;
}

const DEFAULT_START = 6 * 60;  // 6:00 AM
const DEFAULT_END = 22 * 60;   // 10:00 PM
const TICK_15 = 15;

export default function DayTimelineModal({
  day, month, year, events, currentUid, couple, currentUserName, onClose, onEventClick, onAddEvent,
}: Props) {
  const dayEvents = useMemo(() =>
    events
      .filter((e) => e.day === day && e.month === month && e.year === year)
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)),
    [events, day, month, year],
  );

  const myEvents = dayEvents.filter(e => e.createdBy === currentUid);
  const partnerEvents = dayEvents.filter(e => e.createdBy !== currentUid);

  // Compute visible time range — default 6AM–10PM, extend if events fall outside
  const { viewStart, viewEnd } = useMemo(() => {
    let start = DEFAULT_START;
    let end = DEFAULT_END;
    for (const e of dayEvents) {
      const eStart = timeToMinutes(e.time);
      const eEnd = e.endTime ? timeToMinutes(e.endTime) : eStart + 15;
      if (eStart < start) start = Math.floor(eStart / 60) * 60;
      if (eEnd > end) end = Math.ceil(eEnd / 60) * 60;
    }
    return { viewStart: start, viewEnd: end };
  }, [dayEvents]);

  const totalMinutes = viewEnd - viewStart;

  const weekday = DOW[new Date(year, month - 1, day).getDay()];

  const partnerName = couple
    ? (couple.user1 === currentUid
        ? couple.user2DisplayName
        : couple.user1DisplayName) || 'Partner'
    : 'Partner';

  /** Convert minutes to a percentage position within the timeline */
  function minutesToPercent(mins: number): number {
    return ((mins - viewStart) / totalMinutes) * 100;
  }

  /** Render an event block positioned on the timeline using percentages */
  function renderEventBlock(ev: CallyEvent) {
    const startMins = timeToMinutes(ev.time);
    const endMins = ev.endTime ? timeToMinutes(ev.endTime) : startMins + 15;
    const duration = Math.max(endMins - startMins, 5);
    const topPct = minutesToPercent(startMins);
    const heightPct = (duration / totalMinutes) * 100;
    const color = getEventColor(ev.createdBy, currentUid, ev.type);

    return (
      <button
        key={ev.id}
        onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
        style={{
          position: 'absolute',
          top: `${topPct}%`,
          left: 4,
          right: 4,
          height: `${Math.max(heightPct, 0.8)}%`,
          background: color,
          border: 'none',
          borderRadius: 4,
          padding: '2px 6px',
          cursor: 'pointer',
          overflow: 'hidden',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          opacity: 0.9,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.9')}
        title={`${ev.title} — ${ev.time}${ev.endTime ? ' to ' + ev.endTime : ''}`}
      >
        <span style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          color: '#000',
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {ev.title}
        </span>
        {heightPct > 3 && (
          <span style={{ fontSize: '0.58rem', color: 'rgba(0,0,0,0.7)', lineHeight: 1.2 }}>
            {ev.time}
          </span>
        )}
      </button>
    );
  }

  /** Generate time ticks and labels using percentages */
  function renderTimeTicks() {
    const ticks = [];
    for (let m = viewStart; m <= viewEnd; m += TICK_15) {
      const topPct = minutesToPercent(m);
      const isHour = m % 60 === 0;
      ticks.push(
        <div key={m} style={{
          position: 'absolute',
          top: `${topPct}%`,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'flex-start',
        }}>
          <span style={{
            width: 48,
            fontSize: '0.6rem',
            color: isHour ? 'var(--color-muted)' : 'transparent',
            textAlign: 'right',
            paddingRight: 4,
            lineHeight: 1,
            transform: 'translateY(-4px)',
            flexShrink: 0,
            userSelect: 'none',
          }}>
            {isHour ? minutesToTime(m) : ''}
          </span>
          <div style={{
            flex: 1,
            height: isHour ? 1 : 0.5,
            background: isHour ? 'var(--color-border)' : 'rgba(255,255,255,0.04)',
          }} />
        </div>,
      );
    }
    return ticks;
  }

  function handleTimelineClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const pct = y / rect.height;
    const minutes = Math.round((pct * totalMinutes + viewStart) / 15) * 15;
    onAddEvent(minutesToTime(minutes));
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          height: '100%',
          background: 'var(--color-bg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          background: 'var(--color-surface)',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
              {weekday}, {MONTH_NAMES[month - 1]} {day}, {year}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''} scheduled
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => onAddEvent()}
              style={{
                background: 'var(--color-primary)',
                border: 'none',
                borderRadius: 8,
                padding: '6px 14px',
                color: '#000',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              + Add
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'none',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--color-muted)',
                fontSize: '1.1rem',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Column headers */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
          background: 'var(--color-surface)',
        }}>
          <div style={{ width: 52, flexShrink: 0 }} />
          <div style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#1DB954',
            borderLeft: '1px solid var(--color-border)',
            textAlign: 'center',
          }}>
            {currentUserName || 'You'}
          </div>
          <div style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#4A90D9',
            borderLeft: '1px solid var(--color-border)',
            textAlign: 'center',
          }}>
            {partnerName}
          </div>
        </div>

        {/* Timeline body — fills remaining space, no scroll */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Time ticks layer */}
          {renderTimeTicks()}

          {/* Columns container */}
          <div style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 52,
            right: 0,
            display: 'flex',
          }}>
            {/* User column */}
            <div
              onClick={handleTimelineClick}
              style={{
                flex: 1,
                position: 'relative',
                borderLeft: '1px solid var(--color-border)',
                cursor: 'crosshair',
              }}
            >
              {myEvents.map(renderEventBlock)}
            </div>
            {/* Partner column */}
            <div
              onClick={handleTimelineClick}
              style={{
                flex: 1,
                position: 'relative',
                borderLeft: '1px solid var(--color-border)',
                cursor: 'crosshair',
              }}
            >
              {partnerEvents.map(renderEventBlock)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
