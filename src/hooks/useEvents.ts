import { useState, useEffect } from 'react';
import { subscribeToEvents } from '@/lib/firestore';
import { CallyEvent } from '@/types';

export function useEvents(coupleId: string | null) {
  const [events, setEvents] = useState<CallyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coupleId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeToEvents(coupleId, (evts) => {
      setEvents(evts);
      setLoading(false);
    });
    return unsub;
  }, [coupleId]);

  return { events, loading };
}
