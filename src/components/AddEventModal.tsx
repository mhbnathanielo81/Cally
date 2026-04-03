import { useState, useEffect } from 'react';
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

/** Advance a "H:MM AM/PM" time string by `mins` minutes. */
function advanceTime(time: string, mins: number): string {
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return time;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  let total = h * 60 + m + mins;
  if (total >= 1440) total -= 1440;
  if (total < 0) total += 1440;
  const newH24 = Math.floor(total / 60) % 24;
  const newM = total % 60;
  const newPeriod = newH24 < 12 ? 'AM' : 'PM';
  const newH12 = newH24 === 0 ? 12 : newH24 > 12 ? newH24 - 12 : newH24;
  return `${newH12}:${newM.toString().padStart(2, '0')} ${newPeriod}`;
}

interface Props {
  coupleId: string;
  createdBy: string;
  createdByName?: string;
  day: number;
  month: number;
  year: number;
  initialStartTime?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddEventModal({ coupleId, createdBy, createdByName, day, month, year, initialStartTime, onClose, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState(initialStartTime || '12:00 PM');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // When start time changes, clear end time so default 15-min applies
  useEffect(() => {
    setEndTime('');
  }, [time]);

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    try {
      const payload: Parameters<typeof addEvent>[2] = { title: title.trim(), time, day, month, year };
      if (endTime) payload.endTime = endTime;
      if (location.trim()) payload.location = location.trim();
      if (notes.trim()) payload.notes = notes.trim();
      await addEvent(coupleId, createdBy, payload, { changedByName: createdByName ?? '' });
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
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Start Time *</label>
              <select value={time} onChange={(e) => setTime(e.target.value)}>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>End Time <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>(optional)</span></label>
              <select value={endTime} onChange={(e) => setEndTime(e.target.value)}>
                <option value="">— ({advanceTime(time, 60)})</option>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
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
