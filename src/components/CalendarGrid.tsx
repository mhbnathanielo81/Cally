import { useMemo, useState } from 'react';
import { CallyEvent } from '@/types';
import { getEventColor } from '@/lib/colors';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  month: number; // 1-indexed
  year: number;
  events: CallyEvent[];
  currentUid: string;
  onDayClick: (day: number) => void;
  onAddEventClick: (day: number) => void;
  onEventClick: (event: CallyEvent) => void;
}

export default function CalendarGrid({ month, year, events, currentUid, onDayClick, onAddEventClick, onEventClick }: Props) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const { days, startOffset } = useMemo(() => {
    const d = new Date(year, month - 1, 1);
    const startOffset = d.getDay();
    const days = new Date(year, month, 0).getDate();
    return { days, startOffset };
  }, [month, year]);

  const eventsByDay = useMemo(() => {
    function timeToMinutes(time: string): number {
      const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return 0;
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3].toUpperCase();
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    }

    const map: Record<number, CallyEvent[]> = {};
    events
      .filter((e) => e.month === month && e.year === year)
      .forEach((e) => {
        if (!map[e.day]) map[e.day] = [];
        map[e.day].push(e);
      });
    Object.keys(map).forEach((day) => {
      map[Number(day)].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    });
    return map;
  }, [events, month, year]);

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];

  const today = new Date();
  const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--color-border)' }}>
        {DAY_NAMES.map((d) => (
          <div key={d} style={{ background: 'var(--color-bg)', padding: '8px 0', textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600 }}>{d}</div>
        ))}
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} style={{ background: 'var(--color-bg)', minHeight: 100 }} />;
          }
          const dayEvents = eventsByDay[day] ?? [];
          const isToday = isCurrentMonth && day === today.getDate();
          const isHovered = hoveredDay === day;
          return (
            <div
              key={day}
              onClick={() => onDayClick(day)}
              onMouseEnter={() => setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
              style={{
                background: 'var(--color-bg)',
                minHeight: 100,
                padding: '6px',
                cursor: 'pointer',
                border: '1px solid transparent',
                borderColor: isHovered ? 'var(--color-primary)' : 'transparent',
                transition: 'border-color 0.15s',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Day number */}
              <span style={{
                display: 'inline-block',
                width: 26,
                height: 26,
                lineHeight: '26px',
                textAlign: 'center',
                borderRadius: '50%',
                fontSize: '0.85rem',
                fontWeight: isToday ? 700 : 400,
                background: isToday ? 'var(--color-primary)' : 'transparent',
                color: isToday ? '#000' : 'var(--color-text)',
              }}>
                {day}
              </span>

              {/* Hover "+" add button */}
              {isHovered && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAddEventClick(day); }}
                  title="Add event"
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    border: 'none',
                    color: '#000',
                      border: 'none',
                    fontSize: '1rem',
                    lineHeight: '22px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    padding: 0,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  +
                </button>
              )}

              {/* Event pills */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4, minWidth: 0 }}>
                {dayEvents.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                    style={{
                      background: getEventColor(ev.createdBy, currentUid, ev.type),
                      color: '#000',
                      border: 'none',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: '0.7rem',
                      textAlign: 'left',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      width: '100%',
                      minWidth: 0,
                      fontWeight: 600,
                      display: 'block',
                      cursor: 'pointer',
                    }}
                  >
                    {ev.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <span
                    onClick={(e) => { e.stopPropagation(); onDayClick(day); }}
                    style={{ fontSize: '0.65rem', color: 'var(--color-muted)', paddingLeft: 4, cursor: 'pointer' }}
                  >
                    +{dayEvents.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
