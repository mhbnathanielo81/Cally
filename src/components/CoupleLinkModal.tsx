import { useState } from 'react';
import { User } from 'firebase/auth';
import { createCouple, joinCouple } from '@/lib/firestore';

interface Props {
  user: User;
  onLinked: () => void;
}

export default function CoupleLinkModal({ user, onLinked }: Props) {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [inviteCode, setInviteCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const code = await createCouple(user);
      setInviteCode(code);
      setMode('create');
    } catch {
      setError('Failed to create couple. Please try again.');
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

  return (
    <div className="overlay">
      <div className="modal">
        <h2>Connect with your partner 💚</h2>
        {error && <p style={{ color: '#e53e3e', marginBottom: 12, fontSize: '0.9rem' }}>{error}</p>}

        {mode === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: 'var(--color-muted)', margin: 0 }}>To share your calendar, you need to link with your partner.</p>
            <button className="btn-primary" onClick={handleCreate} disabled={loading} style={{ width: '100%', padding: '14px' }}>
              {loading ? 'Creating…' : '✨ Create a couple'}
            </button>
            <button className="btn-ghost" onClick={() => setMode('join')} style={{ width: '100%', padding: '14px' }}>
              🔗 Join with invite code
            </button>
          </div>
        )}

        {mode === 'create' && inviteCode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-muted)', margin: 0 }}>Share this 6-digit code with your partner. It expires in 24 hours.</p>
            <div style={{ background: 'var(--color-bg)', border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-btn)', padding: '16px 32px', fontSize: '2rem', fontWeight: 700, letterSpacing: '0.3em', color: 'var(--color-primary)' }}>
              {inviteCode}
            </div>
            <button onClick={() => navigator.clipboard.writeText(inviteCode)} className="btn-ghost">
              Copy code
            </button>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', margin: 0 }}>Waiting for partner to join… Once they join, the calendar will sync automatically.</p>
            <button className="btn-primary" onClick={onLinked} style={{ width: '100%', padding: '14px' }}>
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
