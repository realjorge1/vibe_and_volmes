import type { ScheduledEventDef } from '../../types/passive';

/**
 * The recurring calendar of the music world. Anchored to the career's real
 * start time and projected forward by systems/passive/scheduledEvents. They
 * are pure flavor + a planner nudge: scheduling the matching activity during a
 * live window earns a small bounded bonus in the away sim. No punishment for
 * missing one — they simply come back around.
 */
export const SCHEDULED_EVENTS: ScheduledEventDef[] = [
  {
    id: 'awards-buzz',
    title: 'Awards Buzz Week',
    blurb: 'The industry is paying attention. Press goes further right now.',
    boostActivity: 'press',
    cadenceDays: 21,
    windowDays: 3,
  },
  {
    id: 'festival-season',
    title: 'Festival Season',
    blurb: 'Lineups are dropping. Networking opens doors this week.',
    boostActivity: 'networking',
    cadenceDays: 14,
    windowDays: 2,
  },
  {
    id: 'viral-window',
    title: 'Algorithm Surge',
    blurb: 'The feed is hungry. Being online pays off more than usual.',
    boostActivity: 'social',
    cadenceDays: 9,
    windowDays: 2,
  },
  {
    id: 'drop-day',
    title: 'New Music Friday',
    blurb: 'Release energy is in the air. Studio sessions hit different.',
    boostActivity: 'studio',
    cadenceDays: 7,
    windowDays: 1,
  },
];
