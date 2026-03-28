# Fix: Chatbot events not appearing in Calendar History + Chat input text overflow

## Fix 1: Events created via Cally chatbot do not appear in Calendar History

### Problem

When Cally creates an event via chat, it never shows up in the Calendar History log. This is because `handleCallyCreateEvent` in `src/pages/calendar.tsx` writes directly to Firestore using raw `addDoc`, bypassing the `addEvent` function from `src/lib/firestore.ts` that writes history entries.

The same will apply to the new `handleCallyUpdateEvent` and `handleCallyDeleteEvent` — make sure they use `updateEvent` and `deleteEvent` from `src/lib/firestore.ts` (which write history), not raw Firestore calls.

### What to change

**File: `src/pages/calendar.tsx`**

Replace the current `handleCallyCreateEvent` function. Instead of using `addDoc` directly, it should call `addEvent` from `@/lib/firestore`:

```typescript
import { addEvent, updateEvent, deleteEvent } from '@/lib/firestore';
```

```typescript
async function handleCallyCreateEvent(eventData: {
  title: string;
  day: number;
  month: number;
  year: number;
  time: string;
  location: string;
  notes: string;
  type: 'event' | 'dinner';
}) {
  if (!user) throw new Error('Not connected');
  await addEvent(
    coupleId || user.uid,
    user.uid,
    eventData,
    { changedByName: currentUserName },
  );
}
```

Remove the `addDoc`, `Timestamp` imports from `firebase/firestore` and the `getDbInstance` import if they are no longer used elsewhere in the file.

### Test

- Create an event via Cally chatbot → click History → the new event should appear in the log
- Create an event via the + button → should also appear in History (verify this still works)
- Edit an event via chatbot → History should show the update
- Delete an event via chatbot → History should show the deletion

---

## Fix 2: Chat input text overflows on long messages

### Problem

When the user types a long message into the Cally chatbot input, the text stays on one line and the beginning of the message disappears off the left edge of the input. The input should wrap to multiple lines so the user can see everything they're typing.

### What to change

**File: `src/components/CallyAssistant.tsx`**

Change the `<input>` element to a `<textarea>` element. Make the following changes:

1. Replace `<input` with `<textarea`
2. Add `rows={1}` so it starts as one line
3. Add style `resize: none` and `overflow: hidden` so it doesn't show a manual resize handle
4. Make it auto-grow as the user types by adding an `onInput` handler that adjusts the height:

```typescript
function autoResize(e: React.FormEvent<HTMLTextAreaElement>) {
  const el = e.currentTarget;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}
```

5. Use `onInput={autoResize}` on the textarea
6. Update the `onKey` handler — for a textarea, Enter should submit (same as before), but **Shift+Enter** should allow a real newline:

```typescript
function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    submit();
  }
}
```

7. After submit clears the input, also reset the textarea height back to auto.

### Test

- Type a very long message → text wraps to the next line, no text disappears
- Press Enter → submits the message (does not add a newline)
- Press Shift+Enter → adds a newline inside the input
- After sending, the input shrinks back to one line
