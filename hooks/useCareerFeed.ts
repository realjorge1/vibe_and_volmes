import { useMemo } from 'react';
import { useGameStore, isNoteEntry } from '../store/gameStore';
import type { EventHistoryEntry, GameEvent } from '../types/events';

/**
 * One entry in the career column. The Deck renders these top-to-bottom, so
 * the list reads oldest → newest and always ends on whatever wants the
 * player's attention right now.
 */
export type FeedItem =
  | { kind: 'week'; key: string; week: number; isCurrent: boolean }
  | { kind: 'note'; key: string; entry: EventHistoryEntry }
  | {
      kind: 'resolved';
      key: string;
      event: GameEvent;
      choiceText: string;
      flavorText: string;
    }
  | { kind: 'active'; key: string; event: GameEvent };

/** Log lines kept in the column; older career lives in the Chronicle. */
const HISTORY_LIMIT = 40;

export interface CareerFeed {
  items: FeedItem[];
  /** True when older history was trimmed out of the column. */
  truncated: boolean;
  pendingCount: number;
  eventsThisWeek: number;
  eventNumber: number;
}

export interface CareerFeedInput {
  week: number;
  historyLog: EventHistoryEntry[];
  lastWeekSummary: EventHistoryEntry[];
  activeEvents: GameEvent[];
  pendingIndex: number;
}

/**
 * Derives the whole Deck column from game state. Pure — drives nothing, and
 * runs without React so the column order can be tested.
 *
 * Past weeks come from `historyLog` (capped, newest-first in the store) and
 * render as compact log lines. The current week is rebuilt from
 * `lastWeekSummary` plus `activeEvents`, so events the player already
 * resolved keep their title and the option they picked instead of collapsing
 * to a single line of flavor text.
 */
export function buildCareerFeed({
  week,
  historyLog,
  lastWeekSummary,
  activeEvents,
  pendingIndex,
}: CareerFeedInput): CareerFeed {
  const items: FeedItem[] = [];

  // ─── Past weeks ───
  // The store keeps history newest-first; flip it so the column reads
  // forward in time and the newest beat sits closest to the thumb.
  const past = historyLog.filter((e) => e.week < week);
  const recent = past.slice(0, HISTORY_LIMIT).reverse();

  let ruledWeek = -1;
  recent.forEach((entry, i) => {
    if (entry.week !== ruledWeek) {
      items.push({
        kind: 'week',
        key: `wk-${entry.week}`,
        week: entry.week,
        isCurrent: false,
      });
      ruledWeek = entry.week;
    }
    items.push({ kind: 'note', key: `log-${entry.week}-${i}`, entry });
  });

  // ─── This week ───
  items.push({ kind: 'week', key: `wk-${week}`, week, isCurrent: true });

  // This week, in the order it happened: simulated beats from the roll-over
  // lead, then decisions and story lines (activities, people…) interleave
  // as the player made them. Decisions pair with the slate positionally
  // rather than by event id: `resolveCurrentEvent` appends in resolution
  // order, which matches the slate order exactly, and that holds even if a
  // week ever slates the same event twice.
  let resolved = 0;
  lastWeekSummary.forEach((entry, i) => {
    if (isNoteEntry(entry)) {
      items.push({ kind: 'note', key: `note-${week}-${i}`, entry });
      return;
    }
    const event = activeEvents[resolved];
    resolved += 1;
    if (!event || resolved > pendingIndex) return;
    const choice = event.choices.find((c) => c.id === entry.choiceId);
    items.push({
      kind: 'resolved',
      key: `res-${week}-${event.id}-${resolved}`,
      event,
      choiceText: choice?.text ?? '',
      flavorText: entry.flavorText,
    });
  });

  // The one decision in front of the player, if any.
  const active = activeEvents[pendingIndex];
  if (active) {
    items.push({ kind: 'active', key: `act-${week}-${active.id}`, event: active });
  }

  return {
    items,
    truncated: past.length > HISTORY_LIMIT,
    pendingCount: Math.max(0, activeEvents.length - pendingIndex),
    eventsThisWeek: activeEvents.length,
    eventNumber: pendingIndex + 1,
  };
}

/** The Deck column, rebuilt whenever the game state it reads changes. */
export function useCareerFeed(): CareerFeed {
  const week = useGameStore((s) => s.week);
  const historyLog = useGameStore((s) => s.historyLog);
  const lastWeekSummary = useGameStore((s) => s.lastWeekSummary);
  const activeEvents = useGameStore((s) => s.activeEvents);
  const pendingIndex = useGameStore((s) => s.pendingEventIndex);

  return useMemo(
    () =>
      buildCareerFeed({ week, historyLog, lastWeekSummary, activeEvents, pendingIndex }),
    [week, historyLog, lastWeekSummary, activeEvents, pendingIndex]
  );
}
