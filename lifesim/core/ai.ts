/**
 * Free will — the smart-object advertisement auction. Objects (and other
 * sims) broadcast motive payoffs; an idle sim scores every advert by
 * quadratic desperation × personality × distance (+ fuzz) and either commits
 * or idles. The intelligence lives in the objects, not the people.
 */

import type { Lot, Sim, World } from './types';
import { newId } from './types';
import { getDef, type ObjectInteraction } from '../data/catalog';
import { SOCIALS, CHILD_SOCIAL_IDS, type SocialDef } from '../data/socials';
import {
  ADVERT_FALLOFF,
  AUTONOMY_BASE_THRESHOLD,
  AUTONOMY_FUZZ,
} from '../data/tuning';
import { rand } from './rng';
import { dist } from './grid';
import { interactionAvailable } from './interactions';
import { socialAvailable, relationshipOf } from './social';

interface Candidate {
  score: number;
  enqueue: () => void;
}

/** 0 when the motive is full, 1 at rock bottom — squared for urgency. */
function desperation(motiveValue: number): number {
  const deficit = (100 - motiveValue) / 200;
  return deficit * deficit;
}

function traitMult(sim: Sim, inter: { trait?: string; traitWeight?: number }): number {
  if (!inter.trait || !inter.traitWeight) return 1;
  const t = sim.personality[inter.trait as keyof Sim['personality']] ?? 5;
  return Math.max(0.2, 1 + ((t - 5) / 5) * inter.traitWeight * 0.6);
}

export function autonomyChoose(world: World, sim: Sim): void {
  if (world.autonomy <= 0) return;
  if (sim.queue.length > 0 || sim.action) return;
  const lot = sim.lotId ? world.lots[sim.lotId] : null;
  if (!lot) return;

  const candidates: Candidate[] = [];

  // ── Object adverts ────────────────────────────────────────────────────────
  for (const objId in lot.objects) {
    const obj = lot.objects[objId];
    if (obj.carriedBy) continue;
    const def = getDef(obj.defId);
    for (const inter of def.interactions) {
      if (!inter.autonomous || !inter.advertises?.length) continue;
      if (interactionAvailable(world, sim, obj, inter) !== null) continue;
      let score = 0;
      for (const ad of inter.advertises) {
        const quality = def.quality ?? 1;
        const qualScale = ad.motive === 'room' ? 1 : 0.8 + quality * 0.2;
        score +=
          ad.value * qualScale * desperation(sim.motives[ad.motive]) *
          traitMult(sim, ad);
      }
      score *= 1 / (1 + dist(sim.pos, obj) * ADVERT_FALLOFF);
      score += rand(world) * AUTONOMY_FUZZ;
      if (score <= 0) continue;
      candidates.push({
        score,
        enqueue: () => {
          sim.queue.push({
            id: newId(world, 'act'),
            kind: 'object',
            label: inter.label,
            icon: inter.icon,
            objectId: obj.id,
            interactionId: inter.id,
            auto: true,
          });
        },
      });
    }

    // Crib: a hungry/lonely baby shouts louder than any appliance.
    if (def.id === 'crib' && obj.data.babyId && sim.age === 'adult') {
      const baby = world.sims[obj.data.babyId as string];
      if (baby && !baby.dead) {
        const care: { inter: string; motive: 'hunger' | 'social' | 'energy'; label: string; icon: string }[] = [
          { inter: 'feed_baby', motive: 'hunger', label: 'Feed Baby', icon: '🍼' },
          { inter: 'play_baby', motive: 'social', label: 'Play With Baby', icon: '🧸' },
        ];
        for (const c of care) {
          const need = Math.max(0, -baby.motives[c.motive]) / 100;
          if (need <= 0.1) continue;
          const score =
            need * 90 * (0.7 + sim.personality.nice * 0.06) +
            rand(world) * AUTONOMY_FUZZ;
          candidates.push({
            score,
            enqueue: () => {
              sim.queue.push({
                id: newId(world, 'act'),
                kind: 'object',
                label: c.label,
                icon: c.icon,
                objectId: obj.id,
                interactionId: c.inter,
                auto: true,
              });
            },
          });
        }
      }
    }
  }

  // ── Social adverts (the other sim is the object) ──────────────────────────
  for (const otherId in world.sims) {
    const other = world.sims[otherId];
    if (other.id === sim.id || other.dead || other.ghost) continue;
    if (other.lotId !== sim.lotId || other.asleep || other.age === 'baby') continue;
    if (other.npc && other.npc !== undefined) continue; // don't chat up the reaper
    if (other.career?.atWork) continue;

    const rel = relationshipOf(sim, other.id);
    const warmth = 0.5 + ((rel.daily + 100) / 200) * 0.8;
    const socialIds = sim.age === 'child' ? CHILD_SOCIAL_IDS : Object.keys(SOCIALS);
    let best: SocialDef | null = null;
    let bestScore = 0;
    for (const sid of socialIds) {
      const def = SOCIALS[sid];
      if (!def.autonomous || def.advertValue <= 0) continue;
      if (socialAvailable(world, sim, other, def) !== null) continue;
      let score =
        def.advertValue * desperation(sim.motives.social) * warmth;
      if (def.traitBias) {
        const t = sim.personality[def.traitBias.trait];
        score *= Math.max(0.2, 1 + ((t - 5) / 5) * def.traitBias.weight * 0.6);
      }
      if (def.mean && sim.personality.nice > 5) score *= 0.2;
      if (score > bestScore) {
        bestScore = score;
        best = def;
      }
    }
    if (best) {
      const finalScore =
        bestScore * (1 / (1 + dist(sim.pos, other.pos) * ADVERT_FALLOFF)) +
        rand(world) * AUTONOMY_FUZZ;
      const chosen = best;
      candidates.push({
        score: finalScore,
        enqueue: () => {
          sim.queue.push({
            id: newId(world, 'act'),
            kind: 'social',
            label: `${chosen.label}: ${other.name.split(' ')[0]}`,
            icon: chosen.icon,
            targetSimId: other.id,
            socialId: chosen.id,
            auto: true,
          });
        },
      });
    }
  }

  if (candidates.length === 0) return;
  candidates.sort((a, b) => b.score - a.score);
  const threshold = AUTONOMY_BASE_THRESHOLD * (1.5 - world.autonomy / 100);
  if (candidates[0].score < threshold) return; // idle: fidget, exist quietly
  candidates[0].enqueue();
}
