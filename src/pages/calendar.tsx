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
import DayDetailModal from '@/components/DayDetailModal';
import CoupleLinkModal from '@/components/CoupleLinkModal';
import ProfileMenu from '@/components/ProfileMenu';
import CallyAssistant from '@/components/CallyAssistant';
import { CallyEvent } from '@/types';
import { addEvent, updateEvent, deleteEvent, migrateEventsToCouple } from '@/lib/firestore';
import { requestNotificationPermission, setupForegroundMessages } from '@/lib/messaging';

export default function CalendarPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [addEventDay, setAddEventDay] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CallyEvent | null>(null);
  const [showCoupleModal, setShowCoupleModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const coupleId = profile?.coupleId ?? null;
  const { events } = useEvents(coupleId || user?.uid || null);
  const { couple } = useCouple(coupleId);

  // Safety-net: migrate legacy solo events for users already paired before this fix
  const migrationRan = useRef(false);
  useEffect(() => {
    if (!user || !coupleId || coupleId === user.uid || migrationRan.current) return;
    migrationRan.current = true;
    migrateEventsToCouple(user.uid, coupleId).catch(console.error);
  }, [user, coupleId]);

  const currentUserName = profile?.displayName ?? user?.displayName ?? '';

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) router.push('/');
  }, [user, authLoading, router]);

  // Request notification permission
  useEffect(() => {
    if (user) {
      requestNotificationPermission(user.uid);
      setupForegroundMessages();
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

  /** Open day-detail view for any authenticated user. */
  function handleDayClick(d: number) {
    setSelectedDay(d);
  }

  /** Open add-event modal for any authenticated user. */
  function handleAddEventClick(d: number) {
    setAddEventDay(d);
  }

  /** Create an event from Cally AI chat. */
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
      {/* Header — three-column layout so "living together" sits centered at the very top */}
      <header style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '8px 20px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        gap: 8,
      }}>
        {/* Left: Cally + month */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/about" style={{ textDecoration: 'none' }}>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>Cally</h1>
          </Link>
          <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>{monthNames[month - 1]} {year}</span>
        </div>

        {/* Centre: living together */}
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

        {/* Right: History + Pair Calendar + ProfileMenu */}
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
          onAddEventClick={handleAddEventClick}
          onEventClick={(ev) => setSelectedEvent(ev)}
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
      {selectedDay && (
        <DayDetailModal
          day={selectedDay}
          month={month}
          year={year}
          events={events}
          currentUid={user.uid}
          onClose={() => setSelectedDay(null)}
          onAddEvent={() => { setSelectedDay(null); setAddEventDay(selectedDay); }}
          onEventClick={(ev) => setSelectedEvent(ev)}
        />
      )}
      {addEventDay && (
        <AddEventModal
          coupleId={coupleId ?? user.uid}
          createdBy={user.uid}
          createdByName={currentUserName}
          day={addEventDay}
          month={month}
          year={year}
          onClose={() => setAddEventDay(null)}
          onSaved={() => setAddEventDay(null)}
        />
      )}
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
