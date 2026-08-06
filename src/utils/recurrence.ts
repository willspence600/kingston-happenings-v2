/**
 * Recurrence date generation utilities.
 * Supports weekly / biweekly / monthly patterns and multiple weekdays.
 */

export type RecurrencePattern = 'weekly' | 'biweekly' | 'monthly';

const MAX_INSTANCES = 100;
const DEFAULT_WEEKS = 52;

/**
 * Generate occurrence dates for a recurring series.
 *
 * @param startDate - First occurrence (YYYY-MM-DD). Included in the result.
 * @param pattern - weekly | biweekly | monthly
 * @param endDate - Inclusive end date (YYYY-MM-DD). Defaults to start + 52 weeks.
 * @param recurrenceDays - Days of week (0=Sun … 6=Sat). If empty/omitted, uses the
 *   weekday of startDate. For weekly/biweekly with multiple days, generates all
 *   matching weekdays within the window.
 */
export function generateRecurringDates(
  startDate: string,
  pattern: RecurrencePattern | string,
  endDate?: string | null,
  recurrenceDays?: number[] | null
): string[] {
  const start = new Date(startDate + 'T12:00:00');
  const end = endDate
    ? new Date(endDate + 'T12:00:00')
    : new Date(start.getTime() + DEFAULT_WEEKS * 7 * 24 * 60 * 60 * 1000);

  const days =
    recurrenceDays && recurrenceDays.length > 0
      ? [...new Set(recurrenceDays)].sort((a, b) => a - b)
      : [start.getDay()];

  if (pattern === 'monthly') {
    return generateMonthlyDates(start, end, days[0]);
  }

  // weekly / biweekly with one or more weekdays
  const intervalDays = pattern === 'biweekly' ? 14 : 7;
  const dates: string[] = [];
  const seen = new Set<string>();

  // For each selected weekday, walk forward from the first occurrence of that day on/after start
  for (const dayOfWeek of days) {
    const cursor = new Date(start);
    const delta = (dayOfWeek - cursor.getDay() + 7) % 7;
    cursor.setDate(cursor.getDate() + delta);

    // For biweekly with multiple days, keep all days aligned to the same biweekly grid
    // anchored on startDate's week.
    while (cursor <= end && dates.length < MAX_INSTANCES) {
      if (cursor >= start) {
        const dateStr = toDateStr(cursor);
        if (!seen.has(dateStr)) {
          seen.add(dateStr);
          dates.push(dateStr);
        }
      }
      cursor.setDate(cursor.getDate() + intervalDays);
    }
  }

  return dates.sort();
}

/**
 * Generate new dates after an existing last date (for extending a series).
 * Excludes any date <= lastExistingDate.
 */
export function generateExtendedDates(
  seriesStartDate: string,
  pattern: RecurrencePattern | string,
  newEndDate: string,
  recurrenceDays: number[] | null | undefined,
  lastExistingDate: string
): string[] {
  const all = generateRecurringDates(seriesStartDate, pattern, newEndDate, recurrenceDays);
  return all.filter((d) => d > lastExistingDate);
}

function generateMonthlyDates(start: Date, end: Date, dayOfWeek: number): string[] {
  const dates: string[] = [];
  const startStr = toDateStr(start);
  dates.push(startStr);

  const current = new Date(start);
  while (dates.length < MAX_INSTANCES) {
    current.setMonth(current.getMonth() + 1);
    // Keep same day-of-month when possible; otherwise clamp
    // Also try to stay on the same weekday of the month if start was a specific weekday pattern.
    // Simple approach: advance one month from original day-of-month.
    if (current > end) break;
    // Adjust to the target weekday closest to the month-anniversary if needed
    const adjusted = new Date(current);
    const delta = (dayOfWeek - adjusted.getDay() + 7) % 7;
    // Prefer staying near the same date of month; if far, leave as month+1 anniversary
    if (delta <= 3) {
      adjusted.setDate(adjusted.getDate() + delta);
    } else if (delta >= 4) {
      adjusted.setDate(adjusted.getDate() - (7 - delta));
    }
    if (adjusted >= start && adjusted <= end) {
      const dateStr = toDateStr(adjusted);
      if (!dates.includes(dateStr)) dates.push(dateStr);
    }
    if (adjusted > end) break;
  }

  return dates.sort();
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Day-name helpers for labels / form mapping */
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function dayNameToNumber(name: string): number {
  const idx = DAY_NAMES.findIndex((d) => d.toLowerCase() === name.toLowerCase());
  return idx >= 0 ? idx : 0;
}
