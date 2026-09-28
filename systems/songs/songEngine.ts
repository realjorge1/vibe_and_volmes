import type { Player, PlayerStats } from '../../types/player';
import type { SongDraft, ProducedSong } from '../../types/audio';
import type { ReleaseResult } from '../../types/music';
import type { SocialReactionType } from '../../types/events';
import type { ReleaseRollout } from '../../types/audio';
import { evaluateSong } from '../../audio/scoring/scoreEngine';
import { buildProducedSong, producedSongToTrack } from '../../audio/metadata/songMetadata';
import { getBeat } from '../../data/beats/beatCatalog';
import { simulateRelease, type ReleaseChartOpts } from '../music/musicEngine';
import { liveChartReads } from '../charts/chartContext';
import { combineFeatures } from '../../data/collabs/featureRoster';
import { clamp } from '../../utils/random';

/** Marketing money → a 0-100 push score, with diminishing returns. */
function marketingToScore(budget: number): number {
  if (budget <= 0) return 0;
  return clamp(Math.sqrt(budget / 50_000) * 100, 0, 100);
}

/** First-week stream multiplier and social buzz base per rollout strategy. */
const ROLLOUT_STREAM_MULT: Record<ReleaseRollout, number> = {
  surprise: 1.05,
  standard: 1.0,
  campaign: 1.15,
};
const ROLLOUT_BUZZ: Record<ReleaseRollout, number> = {
  surprise: 55,
  standard: 35,
  campaign: 45,
};

/**
 * The bridge between the Phase 2 creator tools and the Phase 1 simulation.
 *
 * A produced song is scored by the (simulated) AI evaluator, projected onto
 * the existing `Track` model so charts/discography/social keep working
 * untouched, then run through the same `simulateRelease` math the quick-drop
 * path uses — except the numbers come from what the player actually made, not
 * a random stat blend. The studio screen wires the result into the stores
 * exactly like the old release flow.
 */

export interface ProduceResult {
  song: ProducedSong;
  release: ReleaseResult;
  /** Feed these into weekEngine.refreshSocial so the world reacts. */
  reactions: SocialReactionType[];
}

function reactionsFor(
  release: ReleaseResult,
  song: ProducedSong
): SocialReactionType[] {
  const out: SocialReactionType[] = [];
  switch (release.reception) {
    case 'viral':
      out.push('viral', 'positive');
      break;
    case 'smash':
      out.push('viral', 'positive');
      break;
    case 'hit':
      out.push('positive');
      break;
    case 'solid':
      out.push('positive');
      break;
    case 'mixed':
      out.push('mixed');
      break;
    case 'flop':
      out.push('negative');
      break;
  }
  if (song.controversial) {
    // Divisive drops start arguments; a bad divisive drop can tip to cancel.
    out.push(release.reception === 'flop' ? 'cancel' : 'mixed');
  }
  return out;
}

export function produceAndRelease(
  player: Player,
  week: number,
  draft: SongDraft
): ProduceResult {
  const beat = getBeat(draft.beatId);

  const score = evaluateSong({
    player,
    beat,
    lyrics: draft.lyrics,
    recording: draft.recording,
    mix: draft.mix,
  });

  const song = buildProducedSong({ draft, player, week, score, beat });
  const track = producedSongToTrack(song, week);

  // Translate the release plan (beat, collaborators, rollout, marketing) +
  // live world state into the multi-factor chart inputs.
  const combo = combineFeatures(draft.collaborators);
  const marketingScore = marketingToScore(draft.marketingBudget);
  const reads = liveChartReads(player.stats);
  const opts: ReleaseChartOpts = {
    streamMultiplier:
      ROLLOUT_STREAM_MULT[draft.rollout] *
      (1 + (marketingScore / 100) * 0.8) *
      (1 + (combo.reach / 100) * 0.6),
    chartFactors: {
      socialBuzz: clamp(ROLLOUT_BUZZ[draft.rollout] + combo.reach * 0.25, 0, 100),
      playlistSupport: clamp(
        (beat?.producerReputation ?? 0) * 0.4 +
          marketingScore * 0.45 +
          reads.labelBacking * 0.15 +
          combo.credibility * 0.2,
        0,
        100
      ),
      trendAlignment: reads.trendAlignment,
      labelBacking: reads.labelBacking,
      reputation: reads.reputation,
    },
    persist: {
      producerReputation: beat?.producerReputation ?? 0,
      marketingSeed: marketingScore,
      collabReach: combo.reach,
    },
  };

  const release = simulateRelease(player, track, opts);

  // Keep the produced-song record and the charted track in lock-step.
  song.popularity = clamp(
    Math.round(
      song.popularity * 0.5 +
        (release.reception === 'viral' || release.reception === 'smash' ? 100 : 50) *
          0.5
    ),
    1,
    100
  );
  return {
    song,
    release,
    reactions: reactionsFor(release, song),
  };
}

/** Stat deltas applied to the player after a produced release. */
export function releaseStatDeltas(
  release: ReleaseResult,
  energyCost: number
): { stat: keyof PlayerStats; delta: number }[] {
  const flop = release.reception === 'flop';
  return [
    { stat: 'fans', delta: release.fansGained },
    { stat: 'energy', delta: -energyCost },
    { stat: 'industryRespect', delta: flop ? -2 : 4 },
    { stat: 'reputation', delta: flop ? -1 : 1 },
    { stat: 'creativity', delta: 1 },
  ];
}
