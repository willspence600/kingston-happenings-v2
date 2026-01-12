/**
 * Date utility functions
 * Pure functions for date formatting, holiday detection, and date calculations
 */

import { format, parseISO, isToday, isTomorrow, addDays, startOfDay, isEqual, isWithinInterval, subDays, subMonths } from 'date-fns';

/**
 * Format a date string for display (e.g., "Sat, Jan 15")
 */
export function formatEventDate(dateStr: string): string {
  return format(parseISO(dateStr), 'EEE, MMM d');
}

/**
 * Format a date string for full display (e.g., "Saturday, January 15")
 */
export function formatDateFull(dateStr: string): string {
  return format(parseISO(dateStr), 'EEEE, MMMM d');
}

/**
 * Format a time string for display (e.g., "7:30 PM")
 */
export function formatEventTime(timeStr: string): string {
  return format(parseISO(`2000-01-01T${timeStr}`), 'h:mm a');
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Get a date label for display (e.g., "Happening Today", "Happening Tomorrow")
 */
export function getDateLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) {
    return 'Happening Today';
  }
  if (isTomorrow(date)) {
    return 'Happening Tomorrow';
  }
  return `Happening ${format(date, 'EEEE')}`;
}

/**
 * Check if a date string is today, tomorrow, or the day after
 */
export function isWithinThreeDays(dateStr: string): boolean {
  const eventDate = startOfDay(parseISO(dateStr));
  const today = startOfDay(new Date());
  const tomorrow = startOfDay(addDays(today, 1));
  const dayAfter = startOfDay(addDays(today, 2));
  
  return isEqual(eventDate, today) || isEqual(eventDate, tomorrow) || isEqual(eventDate, dayAfter);
}

/**
 * Get an array of the next N days as date strings
 */
export function getNextDays(count: number): string[] {
  const days: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < count; i++) {
    days.push(format(addDays(today, i), 'yyyy-MM-dd'));
  }
  
  return days;
}

/**
 * Get the date cutoff based on a past events range
 */
export function getDateCutoff(range: 'none' | 'week' | 'month' | '3months' | '6months'): Date {
  const today = new Date();
  switch (range) {
    case 'week':
      return subDays(today, 7);
    case 'month':
      return subMonths(today, 1);
    case '3months':
      return subMonths(today, 3);
    case '6months':
      return subMonths(today, 6);
    default:
      return today;
  }
}

/**
 * Check if a date falls within a date range
 */
export function isDateInRange(dateStr: string, startStr: string, endStr: string): boolean {
  const date = startOfDay(parseISO(dateStr));
  const start = startOfDay(parseISO(startStr));
  const end = startOfDay(parseISO(endStr));
  return isWithinInterval(date, { start, end });
}

/**
 * Fixed date holidays (month-day format)
 */
const FIXED_HOLIDAYS: Record<string, string> = {
  '1-1': "New Year's Day 🎉",
  '2-14': "Valentine's Day 💕",
  '3-17': "St. Patrick's Day ☘️",
  '4-1': "April Fools' Day 🃏",
  '5-4': 'Star Wars Day ⭐',
  '6-21': 'Summer Solstice ☀️',
  '7-1': 'Canada Day 🍁',
  '7-4': 'Independence Day 🇺🇸',
  '10-31': 'Halloween 🎃',
  '11-11': 'Remembrance Day 🌺',
  '12-24': 'Christmas Eve 🎄',
  '12-25': 'Christmas Day 🎁',
  '12-26': 'Boxing Day 📦',
  '12-31': "New Year's Eve 🥂",
};

/**
 * Get the holiday or special event for a given date
 * Returns null if no holiday on that date
 */
export function getHoliday(date: Date): string | null {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = date.getDay();

  // Check fixed holidays
  const key = `${month}-${day}`;
  if (FIXED_HOLIDAYS[key]) {
    return FIXED_HOLIDAYS[key];
  }

  // Variable holidays (approximate)
  // Mother's Day - 2nd Sunday of May
  if (month === 5 && dayOfWeek === 0 && day >= 8 && day <= 14) {
    return "Mother's Day 💐";
  }
  // Father's Day - 3rd Sunday of June
  if (month === 6 && dayOfWeek === 0 && day >= 15 && day <= 21) {
    return "Father's Day 👔";
  }
  // Thanksgiving (Canada) - 2nd Monday of October
  if (month === 10 && dayOfWeek === 1 && day >= 8 && day <= 14) {
    return 'Thanksgiving 🦃';
  }
  // Labour Day - 1st Monday of September
  if (month === 9 && dayOfWeek === 1 && day <= 7) {
    return 'Labour Day 👷';
  }
  // Victoria Day - Last Monday before May 25
  if (month === 5 && dayOfWeek === 1 && day >= 18 && day <= 24) {
    return 'Victoria Day 👑';
  }

  return null;
}

/**
 * Get holiday for a date string
 */
export function getHolidayFromStr(dateStr: string): string | null {
  return getHoliday(parseISO(dateStr));
}

