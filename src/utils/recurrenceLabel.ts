import { DAY_NAMES, DAY_SHORT } from './recurrence';

export interface RecurrenceLabelInput {
  recurrencePattern?: string | null;
  recurrenceDays?: number[] | null;
  recurrenceDay?: number | null; // legacy single-day fallback
}

/**
 * Human-readable recurrence label, e.g. "Every Tuesday", "Every Mon & Wed",
 * "Every 2 weeks", "Monthly", "Recurring weekly".
 */
export function getRecurrenceLabel(input: RecurrenceLabelInput): string {
  const pattern = input.recurrencePattern || 'weekly';
  const days =
    input.recurrenceDays && input.recurrenceDays.length > 0
      ? [...input.recurrenceDays].sort((a, b) => a - b)
      : input.recurrenceDay != null
        ? [input.recurrenceDay]
        : [];

  if (pattern === 'monthly') {
    if (days.length === 1) {
      return `Monthly on ${DAY_NAMES[days[0]]}`;
    }
    return 'Monthly';
  }

  if (pattern === 'biweekly') {
    if (days.length === 1) {
      return `Every 2 weeks on ${DAY_NAMES[days[0]]}`;
    }
    if (days.length > 1) {
      return `Every 2 weeks (${formatDayList(days)})`;
    }
    return 'Every 2 weeks';
  }

  // weekly (default)
  if (days.length === 1) {
    return `Every ${DAY_NAMES[days[0]]}`;
  }
  if (days.length > 1) {
    return `Every ${formatDayList(days)}`;
  }
  return 'Recurring weekly';
}

function formatDayList(days: number[]): string {
  const names = days.map((d) => DAY_SHORT[d] ?? String(d));
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  if (names.length > 2) {
    return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
  }
  return names[0] || '';
}
