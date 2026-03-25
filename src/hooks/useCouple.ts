import { useState, useEffect } from 'react';
import { subscribeToCouple } from '@/lib/firestore';
import { Couple } from '@/types';

export function useCouple(coupleId: string | null) {
  const [couple, setCouple] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coupleId) {
      setCouple(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeToCouple(coupleId, (c) => {
      setCouple(c);
      setLoading(false);
    });
    return unsub;
  }, [coupleId]);

  return { couple, loading };
}
