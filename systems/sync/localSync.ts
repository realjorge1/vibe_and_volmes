import type {
  SyncAdapter,
  CommunityLegend,
  GlobalChartEntry,
} from '../../types/sync';
import type { StoryCard } from '../../types/legacy';
import { SEED_LEGENDS } from '../../data/community/seedLegends';
import { SEED_GLOBAL_CHART } from '../../data/community/seedCharts';
import { COMMUNITY_EVENTS } from '../../data/community/communityEvents';
import { useMetaStore } from '../../store/metaStore';
import {
  playerChartEntry,
  playerTopStreams,
  playerSeasonalRank,
} from '../community/standing';

/**
 * The shipped default. 100% offline: discovery is the bundled seed legends
 * blended with the player's OWN retired careers (read from the cross-save
 * meta-profile). `publishCareer` is a no-op that always "succeeds" so
 * callers need no offline/online branching.
 */

/** Parse a "12.4M" streams label back into a number for ranking. */
function parseStreams(label: string): number {
  const m = label.match(/^([\d.]+)([BMK]?)$/);
  if (!m) return 0;
  const v = parseFloat(m[1]);
  const unit = m[2];
  return unit === 'B' ? v * 1e9 : unit === 'M' ? v * 1e6 : unit === 'K' ? v * 1e3 : v;
}

function ownRetiredAsLegends(): CommunityLegend[] {
  return useMetaStore.getState().retiredCareers.map((c) => ({
    id: c.id,
    artistName: c.artistName,
    identityTitle: c.identity
      .split('-')
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(' '),
    legacyTier: c.legacyTier,
    legacyTotal: c.legacyTotal,
    era: 'Your timeline',
    signatureMoment: `${c.peakFans.toLocaleString('en-US')} fans at the peak · ${c.weeksActive} weeks`,
    seeded: false,
  }));
}

export const localSync: SyncAdapter = {
  id: 'local',
  online: false,

  async publishCareer(_card: StoryCard) {
    // Nothing to publish offline; the export already went to the share sheet.
    return { ok: true };
  },

  async fetchLegends(limit: number) {
    const all = [...ownRetiredAsLegends(), ...SEED_LEGENDS];
    return all.slice(0, limit);
  },

  async fetchHallOfFame(limit: number) {
    const all = [...ownRetiredAsLegends(), ...SEED_LEGENDS].sort(
      (a, b) => b.legacyTotal - a.legacyTotal
    );
    return all.slice(0, limit);
  },

  async fetchGlobalCharts(limit: number) {
    const myStreams = playerTopStreams();
    const me = playerChartEntry();
    // Seed rows are pre-sorted descending; insert the player at their spot.
    const combined: GlobalChartEntry[] = SEED_GLOBAL_CHART.map((r) => ({ ...r, rank: 0 }));
    let idx = combined.findIndex((r) => parseStreams(r.streamsLabel) < myStreams);
    if (idx === -1) idx = combined.length;
    combined.splice(idx, 0, me);
    const ranked = combined.map((r, i) => ({ ...r, rank: i + 1 }));

    const top = ranked.slice(0, limit);
    // Always keep the player visible, even if their rank falls past the cut.
    if (!top.some((r) => r.isPlayer)) {
      const mine = ranked.find((r) => r.isPlayer);
      if (mine) top[top.length - 1] = mine;
    }
    return top;
  },

  async fetchSeasonalRanking() {
    return playerSeasonalRank();
  },

  async fetchCommunityEvents() {
    // Rotate two active events on a daily cadence — a shared global rhythm.
    const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
    const n = COMMUNITY_EVENTS.length;
    return [
      COMMUNITY_EVENTS[dayIndex % n],
      COMMUNITY_EVENTS[(dayIndex + 1) % n],
    ];
  },
};
