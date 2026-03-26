import {
  COLOR_PRIMARY,
  COLOR_PARTNER,
  COLOR_DINNER,
  getEventColor,
} from '@/lib/colors';

describe('getEventColor', () => {
  const MY_UID = 'user-me';
  const PARTNER_UID = 'user-partner';

  it('returns COLOR_DINNER for dinner type regardless of creator', () => {
    expect(getEventColor(MY_UID, MY_UID, 'dinner')).toBe(COLOR_DINNER);
    expect(getEventColor(PARTNER_UID, MY_UID, 'dinner')).toBe(COLOR_DINNER);
  });

  it('returns COLOR_PRIMARY when current user created the event', () => {
    expect(getEventColor(MY_UID, MY_UID, 'event')).toBe(COLOR_PRIMARY);
  });

  it("returns COLOR_PARTNER when the partner created the event", () => {
    expect(getEventColor(PARTNER_UID, MY_UID, 'event')).toBe(COLOR_PARTNER);
  });

  it('COLOR constants have correct hex values', () => {
    expect(COLOR_PRIMARY).toBe('#1DB954');
    expect(COLOR_PARTNER).toBe('#4A90D9');
    expect(COLOR_DINNER).toBe('#F5A623');
  });
});
