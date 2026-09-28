import type { AwayReport, RecapRelationshipChange } from '../../types/progression';
import type { PlanOutcome } from '../../types/passive';
import type { WorldDigest } from '../live/awaySimulation';

/**
 * Assembles the sectioned "while you were away" recap from the world digest
 * (rivals/trends/ambient posts) and the resolved plan outcome (earnings, stat
 * nudges, relationship moves, curiosity). Pure formatting — every value here
 * was already produced and bounded upstream; this only narrates it. Returns the
 * final plan-modulated fan delta separately so the live tick can apply it.
 */

export interface RecapInput {
  world: WorldDigest;
  outcome: PlanOutcome;
  /** Net energy change while away (wall-clock regen + plan rest/grind nudge). */
  energyChange: number;
}

export interface RecapResult {
  report: AwayReport;
  finalFanDelta: number;
}

export function buildAwayReport({ world, outcome, energyChange }: RecapInput): RecapResult {
  const finalFanDelta = Math.round(world.baseFanDelta * outcome.fanDriftMult);

  const headlines = [...world.headlines];
  if (finalFanDelta > 0) {
    headlines.push(
      `Your fanbase grew by ${finalFanDelta.toLocaleString()} while you were gone.`
    );
  } else if (finalFanDelta < 0) {
    headlines.push(
      `You lost ${Math.abs(finalFanDelta).toLocaleString()} fans to the silence.`
    );
  }

  const relationshipChanges: RecapRelationshipChange[] = outcome.affinityChanges.map(
    (a) => ({
      name: a.name,
      delta: a.delta,
      type: a.delta >= 0 ? 'warmer' : 'cooler',
    })
  );

  const report: AwayReport = {
    awayMs: world.awayMs,
    awaySpan: world.awaySpan,
    headlines,
    fanDelta: finalFanDelta,
    energyRegained: energyChange,
    ambientPosts: world.ambientPosts,
    generatedAt: Date.now(),
    resolvedSlots: outcome.resolvedSlots,
    planResults: outcome.planResults,
    earnings: outcome.earnings,
    statChanges: outcome.statChanges.map((s) => ({
      stat: String(s.stat),
      delta: s.delta,
    })),
    relationshipChanges,
    unexpectedEvents: outcome.curiosity.map((c) => c.headline),
  };

  return { report, finalFanDelta };
}
