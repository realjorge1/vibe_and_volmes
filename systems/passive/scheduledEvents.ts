import type { ActivityId, UpcomingEvent } from '../../types/passive';
import { SCHEDULED_EVENTS } from '../../data/passive/scheduledEvents';

/**
 * Projects the recurring world calendar (data/passive/scheduledEvents) against
 * the wall clock. Anchored to the career start so every career sees a stable,
 * repeating rhythm. Pure: a function of (anchor, now). Used by the planner's
 * "Upcoming" strip and to grant a small bounded bonus in the away sim when the
 * matching activity is scheduled during a live window.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function projectScheduledEvents(anchorMs: number, now = Date.now()): UpcomingEvent[] {
  const elapsed = Math.max(0, now - anchorMs);
  const out: UpcomingEvent[] = SCHEDULED_EVENTS.map((def) => {
    const cadenceMs = def.cadenceDays * DAY_MS;
    const windowMs = def.windowDays * DAY_MS;
    const pos = elapsed % cadenceMs;
    const live = pos < windowMs;
    const startsInMs = live ? -pos : cadenceMs - pos;
    const endsInMs = live ? windowMs - pos : cadenceMs - pos + windowMs;
    return {
      id: def.id,
      title: def.title,
      blurb: def.blurb,
      boostActivity: def.boostActivity,
      startsInMs,
      endsInMs,
      live,
    };
  });
  // Live first, then by soonest start.
  return out.sort((a, b) => {
    if (a.live !== b.live) return a.live ? -1 : 1;
    return a.startsInMs - b.startsInMs;
  });
}

/** The set of activity ids that earn a bonus right now, from live events. */
export function liveScheduledBoosts(anchorMs: number, now = Date.now()): Set<ActivityId> {
  const boosts = new Set<ActivityId>();
  for (const e of projectScheduledEvents(anchorMs, now)) {
    if (e.live) boosts.add(e.boostActivity);
  }
  return boosts;
}
