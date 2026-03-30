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

    const unsubAuth = onAuthChange((u) => {
      setUser(u);

      // Clean up any previous profile subscription
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (u) {
        // Subscribe to the user's profile document in real-time so that
        // linking/unlinking a partner is reflected immediately without a
        // manual refresh.
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
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  // `refreshProfile` provides an explicit one-shot fetch for callers that
  // need to ensure they have the latest data immediately (e.g. right after a
  // write that may not have propagated to the real-time snapshot yet).
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await getUserProfile(user.uid);
    setProfile(p);
  }, [user]);

  return { user, profile, loading, refreshProfile };
}
