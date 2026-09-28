/**
 * The 6-stage career ladder from the Phase 3 brief:
 *   novice → amateur → emerging → established → superstar → legend
 *
 * This is a LIGHTWEIGHT GATING LAYER, not a new progression system. It does
 * not store state of its own — a stage is derived (see
 * `systems/career/careerStage.ts`) from the existing XP ladder
 * (`constants/progression.ts` level) AND fan count, requiring BOTH bars to be
 * met. It exists to answer one question: "what has the artist unlocked?"
 * (venues, collaborations, sponsorships, media). The 30-level XP ladder, the
 * 9-tier `FAME_LEVELS`, and the 7-phase career arc all keep their own jobs.
 */

export type CareerStageId =
  | 'novice'
  | 'amateur'
  | 'emerging'
  | 'established'
  | 'superstar'
  | 'legend';

export interface StageUnlocks {
  /** Largest venue scale the artist can headline. */
  venues: string;
  /** Fan ceiling of artists willing to feature on the player's records. */
  maxCollabFans: number;
  /** Sponsorship tier available at this stage. */
  sponsorships: string;
  /** Media opportunities open at this stage. */
  media: string;
}

export interface CareerStage {
  id: CareerStageId;
  /** Display name shown in the brief's exact wording. */
  label: string;
  blurb: string;
  /** Minimum career level (XP ladder) required to stand at this stage. */
  minLevel: number;
  /** Minimum fans required to stand at this stage. */
  minFans: number;
  color: string;
  unlocks: StageUnlocks;
}

/** Ordered low → high. A stage is the highest whose BOTH bars are cleared. */
export const CAREER_STAGES: CareerStage[] = [
  {
    id: 'novice',
    label: 'Novice',
    blurb: 'Bedroom takes and open mics. Nobody is listening yet — that is the point.',
    minLevel: 1,
    minFans: 0,
    color: '#5C636B',
    unlocks: {
      venues: 'Open mics',
      maxCollabFans: 50_000,
      sponsorships: 'None',
      media: 'Local blogs',
    },
  },
  {
    id: 'amateur',
    label: 'Amateur',
    blurb: 'A real scene knows your name. Small rooms, first collabs, first press.',
    minLevel: 4,
    minFans: 5_000,
    color: '#9BA1A8',
    unlocks: {
      venues: 'Clubs',
      maxCollabFans: 300_000,
      sponsorships: 'Micro / affiliate',
      media: 'Podcasts & blogs',
    },
  },
  {
    id: 'emerging',
    label: 'Emerging Artist',
    blurb: 'You broke containment. The algorithm found you and so did the labels.',
    minLevel: 8,
    minFans: 50_000,
    color: '#2E8DFF',
    unlocks: {
      venues: 'Theaters',
      maxCollabFans: 2_000_000,
      sponsorships: 'Brand starter deals',
      media: 'Interviews & playlist features',
    },
  },
  {
    id: 'established',
    label: 'Established Artist',
    blurb: 'No longer a question mark. You headline, you chart, you get the cover.',
    minLevel: 13,
    minFans: 500_000,
    color: '#2E8DFF',
    unlocks: {
      venues: 'Arenas',
      maxCollabFans: 8_000_000,
      sponsorships: 'Major brand deals',
      media: 'Magazine covers & TV',
    },
  },
  {
    id: 'superstar',
    label: 'Superstar',
    blurb: 'The main event of the industry. Stadiums, luxury money, global press.',
    minLevel: 20,
    minFans: 5_000_000,
    color: '#FFFFFF',
    unlocks: {
      venues: 'Stadiums',
      maxCollabFans: 50_000_000,
      sponsorships: 'Luxury & equity',
      media: 'Late-night & global press',
    },
  },
  {
    id: 'legend',
    label: 'Legend',
    blurb: 'Beyond the charts. You are the influence other artists cite.',
    minLevel: 26,
    minFans: 30_000_000,
    color: '#D9C77E',
    unlocks: {
      venues: 'Festival headline & world tours',
      maxCollabFans: Number.POSITIVE_INFINITY,
      sponsorships: 'Own brand / iconic',
      media: 'Documentaries',
    },
  },
];
