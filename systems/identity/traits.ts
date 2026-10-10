import type { TraitDef, TraitEffects } from '../../types/identity';
import type { ActivityCategory } from '../../types/life';
import { getTrait } from '../../data/identity/traits';
import { useGameStore } from '../../store/gameStore';
import { traitTag, traitsFromTags } from './traitTags';

/**
 * Traits live in the game store's tags as `trait:<id>`, so event triggers
 * (`has_tag`), choice gates and everything that already reads tags sees them.
 * This module is the one place that knows the prefix.
 */

export { TRAIT_PREFIX, traitTag, traitsFromTags } from './traitTags';

export function heldTraits(): string[] {
  return traitsFromTags(useGameStore.getState().playerTags);
}

export function hasTrait(id: string, tags: readonly string[] = useGameStore.getState().playerTags): boolean {
  return tags.includes(traitTag(id));
}

export function heldTraitDefs(tags: readonly string[] = useGameStore.getState().playerTags): TraitDef[] {
  return traitsFromTags(tags)
    .map((id) => getTrait(id))
    .filter((t): t is TraitDef => !!t);
}

/**
 * Give the artist a trait. Conflicting traits are dropped (earning Sober
 * ends Party Animal). Returns false when they already had it.
 */
export function grantTrait(id: string): boolean {
  const def = getTrait(id);
  const game = useGameStore.getState();
  if (!def || game.playerTags.includes(traitTag(id))) return false;
  for (const c of def.conflicts ?? []) game.removeTag(traitTag(c));
  // Conflicts are declared one way in places; honor both directions.
  for (const held of traitsFromTags(useGameStore.getState().playerTags)) {
    if (getTrait(held)?.conflicts?.includes(id)) game.removeTag(traitTag(held));
  }
  useGameStore.getState().addTag(traitTag(id));
  return true;
}

export function removeTrait(id: string): void {
  useGameStore.getState().removeTag(traitTag(id));
}

/** Sum of every held trait's effects. Pure over the given tags. */
export function sumTraitEffects(tags: readonly string[]): Required<
  Pick<TraitEffects, 'criticsBonus' | 'showBonus' | 'extraActivities' | 'awardsBonus' | 'warBonus'>
> & {
  streamsMult: number;
  arrestRisk: number;
  activityTilt: Partial<Record<ActivityCategory, number>>;
  weeklyMental: NonNullable<TraitEffects['weeklyMental']>;
  weeklyStats: NonNullable<TraitEffects['weeklyStats']>;
} {
  const out = {
    criticsBonus: 0,
    showBonus: 0,
    extraActivities: 0,
    awardsBonus: 0,
    warBonus: 0,
    streamsMult: 1,
    arrestRisk: 1,
    activityTilt: {} as Partial<Record<ActivityCategory, number>>,
    weeklyMental: {} as NonNullable<TraitEffects['weeklyMental']>,
    weeklyStats: {} as NonNullable<TraitEffects['weeklyStats']>,
  };
  for (const def of heldTraitDefs(tags)) {
    const e = def.effects;
    out.criticsBonus += e.criticsBonus ?? 0;
    out.showBonus += e.showBonus ?? 0;
    out.extraActivities += e.extraActivities ?? 0;
    out.awardsBonus += e.awardsBonus ?? 0;
    out.warBonus += e.warBonus ?? 0;
    out.streamsMult *= e.streamsMult ?? 1;
    out.arrestRisk *= e.arrestRisk ?? 1;
    for (const [k, v] of Object.entries(e.activityTilt ?? {})) {
      const key = k as ActivityCategory;
      out.activityTilt[key] = (out.activityTilt[key] ?? 0) + (v ?? 0);
    }
    for (const [k, v] of Object.entries(e.weeklyMental ?? {})) {
      const key = k as keyof typeof out.weeklyMental;
      out.weeklyMental[key] = (out.weeklyMental[key] ?? 0) + (v ?? 0);
    }
    for (const [k, v] of Object.entries(e.weeklyStats ?? {})) {
      const key = k as keyof typeof out.weeklyStats;
      out.weeklyStats[key] = (out.weeklyStats[key] ?? 0) + (v ?? 0);
    }
  }
  return out;
}

/** The live artist's summed trait effects. */
export function traitEffects() {
  return sumTraitEffects(useGameStore.getState().playerTags);
}
