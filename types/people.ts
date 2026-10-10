import type { EventCategory, EventConsequence } from './events';
import type { StoryBeat } from './social';

/**
 * The artist's personal circle: family, love life, kids, friends and team.
 * Industry rivals stay in types/relationships.ts — these are the people the
 * artist goes home to (or avoids).
 */

export type PersonRole =
  | 'parent'
  | 'sibling'
  | 'partner'
  | 'ex'
  | 'child'
  | 'friend'
  | 'manager'
  | 'producer';

export const PERSON_ROLES: readonly PersonRole[] = [
  'parent',
  'sibling',
  'partner',
  'ex',
  'child',
  'friend',
  'manager',
  'producer',
];

export type PartnerBond = 'dating' | 'engaged' | 'married';

export interface Person {
  id: string;
  name: string;
  role: PersonRole;
  /** How the story refers to them, lowercase: "your mom", "your partner". */
  title: string;
  /** -100 (estranged) .. 100 (ride or die). */
  affinity: number;
  /** Flavor + mechanics hooks: 'supportive', 'disapproving', 'funds-you'… */
  traits: string[];
  /** Living-world NPC id when this person has a career of their own. */
  npcId?: string;
  /** Week they entered the artist's life (≤ 0 = before the career). */
  sinceWeek: number;
  /** Last week the artist made time for them (neglect drifts affinity). */
  lastSeenWeek: number;
  /** Week of the last interaction: one per person per week. */
  lastInteractionWeek?: number;
  /** Partners only. */
  bond?: PartnerBond;
  /** Children only: the week they were born (age is derived). */
  bornWeek?: number;
  /** Children only: the artist's partner at the time, if any. */
  otherParentId?: string;
  /** Weekly money while affinity holds (e.g. a Rich Kid's parents). */
  allowance?: number;
  /** Someone met online: their account id, so their face shows in People. */
  face?: string;
}

/** A baby on the way: born on `dueWeek`. */
export interface PendingBirth {
  dueWeek: number;
  otherParentId: string | null;
}

// ─── Family generation (data/life/families.ts) ─────────────────────────────

export interface FamilyMemberTemplate {
  role: 'parent' | 'sibling';
  title: string;
  affinity: number;
  traits: string[];
  allowance?: number;
}

export interface FamilyTemplate {
  members: FamilyMemberTemplate[];
  /**
   * The first Deck line of the career. `{1}`, `{2}`… are the members' names
   * in order.
   */
  intro: string;
}

// ─── Interactions (data/life/interactions.ts) ──────────────────────────────

/** Structural change an outcome makes to the relationship itself. */
export type InteractionEffect =
  | 'engage'
  | 'marry'
  | 'break-up'
  | 'conceive'
  | 'cut-off';

export interface InteractionOutcome {
  id: string;
  weight: number;
  /** Good outcomes grow likelier as affinity rises; bad ones shrink. */
  luck?: 'good' | 'bad';
  /** Change to this person's affinity. */
  affinity: number;
  /**
   * Applied through the event consequence pipeline. Text may use {name},
   * {title} ("your mom"), {Title} ("Your mom") and {playerName}.
   */
  consequences: EventConsequence;
  social?: StoryBeat;
  effect?: InteractionEffect;
  /** A trait this person gains (e.g. a child who picks up music). */
  addTrait?: string;
}

export interface PersonInteraction {
  id: string;
  label: string;
  /** Ionicons glyph name. */
  icon: string;
  roles: PersonRole[];
  /** Deck category for the result line (default 'personal'). */
  logAs?: EventCategory;
  energyCost: number;
  moneyCost?: number;
  /** Requirements on the person. */
  requires?: {
    minAffinity?: number;
    maxAffinity?: number;
    bond?: PartnerBond[];
    /** Only people with a career of their own (world NPCs). */
    npcLinked?: boolean;
    minChildAge?: number;
  };
  /** Requirement on the artist. */
  minAge?: number;
  outcomes: InteractionOutcome[];
}
