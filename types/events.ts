import type { PlayerStats } from './player';
import type { LifeStageId } from './life';
import type { PartnerBond, PersonRole } from './people';
import type { HomeId, LuxuryCategory } from './status';
import type { MomentSpec } from './drama';
import type { EraPersona, SeedPlant } from './identity';
import type { LawyerTier } from './legal';

export type EventCategory =
  | 'career'
  | 'drama'
  | 'social'
  | 'personal'
  | 'rivalry'
  | 'opportunity';

export type TriggerType =
  | 'stat_gte'
  | 'stat_lte'
  | 'fans_gte'
  | 'fans_lte'
  | 'week_gte'
  | 'has_tag'
  | 'lacks_tag'
  | 'has_released_track'
  | 'random'
  | 'always'
  // ─── Phase 3 triggers ───
  | 'has_contract'
  | 'lacks_contract'
  | 'on_tour'
  | 'controversy_active'
  | 'no_controversy'
  | 'career_phase'
  | 'mental_gte'
  | 'mental_lte'
  | 'rivalry_intensity_gte'
  // ─── Phase 5 culture triggers ───
  | 'era_is'
  | 'genre_saturated'
  | 'genre_ascendant'
  // ─── Life: age ───
  | 'age_gte'
  | 'age_lte'
  | 'life_stage'
  // ─── Life: people ───
  | 'has_partner'
  | 'has_child'
  | 'has_person'
  | 'lacks_person'
  | 'person_affinity_lte'
  | 'person_affinity_gte'
  // ─── Life: assets ───
  | 'owns_asset'
  | 'lacks_asset'
  | 'home_is'
  | 'money_lte'
  // ─── Identity ───
  | 'has_trait'
  | 'lacks_trait'
  /** A planted seed of kind `seed` is ripe (optionally: its NPC now at `npcStages`). */
  | 'seed_ripe'
  | 'era_persona'
  | 'comeback_active'
  // ─── The music year ───
  /** The week of the year is `value` (1..WEEKS_PER_YEAR). */
  | 'year_week'
  | 'career_year_gte'
  // ─── The law ───
  | 'in_jail'
  | 'not_in_jail'
  /** A case is waiting on the artist (charged, no lawyer yet). */
  | 'case_pending'
  // ─── Legacy & business ───
  /** A past life lives on in this world (`legend`: alive / dead / any). */
  | 'has_legend'
  | 'owns_label'
  | 'has_signee'
  /** A label owns some of the artist's masters. */
  | 'label_owns_masters';

export type MentalAxis =
  | 'burnout'
  | 'anxiety'
  | 'paranoia'
  | 'depression'
  | 'addictionRisk'
  | 'isolation';

export interface EventTrigger {
  type: TriggerType;
  stat?: keyof PlayerStats;
  value?: number;
  tag?: string;
  mentalAxis?: MentalAxis;
  phase?: string;
  era?: string; // Phase 5: era id for `era_is`
  lifeStage?: LifeStageId; // for `life_stage`
  role?: PersonRole; // for the person triggers
  bond?: PartnerBond; // `has_partner`: only partners at this stage
  asset?: string; // `owns_asset` / `lacks_asset`: a luxury item id
  assetCategory?: LuxuryCategory; // `owns_asset`: anything in this category
  home?: HomeId; // `home_is`
  trait?: string; // `has_trait` / `lacks_trait`
  seed?: string; // `seed_ripe`: the seed kind
  /** `seed_ripe`: only when the seed's world NPC is now at one of these stages. */
  npcStages?: string[];
  persona?: EraPersona; // `era_persona`
  legend?: 'alive' | 'dead' | 'any'; // `has_legend`
}

export interface StatChange {
  stat: keyof PlayerStats;
  delta: number;
}

export interface RelationshipChange {
  artistId: string;
  delta: number;
}

export type SocialReactionType =
  | 'positive'
  | 'negative'
  | 'mixed'
  | 'neutral'
  | 'viral'
  | 'cancel'
  | 'none';

export interface MentalChange {
  axis: MentalAxis;
  delta: number;
}

export interface EventConsequence {
  statChanges?: StatChange[];
  moneyDelta?: number;
  fansDelta?: number;
  addTags?: string[];
  removeTags?: string[];
  triggerEventId?: string;
  socialReaction?: SocialReactionType;
  relationshipChanges?: RelationshipChange[];
  // ─── Phase 3 consequences (resolved by consequenceApplicator) ───
  mentalChanges?: MentalChange[];
  spawnContractOfferTier?: 'independent' | 'indie' | 'major';
  spawnControversyId?: string;
  bookInterviewKind?: string;
  rivalryIntensityDelta?: { artistId?: string; delta: number };
  historyRecord?: {
    kind: string;
    summary: string;
    severity: number;
    tags: string[];
  };
  // ─── Life: people ───
  /**
   * Affinity changes. `role` targets the person the event's text named for
   * that role (bound when the event was slated); `personId` is filled in then.
   */
  personChanges?: PersonChange[];
  /** Someone new enters the artist's life. `{new}` in the text is their name. */
  addPerson?: NewPerson;
  /**
   * The asset the event named as `{asset}` is lost (stolen, repossessed) or
   * sold for half what it cost. `itemId` is filled in when slated.
   */
  asset?: { action: 'lose' | 'sell'; itemId?: string };
  // ─── Drama layer ───
  /** Something the internet will talk about: becomes a moment (headline, posts, trend). */
  moment?: MomentSpec;
  /** Public opinion in the hottest rival war (+ = the artist's favor). */
  warSwing?: number;
  // ─── Identity ───
  /** A choice that comes back later (see types/identity SeedPlant). */
  plantSeed?: SeedPlant;
  /** Traits the artist gains / loses. */
  addTraits?: string[];
  removeTraits?: string[];
  // ─── The law ───
  /** The artist is charged with this (data/legal/charges id). */
  legalCharge?: string;
  /** How the artist fights the pending case. */
  lawyer?: LawyerTier;
  // ─── Business ───
  /** Masters drama: the label sells them, or the artist buys them back. */
  masters?: { action: 'sold' | 'buy-back' };
  /** Sign a deal on the spot (no shopping around). */
  signDeal?: 'predatory' | 'fair';
  /** Put a song out from here (no studio session). */
  releaseTrack?: 'holiday' | 'jail-tape' | 'tribute';
  /** Something the signee at the center of a label event does (`npcId` bound when slated). */
  signee?: { action: 'leave' | 'renegotiate' | 'loyal'; npcId?: string };
  flavorText: string;
}

export interface PersonChange {
  role: PersonRole;
  delta: number;
  personId?: string;
}

export interface NewPerson {
  role: PersonRole;
  title: string;
  affinity: number;
  /** Drawn from the living world when true; filled in when slated. */
  fromWorld?: boolean;
  name?: string;
  npcId?: string;
  /** Children only: how old they already are, in weeks (a kid who shows up at the door). */
  bornWeeksAgo?: number;
}

export interface EventChoice {
  id: string;
  text: string;
  requiresTags?: string[];
  /**
   * Only the artist with this trait sees this choice. It is hidden, not
   * locked, for everyone else, and labelled with the trait for them.
   */
  requiresTrait?: string;
  consequences: EventConsequence;
}

export interface GameEvent {
  id: string;
  category: EventCategory;
  title: string;
  description: string;
  weight: number;
  triggers: EventTrigger[];
  choices: EventChoice[];
  tags: string[];
  cooldown?: number;  // weeks before same event can re-trigger
  unique?: boolean;   // only once per playthrough
  /**
   * Slated ahead of the random draw whenever eligible (court dates, the past
   * coming back, the calendar). At most a couple a week.
   */
  priority?: boolean;
  // ─── Filled when slated ───
  /** The seed this event pays off; consumed when it resolves. */
  seedId?: string;
  /** Shown on the card: what the artist did, and when. */
  callback?: { week: number; note: string };
}

export interface EventHistoryEntry {
  eventId: string;
  choiceId: string;
  week: number;
  flavorText: string;
  category: EventCategory;
}

export interface ActiveEvent {
  event: GameEvent;
  triggeredAtWeek: number;
}
