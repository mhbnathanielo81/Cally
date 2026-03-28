/**
 * CallyAssistant.test.tsx
 *
 * Component-level tests for the Cally AI assistant chatbot.
 * Verifies that the UI renders correctly, accepts input, shows the chat panel,
 * and displays Cally's replies.
 *
 * The askCally function is mocked so tests don't hit the network.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CallyAssistant from '@/components/CallyAssistant';
import { CallyEvent, Couple } from '@/types';

// ── Mock askCally so tests don't hit the network ──────────────────────────────

jest.mock('@/lib/callyAI', () => ({
  askCally: jest.fn().mockResolvedValue({ action: 'reply', reply: 'There is 1 event on the calendar.' }),
}));

import { askCally } from '@/lib/callyAI';
const mockAskCally = askCally as jest.MockedFunction<typeof askCally>;

// jsdom doesn't implement scrollIntoView — provide a no-op stub
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

afterEach(() => {
  jest.clearAllMocks();
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
  onCreateEvent: jest.fn().mockResolvedValue(undefined),
  onUpdateEvent: jest.fn().mockResolvedValue(undefined),
  onDeleteEvent: jest.fn().mockResolvedValue(undefined),
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

  it('displays the user message bubble after clicking Ask', async () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'how many events do we have' } });
    fireEvent.click(screen.getByRole('button', { name: /^ask$/i }));
    expect(screen.getByText('how many events do we have')).toBeInTheDocument();
  });

  it('displays Cally reply after submitting', async () => {
    mockAskCally.mockResolvedValueOnce({ action: 'reply', reply: 'There is 1 event on the calendar.' });
    const events = [makeEvent({ title: 'BBQ', month: 6 })];
    const { input } = setup(events);
    fireEvent.change(input, { target: { value: 'how many events do we have' } });
    fireEvent.click(screen.getByRole('button', { name: /^ask$/i }));
    // Cally should say there is 1 event (from the mock)
    await waitFor(() => expect(screen.getByText(/1 event/i)).toBeInTheDocument());
  });

  it('clears the input after submitting', async () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'some question' } });
    fireEvent.click(screen.getByRole('button', { name: /^ask$/i }));
    expect((input as HTMLTextAreaElement).value).toBe('');
  });

  it('submits on Enter key press', async () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'how many events do we have' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('how many events do we have')).toBeInTheDocument();
  });

  it('does NOT submit on Shift+Enter (allows newline)', async () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'line one' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    // askCally should NOT have been called — the message was not submitted
    expect(mockAskCally).not.toHaveBeenCalled();
  });

  it('does not submit when input is empty', async () => {
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
  it('sends the question to askCally and displays its reply', async () => {
    mockAskCally.mockResolvedValueOnce({
      action: 'reply',
      reply: 'You have 2 events in Michigan: Detroit Visit (March 10, added by Alex) and Ann Arbor Trip (July 20, added by Jordan).',
    });

    const events = [
      makeEvent({ id: 'e1', title: 'Detroit Visit', location: 'Michigan', time: '9:00 AM', day: 10, month: 3, year: 2026, createdBy: MY_UID }),
      makeEvent({ id: 'e2', title: 'Ann Arbor Trip', location: 'Michigan', time: '2:00 PM', day: 20, month: 7, year: 2026, createdBy: PARTNER_UID }),
    ];

    render(<CallyAssistant {...baseProps} events={events} />);
    fireEvent.click(screen.getByRole('button', { name: /ask cally/i }));
    const input = screen.getByPlaceholderText('Ask Cally about your calendar…');

    fireEvent.change(input, { target: { value: 'how many times am I going to Michigan this year' } });
    fireEvent.click(screen.getByRole('button', { name: /^ask$/i }));

    await waitFor(() => expect(screen.getByText(/2 events/)).toBeInTheDocument());
    expect(screen.getByText(/Detroit Visit/)).toBeInTheDocument();
    expect(screen.getByText(/Ann Arbor Trip/)).toBeInTheDocument();
    expect(screen.getByText(/Alex/)).toBeInTheDocument();
    expect(screen.getByText(/Jordan/)).toBeInTheDocument();
  });
});

// ── Multi-event creation ──────────────────────────────────────────────────────

describe('CallyAssistant — multi-event creation', () => {
  it('calls onCreateEvent for each event and shows Cally reply', async () => {
    const onCreateEvent = jest.fn().mockResolvedValue(undefined);
    mockAskCally.mockResolvedValueOnce({
      action: 'create_events',
      reply: 'Done! I added 2 events to your calendar 💚',
      events: [
        { title: 'BBQ', day: 1, month: 7, year: 2026, time: '6:00 PM', location: '', notes: '', type: 'event' },
        { title: 'Swim', day: 2, month: 7, year: 2026, time: '10:00 AM', location: '', notes: '', type: 'event' },
      ],
    });

    render(<CallyAssistant {...baseProps} onCreateEvent={onCreateEvent} />);
    fireEvent.click(screen.getByRole('button', { name: /ask cally/i }));
    const input = screen.getByPlaceholderText('Ask Cally about your calendar…');
    fireEvent.change(input, { target: { value: 'Add BBQ on July 1 and Swim on July 2' } });
    fireEvent.click(screen.getByRole('button', { name: /^ask$/i }));

    await waitFor(() => expect(onCreateEvent).toHaveBeenCalledTimes(2));
    expect(onCreateEvent).toHaveBeenCalledWith(expect.objectContaining({ title: 'BBQ' }));
    expect(onCreateEvent).toHaveBeenCalledWith(expect.objectContaining({ title: 'Swim' }));
    await waitFor(() => expect(screen.getByText(/2 events/)).toBeInTheDocument());
  });
});

// ── Update event ──────────────────────────────────────────────────────────────

describe('CallyAssistant — update event', () => {
  const existingEvent = {
    id: 'evt-bbq',
    coupleId: 'couple-1',
    title: 'BBQ Party',
    time: '5:00 PM',
    day: 1,
    month: 7,
    year: 2026,
    createdBy: MY_UID,
    type: 'event' as const,
    createdAt: { toDate: () => new Date(), seconds: 0, nanoseconds: 0 } as any,
    updatedAt: { toDate: () => new Date(), seconds: 0, nanoseconds: 0 } as any,
  };

  it('calls onUpdateEvent when event is found', async () => {
    const onUpdateEvent = jest.fn().mockResolvedValue(undefined);
    mockAskCally.mockResolvedValueOnce({
      action: 'update_event',
      reply: "Done! I updated 'BBQ Party' 💚",
      update: { eventTitle: 'BBQ Party', changes: { time: '7:00 PM' } },
    });

    render(<CallyAssistant {...baseProps} events={[existingEvent]} onUpdateEvent={onUpdateEvent} />);
    fireEvent.click(screen.getByRole('button', { name: /ask cally/i }));
    const input = screen.getByPlaceholderText('Ask Cally about your calendar…');
    fireEvent.change(input, { target: { value: 'Move BBQ Party to 7 PM' } });
    fireEvent.click(screen.getByRole('button', { name: /^ask$/i }));

    await waitFor(() => expect(onUpdateEvent).toHaveBeenCalledWith('evt-bbq', { time: '7:00 PM' }));
    await waitFor(() => expect(screen.getByText(/updated 'BBQ Party'/)).toBeInTheDocument());
  });

  it('shows not-found message when event title does not match', async () => {
    const onUpdateEvent = jest.fn().mockResolvedValue(undefined);
    mockAskCally.mockResolvedValueOnce({
      action: 'update_event',
      reply: "Done! 💚",
      update: { eventTitle: 'Nonexistent Event', changes: { time: '7:00 PM' } },
    });

    render(<CallyAssistant {...baseProps} events={[existingEvent]} onUpdateEvent={onUpdateEvent} />);
    fireEvent.click(screen.getByRole('button', { name: /ask cally/i }));
    const input = screen.getByPlaceholderText('Ask Cally about your calendar…');
    fireEvent.change(input, { target: { value: 'Move Nonexistent Event to 7 PM' } });
    fireEvent.click(screen.getByRole('button', { name: /^ask$/i }));

    await waitFor(() => expect(screen.getByText(/couldn't find "Nonexistent Event"/)).toBeInTheDocument());
    expect(onUpdateEvent).not.toHaveBeenCalled();
  });
});

// ── Delete event ──────────────────────────────────────────────────────────────

describe('CallyAssistant — delete event', () => {
  const existingEvent = {
    id: 'evt-bbq',
    coupleId: 'couple-1',
    title: 'BBQ Party',
    time: '5:00 PM',
    day: 1,
    month: 7,
    year: 2026,
    createdBy: MY_UID,
    type: 'event' as const,
    createdAt: { toDate: () => new Date(), seconds: 0, nanoseconds: 0 } as any,
    updatedAt: { toDate: () => new Date(), seconds: 0, nanoseconds: 0 } as any,
  };

  it('calls onDeleteEvent when event is found', async () => {
    const onDeleteEvent = jest.fn().mockResolvedValue(undefined);
    mockAskCally.mockResolvedValueOnce({
      action: 'delete_event',
      reply: "Done! I removed 'BBQ Party' from your calendar 💚",
      deleteEventTitle: 'BBQ Party',
    });

    render(<CallyAssistant {...baseProps} events={[existingEvent]} onDeleteEvent={onDeleteEvent} />);
    fireEvent.click(screen.getByRole('button', { name: /ask cally/i }));
    const input = screen.getByPlaceholderText('Ask Cally about your calendar…');
    fireEvent.change(input, { target: { value: 'Delete BBQ Party' } });
    fireEvent.click(screen.getByRole('button', { name: /^ask$/i }));

    await waitFor(() => expect(onDeleteEvent).toHaveBeenCalledWith('evt-bbq'));
    await waitFor(() => expect(screen.getByText(/removed 'BBQ Party'/)).toBeInTheDocument());
  });

  it('shows not-found message when event title does not match', async () => {
    const onDeleteEvent = jest.fn().mockResolvedValue(undefined);
    mockAskCally.mockResolvedValueOnce({
      action: 'delete_event',
      reply: "Done! 💚",
      deleteEventTitle: 'Ghost Event',
    });

    render(<CallyAssistant {...baseProps} events={[existingEvent]} onDeleteEvent={onDeleteEvent} />);
    fireEvent.click(screen.getByRole('button', { name: /ask cally/i }));
    const input = screen.getByPlaceholderText('Ask Cally about your calendar…');
    fireEvent.change(input, { target: { value: 'Delete Ghost Event' } });
    fireEvent.click(screen.getByRole('button', { name: /^ask$/i }));

    await waitFor(() => expect(screen.getByText(/couldn't find "Ghost Event"/)).toBeInTheDocument());
    expect(onDeleteEvent).not.toHaveBeenCalled();
  });
});
