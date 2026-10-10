import type { Player } from '../../types/player';
import type { Track, ReleaseResult, ReleaseReception, TrackType } from '../../types/music';
import { getGenre } from '../../data/genres';
import { TRACK_QUALITY_WEIGHTS } from '../../constants/gameConfig';
import { generateTrackTitle } from '../../utils/nameGenerator';
import { clamp, gaussRand, chance, randInt } from '../../utils/random';
import { fameReach } from '../../utils/statHelpers';
import { AUDIENCE_FLOOR, isUpcoming, planRelease } from './releaseCurve';
import {
  getChartPosition,
  computeChartScore,
  chartPositionFromScore,
  type ChartFactorInputs,
} from '../charts/chartEngine';

/** Weighted blend of the stats that make a record good. */
export function calculateTrackQuality(player: Player): {
  quality: number;
  replayValue: number;
  originality: number;
  mainstreamAppeal: number;
} {
  const s = player.stats;
  const genre = getGenre(player.genre);

  let raw = 0;
  for (const [stat, w] of Object.entries(TRACK_QUALITY_WEIGHTS)) {
    raw += (s[stat as keyof typeof s] as number) * w;
  }
  const quality = clamp(Math.round(gaussRand(raw, 6)), 1, 100);

  const replayValue = clamp(
    Math.round((s.creativity * 0.5 + s.talent * 0.5) + gaussRand(0, 8)),
    1,
    100
  );
  const originality = clamp(
    Math.round(s.creativity * 0.6 + s.authenticity * 0.4 + gaussRand(0, 8)),
    1,
    100
  );
  const mainstreamAppeal = clamp(
    Math.round(
      s.charisma * 0.4 + genre.mainstreamScore * 5 + s.vocalSkill * 0.2 + gaussRand(0, 8)
    ),
    1,
    100
  );

  return { quality, replayValue, originality, mainstreamAppeal };
}

export function createTrack(
  player: Player,
  week: number,
  type: TrackType = 'single'
): Track {
  const q = calculateTrackQuality(player);
  return {
    id: `track-${week}-${Date.now()}`,
    title: generateTrackTitle(player.genre),
    type,
    genre: player.genre,
    releasedAtWeek: week,
    quality: q.quality,
    replayValue: q.replayValue,
    originality: q.originality,
    mainstreamAppeal: q.mainstreamAppeal,
    peakChartPosition: null,
    peakFans: player.stats.fans,
    weeklyStreams: 0,
    totalStreams: 0,
    status: 'charting',
    wentViral: false,
  };
}

/** Chance the record catches lightning: genre virality + quality + luck. */
export function viralChance(track: Track, player: Player): number {
  const genre = getGenre(player.genre);
  const p =
    (genre.viralPotential / 100) *
    (track.quality / 100) *
    (0.6 + track.originality / 200) *
    (player.stats.charisma / 80 + 0.4);
  return clamp(p, 0.01, 0.6);
}

/** Did the record catch lightning? */
export function checkViral(track: Track, player: Player): boolean {
  return chance(viralChance(track, player));
}

function receptionFromScore(score: number, viral: boolean): ReleaseReception {
  if (viral) return 'viral';
  if (score >= 88) return 'smash';
  if (score >= 72) return 'hit';
  if (score >= 55) return 'solid';
  if (score >= 38) return 'mixed';
  return 'flop';
}

const RECEPTION_MESSAGE: Record<ReleaseReception, string> = {
  flop: 'The release barely registered. The numbers are brutal.',
  mixed: 'Reviews are split. Some moments land, some don\'t.',
  solid: 'A solid body of work. The core fanbase is fed.',
  hit: 'A genuine hit. The streams are climbing fast.',
  smash: 'A smash. This is the record that changes everything.',
  viral: 'It went viral. The internet has fully lost it.',
};

/**
 * Nobody knows an upcoming artist yet: the drop is a few blogs and early
 * listeners, and the numbers come later if the song is good.
 */
const UPCOMING_MESSAGE: Record<ReleaseReception, string> = {
  flop: 'Barely a ripple. A handful of plays, and the blogs passed on it.',
  mixed: 'A few blogs gave it a spin. Reviews are split, and the plays are trickling in.',
  solid: 'Critics are kind to it. The numbers are small for now. Give it time to find people.',
  hit: 'The reviews are glowing. Nobody knows your name yet, but word is starting to spread.',
  smash: 'The reviews are glowing. Nobody knows your name yet, but word is starting to spread.',
  viral: 'It went viral. The internet has fully lost it.',
};

/**
 * Optional release-plan modifiers (collaborators, marketing, rollout) supplied
 * by the produced-song pipeline. The quick-drop path omits them and falls back
 * to the streams-only chart curve, so its behavior is unchanged.
 */
export interface ReleaseChartOpts {
  /** Audience multiplier from marketing + collabs + rollout. */
  streamMultiplier?: number;
  /** Chart factors known at release (everything except streams). */
  chartFactors?: Omit<ChartFactorInputs, 'weeklyStreams'>;
  /** Locked onto the track so the weekly recompute can keep blending them. */
  persist?: {
    producerReputation?: number;
    marketingSeed?: number;
    collabReach?: number;
  };
  /** Points with the critics from who the artist is (traits, era). */
  criticsBonus?: number;
}

export function simulateRelease(
  player: Player,
  track: Track,
  opts?: ReleaseChartOpts
): ReleaseResult {
  const genre = getGenre(player.genre);
  const fans = player.stats.fans;
  const upcoming = isUpcoming(fans);
  // An established artist's fans can make a record go viral on release day.
  // An upcoming artist's song has to be found first, so it can only break out
  // later, while it builds (see releaseCurve.rollBreakout).
  const pViral = viralChance(track, player);
  const viral = !upcoming && chance(pViral);

  const criticsScore = clamp(
    Math.round(
      track.quality * 0.5 +
        track.originality * 0.3 +
        player.stats.industryRespect * 0.2 +
        (opts?.criticsBonus ?? 0) +
        gaussRand(0, 7)
    ),
    1,
    100
  );

  const commercialScore = clamp(
    track.quality * 0.4 +
      track.mainstreamAppeal * 0.4 +
      (player.stats.fanLoyalty / 100) * 20,
    1,
    100
  );

  // The song's full weekly audience scales with the fanbase, appeal and genre
  // reach, lifted by the release plan (marketing/collab/rollout). Only part of
  // it shows up on release week; the rest builds (or doesn't) week by week.
  const fanBase = Math.max(fans, AUDIENCE_FLOOR);
  const planMult = Math.max(1, opts?.streamMultiplier ?? 1);
  const potential =
    fanBase *
    (4 + (commercialScore / 100) * 18) *
    (1 + genre.viralPotential / 20) *
    planMult *
    (0.7 + Math.random() * 0.6);

  const plan = planRelease({
    fans,
    track,
    conversion: 0.01 + (track.replayValue / 100) * 0.05,
    viralMult: viral ? randInt(2, 5) : 1,
    breakoutChance: upcoming ? pViral : 0,
  });
  const streamCount = Math.round(potential * plan.opening);
  const fansGained = Math.round(streamCount * plan.momentum.fansPerStream);

  // Critics set the tone for a name nobody knows; for a known one the numbers
  // do. And no unknown has a smash on day one.
  const reach = fameReach(fans);
  let reception = receptionFromScore(
    commercialScore * reach + criticsScore * (1 - reach),
    viral
  );
  if (upcoming && reception === 'smash') reception = 'hit';

  // Multi-factor chart position when the release plan provides the factors;
  // otherwise the legacy streams-only curve.
  let chartPosition: number | null;
  let chartScoreValue: number | undefined;
  let chartFactors: ReleaseResult['chartFactors'];
  if (opts?.chartFactors) {
    const cs = computeChartScore({
      weeklyStreams: streamCount,
      ...opts.chartFactors,
    });
    chartPosition = chartPositionFromScore(cs.score);
    chartScoreValue = Math.round(cs.score);
    chartFactors = cs.factors;
  } else {
    chartPosition = getChartPosition(streamCount);
  }

  return {
    track: {
      ...track,
      weeklyStreams: streamCount,
      totalStreams: streamCount,
      peakChartPosition: chartPosition,
      peakFans: player.stats.fans + fansGained,
      wentViral: viral,
      producerReputation: opts?.persist?.producerReputation,
      marketingSeed: opts?.persist?.marketingSeed,
      collabReach: opts?.persist?.collabReach,
      momentum: plan.momentum,
      fansEarned: fansGained,
      criticsScore,
    },
    chartPosition,
    fansGained,
    reception,
    streamCount,
    criticsScore,
    message: (upcoming ? UPCOMING_MESSAGE : RECEPTION_MESSAGE)[reception],
    chartScore: chartScoreValue,
    chartFactors,
  };
}
