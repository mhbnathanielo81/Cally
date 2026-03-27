import { useState } from 'react';
import { CallyEvent } from '@/types';
import { updateEvent, deleteEvent } from '@/lib/firestore';
import { getEventColor } from '@/lib/colors';

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    const hour = h % 12 === 0 ? 12 : h % 12;
    const ampm = h < 12 ? 'AM' : 'PM';
    const min = m.toString().padStart(2, '0');
    TIME_OPTIONS.push(`${hour}:${min} ${ampm}`);
  }
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface Props {
  event: CallyEvent;
  currentUid: string;
  currentUserName?: string;
  onClose: () => void;
}

export default function EventDetailModal({ event, currentUid, currentUserName = '', onClose }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [time, setTime] = useState(event.time);
  const [location, setLocation] = useState(event.location ?? '');
  const [notes, setNotes] = useState(event.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const color = getEventColor(event.createdBy, currentUid, event.type);
  const canEdit = event.createdBy === currentUid;
  // Both the creator and their partner can delete an event from the shared calendar
  const canDelete = true;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    try {
      await updateEvent(event.id, { title: title.trim(), time, location: location.trim() || undefined, notes: notes.trim() || undefined }, {
        changedBy: currentUid,
        changedByName: currentUserName,
        previousEvent: event,
      });
      // Close the modal so the refreshed event data is shown from the events list
      onClose();
    } catch {
      setError('Failed to update event.');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this event?')) return;
    try {
      await deleteEvent(event.id, { event, changedBy: currentUid, changedByName: currentUserName });
      onClose();
    } catch {
      setError('Failed to delete event.');
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        <div style={{ width: 4, height: 40, background: color, borderRadius: 2, position: 'absolute', left: 16, top: 32 }} />
        <h2 style={{ paddingLeft: 16 }}>{editing ? 'Edit Event' : event.title}</h2>
        {!editing && (
          <div style={{ paddingLeft: 16 }}>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', margin: '0 0 8px' }}>{MONTH_NAMES[event.month - 1]} {event.day}, {event.year} · {event.time}</p>
            {event.location && <p style={{ margin: '0 0 8px', fontSize: '0.9rem' }}>📍 {event.location}</p>}
            {event.notes && <p style={{ margin: '0 0 8px', fontSize: '0.9rem', color: 'var(--color-muted)' }}>{event.notes}</p>}
            <div className="modal-actions" style={{ paddingLeft: 0 }}>
              {canDelete && <button className="btn-danger" onClick={handleDelete}>Delete</button>}
              {canEdit && <button className="btn-ghost" onClick={() => { setError(''); setEditing(true); }}>Edit</button>}
              <button className="btn-primary" onClick={onClose}>Close</button>
            </div>
          </div>
        )}
        {editing && (
          <form onSubmit={handleSave} style={{ paddingLeft: 16 }}>
            {error && <p style={{ color: '#e53e3e', marginBottom: 12, fontSize: '0.9rem' }}>{error}</p>}
            <div className="field">
              <label>Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <label>Time</label>
              <select value={time} onChange={(e) => setTime(e.target.value)}>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" />
            </div>
            <div className="field">
              <label>Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ resize: 'vertical' }} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
