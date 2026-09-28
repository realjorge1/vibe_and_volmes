import type { PlayerStats } from './player';

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
  | 'genre_ascendant';

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
  flavorText: string;
}

export interface EventChoice {
  id: string;
  text: string;
  requiresTags?: string[];
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
