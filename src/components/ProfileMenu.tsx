import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { User } from 'firebase/auth';
import { signOut } from '@/lib/auth';

interface Props { user: User; }

export default function ProfileMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)} style={{ background: 'none', padding: 0, borderRadius: '50%', overflow: 'hidden', width: 36, height: 36 }}>
        {user.photoURL ? (
          <Image src={user.photoURL} alt={user.displayName ?? 'User'} width={36} height={36} style={{ borderRadius: '50%' }} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#000' }}>
            {(user.displayName ?? 'U')[0].toUpperCase()}
          </div>
        )}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 44, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '8px', minWidth: 180, zIndex: 50 }}>
          <button
            onClick={() => { setOpen(false); router.push('/profile'); }}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              background: 'none',
              padding: '8px 12px',
              fontSize: '0.85rem',
              color: 'var(--color-muted)',
              borderBottom: '1px solid var(--color-border)',
              marginBottom: 4,
              borderRadius: 0,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-muted)'; }}
            aria-label="View profile"
          >
            {user.displayName ?? user.email}
          </button>
          <button onClick={() => { setOpen(false); router.push('/settings'); }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', padding: '8px 12px', borderRadius: 6, color: 'var(--color-text)', fontSize: '0.9rem' }}>
            Settings
          </button>
          <button onClick={handleSignOut} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', padding: '8px 12px', borderRadius: 6, color: '#e53e3e', fontSize: '0.9rem' }}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
