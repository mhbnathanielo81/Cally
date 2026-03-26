import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { signInWithGoogle } from '@/lib/auth';
import { joinCouple } from '@/lib/firestore';

type JoinStatus = 'idle' | 'joining' | 'success' | 'error';

export default function JoinPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { code } = router.query;

  const [status, setStatus] = useState<JoinStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Once we have a signed-in user + their profile + the invite code, auto-join
  useEffect(() => {
    if (loading || !user || !profile || !code || typeof code !== 'string') return;
    if (status !== 'idle') return;

    // Already in a couple — go straight to calendar
    if (profile.coupleId) {
      router.push('/calendar');
      return;
    }

    setStatus('joining');
    joinCouple(user, code)
      .then(() => {
        setStatus('success');
        setTimeout(() => router.push('/calendar'), 1500);
      })
      .catch((err: unknown) => {
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Failed to join. Please try again.');
      });
  }, [user, profile, loading, code, status, router]);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch {
      // handled in auth.ts
    }
  };

  // Spinner shared style
  const spinnerBlock = (
    <>
      <div style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );

  // Loading auth state or waiting for router query to hydrate
  if (loading || (!code && typeof window !== 'undefined')) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        {spinnerBlock}
      </div>
    );
  }

  // Invalid / missing code
  if (!code || typeof code !== 'string') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16, padding: 24 }}>
        <h1 style={{ color: 'var(--color-primary)', fontWeight: 800, fontSize: '2.5rem', margin: 0 }}>Cally</h1>
        <p style={{ margin: '0 0 4px', fontStyle: 'italic', color: 'var(--color-primary)', fontSize: '1rem' }}>living together</p>
        <p style={{ color: 'var(--color-muted)', marginTop: 16 }}>This invitation link is invalid or has expired.</p>
        <button className="btn-ghost" onClick={() => router.push('/')}>Go to Sign In</button>
      </div>
    );
  }

  // Not signed in — prompt Google sign-in; after sign-in the useEffect handles the join
  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 32, padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', margin: '0 0 4px', fontWeight: 800, color: 'var(--color-primary)' }}>Cally</h1>
          <p style={{ margin: '0 0 16px', fontStyle: 'italic', color: 'var(--color-primary)', fontSize: '1rem' }}>living together</p>
          <p style={{ color: 'var(--color-muted)', margin: 0, fontSize: '1.1rem' }}>You&apos;ve been invited to a shared calendar!</p>
        </div>
        <button
          onClick={handleSignIn}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#fff',
            color: '#000',
            fontWeight: 600,
            fontSize: '1rem',
            padding: '14px 28px',
            borderRadius: 'var(--radius-btn)',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Sign in with Google to link calendars
        </button>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.8rem', textAlign: 'center', maxWidth: 300, margin: 0 }}>
          Sign in to accept the invitation and share your calendar.
        </p>
      </div>
    );
  }

  // Signed in — show joining / success / error state
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16, padding: 24 }}>
      <h1 style={{ color: 'var(--color-primary)', fontWeight: 800, fontSize: '2.5rem', margin: 0 }}>Cally</h1>
      <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--color-primary)', fontSize: '1rem' }}>living together</p>

      {(status === 'idle' || status === 'joining') && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 16 }}>
          {spinnerBlock}
          <p style={{ color: 'var(--color-muted)', margin: 0 }}>Linking your calendar…</p>
        </div>
      )}

      {status === 'success' && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <p style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '1.3rem', margin: '0 0 8px' }}>✅ Calendars linked!</p>
          <p style={{ color: 'var(--color-muted)', margin: 0 }}>Redirecting to your shared calendar…</p>
        </div>
      )}

      {status === 'error' && (
        <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <p style={{ color: '#e53e3e', margin: 0 }}>{errorMsg}</p>
          <button className="btn-primary" onClick={() => router.push('/calendar')}>Go to Calendar</button>
        </div>
      )}
    </div>
  );
}
