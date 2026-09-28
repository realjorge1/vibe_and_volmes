import type { ActivityId } from '../../types/passive';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useSocialStore } from '../../store/socialStore';
import { useLiveStore } from '../../store/liveStore';
import { usePlanStore } from '../../store/planStore';
import { useRelationshipStore } from '../../store/relationshipStore';
import { useProgressionStore } from '../../store/progressionStore';
import { useWorldStore } from '../../store/worldStore';
import { LIVE_CONFIG } from '../../constants/liveConfig';
import { reconcileEnergy } from './energySystem';
import { simulateWorld } from './awaySimulation';
import { resolvePlan } from '../passive/planEngine';
import { buildAwayReport } from '../passive/recapEngine';
import { liveScheduledBoosts } from '../passive/scheduledEvents';
import { communityBoostActivities } from '../community';
import { awardXp, checkAchievements } from '../progression/xpEngine';
import { grantPremiumCurrency } from '../premium/premiumEngine';
import { awardSeasonXp } from '../premium/seasonPass';

/**
 * The real-time heartbeat. Called when the app gains focus (mount + AppState
 * 'active'). It makes the world feel like it kept living: energy regenerates on
 * a wall clock, your scheduled daily plan executes, and — if you were gone long
 * enough — a sectioned "while you were away" recap is staged and the feed is
 * freshened.
 *
 * Decorator-safe: every mechanical delta it applies (passive earnings, tiny
 * stat/relationship nudges, fan drift, XP) is bounded by the plan engine and
 * openly reported in the recap. It never runs the weekly tick.
 */
export function runLiveResume(now = Date.now()): void {
  const player = usePlayerStore.getState().player;
  const live = useLiveStore.getState();

  if (!player) {
    live.markSeen(now);
    return;
  }

  const awayMs = Math.max(0, now - live.lastSeenAt);
  const regained = reconcileEnergy(now);

  if (awayMs >= LIVE_CONFIG.AWAY_REPORT_MIN_MS) {
    const week = useGameStore.getState().week;
    const plan = usePlanStore.getState();
    const rel = useRelationshipStore.getState();

    // Build the resolve context: who can be warmed up, what's boosted now.
    const knownArtists = rel.knownArtists.map((a) => ({ id: a.id, name: a.name }));
    const boostActivities = new Set<ActivityId>([
      ...liveScheduledBoosts(player.createdAt, now),
      ...communityBoostActivities(),
    ]);
    const planAwayMs = Math.max(0, now - plan.lastResolvedAt);

    // Resolve the plan (pure) and advance the *real* living world by the weeks
    // that elapsed while away (capped), so rivals/relationships/trends actually
    // moved. Those real stories drive the report; a short absence (< a world
    // week) falls back to ambient flavor.
    const { outcome, storylines } = resolvePlan(player, plan.plan, planAwayMs, {
      knownArtists,
      storylines: plan.storylines,
      boostActivities,
      now,
    });
    const worldStore = useWorldStore.getState();
    const awayWeeks = Math.min(
      LIVE_CONFIG.AWAY_WORLD_WEEKS_MAX,
      Math.floor(awayMs / LIVE_CONFIG.AWAY_WORLD_WEEK_MS)
    );
    const liveEvents =
      awayWeeks > 0 ? worldStore.advanceWeeks(awayWeeks) : worldStore.recentEvents(12);
    const world = simulateWorld(player, awayMs, week, liveEvents);

    // Apply the bounded plan deltas to the sim.
    if (outcome.earnings > 0) usePlayerStore.getState().addMoney(outcome.earnings);
    if (outcome.statChanges.length > 0) {
      usePlayerStore.getState().updateStats(outcome.statChanges);
    }
    let energyChange = regained;
    if (outcome.energyDelta !== 0) {
      const cur = usePlayerStore.getState().player!.stats.energy;
      usePlayerStore.getState().setStatDirect('energy', cur + outcome.energyDelta);
      energyChange = regained + outcome.energyDelta;
    }
    for (const a of outcome.affinityChanges) rel.updateAffinity(a.artistId, a.delta);
    for (const g of outcome.xpGrants) awardXp(g.source, g.amount, g.label);

    // Merge into the sectioned recap; apply the plan-modulated fan drift.
    const { report, finalFanDelta } = buildAwayReport({ world, outcome, energyChange });
    if (finalFanDelta !== 0) {
      const nextFans = Math.max(
        0,
        usePlayerStore.getState().player!.stats.fans + finalFanDelta
      );
      usePlayerStore.getState().setStatDirect('fans', nextFans);
    }

    // Freshen the feed so the first thing you see is the world reacting.
    const social = useSocialStore.getState();
    if (report.ambientPosts.length > 0) {
      social.setFeed([...report.ambientPosts, ...social.feed].slice(0, 60));
      social.addToHistory(report.ambientPosts);
    }

    // Earnable premium currency + season XP — the come-back-tomorrow reward
    // loop, all on the decorator side (never gates or shortcuts the sim).
    if (outcome.resolvedSlots > 0) {
      grantPremiumCurrency(Math.min(15, outcome.resolvedSlots * 2));
      awardSeasonXp(outcome.resolvedSlots * 6 + outcome.curiosity.length * 10);
    }

    // Persist plan progress (advanced storylines + resolve baseline).
    plan.setStorylines(storylines);
    plan.markResolved(now);

    live.setAwayReport(report);
  }

  // Passive drift may have crossed an achievement threshold.
  checkAchievements();

  live.markSeen(now);

  // Persist the live layer + anything it nudged.
  usePlayerStore.getState().save();
  useSocialStore.getState().save();
  useLiveStore.getState().save();
  usePlanStore.getState().save();
  useWorldStore.getState().saveWorld();
}

/** Lightweight tick for periodic in-session refresh (energy only). */
export function runLivePoll(now = Date.now()): void {
  if (!usePlayerStore.getState().player) return;
  reconcileEnergy(now);
}
