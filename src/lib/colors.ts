export const COLOR_PRIMARY = '#1DB954';
export const COLOR_PARTNER = '#4A90D9';
export const COLOR_DINNER = '#F5A623';

export function getEventColor(createdBy: string, currentUid: string, type: 'event' | 'dinner'): string {
  if (type === 'dinner') return COLOR_DINNER;
  return createdBy === currentUid ? COLOR_PRIMARY : COLOR_PARTNER;
}
