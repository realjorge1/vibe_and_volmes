import type { ReleaseResult, Track } from '../../types/music';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useMusicStore } from '../../store/musicStore';
import { useProgressionStore } from '../../store/progressionStore';
import { createTrack, simulateRelease } from './musicEngine';
import { liveChartReads } from '../charts/chartContext';
import { afterRelease, releaseBoost, stampTrack } from './releaseHooks';
import { awardReleaseXp } from '../progression/xpEngine';
import { notifyRelease } from '../notifications/triggers';
import { clamp, pick } from '../../utils/random';

/**
 * A song out the fast way: no studio session, one tap (or one event choice).
 * The studio's quick drop, the holiday single, the jail tape, the tribute to
 * a past life and "(Your Version)" all come through here, so every one of
 * them is boosted, stamped and settled exactly like a full release.
 */

export interface QuickReleaseOpts {
  title?: string;
  /** On top of who the artist is (traits/era/comeback). */
  streamsMult?: number;
  /** Social buzz at release, 0..100 (a jail tape trends; a quick drop doesn't). */
  buzz?: number;
  /** Floor under the song's quality (a re-record is at least as good as the original). */
  qualityFloor?: number;
  /** Story stamps. */
  extra?: Partial<Track>;
  /** Industry respect for putting it out (a flop costs a little either way). */
  respect?: number;
}

export function releaseQuickTrack(opts: QuickReleaseOpts = {}): ReleaseResult | null {
  const player = usePlayerStore.getState().player;
  if (!player) return null;
  const week = useGameStore.getState().week;
  const base = createTrack(player, week);
  const track: Track = {
    ...base,
    title: opts.title ?? base.title,
    quality: opts.qualityFloor ? Math.max(base.quality, clamp(opts.qualityFloor, 1, 100)) : base.quality,
  };
  const boost = releaseBoost();
  const reads = liveChartReads(player.stats);
  const result = simulateRelease(player, track, {
    streamMultiplier: boost.streamsMult * (opts.streamsMult ?? 1),
    criticsBonus: boost.criticsBonus,
    chartFactors: {
      socialBuzz: opts.buzz ?? 0,
      playlistSupport: 0,
      trendAlignment: reads.trendAlignment,
      labelBacking: reads.labelBacking,
      reputation: reads.reputation,
    },
  });
  const stamped: ReleaseResult = { ...result, track: stampTrack(result.track, opts.extra) };

  const music = useMusicStore.getState();
  music.addTrack(stamped.track);
  music.setLastRelease(stamped);
  if (stamped.chartPosition !== null) {
    music.addChartEntry({
      week,
      trackId: stamped.track.id,
      trackTitle: stamped.track.title,
      position: stamped.chartPosition,
      streams: stamped.streamCount,
    });
  }
  usePlayerStore.getState().updateStats([
    { stat: 'fans', delta: stamped.fansGained },
    { stat: 'industryRespect', delta: stamped.reception === 'flop' ? -2 : opts.respect ?? 3 },
  ]);
  awardReleaseXp(stamped.reception);
  notifyRelease(stamped.track.id);
  afterRelease(stamped);

  usePlayerStore.getState().save();
  useMusicStore.getState().save();
  useProgressionStore.getState().save();
  return stamped;
}

export const HOLIDAY_TITLES: readonly string[] = [
  'Snow In The City',
  'Home For December',
  'Mistletoe Problems',
  'All I Got Is You',
  'Cold Outside, Warm In Here',
  'Silent Night, Loud Heart',
  'Gift Wrapped',
  'New Year, Same Us',
];

export const JAIL_TITLES: readonly string[] = [
  'Letters From Inside',
  'Count Time',
  'Phone Call Freestyle',
  'Visiting Hours',
  'Concrete Walls',
  'Free Me',
  'Cell Block Hymn',
];

export function holidayTitle(): string {
  return pick([...HOLIDAY_TITLES]);
}

export function jailTitle(): string {
  return pick([...JAIL_TITLES]);
}
