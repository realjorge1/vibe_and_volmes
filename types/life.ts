import type { EventConsequence } from './events';
import type { PlayerStats } from './player';
import type { StoryBeat } from './social';
import type { CareerStageId } from '../constants/careerStages';

// ─── Age & life stages ─────────────────────────────────────────────────────

export type LifeStageId = 'young' | 'prime' | 'established' | 'midlife' | 'elder';

export interface LifeStage {
  id: LifeStageId;
  label: string;
  minAge: number;
  /** Inclusive; the last stage runs forever. */
  maxAge: number;
  /** Written into the Deck the week the artist enters this stage. */
  arrival: string;
}

/** Starting age offered at onboarding, with its teen-years backstory. */
export interface StartingAgeOption {
  age: number;
  label: string;
  backstory: string;
}

// ─── Activities (the Life tab's "what do you do this week") ───────────────

export type ActivityCategory =
  | 'music'
  | 'mind-body'
  | 'nightlife'
  | 'love'
  | 'money'
  | 'risky';

/** Who `{npc}` names in an activity's text. */
export type ActivityNpc = 'world' | 'celebrity' | 'rival';

/** Hard requirements. Failing one shows the activity as locked. */
export interface ActivityGates {
  minAge?: number;
  maxAge?: number;
  minStage?: CareerStageId;
  minLevel?: number;
  minFans?: number;
  requiresTag?: string;
  lacksTag?: string;
  /** Needs a rival to aim at (see `ActivityNpc`). */
  requiresRival?: boolean;
  /** Only while the artist has no partner. */
  single?: boolean;
}

export interface ActivityOutcome {
  id: string;
  weight: number;
  /**
   * Good outcomes grow likelier as the activity's `skill` stat rises and bad
   * ones shrink; unmarked outcomes are pure luck.
   */
  luck?: 'good' | 'bad';
  /**
   * Applied through the same consequence pipeline as event choices.
   * `flavorText` becomes the Deck line; `{npc}` is filled in.
   */
  consequences: EventConsequence;
  /** Set on dramatic outcomes: a post that lands in the social feed. */
  social?: StoryBeat;
  /** The `{npc}` met here joins the artist's people in this role. */
  meets?: 'partner' | 'friend' | 'producer';
}

export interface LifeActivity {
  id: string;
  category: ActivityCategory;
  label: string;
  /** One line under the label. */
  blurb: string;
  /** Ionicons glyph name. */
  icon: string;
  energyCost: number;
  moneyCost?: number;
  /** The stat that tilts outcomes toward `luck: 'good'`. */
  skill?: keyof PlayerStats;
  /** Who `{npc}` names; omit when the text never uses it. */
  npc?: ActivityNpc;
  gates?: ActivityGates;
  /** Minimum weeks between two uses. */
  cooldownWeeks?: number;
  outcomes: ActivityOutcome[];
}
