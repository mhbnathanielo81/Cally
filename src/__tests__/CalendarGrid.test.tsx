import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CalendarGrid from '@/components/CalendarGrid';
import { CallyEvent } from '@/types';

// Minimal fake Timestamp shape to satisfy the type
const fakeTs = { toDate: () => new Date(), seconds: 0, nanoseconds: 0 } as any;

function makeEvent(overrides: Partial<CallyEvent> = {}): CallyEvent {
  return {
    id: 'evt-1',
    coupleId: 'couple-1',
    title: 'Test Event',
    time: '2:00 PM',
    day: 15,
    month: 3,
    year: 2026,
    createdBy: 'user-me',
    type: 'event',
    createdAt: fakeTs,
    updatedAt: fakeTs,
    ...overrides,
  };
}

const baseProps = {
  month: 3,
  year: 2026,
  events: [] as CallyEvent[],
  currentUid: 'user-me',
  onDayClick: jest.fn(),
  onEventClick: jest.fn(),
};

afterEach(() => jest.clearAllMocks());

describe('CalendarGrid', () => {
  it('renders all 7 day-name headers', () => {
    render(<CalendarGrid {...baseProps} />);
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((d) => {
      expect(screen.getByText(d)).toBeInTheDocument();
    });
  });

  it('renders 31 day cells for March 2026', () => {
    render(<CalendarGrid {...baseProps} />);
    // Day 1 through 31 should all appear
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
  });

  it('calls onDayClick with the correct day when a date cell is clicked', () => {
    render(<CalendarGrid {...baseProps} />);
    fireEvent.click(screen.getByText('10'));
    expect(baseProps.onDayClick).toHaveBeenCalledWith(10);
  });

  it('renders an event pill on the correct day', () => {
    const events = [makeEvent({ title: 'Birthday Party', day: 15 })];
    render(<CalendarGrid {...baseProps} events={events} />);
    expect(screen.getByText('Birthday Party')).toBeInTheDocument();
  });

  it('calls onEventClick when an event pill is clicked', () => {
    const event = makeEvent({ title: 'Dinner Date', type: 'dinner' });
    render(<CalendarGrid {...baseProps} events={[event]} />);
    fireEvent.click(screen.getByText('Dinner Date'));
    expect(baseProps.onEventClick).toHaveBeenCalledWith(event);
  });

  it('shows "+N more" label when a day has more than 3 events', () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      makeEvent({ id: `evt-${i}`, title: `Event ${i + 1}`, day: 20 })
    );
    render(<CalendarGrid {...baseProps} events={events} />);
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('does not render events from a different month', () => {
    const events = [makeEvent({ title: 'Old Event', month: 2, day: 15 })];
    render(<CalendarGrid {...baseProps} events={events} />);
    expect(screen.queryByText('Old Event')).not.toBeInTheDocument();
  });

  it('does not render events from a different year', () => {
    const events = [makeEvent({ title: 'Future Event', year: 2027 })];
    render(<CalendarGrid {...baseProps} events={events} />);
    expect(screen.queryByText('Future Event')).not.toBeInTheDocument();
  });
});
