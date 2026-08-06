const RIYADH_TZ = 'Asia/Riyadh';

/** Returns [startInclusive, endExclusive) for a calendar day in Asia/Riyadh. */
export function riyadhDayWindow(day?: string): {
  day: string;
  start: Date;
  end: Date;
} {
  const dayKey = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : riyadhTodayKey();

  // Construct noon UTC then find Riyadh calendar bounds via formatter offset trick:
  // Use temporal parts in Riyadh for the given Y-M-D at 00:00 Riyadh.
  const start = riyadhLocalToUtc(dayKey, 0, 0, 0);
  const endDate = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  // DST not used in Riyadh; +1 day from midnight is safe.
  const end = endDate;

  return { day: dayKey, start, end };
}

export function riyadhTodayKey(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: RIYADH_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function rangeWindow(
  range: '1d' | '7d',
  now = new Date(),
): { start: Date; end: Date; range: '1d' | '7d' } {
  const today = riyadhDayWindow(riyadhTodayKey(now));
  if (range === '1d') {
    return { start: today.start, end: today.end, range };
  }
  const start = new Date(today.start.getTime() - 6 * 24 * 60 * 60 * 1000);
  return { start, end: today.end, range };
}

function riyadhLocalToUtc(
  dayKey: string,
  hour: number,
  minute: number,
  second: number,
): Date {
  // Riyadh is fixed UTC+3
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour - 3, minute, second));
}

export const ANALYTICS_DISCLAIMER =
  'تقدير من انخفاض المخزون — ليس تقرير مبيعات رسمي من البوت';
