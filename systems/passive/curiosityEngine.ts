import type {
  ActivityId,
  ActivityEffect,
  CuriosityResult,
  Storyline,
} from '../../types/passive';
import {
  CURIOSITY_EVENTS,
  STORYLINE_STEPS,
  getCuriosityEvent,
} from '../../data/passive/curiosityEvents';
import { getActivity } from '../../data/passive/activities';
import { PASSIVE_CONFIG } from '../../constants/passiveConfig';
import { chance, weightedPick } from '../../utils/random';

/**
 * The surprise layer. Given what the player scheduled, this rolls bounded
 * "unexpected events" and advances multi-step storylines across resumes. Pure:
 * it returns the headlines, the one-shot effect deltas to fold into the plan
 * outcome, and the updated storyline list. It never touches stores.
 */

export interface CuriosityRoll {
  results: CuriosityResult[];
  effects: ActivityEffect[];
  storylines: Storyline[];
}

interface CuriosityInput {
  slotCounts: Partial<Record<ActivityId, number>>;
  artistName: string;
  storylines: Storyline[];
  now: number;
}

function fill(tpl: string, name: string): string {
  return tpl.replace(/\{name\}/g, name);
}

function storylineCooldown(defId: string): number {
  return getCuriosityEvent(defId)?.storyline?.cooldownMs ?? 6 * 60 * 60 * 1000;
}

/** Advance in-flight storylines whose next step is due. */
function advanceStorylines(
  storylines: Storyline[],
  now: number,
  budget: number,
  results: CuriosityResult[]
): { remaining: Storyline[]; used: number } {
  let used = 0;
  const remaining: Storyline[] = [];
  for (const sl of storylines) {
    if (used < budget && now >= sl.nextEligibleAt) {
      const line = (STORYLINE_STEPS[sl.defId] ?? [])[sl.step - 1];
      if (line) {
        results.push({ id: `${sl.id}-${sl.step}`, headline: `${sl.title}: ${line}` });
        used++;
        const nextStep = sl.step + 1;
        if (nextStep <= sl.steps) {
          remaining.push({
            ...sl,
            step: nextStep,
            nextEligibleAt: now + storylineCooldown(sl.defId),
          });
        }
        // else: storyline complete → dropped.
        continue;
      }
    }
    remaining.push(sl);
  }
  return { remaining, used };
}

export function rollCuriosity(input: CuriosityInput): CuriosityRoll {
  const { slotCounts, artistName, storylines, now } = input;
  const results: CuriosityResult[] = [];
  const effects: ActivityEffect[] = [];

  // 1. Advance existing storylines first (they get recap priority).
  const advanced = advanceStorylines(
    storylines,
    now,
    PASSIVE_CONFIG.CURIOSITY_MAX_PER_RESUME,
    results
  );
  let outStorylines = advanced.remaining;
  let budget = PASSIVE_CONFIG.CURIOSITY_MAX_PER_RESUME - advanced.used;

  // 2. Roll fresh curiosity beats, weighted by what was scheduled.
  const scheduled = new Set(Object.keys(slotCounts) as ActivityId[]);
  let propensity = 0;
  for (const id of scheduled) {
    propensity += (getActivity(id)?.effect.curiosityWeight ?? 0) * (slotCounts[id] ?? 0);
  }
  const points = Math.min(Math.round(propensity), 18);

  const seededDefs = new Set(outStorylines.map((s) => s.defId));
  for (let i = 0; i < points && budget > 0; i++) {
    if (!chance(PASSIVE_CONFIG.CURIOSITY_BASE_CHANCE)) continue;
    const pool = CURIOSITY_EVENTS.filter(
      (e) =>
        (e.favoredBy.length === 0 || e.favoredBy.some((a) => scheduled.has(a))) &&
        !(e.storyline && seededDefs.has(e.id))
    );
    const ev = weightedPick(pool);
    if (!ev) continue;

    results.push({
      id: `${ev.id}-${now}-${i}`,
      headline: fill(ev.headlines[Math.floor(Math.random() * ev.headlines.length)], artistName),
    });
    if (ev.effect) effects.push(ev.effect);
    budget--;

    if (ev.storyline) {
      seededDefs.add(ev.id);
      outStorylines = [
        ...outStorylines,
        {
          id: `sl-${ev.id}-${now}`,
          defId: ev.id,
          title: ev.storyline.title,
          step: 1,
          steps: ev.storyline.steps,
          nextEligibleAt: now + ev.storyline.cooldownMs,
        },
      ];
    }
  }

  return { results, effects, storylines: outStorylines };
}
