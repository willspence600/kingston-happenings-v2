/**
 * Options for the venue details organizers fill in (sign-up, venue page editor)
 */

export const VENUE_TYPE_OPTIONS = [
  'Restaurant',
  'Bar / pub',
  'Café',
  'Brewery / winery',
  'Music venue',
  'Theatre / arts space',
  'Gallery',
  'Community space',
  'Other',
];

export const ACCESSIBILITY_OPTIONS = [
  'Step-free entrance',
  'Accessible washroom',
  'Elevator / everything on one level',
  'Accessible parking nearby',
  'Seating available',
  'Quiet or sensory-friendly space',
  'Service animals welcome',
  'Digital menu available',
];

export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** "23:00" → "11:00 PM" */
export function formatHourLabel(time: string): string {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}
