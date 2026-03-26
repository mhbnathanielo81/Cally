/**
 * CallyAssistant.test.tsx
 *
 * Component-level tests for the Cally AI assistant chatbot.
 * Verifies that the UI renders correctly, accepts input, shows the chat panel,
 * and displays Cally's replies.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CallyAssistant from '@/components/CallyAssistant';
import { CallyEvent, Couple } from '@/types';

// jsdom doesn't implement scrollIntoView — provide a no-op stub
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

// ── fixtures ──────────────────────────────────────────────────────────────────

const fakeTs = { toDate: () => new Date(), seconds: 0, nanoseconds: 0 } as any;

const MY_UID = 'user-me';
const PARTNER_UID = 'user-partner';

const fakeCouple: Couple = {
  coupleId: 'couple-1',
  user1: MY_UID,
  user1DisplayName: 'Alex',
  user1PhotoURL: '',
  user2: PARTNER_UID,
  user2DisplayName: 'Jordan',
  user2PhotoURL: '',
  inviteCode: 'abc123',
  status: 'linked',
  createdAt: fakeTs,
  linkedAt: fakeTs,
  updatedAt: fakeTs,
};

function makeEvent(overrides: Partial<CallyEvent> = {}): CallyEvent {
  return {
    id: 'evt-default',
    coupleId: 'couple-1',
    title: 'Test Event',
    time: '12:00 PM',
    day: 15,
    month: 6,
    year: 2026,
    createdBy: MY_UID,
    type: 'event',
    createdAt: fakeTs,
    updatedAt: fakeTs,
    ...overrides,
  };
}

const baseProps = {
  events: [] as CallyEvent[],
  currentUid: MY_UID,
  couple: fakeCouple,
  currentUserName: 'Alex',
};

// ── rendering ─────────────────────────────────────────────────────────────────

describe('CallyAssistant — rendering', () => {
  it('renders the input placeholder text', () => {
    render(<CallyAssistant {...baseProps} />);
    expect(screen.getByPlaceholderText('Ask Cally about your calendar…')).toBeInTheDocument();
  });

  it('renders the Cally mascot image', () => {
    render(<CallyAssistant {...baseProps} />);
    expect(screen.getByAltText('Cally')).toBeInTheDocument();
  });

  it('renders the Ask button', () => {
    render(<CallyAssistant {...baseProps} />);
    expect(screen.getByRole('button', { name: /^ask$/i })).toBeInTheDocument();
  });

  it('does not show chat panel until the user focuses the input', () => {
    render(<CallyAssistant {...baseProps} />);
    // The greeting message should not be visible until panel is opened
    expect(screen.queryByText(/Hi! I'm Cally/)).not.toBeInTheDocument();
  });
});

// ── opening the chat panel ────────────────────────────────────────────────────

describe('CallyAssistant — opening the chat panel', () => {
  it('shows the greeting message after clicking the mascot', () => {
    render(<CallyAssistant {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /ask cally/i }));
    expect(screen.getByText(/Ask me anything about your calendar/)).toBeInTheDocument();
  });

  it('shows the greeting message after focusing the input', () => {
    render(<CallyAssistant {...baseProps} />);
    fireEvent.focus(screen.getByPlaceholderText('Ask Cally about your calendar…'));
    expect(screen.getByText(/Ask me anything about your calendar/)).toBeInTheDocument();
  });

  it('toggles the panel closed when mascot is clicked again', () => {
    render(<CallyAssistant {...baseProps} />);
    const mascotBtn = screen.getByRole('button', { name: /ask cally/i });
    fireEvent.click(mascotBtn); // open
    expect(screen.getByText(/Ask me anything about your calendar/)).toBeInTheDocument();
    fireEvent.click(mascotBtn); // close
    expect(screen.queryByText(/Ask me anything about your calendar/)).not.toBeInTheDocument();
  });

  it('closes the chat panel when the ✕ Close button is clicked', () => {
    render(<CallyAssistant {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /ask cally/i })); // open
    expect(screen.getByText(/Ask me anything about your calendar/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close cally chat/i }));
    expect(screen.queryByText(/Ask me anything about your calendar/)).not.toBeInTheDocument();
  });
});

// ── submitting a question ─────────────────────────────────────────────────────

describe('CallyAssistant — submitting questions', () => {
  function setup(events: CallyEvent[] = []) {
    render(<CallyAssistant {...baseProps} events={events} />);
    // open panel first
    fireEvent.click(screen.getByRole('button', { name: /ask cally/i }));
    const input = screen.getByPlaceholderText('Ask Cally about your calendar…');
    return { input };
  }

  it('displays the user message bubble after clicking Ask', () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'how many events do we have' } });
    fireEvent.click(screen.getByRole('button', { name: /^ask$/i }));
    expect(screen.getByText('how many events do we have')).toBeInTheDocument();
  });

  it('displays Cally reply after submitting', () => {
    const events = [makeEvent({ title: 'BBQ', month: 6 })];
    const { input } = setup(events);
    fireEvent.change(input, { target: { value: 'how many events do we have' } });
    fireEvent.click(screen.getByRole('button', { name: /^ask$/i }));
    // Cally should say there is 1 event
    expect(screen.getByText(/1 event/i)).toBeInTheDocument();
  });

  it('clears the input after submitting', () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'some question' } });
    fireEvent.click(screen.getByRole('button', { name: /^ask$/i }));
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('submits on Enter key press', () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'how many events do we have' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('how many events do we have')).toBeInTheDocument();
  });

  it('does not submit when input is empty', () => {
    setup();
    // There should be exactly 1 message bubble (the greeting)
    const beforeCount = screen.getAllByText(/Cally:/).length;
    fireEvent.click(screen.getByRole('button', { name: /^ask$/i }));
    // Still only the greeting
    expect(screen.getAllByText(/Cally:/).length).toBe(beforeCount);
  });
});

// ── Michigan query integration test ──────────────────────────────────────────

describe('CallyAssistant — Michigan scenario', () => {
  it('correctly answers "how many times am I going to Michigan this year"', () => {
    const events = [
      makeEvent({ id: 'e1', title: 'Detroit Visit', location: 'Michigan', time: '9:00 AM', day: 10, month: 3, year: 2026, createdBy: MY_UID }),
      makeEvent({ id: 'e2', title: 'Ann Arbor Trip', location: 'Michigan', time: '2:00 PM', day: 20, month: 7, year: 2026, createdBy: PARTNER_UID }),
      makeEvent({ id: 'e3', title: 'Unrelated Event', location: 'Chicago', time: '10:00 AM', day: 1, month: 5, year: 2026 }),
    ];

    render(<CallyAssistant {...baseProps} events={events} />);
    fireEvent.click(screen.getByRole('button', { name: /ask cally/i }));
    const input = screen.getByPlaceholderText('Ask Cally about your calendar…');

    fireEvent.change(input, { target: { value: 'how many times am I going to Michigan this year' } });
    fireEvent.click(screen.getByRole('button', { name: /^ask$/i }));

    // Should mention 2 events for Michigan
    expect(screen.getByText(/2 events/)).toBeInTheDocument();
    // Should list both Michigan events
    expect(screen.getByText(/Detroit Visit/)).toBeInTheDocument();
    expect(screen.getByText(/Ann Arbor Trip/)).toBeInTheDocument();
    // Should NOT mention the Chicago event
    expect(screen.queryByText(/Unrelated Event/)).not.toBeInTheDocument();
    // Should identify who added each event
    expect(screen.getByText(/Alex/)).toBeInTheDocument();   // Detroit Visit — Alex
    expect(screen.getByText(/Jordan/)).toBeInTheDocument(); // Ann Arbor Trip — Jordan
  });
});
