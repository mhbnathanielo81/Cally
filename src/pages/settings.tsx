import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';

export default function SettingsPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  if (loading || !user || !profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <button onClick={() => router.push('/calendar')} style={{ background: 'none', color: 'var(--color-muted)', fontSize: '1.2rem', padding: '4px 8px' }}>←</button>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Settings</h1>
      </div>

      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-card)', padding: 24, marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '1rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profile</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {user.photoURL ? (
            <Image src={user.photoURL} alt={user.displayName ?? 'User'} width={56} height={56} style={{ borderRadius: '50%' }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.5rem', color: '#000' }}>
              {(user.displayName ?? 'U')[0].toUpperCase()}
            </div>
          )}
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>{user.displayName}</p>
            <p style={{ margin: '4px 0 0', color: 'var(--color-muted)', fontSize: '0.9rem' }}>{user.email}</p>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-card)', padding: 24, marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '1rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Couple Status</h2>
        {profile.coupleId ? (
          <p style={{ margin: 0, color: 'var(--color-primary)', fontWeight: 600 }}>✓ Linked with partner</p>
        ) : (
          <div>
            <p style={{ margin: '0 0 12px', color: 'var(--color-muted)' }}>Not linked yet.</p>
            <button className="btn-primary" onClick={() => router.push('/calendar')}>Connect on calendar page</button>
          </div>
        )}
      </div>

      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-card)', padding: 24 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '1rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account</h2>
        <button className="btn-danger" onClick={async () => { await signOut(); router.push('/'); }}>Sign out</button>
      </div>
    </div>
  );
}
