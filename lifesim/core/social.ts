/**
 * Social resolution: acceptance rolls against relationship + mood +
 * personality + zodiac chemistry, the two-track relationship model
 * (daily decays, lifetime endures), jealousy cascades, move-in proposals,
 * and the baby prompt.
 */

import type { Relationship, Sim, World } from './types';
import { clampMotive, newId } from './types';
import { SOCIALS, CHILD_SOCIAL_IDS, type SocialDef } from '../data/socials';
import {
  ENEMY_THRESHOLD,
  FRIEND_THRESHOLD,
  JEALOUSY_DAILY_HIT,
  LOVE_THRESHOLD,
  REL_DECAY_PER_DAY,
} from '../data/tuning';
import { chance, rand } from './rng';
import { zodiacChemistry } from './sim';
import { setThought } from './sim';
import { logMsg, pushDialog } from './log';
import { THOUGHT } from '../data/names';
import { finishAction } from './interactions';
import { placeObject, findObjects, spawnProp } from './grid';
import { createSim } from './sim';

// ─── Relationship plumbing ──────────────────────────────────────────────────

export function relationshipOf(sim: Sim, otherId: string): Relationship {
  let rel = sim.relationships[otherId];
  if (!rel) {
    rel = { daily: 0, lifetime: 0, friend: false, love: false, enemy: false, lastDay: 0 };
    sim.relationships[otherId] = rel;
  }
  return rel;
}

function applyDelta(sim: Sim, otherId: string, daily: number, lifetime: number, day: number): void {
  const rel = relationshipOf(sim, otherId);
  rel.daily = Math.max(-100, Math.min(100, rel.daily + daily));
  rel.lifetime = Math.max(-100, Math.min(100, rel.lifetime + lifetime));
  rel.lastDay = day;
  // Hysteresis so friendships don't flicker at the boundary.
  if (rel.daily >= FRIEND_THRESHOLD) rel.friend = true;
  else if (rel.daily < FRIEND_THRESHOLD - 15) rel.friend = false;
  if (rel.daily <= ENEMY_THRESHOLD) rel.enemy = true;
  else if (rel.daily > ENEMY_THRESHOLD + 15) rel.enemy = false;
}

/** Friendships require maintenance — the career friend-count treadmill. */
export function dailyRelationshipDecay(world: World): void {
  for (const simId in world.sims) {
    const sim = world.sims[simId];
    for (const otherId in sim.relationships) {
      const rel = sim.relationships[otherId];
      if (rel.lastDay < world.day - 1) {
        if (rel.daily > 0) rel.daily = Math.max(0, rel.daily - REL_DECAY_PER_DAY);
        else if (rel.daily < 0) rel.daily = Math.min(0, rel.daily + REL_DECAY_PER_DAY);
        if (rel.daily < FRIEND_THRESHOLD - 15) rel.friend = false;
      }
    }
  }
}

export function householdFriendCount(world: World, householdId: string): number {
  const hh = world.households[householdId];
  if (!hh) return 0;
  const counted = new Set<string>();
  for (const simId of hh.simIds) {
    const sim = world.sims[simId];
    if (!sim) continue;
    for (const otherId in sim.relationships) {
      const other = world.sims[otherId];
      if (!other || other.dead || other.householdId === householdId) continue;
      if (sim.relationships[otherId].friend) counted.add(otherId);
    }
  }
  return counted.size;
}

// ─── Menu availability ──────────────────────────────────────────────────────

export function socialAvailable(
  world: World,
  actor: Sim,
  target: Sim,
  def: SocialDef
): string | null {
  if (target.dead || target.ghost) return 'Gone';
  if (target.age === 'baby') return 'Too small';
  if (target.npc) return 'On duty';
  if (target.career?.atWork) return 'At work';
  if (target.asleep && def.id !== 'greet') return 'Asleep';
  if (def.adultOnly && (actor.age !== 'adult' || target.age !== 'adult')) return 'Adults only';
  if (actor.age === 'child' && !CHILD_SOCIAL_IDS.includes(def.id)) return 'Kids-only menu';
  if (def.gate) {
    const t = actor.personality[def.gate.trait];
    if (def.gate.min !== undefined && t < def.gate.min) return 'Not your style';
    if (def.gate.max !== undefined && t > def.gate.max) return 'Too nice for that';
  }
  const rel = relationshipOf(actor, target.id);
  if (def.minDaily !== undefined && rel.daily < def.minDaily) return 'Not close enough';
  if (def.needsLove && !rel.love) return 'No spark yet';
  if (def.special === 'goodbye' && target.visitLeaveAt === undefined) return 'Lives here';
  if (def.special === 'propose' && target.householdId === actor.householdId) return 'Already family';
  return null;
}

// ─── The engine hook: ticking an in-progress social ─────────────────────────

export function tickSocialStage(world: World, sim: Sim): void {
  const action = sim.action;
  if (!action || action.stage !== 'social') return;
  const target = action.targetSimId ? world.sims[action.targetSimId] : null;
  const def = action.socialId ? SOCIALS[action.socialId] : null;
  if (!target || !def || target.dead || target.lotId !== sim.lotId) {
    finishAction(world, sim, false);
    return;
  }
  action.ticksLeft -= 1;
  if (action.ticksLeft > 0) return;
  resolveSocial(world, sim, target, def);
  finishAction(world, sim, false); // effects already applied by resolve
}

// ─── Resolution ─────────────────────────────────────────────────────────────

function personalityAffinity(target: Sim, def: SocialDef): number {
  switch (def.id) {
    case 'joke':
    case 'tickle':
    case 'entertain':
    case 'dance_together':
      return (target.personality.playful - 5) * 3;
    case 'flirt':
    case 'kiss':
    case 'deep_kiss':
    case 'backrub':
      return (target.personality.outgoing - 5) * 2.5;
    case 'compliment':
    case 'cheer_up':
    case 'apologize':
      return (target.personality.nice - 5) * 3;
    case 'brag':
      return (5 - target.personality.nice) * 2;
    default:
      return 0;
  }
}

export function resolveSocial(world: World, actor: Sim, target: Sim, def: SocialDef): void {
  const targetRel = relationshipOf(target, actor.id);
  const score =
    def.baseChance +
    targetRel.daily * 0.45 +
    targetRel.lifetime * 0.2 +
    target.mood * 0.25 +
    personalityAffinity(target, def) +
    zodiacChemistry(actor.zodiac, target.zodiac) * 10;
  const accepted = def.mean
    ? true // insults always "land"; the relationship damage is the outcome
    : rand(world) * 100 < Math.max(5, Math.min(95, score));

  if (accepted) {
    actor.motives.social = clampMotive(actor.motives.social + def.actorSocial);
    target.motives.social = clampMotive(target.motives.social + def.targetSocial);
    if (def.actorFun) actor.motives.fun = clampMotive(actor.motives.fun + def.actorFun);
    if (def.targetFun) target.motives.fun = clampMotive(target.motives.fun + def.targetFun);
    applyDelta(actor, target.id, def.accept.daily, def.accept.lifetime, world.day);
    applyDelta(target, actor.id, def.accept.daily * 0.9, def.accept.lifetime, world.day);
    // Greeting a waiting visitor lets them past the doormat.
    if (def.id === 'greet' && target.visitLeaveAt !== undefined) target.greeted = true;
    if (def.romantic) {
      setThought(world, actor, THOUGHT.love, 20);
      setThought(world, target, THOUGHT.love, 20);
      updateLoveFlags(world, actor, target);
      jealousyCheck(world, actor, target);
    }
  } else {
    applyDelta(actor, target.id, def.reject.daily, def.reject.lifetime, world.day);
    applyDelta(target, actor.id, def.reject.daily, def.reject.lifetime, world.day);
    actor.motives.social = clampMotive(actor.motives.social - 4);
    actor.motives.fun = clampMotive(actor.motives.fun - 6);
    setThought(world, actor, THOUGHT.sad, 20);
    setThought(world, target, THOUGHT.angry, 20);
    if (def.romantic) {
      logMsg(world, THOUGHT.brokenHeart, `${target.name} rejected ${actor.name}'s ${def.label.toLowerCase()}.`);
    }
  }

  // Scripted follow-ups.
  switch (def.special) {
    case 'slap': {
      setThought(world, target, THOUGHT.angry, 30);
      target.motives.fun = clampMotive(target.motives.fun - 15);
      // Grouchy targets retaliate; the slap-fight cascade is canon.
      if (target.personality.nice < 4 && !target.action) {
        target.queue.unshift({
          id: newId(world, 'act'),
          kind: 'social',
          label: `Slap: ${actor.name.split(' ')[0]}`,
          icon: '🖐️',
          targetSimId: actor.id,
          socialId: 'slap',
          auto: true,
        });
      }
      break;
    }
    case 'deep_kiss': {
      if (accepted) maybeOfferBaby(world, actor, target);
      break;
    }
    case 'propose': {
      if (accepted) moveIn(world, actor, target);
      break;
    }
    case 'goodbye': {
      if (target.visitLeaveAt !== undefined) target.visitLeaveAt = world.totalMinutes;
      break;
    }
    default:
      break;
  }
}

function updateLoveFlags(world: World, a: Sim, b: Sim): void {
  const relA = relationshipOf(a, b.id);
  const relB = relationshipOf(b, a.id);
  if (relA.daily >= LOVE_THRESHOLD && !relA.love) {
    relA.love = true;
    logMsg(world, THOUGHT.love, `${a.name} is in love with ${b.name}!`);
  }
  if (relB.daily >= LOVE_THRESHOLD && !relB.love) relB.love = true;
}

/** Witnessed romance + existing love flags = slaps and broken hearts. */
function jealousyCheck(world: World, actor: Sim, target: Sim): void {
  for (const simId in world.sims) {
    const witness = world.sims[simId];
    if (witness.id === actor.id || witness.id === target.id) continue;
    if (witness.dead || witness.asleep || witness.lotId !== actor.lotId) continue;
    const d = Math.abs(witness.pos.x - actor.pos.x) + Math.abs(witness.pos.y - actor.pos.y);
    if (d > 8) continue;
    const lovesActor = relationshipOf(witness, actor.id).love;
    const lovesTarget = relationshipOf(witness, target.id).love;
    if (!lovesActor && !lovesTarget) continue;
    const cheater = lovesActor ? actor : target;
    applyDelta(witness, cheater.id, JEALOUSY_DAILY_HIT, -10, world.day);
    relationshipOf(witness, cheater.id).love = false;
    setThought(world, witness, THOUGHT.brokenHeart, 60);
    logMsg(world, THOUGHT.brokenHeart, `${witness.name} saw everything. Everything.`);
    if (!witness.action) {
      witness.queue.unshift({
        id: newId(world, 'act'),
        kind: 'social',
        label: `Slap: ${cheater.name.split(' ')[0]}`,
        icon: '🖐️',
        targetSimId: cheater.id,
        socialId: 'slap',
        auto: true,
      });
    }
  }
}

// ─── Move-in & babies ───────────────────────────────────────────────────────

function moveIn(world: World, actor: Sim, target: Sim): void {
  const from = target.householdId ? world.households[target.householdId] : null;
  const to = actor.householdId ? world.households[actor.householdId] : null;
  if (!to) return;
  if (from) {
    from.simIds = from.simIds.filter((id) => id !== target.id);
    to.funds += from.funds;
    from.funds = 0;
  }
  to.simIds.push(target.id);
  target.householdId = to.id;
  target.visitLeaveAt = undefined;
  target.greeted = undefined;
  logMsg(world, '🏠', `${target.name} moved in with ${actor.name}! (§ merged)`);
}

function maybeOfferBaby(world: World, actor: Sim, target: Sim): void {
  if (actor.age !== 'adult' || target.age !== 'adult') return;
  const relA = relationshipOf(actor, target.id);
  const relB = relationshipOf(target, actor.id);
  if (!relA.love || !relB.love) return;
  const hh = actor.householdId ? world.households[actor.householdId] : null;
  if (!hh || hh.lotId !== actor.lotId) return; // only at home
  if (hh.simIds.length >= 6) return;
  if (world.dialogs.some((d) => d.kind === 'baby')) return;
  if (!chance(world, 0.5)) return;
  pushDialog(world, {
    kind: 'baby',
    title: 'A Question Hangs in the Air',
    body: `${actor.name} and ${target.name} shared quite a kiss. Should they have a baby?`,
    options: [
      { id: 'yes', label: 'Yes! Welcome chaos.' },
      { id: 'no', label: 'Not yet.' },
    ],
    simId: actor.id,
    data: { partnerId: target.id },
  });
}

/** Store-level resolver: the player said yes to the baby prompt. */
export function haveBaby(world: World, parentAId: string, parentBId: string): void {
  const parentA = world.sims[parentAId];
  if (!parentA || !parentA.householdId || !parentA.lotId) return;
  const hh = world.households[parentA.householdId];
  const lot = world.lots[parentA.lotId];
  if (!hh || !lot) return;

  // A crib appears (free) if the household doesn't own one.
  let crib = findObjects(lot, 'crib').find((c) => !c.data.babyId);
  if (!crib) {
    outer: for (let y = 1; y < lot.h - 1; y++) {
      for (let x = 1; x < lot.w - 1; x++) {
        const placed = placeObject(world, lot, 'crib', x, y);
        if (placed) {
          crib = placed;
          break outer;
        }
      }
    }
  }
  if (!crib) {
    crib = spawnProp(world, lot, 'crib', lot.spawn.x, lot.spawn.y);
  }

  const parentB = world.sims[parentBId];
  const baby = createSim(world, {
    age: 'baby',
    householdId: hh.id,
    lastName: parentA.name.split(' ').slice(-1)[0],
  });
  baby.lotId = lot.id;
  baby.pos = { x: crib.x, y: crib.y };
  baby.bornAt = world.totalMinutes;
  baby.motives.hunger = 40;
  baby.motives.energy = 40;
  hh.simIds.push(baby.id);
  crib.data.babyId = baby.id;
  logMsg(world, THOUGHT.baby, `A baby! ${baby.name} joins the ${hh.name} household.`);
  if (parentB) setThought(world, parentB, THOUGHT.baby, 60);
  setThought(world, parentA, THOUGHT.baby, 60);
}
