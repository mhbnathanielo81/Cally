import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';
import { useCouple } from '@/hooks/useCouple';
import CalendarGrid from '@/components/CalendarGrid';
import MonthSidebar from '@/components/MonthSidebar';
import AddEventModal from '@/components/AddEventModal';
import EventDetailModal from '@/components/EventDetailModal';
import EventHistoryModal from '@/components/EventHistoryModal';
import DayTimelineModal from '@/components/DayTimelineModal';
import CoupleLinkModal from '@/components/CoupleLinkModal';
import ProfileMenu from '@/components/ProfileMenu';
import CallyAssistant from '@/components/CallyAssistant';
import { CallyEvent } from '@/types';
import { addEvent, updateEvent, deleteEvent, resolveUserCouple } from '@/lib/firestore';
import { requestNotificationPermission, setupForegroundMessages } from '@/lib/messaging';

export default function CalendarPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [timelineDay, setTimelineDay] = useState<number | null>(null);
  const [addEventDay, setAddEventDay] = useState<number | null>(null);
  const [addEventStartTime, setAddEventStartTime] = useState<string | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<CallyEvent | null>(null);
  const [showCoupleModal, setShowCoupleModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const coupleId = profile?.coupleId ?? null;
  const { events } = useEvents(coupleId || user?.uid || null);
  const { couple } = useCouple(coupleId);

  const resolutionRan = useRef(false);
  useEffect(() => {
    if (!user || resolutionRan.current) return;
    resolutionRan.current = true;
    resolveUserCouple(user.uid).catch(console.error);
  }, [user]);

  const currentUserName = profile?.displayName ?? user?.displayName ?? '';

  useEffect(() => {
    if (!authLoading && !user) router.push('/');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      requestNotificationPermission(user.uid);
      let unsubscribe: (() => void) | undefined;
      setupForegroundMessages().then((unsub) => { unsubscribe = unsub; });
      return () => { unsubscribe?.(); };
    }
  }, [user]);

  const handleCoupleLinked = useCallback(async () => {
    setShowCoupleModal(false);
    await refreshProfile();
  }, [refreshProfile]);

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return null;

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  /**
   * Day click from calendar grid:
   * - Has events → open timeline modal
   * - No events → open add event modal directly
   */
  function handleDayClick(d: number, hasEvents: boolean) {
    if (hasEvents) {
      setTimelineDay(d);
    } else {
      setAddEventStartTime(undefined);
      setAddEventDay(d);
    }
  }

  /** Create an event from Cally AI chat. */
  async function handleCallyCreateEvent(eventData: {
    title: string;
    day: number;
    month: number;
    year: number;
    time: string;
    endTime?: string;
    location: string;
    notes: string;
    type: 'event' | 'dinner';
  }) {
    if (!user) throw new Error('Not connected');
    await addEvent(
      coupleId || user.uid,
      user.uid,
      eventData,
      { changedByName: currentUserName },
    );
  }

  async function handleCallyUpdateEvent(eventId: string, changes: Partial<{
    title: string; day: number; month: number; year: number;
    time: string; location: string; notes: string; type: 'event' | 'dinner';
  }>) {
    const existingEvent = events.find(e => e.id === eventId);
    await updateEvent(eventId, changes, {
      changedBy: user!.uid,
      changedByName: currentUserName,
      previousEvent: existingEvent,
    });
  }

  async function handleCallyDeleteEvent(eventId: string) {
    const existingEvent = events.find(e => e.id === eventId);
    await deleteEvent(eventId, {
      changedBy: user!.uid,
      changedByName: currentUserName,
      event: existingEvent,
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <header style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '8px 20px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/about" style={{ textDecoration: 'none' }}>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>Cally</h1>
          </Link>
          <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>{monthNames[month - 1]} {year}</span>
        </div>

        <span style={{
          fontSize: '1.8rem',
          fontStyle: 'italic',
          fontFamily: "'Great Vibes', cursive",
          letterSpacing: '0.03em',
          background: 'linear-gradient(90deg, #1DB954, #a8f5c8, #1DB954)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          WebkitTextStroke: '0.5px rgba(192,192,192,0.7)',
          whiteSpace: 'nowrap',
        }}>
          living together
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
          <button
            className="btn-ghost"
            onClick={() => setShowHistory(true)}
            style={{ fontSize: '0.85rem', padding: '6px 12px' }}
            title="View calendar history"
          >
            📋 History
          </button>
          <button className="btn-ghost" onClick={() => setShowCoupleModal(true)} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
            💚 Pair Calendar
          </button>
          <ProfileMenu user={user} />
        </div>
      </header>

      {/* Cally AI Assistant */}
      <CallyAssistant
        events={events}
        currentUid={user.uid}
        couple={couple}
        currentUserName={currentUserName || 'you'}
        onCreateEvent={handleCallyCreateEvent}
        onUpdateEvent={handleCallyUpdateEvent}
        onDeleteEvent={handleCallyDeleteEvent}
      />

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <CalendarGrid
          month={month}
          year={year}
          events={events}
          currentUid={user.uid}
          onDayClick={handleDayClick}
        />
        <MonthSidebar
          selectedMonth={month}
          selectedYear={year}
          onMonthChange={setMonth}
          onYearChange={setYear}
        />
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, padding: '8px 20px', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)', fontSize: '0.75rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#1DB954', display: 'inline-block' }} /> Your events</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#4A90D9', display: 'inline-block' }} /> Partner&apos;s events</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#F5A623', display: 'inline-block' }} /> Dinner reservations</span>
      </div>

      {/* Modals */}

      {/* Day Timeline — full-screen view of a day's events */}
      {timelineDay !== null && (
        <DayTimelineModal
          day={timelineDay}
          month={month}
          year={year}
          events={events}
          currentUid={user.uid}
          couple={couple}
          currentUserName={currentUserName}
          onClose={() => setTimelineDay(null)}
          onEventClick={(ev) => { setSelectedEvent(ev); }}
          onAddEvent={(startTime) => {
            setAddEventStartTime(startTime);
            setAddEventDay(timelineDay);
          }}
        />
      )}

      {/* Add Event */}
      {addEventDay !== null && (
        <AddEventModal
          coupleId={coupleId ?? user.uid}
          createdBy={user.uid}
          createdByName={currentUserName}
          day={addEventDay}
          month={month}
          year={year}
          initialStartTime={addEventStartTime}
          onClose={() => { setAddEventDay(null); setAddEventStartTime(undefined); }}
          onSaved={() => { setAddEventDay(null); setAddEventStartTime(undefined); }}
        />
      )}

      {/* Event Detail / Edit */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          currentUid={user.uid}
          currentUserName={currentUserName}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {showCoupleModal && (
        <CoupleLinkModal user={user} couple={couple} onLinked={handleCoupleLinked} onClose={() => setShowCoupleModal(false)} />
      )}
      {showHistory && (
        <EventHistoryModal
          coupleId={coupleId ?? user.uid}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
