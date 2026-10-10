import { WEEKS_PER_YEAR } from '../../constants/gameConfig';

/**
 * The music year, as pure week math. A year is WEEKS_PER_YEAR weeks and the
 * tentpoles sit on fixed weeks of it, so the player learns the rhythm:
 * the lineup drops, the festival plays, nominations land, award night, the
 * holidays, and Wrapped when the year turns over (the birthday week).
 */

export const CALENDAR = {
  /** The festival lineup is announced. */
  lineup: 3,
  /** Festival weekend. */
  festival: 5,
  /** Award nominations are announced. */
  nominations: 7,
  /** Award night. */
  awards: 9,
  /** Holiday season: the holiday songs come back. */
  holidayStart: 10,
  holidayEnd: WEEKS_PER_YEAR,
} as const;

/** 1..WEEKS_PER_YEAR: where `week` falls in its year. */
export function yearWeek(week: number, weeksPerYear: number = WEEKS_PER_YEAR): number {
  return ((Math.max(1, week) - 1) % weeksPerYear) + 1;
}

/** 1 for the first year of the career. */
export function careerYear(week: number, weeksPerYear: number = WEEKS_PER_YEAR): number {
  return Math.floor((Math.max(1, week) - 1) / weeksPerYear) + 1;
}

/** True on the first week of a new year (never week 1). */
export function isNewYearWeek(week: number, weeksPerYear: number = WEEKS_PER_YEAR): boolean {
  return week > 1 && yearWeek(week, weeksPerYear) === 1;
}

export function isHolidaySeason(week: number, weeksPerYear: number = WEEKS_PER_YEAR): boolean {
  const w = yearWeek(week, weeksPerYear);
  return w >= CALENDAR.holidayStart && w <= Math.min(CALENDAR.holidayEnd, weeksPerYear);
}

/** The absolute week of a given year-week in the same year as `week`. */
export function weekOfYear(week: number, target: number, weeksPerYear: number = WEEKS_PER_YEAR): number {
  return (careerYear(week, weeksPerYear) - 1) * weeksPerYear + target;
}

/** Weeks until the next time the calendar reaches `target` (0 = this week). */
export function weeksUntil(week: number, target: number, weeksPerYear: number = WEEKS_PER_YEAR): number {
  const w = yearWeek(week, weeksPerYear);
  return (target - w + weeksPerYear) % weeksPerYear;
}

/**
 * How long ago something was, the way people say it. With a short year a
 * "week" of game time is about a month of life.
 */
export function agoPhrase(weeksAgo: number, weeksPerYear: number = WEEKS_PER_YEAR): string {
  if (weeksAgo <= 1) return 'last month';
  if (weeksAgo < weeksPerYear / 2) return 'a few months ago';
  if (weeksAgo < weeksPerYear) return 'earlier this year';
  const years = Math.floor(weeksAgo / weeksPerYear);
  if (years === 1) return 'a year ago';
  const words = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  return `${words[years] ?? years} years ago`;
}
