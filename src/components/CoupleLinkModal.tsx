import { useState } from 'react';
import { User } from 'firebase/auth';
import { createCouple, joinCouple } from '@/lib/firestore';
import { Couple } from '@/types';

interface Props {
  user: User;
  couple?: Couple | null;
  onLinked: () => void;
  onClose?: () => void;
}

export default function CoupleLinkModal({ user, couple, onLinked, onClose }: Props) {
  const initialMode = (): 'choose' | 'create' | 'join' | 'linked' => {
    if (!couple) return 'choose';
    if (couple.status === 'linked') return 'linked';
    if (couple.status === 'pending' && couple.user1 === user.uid) return 'create';
    return 'choose';
  };

  const [mode, setMode] = useState<'choose' | 'create' | 'join' | 'linked'>(initialMode);
  const [inviteCode, setInviteCode] = useState(
    couple?.status === 'pending' && couple.user1 === user.uid ? couple.inviteCode : ''
  );
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Derive the invite link from the code so there is a single source of truth
  const inviteLink = inviteCode && typeof window !== 'undefined'
    ? `${window.location.origin}/join?code=${inviteCode}`
    : '';

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const code = await createCouple(user);
      setInviteCode(code);
      setMode('create');
    } catch {
      setError('Failed to create invite link. Please try again.');
    }
    setLoading(false);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.length !== 6) { setError('Enter a valid 6-digit code.'); return; }
    setLoading(true);
    setError('');
    try {
      await joinCouple(user, joinCode.trim());
      onLinked();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join. Please try again.');
    }
    setLoading(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const partnerName = couple
    ? (couple.user1 === user.uid ? couple.user2DisplayName : couple.user1DisplayName) || 'your partner'
    : null;

  const handleClose = onClose ?? onLinked;

  return (
    <div className="overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={handleClose}>×</button>
        <h2>Pair Calendar 💚</h2>
        {error && <p style={{ color: '#e53e3e', marginBottom: 12, fontSize: '0.9rem' }}>{error}</p>}

        {mode === 'linked' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', alignItems: 'center' }}>
            <p style={{ fontSize: '2rem', margin: 0 }}>✅</p>
            <p style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>
              Paired with {partnerName}
            </p>
            <p style={{ color: 'var(--color-muted)', margin: 0 }}>Your calendar is shared with your partner.</p>
            <button className="btn-primary" onClick={handleClose} style={{ width: '100%', padding: '14px' }}>
              Continue
            </button>
          </div>
        )}

        {mode === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: 'var(--color-muted)', margin: 0 }}>
              Send your partner an invite link — they sign in with Google and your calendars link instantly.
            </p>
            <button className="btn-primary" onClick={handleCreate} disabled={loading} style={{ width: '100%', padding: '14px' }}>
              {loading ? 'Creating…' : '🔗 Create invite link'}
            </button>
            <button className="btn-ghost" onClick={() => setMode('join')} style={{ width: '100%', padding: '14px' }}>
              Enter invite code manually
            </button>
          </div>
        )}

        {mode === 'create' && inviteCode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: 'var(--color-muted)', margin: 0 }}>
              Copy the link below and send it to your partner. They sign in with Google and your calendars link automatically.
            </p>
            <div style={{
              background: 'var(--color-bg)',
              border: '2px solid var(--color-primary)',
              borderRadius: 'var(--radius-btn)',
              padding: '12px 16px',
              fontSize: '0.8rem',
              color: 'var(--color-primary)',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
              lineHeight: 1.5,
            }}>
              {inviteLink}
            </div>
            <button onClick={handleCopyLink} className="btn-primary" style={{ width: '100%', padding: '14px' }}>
              {copied ? '✅ Copied!' : '📋 Copy invite link'}
            </button>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.82rem', margin: 0, textAlign: 'center' }}>
              Or share the 6-digit code: <strong style={{ color: 'var(--color-primary)', letterSpacing: '0.1em' }}>{inviteCode}</strong>
              {' '}· Expires in 24 hours
            </p>
            <button className="btn-ghost" onClick={handleClose} style={{ width: '100%', padding: '12px' }}>
              Continue to calendar
            </button>
          </div>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: 'var(--color-muted)', margin: 0 }}>Enter the 6-digit invite code your partner shared with you.</p>
            <div className="field">
              <label>Invite Code</label>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                style={{ fontSize: '1.5rem', letterSpacing: '0.3em', textAlign: 'center' }}
                autoFocus
                maxLength={6}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => { setMode('choose'); setError(''); }}>Back</button>
              <button type="submit" className="btn-primary" disabled={loading || joinCode.length !== 6}>
                {loading ? 'Joining…' : 'Join'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
