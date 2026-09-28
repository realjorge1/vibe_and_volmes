/**
 * Real-time "living world" tuning. The weekly sim is unchanged; this layer
 * runs on a wall clock the moment the app regains focus.
 */
export const LIVE_CONFIG = {
  /** Full 0→100 energy recharge time. ~5 hours, per the brief. */
  ENERGY_FULL_RECHARGE_MS: 5 * 60 * 60 * 1000,
  ENERGY_MAX: 100,

  /**
   * Only narrate "while you were away" once the player has actually been
   * gone a meaningful beat. Below this it's just an app re-focus.
   */
  AWAY_REPORT_MIN_MS: 12 * 60 * 1000, // 12 minutes

  /**
   * The world keeps moving while you're gone, but it doesn't run away
   * from you — passive drift is capped at this much elapsed time.
   */
  AWAY_SIM_CAP_MS: 18 * 60 * 60 * 1000, // 18 hours of effective drift

  /** Ambient posts injected at the top of the feed per away report. */
  AWAY_AMBIENT_POSTS_MIN: 3,
  AWAY_AMBIENT_POSTS_MAX: 6,

  /**
   * The *living world* (NPC life engine) keeps simulating while you're gone.
   * This much real time maps to one in-world week of idle catch-up, so coming
   * back after a while genuinely moves rivals, relationships and trends.
   */
  AWAY_WORLD_WEEK_MS: 6 * 60 * 60 * 1000, // ~6h away ≈ one world week
  /**
   * Cap on how many weeks the world advances per return: a long absence should
   * evolve the world meaningfully without making it unrecognizable.
   */
  AWAY_WORLD_WEEKS_MAX: 8,

  /** Passive fan drift the world generates, per effective hour away. */
  PASSIVE_FAN_PER_HOUR_BASE: 14,

  /** Toasts auto-expire after this long on screen. */
  NOTIFICATION_TTL_MS: 6500,
  /** Hard cap on the visible toast stack. */
  NOTIFICATION_MAX: 6,
} as const;
