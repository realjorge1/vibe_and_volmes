import type { Seed, SeedPlant } from '../../types/identity';
import type { EventTrigger, GameEvent } from '../../types/events';

/**
 * Seeds: choices that come back. Pure.
 *
 * An outcome can plant a seed ("you lent Dre $500"). After a while the seed
 * ripens, and callback events whose `seed_ripe` trigger names its kind become
 * eligible. When one is slated it binds the seed (its name fills `{seed}`,
 * its memory shows on the card), and resolving the event consumes it. A seed
 * nobody paid off is forgotten after its window closes.
 */

/** How long a ripe seed waits for its payoff before it is forgotten. */
export const SEED_WINDOW_WEEKS = 30;

let seedCounter = 0;

export function makeSeed(plant: SeedPlant, week: number, rng: () => number = Math.random): Seed {
  const [min, max] = plant.after;
  const wait = Math.max(1, Math.round(min + rng() * Math.max(0, max - min)));
  seedCounter = (seedCounter + 1) % 1_000_000;
  return {
    id: `seed-${week}-${Date.now().toString(36)}-${seedCounter}`,
    kind: plant.kind,
    plantedWeek: week,
    ripeWeek: week + wait,
    expiresWeek: week + wait + SEED_WINDOW_WEEKS,
    name: plant.name,
    npcId: plant.npcId,
    personId: plant.personId,
    rivalId: plant.rivalId,
    note: plant.note,
  };
}

export function isRipe(seed: Seed, week: number): boolean {
  return week >= seed.ripeWeek && week < seed.expiresWeek;
}

/** Seeds still worth keeping (not past their window). */
export function liveSeeds(seeds: Seed[], week: number): Seed[] {
  return seeds.filter((s) => week < s.expiresWeek);
}

function seedTrigger(event: GameEvent): EventTrigger | undefined {
  return event.triggers.find((t) => t.type === 'seed_ripe');
}

/**
 * The seed an event would pay off: the oldest ripe seed of the trigger's
 * kind, filtered by where its world NPC's career is now when the trigger
 * asks (the opener you ghosted is a star now / still nobody).
 */
export function seedForTrigger(
  trigger: EventTrigger,
  seeds: Seed[],
  week: number,
  npcStageOf: (npcId: string) => string | undefined
): Seed | null {
  const matching = seeds
    .filter((s) => s.kind === trigger.seed && isRipe(s, week))
    .filter((s) => {
      if (!trigger.npcStages || trigger.npcStages.length === 0) return true;
      if (!s.npcId) return false;
      const stage = npcStageOf(s.npcId);
      return !!stage && trigger.npcStages.includes(stage);
    })
    .sort((a, b) => a.plantedWeek - b.plantedWeek);
  return matching[0] ?? null;
}

export function seedForEvent(
  event: GameEvent,
  seeds: Seed[],
  week: number,
  npcStageOf: (npcId: string) => string | undefined
): Seed | null {
  const t = seedTrigger(event);
  return t ? seedForTrigger(t, seeds, week, npcStageOf) : null;
}
