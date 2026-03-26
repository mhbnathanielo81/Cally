/**
 * callyEngine.test.ts
 *
 * Unit tests for the Cally AI assistant query engine.
 * All tests operate on plain data — no React, no Firebase.
 */

import {
  timeToMinutes,
  extractLocationFromQuery,
  creatorLabel,
  describeEvent,
  parseDayQuery,
  answer,
} from '@/lib/callyEngine';
import { CallyEvent, Couple } from '@/types';

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

// ── timeToMinutes ─────────────────────────────────────────────────────────────

describe('timeToMinutes', () => {
  it('returns 0 for midnight 12:00 AM', () => {
    expect(timeToMinutes('12:00 AM')).toBe(0);
  });

  it('returns 540 for 9:00 AM', () => {
    expect(timeToMinutes('9:00 AM')).toBe(540);
  });

  it('returns 780 for 1:00 PM', () => {
    expect(timeToMinutes('1:00 PM')).toBe(780);
  });

  it('returns 720 for noon 12:00 PM', () => {
    expect(timeToMinutes('12:00 PM')).toBe(720);
  });

  it('returns 1425 for 11:45 PM', () => {
    expect(timeToMinutes('11:45 PM')).toBe(1425);
  });

  it('returns 0 for an unparseable string', () => {
    expect(timeToMinutes('no-time')).toBe(0);
  });
});

// ── extractLocationFromQuery ──────────────────────────────────────────────────

describe('extractLocationFromQuery', () => {
  it('extracts "michigan" from "how many times going to michigan this year"', () => {
    expect(extractLocationFromQuery('how many times going to michigan this year')).toBe('michigan');
  });

  it('extracts "new york" from "events in new york"', () => {
    expect(extractLocationFromQuery('events in new york')).toBe('new york');
  });

  it('extracts "chicago" from "trip to chicago in 2026"', () => {
    expect(extractLocationFromQuery('trip to chicago in 2026')).toBe('chicago');
  });

  it('extracts "michigan" from a bare 1-word query', () => {
    expect(extractLocationFromQuery('michigan')).toBe('michigan');
  });

  it('returns null for "how many events do we have"', () => {
    expect(extractLocationFromQuery('how many events do we have')).toBeNull();
  });

  it('returns null for "list all events"', () => {
    expect(extractLocationFromQuery('list all events')).toBeNull();
  });
});

// ── creatorLabel ──────────────────────────────────────────────────────────────

describe('creatorLabel', () => {
  it('returns the current user name when UID matches', () => {
    expect(creatorLabel(MY_UID, MY_UID, fakeCouple, 'Alex')).toBe('Alex');
  });

  it("returns partner's display name from couple data", () => {
    expect(creatorLabel(PARTNER_UID, MY_UID, fakeCouple, 'Alex')).toBe('Jordan');
  });

  it('returns "your partner" when couple is null', () => {
    expect(creatorLabel(PARTNER_UID, MY_UID, null, 'Alex')).toBe('your partner');
  });

  it('falls back to "you" when currentUserName is empty', () => {
    expect(creatorLabel(MY_UID, MY_UID, null, '')).toBe('you');
  });
});

// ── describeEvent ─────────────────────────────────────────────────────────────

describe('describeEvent', () => {
  it('includes title, date, time, and creator name', () => {
    const e = makeEvent({ title: 'Team Lunch', time: '1:00 PM', day: 5, month: 4, year: 2026 });
    const desc = describeEvent(e, MY_UID, fakeCouple, 'Alex');
    expect(desc).toContain('Team Lunch');
    expect(desc).toContain('April 5, 2026');
    expect(desc).toContain('1:00 PM');
    expect(desc).toContain('Alex');
  });

  it('includes location when present', () => {
    const e = makeEvent({ title: 'Flight', location: 'Detroit Metro Airport' });
    const desc = describeEvent(e, MY_UID, fakeCouple, 'Alex');
    expect(desc).toContain('@ Detroit Metro Airport');
  });

  it('omits location marker when location is absent', () => {
    const e = makeEvent({ title: 'Call', location: undefined });
    const desc = describeEvent(e, MY_UID, fakeCouple, 'Alex');
    expect(desc).not.toContain('@');
  });
});

// ── answer() — location queries ───────────────────────────────────────────────

describe('answer — location queries', () => {
  const events = [
    makeEvent({ id: 'e1', title: 'Detroit Visit', location: 'Michigan', time: '9:00 AM', day: 10, month: 3, year: 2026, createdBy: MY_UID }),
    makeEvent({ id: 'e2', title: 'Ann Arbor Trip', location: 'Michigan', time: '2:00 PM', day: 20, month: 7, year: 2026, createdBy: PARTNER_UID }),
    makeEvent({ id: 'e3', title: 'Paris Holiday', location: 'France', time: '10:00 AM', day: 5, month: 8, year: 2026, createdBy: MY_UID }),
  ];

  it('counts Michigan events across all of 2026', () => {
    const resp = answer('how many times am I going to Michigan this year', events, MY_UID, fakeCouple, 'Alex');
    expect(resp).toContain('2 events');
    expect(resp).toContain('michigan');
  });

  it('lists both Michigan events in chronological order', () => {
    const resp = answer('events in Michigan', events, MY_UID, fakeCouple, 'Alex');
    const detroit = resp.indexOf('Detroit Visit');
    const annArbor = resp.indexOf('Ann Arbor Trip');
    expect(detroit).toBeGreaterThan(-1);
    expect(annArbor).toBeGreaterThan(-1);
    // Detroit (March 10) should appear before Ann Arbor (July 20)
    expect(detroit).toBeLessThan(annArbor);
  });

  it('identifies who added each Michigan event', () => {
    const resp = answer('events in Michigan 2026', events, MY_UID, fakeCouple, 'Alex');
    expect(resp).toContain('Alex');   // Detroit Visit — added by me
    expect(resp).toContain('Jordan'); // Ann Arbor Trip — added by partner
  });

  it('reports no results when location is not found', () => {
    const resp = answer('events in Tokyo', events, MY_UID, fakeCouple, 'Alex');
    expect(resp).toContain("don't see any events");
    expect(resp).toContain('tokyo');
  });
});

// ── answer() — year filtering ─────────────────────────────────────────────────

describe('answer — year filtering', () => {
  const events = [
    makeEvent({ id: 'e1', title: 'Old Event', year: 2025, month: 6 }),
    makeEvent({ id: 'e2', title: 'Current Event', year: 2026, month: 6 }),
    makeEvent({ id: 'e3', title: 'Future Event', year: 2027, month: 6 }),
  ];

  it('only shows 2026 events when year is specified', () => {
    const resp = answer('how many events do we have in 2026', events, MY_UID, null, 'Alex');
    expect(resp).toContain('1 event');
    expect(resp).toContain('2026');
  });

  it('shows all events when no year is specified', () => {
    const resp = answer('how many events total events', events, MY_UID, null, 'Alex');
    expect(resp).toContain('3 events');
  });
});

// ── answer() — count / list all ───────────────────────────────────────────────

describe('answer — count and list all events', () => {
  const events = [
    makeEvent({ id: 'e1', title: 'Brunch', day: 1 }),
    makeEvent({ id: 'e2', title: 'Run', day: 2 }),
  ];

  it('reports correct total count', () => {
    const resp = answer('how many events are there', events, MY_UID, null, 'Alex');
    expect(resp).toContain('2 events');
  });

  it('lists all events including titles', () => {
    const resp = answer('list all events', events, MY_UID, null, 'Alex');
    expect(resp).toContain('Brunch');
    expect(resp).toContain('Run');
  });

  it('handles empty calendar gracefully', () => {
    const resp = answer('show all events in 2030', [], MY_UID, null, 'Alex');
    expect(resp).toContain('No events found');
  });

  it('shows singular "event" when count is 1', () => {
    const resp = answer('how many events do we have', [makeEvent()], MY_UID, null, 'Alex');
    expect(resp).toMatch(/\b1 event\b/);
    // Should not say "1 events"
    expect(resp).not.toMatch(/\b1 events\b/);
  });
});

// ── answer() — month filtering ────────────────────────────────────────────────

describe('answer — month filtering', () => {
  const events = [
    makeEvent({ id: 'e1', title: 'June BBQ', month: 6 }),
    makeEvent({ id: 'e2', title: 'July 4th', month: 7 }),
  ];

  it('returns only June events', () => {
    const resp = answer('list events in June', events, MY_UID, null, 'Alex');
    expect(resp).toContain('June BBQ');
    expect(resp).not.toContain('July 4th');
  });

  it('handles month with no events', () => {
    const resp = answer('events in August', events, MY_UID, null, 'Alex');
    expect(resp).toContain('No events found in August');
  });
});

// ── answer() — my vs partner events ──────────────────────────────────────────

describe('answer — my events vs partner events', () => {
  const events = [
    makeEvent({ id: 'e1', title: 'My Meeting', createdBy: MY_UID }),
    makeEvent({ id: 'e2', title: "Partner's Yoga", createdBy: PARTNER_UID }),
  ];

  it('returns only my events', () => {
    const resp = answer('show my events', events, MY_UID, fakeCouple, 'Alex');
    expect(resp).toContain('My Meeting');
    expect(resp).not.toContain("Partner's Yoga");
  });

  it("returns only partner's events", () => {
    const resp = answer("show my partner's events", events, MY_UID, fakeCouple, 'Alex');
    expect(resp).not.toContain('My Meeting');
    expect(resp).toContain("Partner's Yoga");
  });

  it('handles empty my-events gracefully', () => {
    const partnerOnly = [makeEvent({ id: 'e1', createdBy: PARTNER_UID })];
    const resp = answer('show my events', partnerOnly, MY_UID, null, 'Alex');
    expect(resp).toContain("haven't added any events yet");
  });

  it("handles empty partner's events gracefully", () => {
    const myOnly = [makeEvent({ id: 'e1', createdBy: MY_UID })];
    const resp = answer("show partner events", myOnly, MY_UID, null, 'Alex');
    expect(resp).toContain("hasn't added any events yet");
  });
});

// ── answer() — next upcoming event ────────────────────────────────────────────

describe('answer — next upcoming event', () => {
  it('returns the soonest future event', () => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const nextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);

    const events = [
      makeEvent({
        id: 'e1', title: 'Tomorrow Event',
        day: tomorrow.getDate(), month: tomorrow.getMonth() + 1, year: tomorrow.getFullYear(), time: '9:00 AM',
      }),
      makeEvent({
        id: 'e2', title: 'Next Week Event',
        day: nextWeek.getDate(), month: nextWeek.getMonth() + 1, year: nextWeek.getFullYear(), time: '10:00 AM',
      }),
    ];

    const resp = answer('what is my next upcoming event', events, MY_UID, null, 'Alex');
    expect(resp).toContain('Tomorrow Event');
    expect(resp).not.toContain('Next Week Event');
  });

  it('handles no upcoming events', () => {
    const pastEvent = makeEvent({ day: 1, month: 1, year: 2020 });
    const resp = answer('what is my next event', [pastEvent], MY_UID, null, 'Alex');
    expect(resp).toContain('No upcoming events');
  });
});

// ── answer() — help / catch-all ───────────────────────────────────────────────

describe('answer — help / catch-all', () => {
  it('returns help text for unrecognised queries', () => {
    const resp = answer('what is the weather today', [], MY_UID, null, 'Alex');
    expect(resp).toContain("I'm Cally");
    expect(resp).toContain('Michigan');
  });
});

// ── answer() — event ordering in location results ─────────────────────────────

describe('answer — chronological ordering of results', () => {
  it('lists events in date-ascending order, not insertion order', () => {
    const events = [
      makeEvent({ id: 'e1', title: 'Late Event', location: 'Michigan', day: 20, month: 12, year: 2026, time: '9:00 AM' }),
      makeEvent({ id: 'e2', title: 'Early Event', location: 'Michigan', day: 1, month: 1, year: 2026, time: '9:00 AM' }),
    ];
    const resp = answer('events in Michigan', events, MY_UID, null, 'Alex');
    const early = resp.indexOf('Early Event');
    const late = resp.indexOf('Late Event');
    expect(early).toBeLessThan(late);
  });

  it('sorts same-day events by time (earlier first)', () => {
    const events = [
      makeEvent({ id: 'e1', title: 'Afternoon Meeting', location: 'Michigan', day: 5, month: 6, year: 2026, time: '1:00 PM' }),
      makeEvent({ id: 'e2', title: 'Morning Coffee', location: 'Michigan', day: 5, month: 6, year: 2026, time: '9:00 AM' }),
    ];
    const resp = answer('events in Michigan 2026', events, MY_UID, null, 'Alex');
    const morning = resp.indexOf('Morning Coffee');
    const afternoon = resp.indexOf('Afternoon Meeting');
    expect(morning).toBeLessThan(afternoon);
  });
});

// ── parseDayQuery ─────────────────────────────────────────────────────────────

describe('parseDayQuery', () => {
  it('parses "March 27th"', () => {
    expect(parseDayQuery('what events do I have on march 27th')).toEqual({ monthNum: 3, day: 27 });
  });

  it('parses "March 27" (no ordinal)', () => {
    expect(parseDayQuery('explain what events i have on march 27')).toEqual({ monthNum: 3, day: 27 });
  });

  it('parses "27th of March"', () => {
    expect(parseDayQuery('what is happening on the 27th of march')).toEqual({ monthNum: 3, day: 27 });
  });

  it('parses "27 March"', () => {
    expect(parseDayQuery('events on 27 march')).toEqual({ monthNum: 3, day: 27 });
  });

  it('parses "January 1st"', () => {
    expect(parseDayQuery('what is on january 1st')).toEqual({ monthNum: 1, day: 1 });
  });

  it('returns null for a bare month name (no day number)', () => {
    expect(parseDayQuery('list events in june')).toBeNull();
  });

  it('returns null for unrelated queries', () => {
    expect(parseDayQuery('how many events do i have')).toBeNull();
  });
});

// ── answer() — specific day queries ──────────────────────────────────────────

describe('answer — specific day queries', () => {
  const events = [
    makeEvent({ id: 'e1', title: 'Morning Run', day: 27, month: 3, year: 2026, time: '7:00 AM', createdBy: MY_UID }),
    makeEvent({ id: 'e2', title: 'Lunch Meeting', day: 27, month: 3, year: 2026, time: '12:00 PM', createdBy: PARTNER_UID }),
    makeEvent({ id: 'e3', title: 'Other Day Event', day: 28, month: 3, year: 2026, time: '9:00 AM', createdBy: MY_UID }),
  ];

  it('returns only March 27 events (not all of March)', () => {
    const resp = answer('explain what events I have on march 27th', events, MY_UID, fakeCouple, 'Alex');
    expect(resp).toContain('Morning Run');
    expect(resp).toContain('Lunch Meeting');
    expect(resp).not.toContain('Other Day Event');
  });

  it('mentions the correct count for that day', () => {
    const resp = answer('what is on march 27', events, MY_UID, fakeCouple, 'Alex');
    expect(resp).toContain('2 events');
    expect(resp).toContain('March 27');
  });

  it('returns sorted events (morning before afternoon)', () => {
    const resp = answer('events on march 27th 2026', events, MY_UID, fakeCouple, 'Alex');
    const morning = resp.indexOf('Morning Run');
    const lunch = resp.indexOf('Lunch Meeting');
    expect(morning).toBeLessThan(lunch);
  });

  it('reports no events when the day is clear', () => {
    const resp = answer('what is on march 5th', events, MY_UID, fakeCouple, 'Alex');
    expect(resp).toContain('no events');
    expect(resp).toContain('March 5');
  });

  it('does NOT return all-March events when a specific day is asked', () => {
    // Previously Cally would answer with "You have N events in March" — ensure it no longer does
    const resp = answer('what events do I have on march 27th', events, MY_UID, fakeCouple, 'Alex');
    expect(resp).not.toMatch(/events? in March/i);
  });
});

// ── answer() — weekend availability ──────────────────────────────────────────

describe('answer — weekend availability', () => {
  it('shows free and busy weekends for a given month', () => {
    // March 2026: weekends on 7-8, 14-15, 21-22, 28-29
    const events = [
      makeEvent({ id: 'e1', title: 'Sat Event', day: 7, month: 3, year: 2026, time: '10:00 AM' }),
    ];
    const resp = answer('what free weekends do we have in march 2026', events, MY_UID, null, 'Alex');
    expect(resp).toContain('Weekend availability in March 2026');
    expect(resp).toMatch(/📅.*March 7/);      // busy weekend
    expect(resp).toMatch(/✓.*March 14/);      // free weekend
    expect(resp).toMatch(/✓.*March 21/);      // free weekend
    expect(resp).toMatch(/✓.*March 28/);      // free weekend
  });

  it('reports free and busy counts', () => {
    const events = [
      makeEvent({ id: 'e1', day: 7, month: 3, year: 2026 }),
    ];
    const resp = answer('free weekends in march 2026', events, MY_UID, null, 'Alex');
    expect(resp).toContain('3 free');
    expect(resp).toContain('1 with events');
  });

  it('handles a month with no events (all free)', () => {
    const resp = answer('what weekends are free in april 2026', [], MY_UID, null, 'Alex');
    expect(resp).toContain('Weekend availability in April 2026');
    expect(resp).not.toMatch(/📅/); // no busy weekends
    expect(resp).toContain('0 with events');
  });
});
