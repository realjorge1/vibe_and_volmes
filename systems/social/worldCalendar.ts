import { WEEKS_PER_YEAR } from '../../constants/gameConfig';
import { CALENDAR_BEATS, LEAGUES, SHOWS, type CalendarBeat, type League } from '../../data/social/everyday/calendar';

/**
 * THE WORLD'S YEAR, as pure week math (see data/social/everyday/calendar).
 * Week N of a game year is month N. Each year draws its own finalists, the
 * phone gets a new number, and the big show of the season changes with the
 * months, so the regular internet always has something current to say.
 */

export interface WorldMoment {
  /** 0 = January. */
  month: number;
  /** 1 for the career's first year. */
  year: number;
  /** The calendar year it is in the game ("Class of 2027"). */
  classYear: number;
  phone: string;
  phoneTag: string;
  show: string;
  finalists: Record<League, readonly [string, string]>;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The calendar year a career started in (from the player's creation time). */
export function baseYearOf(createdAt: number): number {
  const y = new Date(createdAt || Date.now()).getFullYear();
  return y < 2000 ? new Date().getFullYear() : y;
}

export function monthOf(week: number, weeksPerYear = WEEKS_PER_YEAR): number {
  return (Math.max(1, week) - 1) % weeksPerYear % 12;
}

export function yearOf(week: number, weeksPerYear = WEEKS_PER_YEAR): number {
  return Math.floor((Math.max(1, week) - 1) / weeksPerYear) + 1;
}

/** The show everyone is watching this month. */
function showOf(month: number, year: number): string {
  if (month >= 2 && month <= 3) return SHOWS.drama[0];
  if (month === 4) return SHOWS.drama[2];
  if (month >= 5 && month <= 7) return SHOWS.reality[1];
  if (month >= 8 && month <= 9) return SHOWS.drama[1];
  if (month >= 10) return SHOWS.reality[0];
  // January and February: the dating show, or last year's drama on a rerun binge.
  return year % 2 === 0 ? SHOWS.drama[0] : SHOWS.reality[2];
}

function finalistsOf(league: League, year: number): readonly [string, string] {
  const teams = LEAGUES[league].teams;
  const a = hash(`${league}:${year}:a`) % teams.length;
  let b = hash(`${league}:${year}:b`) % teams.length;
  if (b === a) b = (a + 1 + (year % (teams.length - 1))) % teams.length;
  return [teams[a], teams[b]];
}

export function worldMoment(week: number, baseYear: number): WorldMoment {
  const month = monthOf(week);
  const year = yearOf(week);
  const n = 9 + year;
  return {
    month,
    year,
    classYear: baseYear + year - 1,
    phone: `Orbit ${n}`,
    phoneTag: `Orbit${n}`,
    show: showOf(month, year),
    finalists: { pbl: finalistsOf('pbl', year), gfl: finalistsOf('gfl', year), cup: finalistsOf('cup', year) },
  };
}

/** The league the sports pages talk about this month. */
export function seasonLeague(month: number): League {
  if (month === 6 || month === 7) return 'cup';
  if (month >= 2 && month <= 5) return 'pbl';
  return month % 2 === 0 ? 'gfl' : 'pbl';
}

/** What the world is talking about this week. */
export function beatsFor(week: number): CalendarBeat[] {
  const month = monthOf(week);
  return CALENDAR_BEATS.filter((b) => b.months.includes(month));
}

export function beatById(id: string | undefined): CalendarBeat | undefined {
  return id ? CALENDAR_BEATS.find((b) => b.id === id) : undefined;
}

/** Fill a line's placeholders for this moment of the year. */
export function fillWorld(text: string, m: WorldMoment, extra: { city: string; league?: League; friend?: string }): string {
  const [team, team2] = m.finalists[extra.league ?? seasonLeague(m.month)];
  return text
    .replace(/\{team\}/g, team)
    .replace(/\{team2\}/g, team2)
    .replace(/\{show\}/g, m.show)
    .replace(/\{phoneTag\}/g, m.phoneTag)
    .replace(/\{phone\}/g, m.phone)
    .replace(/\{year\}/g, String(m.classYear))
    .replace(/\{city\}/g, extra.city || 'the city')
    .replace(/\{friend\}/g, extra.friend ?? 'bestie');
}
