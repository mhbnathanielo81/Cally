import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange, handleRedirectResult } from '@/lib/auth';
import { getUserProfile, subscribeToUserProfile } from '@/lib/firestore';
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
    // Process redirect result when page loads after Google sign-in redirect
    handleRedirectResult();

    let unsubProfile: (() => void) | null = null;

    const unsub = onAuthChange(async (u) => {
      setUser(u);
      // Clean up previous profile subscription
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }
      if (u) {
        // Use real-time subscription so coupleId changes propagate instantly
        unsubProfile = subscribeToUserProfile(u.uid, (p) => {
          setProfile(p);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => {
      unsub();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await getUserProfile(user.uid);
    setProfile(p);
  }, [user]);

  return { user, profile, loading, refreshProfile };
}