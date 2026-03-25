import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange } from '@/lib/auth';
import { getUserProfile } from '@/lib/firestore';
import { UserProfile } from '@/types';

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      setUser(u);
      if (u) {
        const p = await getUserProfile(u.uid);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await getUserProfile(user.uid);
    setProfile(p);
  }, [user]);

  return { user, profile, loading, refreshProfile };
}
