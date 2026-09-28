# Away-Simulation Engine & Recap Generation

> Deliverables 2 & 3 of the brief. How the scheduled plan executes while the
> player is gone, and how the return is turned into a satisfying recap.

## The decorator contract (non-negotiable)

The deterministic **weekly** sim (`systems/weekEngine.ts`) owns every real
mechanical outcome. The away layer is a **decorator**: it only adds *bounded,
openly-reported* deltas (capped passive earnings, tiny stat/relationship nudges,
fan drift, XP) plus flavor. Deleting `systems/passive/*` changes zero core
mechanics. It NEVER runs the weekly tick and never produces a large jump.

## Heartbeat

`systems/live/liveTick.ts#runLiveResume` fires on app focus (mount +
AppState `active`), mounted once in `app/(game)/_layout.tsx` via
`hooks/useLiveResume`. On each resume:

1. `reconcileEnergy(now)` — wall-clock energy regen (unchanged Phase 6 behavior).
2. If `awayMs ≥ AWAY_REPORT_MIN_MS` (12 min): resolve the plan, simulate the
   world, apply bounded deltas, build the recap, freshen the feed.
3. `markSeen(now)` + persist.

## Plan resolution (`systems/passive/planEngine.ts`)

`resolvePlan(player, plan, awayMs, ctx)` is **pure** — it returns deltas; the
tick applies them. Algorithm:

- `resolvedSlots = min(floor(awayMs / SLOT_MS), MAX_RESOLVED_SLOTS)` — a week
  offline pays out the same capped amount as ~12 slots (≈3 planned days).
- Walk the plan, cycling slots. Each non-empty slot rolls its activity's
  per-slot effect ranges (money, stat nudges, energy, affinity, XP, fan-drift
  multiplier). Activities boosted by a **live scheduled/community event** get a
  1.35× bump.
- Fold in **curiosity** (below).
- **Clamp every channel** against `constants/passiveConfig.ts`:
  `MAX_EARN_PER_RESUME`, `MAX_STAT_NUDGE`, `MAX_PASSIVE_XP`, `MAX_AFFINITY_NUDGE`,
  fan-drift to `[0.8, 2.0]`. (Unit-tested over 1000 randomized runs.)

The tick then applies: `addMoney`, `updateStats`, `setStatDirect('energy')`,
`relationshipStore.updateAffinity`, and `awardXp` (at the resolved-outcome site,
never predictively) — exactly the existing dopamine-spine plumbing.

## Curiosity & evolving storylines (`systems/passive/curiosityEngine.ts`)

The "you'll never guess what happened" layer. Weighted by what was scheduled
(`data/passive/curiosityEvents.ts`), it rolls bounded one-shot beats (a DJ spins
your track, a stylist DMs you, a clip resurfaces) and seeds **multi-step
storylines** (The Co-Sign, The Blind Item) that advance across resumes via
`planStore.storylines`. All effects are bounded and folded into the same clamps.

## Scheduled events (`systems/passive/scheduledEvents.ts`)

A recurring world calendar (`data/passive/scheduledEvents.ts`) projected against
the wall clock, anchored to `player.createdAt`. Drop Day, Festival Season,
Algorithm Surge, Awards Buzz Week. Scheduling the matching activity during a
live window earns the boost. Missing one is never punished — it cycles back.

## World half (`systems/live/awaySimulation.ts`)

`simulateWorld(player, awayMs, week)` returns a `WorldDigest`: rival/trend/chart
headlines + ambient feed posts + the **base** passive fan drift (loyalty- and
reputation-weighted, capped at `AWAY_SIM_CAP_MS`). The plan's `fanDriftMult`
modulates the final delta.

## Recap assembly (`systems/passive/recapEngine.ts`)

`buildAwayReport({ world, outcome, energyChange })` merges the two halves into a
sectioned `AwayReport` (`types/progression.ts`) and returns the final
plan-modulated fan delta for the tick to apply. Sections:

- **Stats row** — fans Δ, earnings, net energy Δ.
- **Your Days** — per-activity result lines ("Studio × 3 — sharpened your craft").
- **Unexpected** — curiosity headlines + storyline beats.
- **Relationships** — affinity moves (name, ±delta, warmer/cooler).
- **The World** — rival/trend/chart headlines + the fan-delta line.

Rendered by `components/live/AwayReportModal.tsx` as a scrollable sheet with one
"Catch Up" CTA. A premium *recap-flair* convenience adds a purely cosmetic gold
theme — it never changes the content.

## First-session safety

`weekEngine.initializeFirstWeek` anchors both `liveStore.lastSeenAt` and
`planStore.lastResolvedAt` to `now`, so a brand-new career never opens with a
fake "while you were away".

## Tuning knobs

All in `constants/passiveConfig.ts`: `SLOTS_PER_DAY`, `SLOT_MS`,
`MAX_RESOLVED_SLOTS`, the per-channel caps, and curiosity rates. Change tuning
without touching engine logic.
