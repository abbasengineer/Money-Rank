import { format, startOfWeek, parse } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export const DEFAULT_RESET_TZ = 'America/New_York';

export function getActiveDateKey(resetTz: string = DEFAULT_RESET_TZ): string {
  const now = new Date();
  const zonedNow = toZonedTime(now, resetTz);
  return format(zonedNow, 'yyyy-MM-dd');
}

export function getWeekKey(date: Date, resetTz: string = DEFAULT_RESET_TZ): string {
  const zonedDate = toZonedTime(date, resetTz);
  const weekStart = startOfWeek(zonedDate, { weekStartsOn: 1 });
  return format(weekStart, 'yyyy-ww');
}

export function getCurrentWeekKey(resetTz: string = DEFAULT_RESET_TZ): string {
  return getWeekKey(new Date(), resetTz);
}
