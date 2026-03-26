import { useState } from 'react';
import { addEvent } from '@/lib/firestore';

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    const hour = h % 12 === 0 ? 12 : h % 12;
    const ampm = h < 12 ? 'AM' : 'PM';
    const min = m.toString().padStart(2, '0');
    TIME_OPTIONS.push(`${hour}:${min} ${ampm}`);
  }
}

interface Props {
  coupleId: string;
  createdBy: string;
  day: number;
  month: number;
  year: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddEventModal({ coupleId, createdBy, day, month, year, onClose, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('12:00 PM');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    try {
      // Build payload without undefined values — Firestore rejects undefined fields
      const payload: Parameters<typeof addEvent>[2] = { title: title.trim(), time, day, month, year };
      if (location.trim()) payload.location = location.trim();
      if (notes.trim()) payload.notes = notes.trim();
      await addEvent(coupleId, createdBy, payload);
      onSaved();
      onClose();
    } catch {
      setError('Failed to save event. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        <h2>Add Event — {monthNames[month - 1]} {day}, {year}</h2>
        {error && <p style={{ color: '#e53e3e', marginBottom: 12, fontSize: '0.9rem' }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span>Title *</span>
              <span style={{ fontWeight: 400, fontSize: '0.78rem', color: title.length >= 50 ? '#e53e3e' : 'var(--color-muted)' }}>
                {title.length}/50
              </span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 50))}
              placeholder="Event title"
              autoFocus
              maxLength={50}
            />
          </div>
          <div className="field">
            <label>Time</label>
            <select value={time} onChange={(e) => setTime(e.target.value)}>
              {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Location <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>(optional)</span></label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Add a location" />
          </div>
          <div className="field">
            <label>Notes <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>(optional)</span></label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes" rows={3} style={{ resize: 'vertical' }} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
