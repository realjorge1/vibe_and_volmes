import type { SocialPost } from './social';

/**
 * Living-world + progression layer types.
 *
 * The deterministic weekly sim still owns every mechanical outcome. This
 * layer adds the *dopamine spine*: an XP/level career ladder, real-time
 * energy, achievements, and a "while you were away" report. It reads the
 * sim's state and amplifies it — it never drives it.
 */

/** Where XP came from — used for the floating "+XP" attribution. */
export type XpSource =
  | 'release'
  | 'viral'
  | 'fan-growth'
  | 'chart'
  | 'controversy'
  | 'event'
  | 'performance'
  | 'milestone'
  | 'engagement'
  | 'luxury';

export interface CareerLevel {
  /** 1-30 */
  level: number;
  /** Emotionally-loaded rank name. */
  title: string;
  /** One-line status flavor shown on level-up. */
  blurb: string;
  /** Total cumulative XP required to BE this level. */
  xpToReach: number;
  /** Things this level turns on (display + gating). */
  unlocks: string[];
  /** Headline reward line shown in the level-up burst. */
  milestone: string;
  /** Ring color for the level badge. */
  color: string;
}

export interface XpGrant {
  source: XpSource;
  amount: number;
  /** Short reason, e.g. "Song went viral". */
  label: string;
  at: number;
}

export interface LevelUpResult {
  from: number;
  to: number;
  level: CareerLevel;
}

export interface AchievementSnapshot {
  fans: number;
  reputation: number;
  money: number;
  level: number;
  week: number;
  releasedTracks: number;
  viralTracks: number;
  number1s: number;
  controversiesSurvived: number;
  hottestRivalryIntensity: number;
}

export interface Achievement {
  id: string;
  name: string;
  /** What the player did to earn it. */
  description: string;
  /** Dopamine tier — drives badge color + burst intensity. */
  tier: 'bronze' | 'silver' | 'gold' | 'legendary';
  /** XP awarded when unlocked. */
  xp: number;
  /** Pure predicate over a snapshot. Data-driven, no side effects. */
  test: (s: AchievementSnapshot) => boolean;
  /** Hidden until earned (surprise spike). */
  secret?: boolean;
}

export type LiveNotificationKind =
  | 'level-up'
  | 'achievement'
  | 'energy-full'
  | 'away'
  | 'xp'
  | 'info';

export interface LiveNotification {
  id: string;
  kind: LiveNotificationKind;
  title: string;
  body: string;
  /** Accent color for the toast. */
  color: string;
  at: number;
}

/** A single relationship movement surfaced in the recap. */
export interface RecapRelationshipChange {
  name: string;
  delta: number;
  /** Relationship type after the nudge. */
  type: string;
}

/** A single stat movement surfaced in the recap. */
export interface RecapStatChange {
  stat: string;
  delta: number;
}

/**
 * The "this happened while you were gone" payload — the open-the-app hit.
 *
 * Sectioned recap: the world kept moving (`headlines`) AND your scheduled plan
 * executed (`planResults`/`earnings`/`statChanges`/`relationshipChanges`/
 * `unexpectedEvents`). Every value here is bounded and was already applied to
 * the sim by the live tick — the recap only narrates it.
 */
export interface AwayReport {
  /** Wall-clock ms the player was away. */
  awayMs: number;
  /** Capped, human-readable span, e.g. "6h 12m". */
  awaySpan: string;
  /** Punchy world headlines (rivals, trends, charts moving without you). */
  headlines: string[];
  /** Net fan delta the world generated passively while away. */
  fanDelta: number;
  /** Energy regenerated while away (0-100). */
  energyRegained: number;
  /** Fresh ambient posts the live world produced — prepended to the feed. */
  ambientPosts: SocialPost[];
  generatedAt: number;

  // ── Plan-driven recap sections (filled by the passive layer) ──────────────
  /** Slots the plan resolved across the absence. */
  resolvedSlots: number;
  /** Per-activity result lines, e.g. "Studio × 3 — sharpened your pen". */
  planResults: string[];
  /** Bounded passive earnings the plan produced. */
  earnings: number;
  /** Tiny stat nudges from the plan. */
  statChanges: RecapStatChange[];
  /** Relationship movements from networking/social slots. */
  relationshipChanges: RecapRelationshipChange[];
  /** Curiosity / unexpected-event headlines. */
  unexpectedEvents: string[];
}
