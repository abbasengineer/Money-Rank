import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function dateKeyToLocalDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get today's dateKey in the user's local timezone
 * This ensures challenges unlock at midnight in each user's timezone
 */
export function getLocalTodayDateKey(): string {
  const now = new Date();
  return format(now, 'yyyy-MM-dd');
}
