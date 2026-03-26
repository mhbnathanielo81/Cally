import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';
import { useCouple } from '@/hooks/useCouple';
import CalendarGrid from '@/components/CalendarGrid';
import MonthSidebar from '@/components/MonthSidebar';
import AddEventModal from '@/components/AddEventModal';
import EventDetailModal from '@/components/EventDetailModal';
import DayDetailModal from '@/components/DayDetailModal';
import CoupleLinkModal from '@/components/CoupleLinkModal';
import ProfileMenu from '@/components/ProfileMenu';
import CallyAssistant from '@/components/CallyAssistant';
import { CallyEvent } from '@/types';
import { requestNotificationPermission, setupForegroundMessages } from '@/lib/messaging';
import { getDbInstance } from '@/lib/firebase';

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

  const coupleId = profile?.coupleId ?? null;
  const { events } = useEvents(coupleId);
  const { couple } = useCouple(coupleId);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) router.push('/');
  }, [user, authLoading, router]);

  // Show couple modal if not linked
  useEffect(() => {
    if (!authLoading && user && profile && !profile.coupleId) {
      setShowCoupleModal(true);
    }
  }, [authLoading, user, profile]);

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

  /** Open day-detail view; guard if not paired. */
  function handleDayClick(d: number) {
    if (!profile?.coupleId) { setShowCoupleModal(true); return; }
    setSelectedDay(d);
  }

  /** Open add-event modal directly; guard if not paired. */
  function handleAddEventClick(d: number) {
    if (!profile?.coupleId) { setShowCoupleModal(true); return; }
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
    const db = getDbInstance();
    if (!db || !user || !coupleId) {
      throw new Error('Not connected');
    }
    await addDoc(collection(db, 'events'), {
      ...eventData,
      coupleId,
      createdBy: user.uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/about" style={{ textDecoration: 'none' }}>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>Cally</h1>
          </Link>
          <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>{monthNames[month - 1]} {year}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn-ghost" onClick={() => setShowCoupleModal(true)} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
            💚 Pair Calendar
          </button>
          <ProfileMenu user={user} />
        </div>
      </header>

      {/* "living together" — centered above Cally chat box */}
      <div style={{ textAlign: 'center', padding: '6px 0 2px', background: 'var(--color-surface)' }}>
        <span style={{
          fontSize: '1.8rem',
          fontStyle: 'italic',
          fontFamily: "'Great Vibes', cursive",
          letterSpacing: '0.03em',
          background: 'linear-gradient(90deg, #1DB954, #a8f5c8, #1DB954)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          WebkitTextStroke: '0.5px rgba(192,192,192,0.7)',
        }}>
          living together
        </span>
      </div>

      {/* Cally AI Assistant */}
      <CallyAssistant
        events={events}
        currentUid={user.uid}
        couple={couple}
        currentUserName={profile?.displayName ?? user.displayName ?? 'you'}
        onCreateEvent={handleCallyCreateEvent}
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
      {addEventDay && coupleId && (
        <AddEventModal
          coupleId={coupleId}
          createdBy={user.uid}
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
          onClose={() => setSelectedEvent(null)}
        />
      )}
      {showCoupleModal && (
        <CoupleLinkModal user={user} couple={couple} onLinked={handleCoupleLinked} onClose={() => setShowCoupleModal(false)} />
      )}
    </div>
  );
}
