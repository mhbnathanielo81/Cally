import { useEffect, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { subscribeToEventHistory } from '@/lib/firestore';
import { EventHistoryEntry } from '@/types';

interface Props {
  coupleId: string;
  onClose: () => void;
}

const ACTION_ICONS: Record<EventHistoryEntry['action'], string> = {
  created: '✨',
  updated: '✏️',
  deleted: '🗑️',
};

const ACTION_LABELS: Record<EventHistoryEntry['action'], string> = {
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted',
};

const ACTION_COLORS: Record<EventHistoryEntry['action'], string> = {
  created: 'var(--color-primary)',
  updated: '#4A90D9',
  deleted: '#e53e3e',
};

function formatTimestamp(ts: Timestamp | undefined): string {
  if (!ts) return '';
  const d = ts.toDate();
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' at '
    + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  time: 'Time',
  location: 'Location',
  notes: 'Notes',
  day: 'Day',
  month: 'Month',
  year: 'Year',
};

export default function EventHistoryModal({ coupleId, onClose }: Props) {
  const [entries, setEntries] = useState<EventHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToEventHistory(coupleId, (data) => {
      setEntries(data);
      setLoading(false);
    });
    return unsub;
  }, [coupleId]);

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(540px, 95vw)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        <button className="close-btn" onClick={onClose}>×</button>
        <h2 style={{ marginBottom: 8 }}>📋 Calendar History</h2>
        <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
          A log of all event changes — additions, edits, and deletions.
        </p>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-muted)' }}>
              Loading history…
            </div>
          )}

          {!loading && entries.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-muted)' }}>
              No history yet. Changes to events will appear here.
            </div>
          )}

          {!loading && entries.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    background: 'var(--color-bg)',
                    borderRadius: 10,
                    padding: '14px 16px',
                    borderLeft: `3px solid ${ACTION_COLORS[entry.action]}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: '1rem' }}>{ACTION_ICONS[entry.action]}</span>
                    <span style={{ fontWeight: 700, color: ACTION_COLORS[entry.action], fontSize: '0.85rem' }}>
                      {ACTION_LABELS[entry.action]}
                    </span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                      {formatTimestamp(entry.changedAt)}
                    </span>
                  </div>

                  <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: '0.95rem' }}>
                    {entry.eventTitle}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                    {entry.eventDate}
                    {entry.changedByName ? ` · by ${entry.changedByName}` : ''}
                  </p>

                  {entry.action === 'updated' && entry.changes && Object.keys(entry.changes).length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {Object.entries(entry.changes).map(([field, { from, to }]) => (
                        <div key={field} style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                            {FIELD_LABELS[field] ?? field}:
                          </span>{' '}
                          <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>
                            {String(from ?? '—')}
                          </span>
                          {' → '}
                          <span style={{ color: 'var(--color-text)' }}>{String(to ?? '—')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
