/**
 * Passive scheduling tuning — the "life happens while you're away" layer.
 *
 * This is a DECORATOR over the weekly deterministic sim (see systems/weekEngine).
 * Everything here is bounded and openly reported in the recap; it never runs the
 * weekly tick and never produces a large mechanical jump. The sim is week-based;
 * a "day"/"slot" exists only as a real-time unit for this scheduling layer.
 */
export const PASSIVE_CONFIG = {
  /** Slots in one planned day. The plan repeats while you're away. */
  SLOTS_PER_DAY: 4,

  /**
   * Real wall-clock time one scheduled slot represents. 4 slots × 1.5h = a
   * 6-hour "day", so a full plan resolves a couple of times across a normal
   * overnight absence — enough to feel alive without running away from you.
   */
  SLOT_MS: 90 * 60 * 1000, // 1.5h per slot

  /**
   * Hard cap on how many slots a single absence can resolve, no matter how
   * long you were gone. Mirrors LIVE_CONFIG.AWAY_SIM_CAP_MS in spirit: a week
   * offline pays out the same bounded amount as ~12 slots (≈3 planned days).
   */
  MAX_RESOLVED_SLOTS: 12,

  /** Minimum resolved slots before the recap bothers showing plan results. */
  MIN_SLOTS_FOR_RECAP: 1,

  // ── Per-slot bounded outcome caps (the anti-runaway guardrails) ──────────
  /** Hard ceiling on passive earnings from one resolved slot. */
  MAX_EARN_PER_SLOT: 1_400,
  /** Hard ceiling on total passive earnings from one absence. */
  MAX_EARN_PER_RESUME: 9_000,
  /** Max absolute 0-100 stat nudge from one absence (per stat). */
  MAX_STAT_NUDGE: 4,
  /** Max relationship affinity nudge from one absence (per artist). */
  MAX_AFFINITY_NUDGE: 6,
  /** Max passive XP awarded from one absence (keeps the plan from out-earning play). */
  MAX_PASSIVE_XP: 220,

  // ── Curiosity / unexpected events ────────────────────────────────────────
  /** Base chance per resolved slot that a curiosity beat fires. */
  CURIOSITY_BASE_CHANCE: 0.16,
  /** Max curiosity events surfaced in a single recap. */
  CURIOSITY_MAX_PER_RESUME: 3,

  // ── Premium currency (cosmetic-only economy; never buys power) ───────────
  /** Name shown in the store wallet. */
  PREMIUM_CURRENCY_NAME: 'Vibes',
  /** Free grant the very first time the account is created. */
  PREMIUM_STARTER_GRANT: 250,
} as const;
