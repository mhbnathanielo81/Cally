/**
 * callyEngine.ts
 *
 * Pure query-engine functions for the Cally AI assistant.
 * Keeping them separate from the React component makes them straightforward to unit-test.
 */

import { CallyEvent, Couple } from '@/types';

// ── time helpers ──────────────────────────────────────────────────────────────

/** Convert a "H:MM AM/PM" string to minutes-since-midnight for comparison. */
export function timeToMinutes(time: string): number {
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

// ── constants ─────────────────────────────────────────────────────────────────

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── event description helpers ─────────────────────────────────────────────────

export function formatDate(e: CallyEvent): string {
  return `${MONTH_NAMES[e.month - 1]} ${e.day}, ${e.year}`;
}

export function formatTime(t: string): string {
  return t || '—';
}

/** Resolve who created an event — returns a display name. */
export function creatorLabel(
  uid: string,
  currentUid: string,
  couple: Couple | null,
  currentUserName: string,
): string {
  if (uid === currentUid) return currentUserName || 'you';
  if (couple) {
    if (uid === couple.user1) return couple.user1DisplayName || 'your partner';
    if (uid === couple.user2) return couple.user2DisplayName || 'your partner';
  }
  return 'your partner';
}

/** Return a single-line plain-text description of an event. */
export function describeEvent(
  e: CallyEvent,
  currentUid: string,
  couple: Couple | null,
  currentUserName: string,
): string {
  const who = creatorLabel(e.createdBy, currentUid, couple, currentUserName);
  const loc = e.location ? ` @ ${e.location}` : '';
  const timeStr = e.endTime ? `${formatTime(e.time)}–${formatTime(e.endTime)}` : formatTime(e.time);
  return `• ${e.title}${loc} — ${formatDate(e)} ${timeStr} (added by ${who})`;
}

// ── location extraction ───────────────────────────────────────────────────────

/**
 * Extract a location keyword from a natural-language query.
 * Returns `null` when no location intent is detected.
 */
export function extractLocationFromQuery(q: string): string | null {
  // Word-boundary anchors prevent matching "at" inside "what", "in" inside "going", etc.
  const pat =
    /(?:going to|trip to|travel(?:ing)? to|fly(?:ing)? to|drive(?:n)? to|events? in|times? in|visits? to|headed to|\bin\b|\bat\b)\s+([a-z][a-z ]{1,30}?)(?:\s+this|\s+next|\s+last|\s+in|\s+\d{4}|\?|$)/i;
  const m = q.match(pat);
  if (m) return m[1].trim().toLowerCase();

  // Very short queries with no leading verb → treat as a bare location search
  const words = q.split(/\s+/);
  if (words.length <= 3 && !/^(list|show|how|what|when|who|tell|count|find)/.test(q)) {
    return q.replace(/[?.!]/g, '').trim().toLowerCase();
  }
  return null;
}

// ── specific-day parsing ──────────────────────────────────────────────────────

/**
 * Detect a "Month Day" reference in the query (e.g. "March 27th", "27th of March").
 * Returns the 1-based month number and day, or null if no match.
 */
export function parseDayQuery(q: string): { monthNum: number; day: number } | null {
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    const name = MONTH_NAMES[i].toLowerCase();
    if (!q.includes(name)) continue;

    // "March 27" / "March 27th"
    const afterMatch = q.match(new RegExp(`${name}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i'));
    if (afterMatch) return { monthNum: i + 1, day: parseInt(afterMatch[1], 10) };

    // "27th of March" / "27 March"
    const beforeMatch = q.match(new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${name}\\b`, 'i'));
    if (beforeMatch) return { monthNum: i + 1, day: parseInt(beforeMatch[1], 10) };
  }
  return null;
}

// ── weekend helpers ───────────────────────────────────────────────────────────

/** Return all Sat+Sun weekend pairs that have a Saturday in the given month+year. */
function getWeekendsInMonth(monthNum: number, year: number): Array<{ sat: number; sun: number | null }> {
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const weekends: Array<{ sat: number; sun: number | null }> = [];

  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, monthNum - 1, d).getDay() === 6) {
      // Saturday found — pair with following Sunday if it's still in the same month
      const sun = d + 1 <= daysInMonth ? d + 1 : null;
      weekends.push({ sat: d, sun });
    }
  }
  return weekends;
}

// ── core query engine ─────────────────────────────────────────────────────────

/** Sort comparator: ascending by date then time. */
function chronoSort(a: CallyEvent, b: CallyEvent): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  if (a.day !== b.day) return a.day - b.day;
  return timeToMinutes(a.time) - timeToMinutes(b.time);
}

/**
 * Answer a natural-language question about the couple's calendar.
 *
 * @param query          Raw text the user typed.
 * @param events         Full list of CallyEvent objects from Firestore.
 * @param currentUid     UID of the signed-in user.
 * @param couple         Couple document (used to resolve partner display names).
 * @param currentUserName Display name of the signed-in user.
 * @returns Plain-text response string for Cally to display.
 */
export function answer(
  query: string,
  events: CallyEvent[],
  currentUid: string,
  couple: Couple | null,
  currentUserName: string,
): string {
  const q = query.toLowerCase().trim();
  const currentYear = new Date().getFullYear();

  // ── 1. Determine target year ────────────────────────────────────────────────
  const yearMatch = q.match(/\b(20\d{2})\b/);
  let targetYear: number | null = yearMatch ? parseInt(yearMatch[1], 10) : null;
  if (!targetYear) {
    if (q.includes('this year')) targetYear = currentYear;
    else if (q.includes('next year')) targetYear = currentYear + 1;
    else if (q.includes('last year')) targetYear = currentYear - 1;
  }

  // ── 2. Narrow the pool to the target year (if any) ─────────────────────────
  let pool = targetYear ? events.filter((e) => e.year === targetYear) : [...events];

  // ── 3. Count all events ─────────────────────────────────────────────────────
  if (/how many events|total events|number of events/.test(q)) {
    const yearStr = targetYear ? ` in ${targetYear}` : '';
    return `There ${pool.length === 1 ? 'is' : 'are'} ${pool.length} event${pool.length !== 1 ? 's' : ''} on the calendar${yearStr}.`;
  }

  // ── 4. List all events ──────────────────────────────────────────────────────
  if (/list all|show all|all events/.test(q)) {
    if (pool.length === 0) {
      const yearStr = targetYear ? ` in ${targetYear}` : '';
      return `No events found on the calendar${yearStr}.`;
    }
    pool.sort(chronoSort);
    const lines = pool.slice(0, 20).map((e) => describeEvent(e, currentUid, couple, currentUserName));
    const more = pool.length > 20 ? `\n…and ${pool.length - 20} more.` : '';
    return `Here are all your events:\n\n${lines.join('\n')}${more}`;
  }

  // ── 5. Specific-day queries — must come before month-only handler ───────────
  const dayQuery = parseDayQuery(q);
  if (dayQuery) {
    const { monthNum, day } = dayQuery;
    const yearForDay = targetYear ?? currentYear;
    const monthName = MONTH_NAMES[monthNum - 1];
    const dayEvents = events
      .filter((e) => e.month === monthNum && e.day === day && e.year === yearForDay)
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

    if (dayEvents.length === 0) {
      return `You have no events on ${monthName} ${day}, ${yearForDay}. That day is wide open!`;
    }
    const lines = dayEvents.map((e) => describeEvent(e, currentUid, couple, currentUserName));
    return (
      `You have ${dayEvents.length} event${dayEvents.length !== 1 ? 's' : ''} on ${monthName} ${day}, ${yearForDay}:\n\n` +
      lines.join('\n')
    );
  }

  // ── 6. Weekend availability — must come before month-only handler ───────────
  if (/weekend/.test(q)) {
    const monthIdx = MONTH_NAMES.findIndex((m) => q.includes(m.toLowerCase()));
    if (monthIdx >= 0) {
      const monthNum = monthIdx + 1;
      const yearForWeekend = targetYear ?? currentYear;
      const monthName = MONTH_NAMES[monthIdx];
      const weekends = getWeekendsInMonth(monthNum, yearForWeekend);
      const eventDays = new Set(
        events
          .filter((e) => e.month === monthNum && e.year === yearForWeekend)
          .map((e) => e.day),
      );

      const lines = weekends.map(({ sat, sun }) => {
        const days: number[] = sun !== null ? [sat, sun] : [sat];
        const hasBusy = days.some((d) => eventDays.has(d));
        const dateRange = days.length === 2 ? `${monthName} ${days[0]}–${days[1]}` : `${monthName} ${days[0]}`;
        return hasBusy ? `📅 ${dateRange}: has events` : `✓  ${dateRange}: free`;
      });

      const freeCount = lines.filter((l) => l?.startsWith('✓')).length;
      const busyCount = lines.filter((l) => l?.startsWith('📅')).length;
      return (
        `Weekend availability in ${monthName} ${yearForWeekend}:\n\n` +
        lines.join('\n') +
        `\n\n${freeCount} free · ${busyCount} with events`
      );
    }
  }

  // ── 7. Events by month (checked after day/weekend to avoid misrouting) ──────
  const monthIdx = MONTH_NAMES.findIndex((m) => q.includes(m.toLowerCase()));
  if (monthIdx >= 0) {
    const monthNum = monthIdx + 1;
    const byMonth = pool.filter((e) => e.month === monthNum);
    if (byMonth.length === 0) {
      return `No events found in ${MONTH_NAMES[monthIdx]}${targetYear ? ' ' + targetYear : ''}.`;
    }
    byMonth.sort((a, b) => a.day - b.day || timeToMinutes(a.time) - timeToMinutes(b.time));
    const lines = byMonth.map((e) => describeEvent(e, currentUid, couple, currentUserName));
    return `You have ${byMonth.length} event${byMonth.length !== 1 ? 's' : ''} in ${MONTH_NAMES[monthIdx]}:\n\n${lines.join('\n')}`;
  }

  // ── 8. My events vs partner events ──────────────────────────────────────────
  if (/my events|events i (added|created)/.test(q)) {
    const mine = pool.filter((e) => e.createdBy === currentUid);
    if (mine.length === 0) return "You haven't added any events yet.";
    const lines = mine.map((e) => describeEvent(e, currentUid, couple, currentUserName));
    return `Your events (${mine.length}):\n\n${lines.join('\n')}`;
  }
  if (/partner|their events|his events|her events/.test(q)) {
    const theirs = pool.filter((e) => e.createdBy !== currentUid);
    if (theirs.length === 0) return "Your partner hasn't added any events yet.";
    const lines = theirs.map((e) => describeEvent(e, currentUid, couple, currentUserName));
    return `Your partner's events (${theirs.length}):\n\n${lines.join('\n')}`;
  }

  // ── 9. Next upcoming event ──────────────────────────────────────────────────
  if (/next event|upcoming/.test(q)) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const upcoming = events
      .filter((e) => new Date(e.year, e.month - 1, e.day) >= today)
      .sort(chronoSort);
    if (upcoming.length === 0) return 'No upcoming events found on the calendar.';
    return `Your next event is:\n\n${describeEvent(upcoming[0], currentUid, couple, currentUserName)}`;
  }

  // ── 10. Location queries (checked late so month names don't get eaten) ───────
  const locationPattern = extractLocationFromQuery(q);
  if (locationPattern) {
    const matched = pool.filter(
      (e) =>
        (e.location?.toLowerCase().includes(locationPattern) ?? false) ||
        e.title.toLowerCase().includes(locationPattern),
    );

    if (matched.length === 0) {
      const yearStr = targetYear ? ` in ${targetYear}` : '';
      return `I don't see any events in "${locationPattern}"${yearStr} on the calendar. Try checking the location field when adding events!`;
    }

    matched.sort(chronoSort);
    const yearStr = targetYear ? ` in ${targetYear}` : '';
    const lines = matched.map((e) => describeEvent(e, currentUid, couple, currentUserName));
    return (
      `You have ${matched.length} event${matched.length !== 1 ? 's' : ''} related to "${locationPattern}"${yearStr}:\n\n` +
      lines.join('\n')
    );
  }

  // ── 11. Help / catch-all ────────────────────────────────────────────────────
  return (
    "Hi! I'm Cally 💚 I can help you explore your calendar. Try asking me:\n" +
    '• "What events do I have on March 27th?"\n' +
    '• "What free weekends do we have in April?"\n' +
    '• "How many times are we going to Michigan this year?"\n' +
    '• "List all events in June"\n' +
    '• "What is my next upcoming event?"\n' +
    '• "Show me my partner\'s events"\n' +
    '• "How many events do we have in 2026?"'
  );
}

