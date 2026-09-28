import type { FeatureCredit } from '../../types/audio';
import type { CareerStage } from '../../constants/careerStages';
import type { MusicGenre } from '../../types/player';
import { RIVAL_ARTISTS } from '../artists/rivalArtists';
import { maxCollabFansFor } from '../../systems/career/careerStage';
import { clamp } from '../../utils/random';

/**
 * The featurable artist roster. Reuses the rival/industry artists from
 * `data/artists/rivalArtists.ts` — securing a feature costs money and is gated
 * by career stage (a novice can't pull a 12M-fan superstar onto a record). A
 * feature buys reach (first-week streams) and credibility (chart playlist push).
 */

export interface FeatureArtist extends FeatureCredit {
  genre: MusicGenre;
}

/** 0-100 reach from a fan count, on a log curve (50M fans ≈ max reach). */
function reachFromFans(fans: number): number {
  return Math.round(
    clamp(
      ((Math.log10(fans + 1) - 4) / (Math.log10(50_000_000) - 4)) * 100,
      5,
      100
    )
  );
}

export const FEATURE_ROSTER: FeatureArtist[] = RIVAL_ARTISTS.map((a) => {
  const reachBonus = reachFromFans(a.fans);
  return {
    artistId: a.id,
    name: a.name,
    fans: a.fans,
    genre: a.genre,
    cost: Math.round(a.fans * 0.025),
    reachBonus,
    credibilityBonus: Math.round(clamp(reachBonus * 0.85 + 10, 0, 100)),
  };
});

/** Features the artist can realistically secure at this stage (by fan ceiling). */
export function getAvailableFeatures(stage: CareerStage): FeatureArtist[] {
  const ceiling = maxCollabFansFor(stage);
  return FEATURE_ROSTER.filter((f) => f.fans <= ceiling).sort(
    (a, b) => a.fans - b.fans
  );
}

/** Combined release modifiers from chosen collaborators (0-100, summed & capped). */
export function combineFeatures(features: FeatureCredit[]): {
  reach: number;
  credibility: number;
  cost: number;
} {
  return {
    reach: clamp(
      features.reduce((s, f) => s + f.reachBonus, 0),
      0,
      100
    ),
    credibility: clamp(
      features.reduce((s, f) => s + f.credibilityBonus, 0),
      0,
      100
    ),
    cost: features.reduce((s, f) => s + f.cost, 0),
  };
}
