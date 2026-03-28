# MUST IMPLEMENT: Multi-event creation + Edit/Delete via Cally chatbot

These two features are NOT yet implemented. The changes are ALL in `src/pages/api/cally-chat.ts`, `src/lib/callyAI.ts`, and `src/components/CallyAssistant.tsx`.

---

## Feature A: Multi-event creation

### `src/pages/api/cally-chat.ts`

**Step 1:** In the system prompt string (the big template literal assigned to `systemPrompt`), find the section about event creation JSON. AFTER that section, add this text to the prompt:

```
## Multiple event creation
If the user asks to add MULTIPLE events in one message, respond with ONLY this JSON — no other text before or after:

{"action":"create_events","events":[{"title":"Event 1","day":27,"month":3,"year":2026,"time":"7:00 PM","location":"","notes":"","type":"event"},{"title":"Event 2","day":28,"month":3,"year":2026,"time":"12:00 PM","location":"","notes":"","type":"event"}],"message":"Done! I added 2 events to your calendar 💚"}

Use "create_events" (plural) with an "events" array when there are 2 or more events. Use "create_event" (singular) with a single "event" object when there is exactly 1 event. All the same rules for date resolution, time format, location, and type apply to each event in the array.
```

**Step 2:** In the response parsing section, there are TWO places where `parsed.action === 'create_event'` is checked (once for code-fenced JSON, once for raw JSON). In BOTH places, add this check right after the `create_event` check:

```typescript
if (parsed.action === 'create_events' && Array.isArray(parsed.events)) {
  return res.status(200).json({
    action: 'create_events',
    events: parsed.events,
    reply: parsed.message || 'Events created! 💚',
  });
}
```

### `src/lib/callyAI.ts`

**Step 1:** Add `'create_events'` to the action union in the `CallyResponse` type.

**Step 2:** Add this field to the `CallyResponse` interface:
```typescript
events?: Array<{
  title: string;
  day: number;
  month: number;
  year: number;
  time: string;
  location: string;
  notes: string;
  type: 'event' | 'dinner';
}>;
```

**Step 3:** In the `askCally` function, after the existing `create_event` handling, add:
```typescript
if (data.action === 'create_events' && Array.isArray(data.events)) {
  return {
    action: 'create_events',
    reply: data.reply || 'Events created! 💚',
    events: data.events,
  };
}
```

### `src/components/CallyAssistant.tsx`

In the `submit` function, after the existing `create_event` handler block, add:

```typescript
} else if (response.action === 'create_events' && response.events) {
  try {
    for (const event of response.events) {
      await onCreateEvent(event);
    }
    const callyMsg: ChatMessage = { role: 'cally', text: response.reply };
    setMessages((prev) => [...prev, callyMsg]);
  } catch {
    const errorMsg: ChatMessage = {
      role: 'cally',
      text: "I created some events but hit a problem. Check your calendar and try again for any missing ones! 💚",
    };
    setMessages((prev) => [...prev, errorMsg]);
  }
}
```

---

## Feature B: Edit and delete events via chatbot

### `src/pages/api/cally-chat.ts`

**Step 1:** In the system prompt string, AFTER the multiple event creation section, add:

```
## Event editing via chat
If the user asks to EDIT, UPDATE, CHANGE, MOVE, or RESCHEDULE an existing event, find the matching event from the calendar events list above. Respond with ONLY this JSON:

{"action":"update_event","eventTitle":"Exact event title from list","changes":{"time":"8:00 PM"},"message":"Done! I updated 'Event title' 💚"}

Rules: only include fields in "changes" that are changing. "eventTitle" must exactly match an event title from the calendar list. If ambiguous ask for clarification. If not found say so.

## Event deletion via chat
If the user asks to DELETE, REMOVE, or CANCEL an event, respond with ONLY this JSON:

{"action":"delete_event","eventTitle":"Exact event title from list","message":"Done! I removed 'Event title' from your calendar 💚"}

Rules: "eventTitle" must exactly match an event from the list. If ambiguous ask for confirmation. If not found say so.
```

**Step 2:** In BOTH JSON parsing blocks (code-fenced and raw), add these checks:

```typescript
if (parsed.action === 'update_event' && parsed.eventTitle) {
  return res.status(200).json({
    action: 'update_event',
    eventTitle: parsed.eventTitle,
    changes: parsed.changes || {},
    reply: parsed.message || 'Event updated! 💚',
  });
}

if (parsed.action === 'delete_event' && parsed.eventTitle) {
  return res.status(200).json({
    action: 'delete_event',
    eventTitle: parsed.eventTitle,
    reply: parsed.message || 'Event deleted! 💚',
  });
}
```

### `src/lib/callyAI.ts`

**Step 1:** Add `'update_event' | 'delete_event'` to the action union in `CallyResponse`.

**Step 2:** Add these fields to `CallyResponse`:
```typescript
update?: {
  eventTitle: string;
  changes: Partial<{
    title: string; day: number; month: number; year: number;
    time: string; location: string; notes: string; type: 'event' | 'dinner';
  }>;
};
deleteEventTitle?: string;
```

**Step 3:** In `askCally`, add:
```typescript
if (data.action === 'update_event' && data.eventTitle) {
  return {
    action: 'update_event',
    reply: data.reply || 'Event updated! 💚',
    update: { eventTitle: data.eventTitle, changes: data.changes || {} },
  };
}

if (data.action === 'delete_event' && data.eventTitle) {
  return {
    action: 'delete_event',
    reply: data.reply || 'Event deleted! 💚',
    deleteEventTitle: data.eventTitle,
  };
}
```

### `src/components/CallyAssistant.tsx`

**Step 1:** Add two new props:
```typescript
onUpdateEvent: (eventId: string, changes: Partial<NewEventData>) => Promise<void>;
onDeleteEvent: (eventId: string) => Promise<void>;
```

**Step 2:** In `submit`, add handlers:

```typescript
} else if (response.action === 'update_event' && response.update) {
  const matchedEvent = events.find(e => e.title.toLowerCase() === response.update!.eventTitle.toLowerCase());
  if (matchedEvent?.id) {
    try {
      await onUpdateEvent(matchedEvent.id, response.update.changes);
      setMessages((prev) => [...prev, { role: 'cally', text: response.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'cally', text: "Something went wrong updating that event. Try again! 💚" }]);
    }
  } else {
    setMessages((prev) => [...prev, { role: 'cally', text: `I couldn't find "${response.update.eventTitle}" on your calendar. Double-check the name? 💚` }]);
  }
} else if (response.action === 'delete_event' && response.deleteEventTitle) {
  const matchedEvent = events.find(e => e.title.toLowerCase() === response.deleteEventTitle!.toLowerCase());
  if (matchedEvent?.id) {
    try {
      await onDeleteEvent(matchedEvent.id);
      setMessages((prev) => [...prev, { role: 'cally', text: response.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'cally', text: "Something went wrong deleting that event. Try again! 💚" }]);
    }
  } else {
    setMessages((prev) => [...prev, { role: 'cally', text: `I couldn't find "${response.deleteEventTitle}" on your calendar. Double-check the name? 💚` }]);
  }
}
```

### `src/pages/calendar.tsx`

Add imports and handler functions. Make sure `updateEvent` and `deleteEvent` are imported from `@/lib/firestore`:

```typescript
import { addEvent, updateEvent, deleteEvent } from '@/lib/firestore';
```

Add these functions in the component:

```typescript
async function handleCallyUpdateEvent(eventId: string, changes: Partial<{
  title: string; day: number; month: number; year: number;
  time: string; location: string; notes: string; type: 'event' | 'dinner';
}>) {
  const existingEvent = events.find(e => e.id === eventId);
  await updateEvent(eventId, changes, {
    changedBy: user!.uid,
    changedByName: currentUserName,
    previousEvent: existingEvent,
  });
}

async function handleCallyDeleteEvent(eventId: string) {
  const existingEvent = events.find(e => e.id === eventId);
  await deleteEvent(eventId, {
    changedBy: user!.uid,
    changedByName: currentUserName,
    event: existingEvent,
  });
}
```

Pass the new props to CallyAssistant:

```tsx
<CallyAssistant
  events={events}
  currentUid={user.uid}
  couple={couple}
  currentUserName={currentUserName || 'you'}
  onCreateEvent={handleCallyCreateEvent}
  onUpdateEvent={handleCallyUpdateEvent}
  onDeleteEvent={handleCallyDeleteEvent}
/>
```

---

## Commit message

```
feat: add multi-event creation and edit/delete to Cally chatbot

- System prompt updated with create_events, update_event, delete_event actions
- API route parses all three new JSON actions
- callyAI.ts types and askCally handle new actions
- CallyAssistant.tsx dispatches update/delete to new callback props
- calendar.tsx passes onUpdateEvent and onDeleteEvent using firestore helpers
```
