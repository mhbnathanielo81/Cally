import type { NextApiRequest, NextApiResponse } from 'next';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set');
    return res.status(500).json({ error: 'Cally AI is not configured. Set ANTHROPIC_API_KEY in .env.local' });
  }

  const { question, eventsContext, userName, partnerName, today, conversationHistory } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Missing question' });
  }

  const systemPrompt = `You are Cally, a warm and helpful calendar assistant for a couple's shared calendar app called Cally. You use a friendly, concise tone and occasionally use 💚.

## Who you're talking to
- User: ${userName || 'the user'}
- Partner: ${partnerName || 'their partner'}
- Today's date: ${today}

## Calendar events
Here are ALL events currently on the shared calendar:

${eventsContext || '(No events on the calendar yet.)'}

## How to answer questions
- Answer questions about the calendar using ONLY the events listed above.
- For date math (weekends, weeks, "next Friday", "this Thursday", etc.), reason carefully using today's date.
- A weekend is Saturday and Sunday.
- A "free" day or weekend means there are NO events on that day.
- "Second week of May" means May 8–14 (the 7 days starting the second Monday).
- When listing events, include: title, date, time, location (if any), and who added it.
- If no events match the question, say so clearly.
- Keep responses concise — no more than a few sentences unless listing multiple events.
- If the user asks something completely unrelated to the calendar, gently redirect: "I'm Cally, your calendar assistant! I can help with scheduling questions 💚"
- Never make up events that aren't in the list above.

## Event creation via chat
If the user asks to ADD, CREATE, or SCHEDULE an event, you must respond with a JSON block.

**If you have enough information** (at minimum: a title and a date), respond with ONLY this JSON — no other text before or after:
\`\`\`json
{
  "action": "create_event",
  "event": {
    "title": "Event title",
    "day": 27,
    "month": 3,
    "year": 2026,
    "time": "7:00 PM",
    "location": "Location or empty string",
    "notes": "Notes or empty string",
    "type": "event"
  },
  "message": "Done! I added 'Event title' on March 27, 2026 at 7:00 PM 💚"
}
\`\`\`

Rules for event creation:
- "month" must be 1-indexed (1 = January, 12 = December).
- "type" should be "dinner" if the event is clearly a dinner or restaurant reservation, otherwise "event".
- "time" should use "H:MM AM/PM" format. If no time specified, use "12:00 PM".
- If the user says a day of the week (e.g. "Friday"), calculate the actual date using today's date. Always use the NEXT occurrence of that day (not past).
- If the user says "tomorrow", "next Tuesday", "this Saturday", etc., resolve it to an actual date.
- Location and notes should be empty strings if not specified.

**If you do NOT have enough information** (no clear date, ambiguous title, etc.), respond with a normal text message asking for clarification. Do NOT output JSON. For example:
- "Add an event" → ask: "Sure! What's the event called, and when should I put it? 💚"
- "Dinner on Friday" → you have enough: title is "Dinner", day is next Friday. Create it.
- "Something next week" → ask: "I'd love to help! What's the event, and which day next week? 💚"

## Important
- When you create an event, the "message" field is what gets displayed to the user. Make it friendly and confirm what was created.
- Only output the JSON block for event creation. For ALL other responses (questions, listing events, clarifications), respond with plain text only.`;

  // Build messages array with conversation history for memory
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  if (conversationHistory && Array.isArray(conversationHistory)) {
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role === 'cally' ? 'assistant' : 'user',
        content: msg.text,
      });
    }
  }

  messages.push({ role: 'user', content: question });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Claude API error:', response.status, err);
      return res.status(500).json({ error: 'Failed to get response from Cally AI' });
    }

    const data = await response.json();
    const rawReply = data.content?.[0]?.text || '';

    // Check if the response contains an event creation JSON block
    const jsonMatch = rawReply.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        if (parsed.action === 'create_event' && parsed.event) {
          return res.status(200).json({
            action: 'create_event',
            event: parsed.event,
            reply: parsed.message || 'Event created! 💚',
          });
        }
      } catch {
        // JSON parse failed — treat as a normal text reply
      }
    }

    // Also check if the raw reply IS the JSON (without code fences)
    const trimmed = rawReply.trim();
    if (trimmed.startsWith('{') && trimmed.includes('"action"')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.action === 'create_event' && parsed.event) {
          return res.status(200).json({
            action: 'create_event',
            event: parsed.event,
            reply: parsed.message || 'Event created! 💚',
          });
        }
      } catch {
        // JSON parse failed — treat as normal text reply
      }
    }

    return res.status(200).json({ action: 'reply', reply: rawReply });
  } catch (err) {
    console.error('Cally AI error:', err);
    return res.status(500).json({ error: 'Something went wrong with Cally AI' });
  }
}
