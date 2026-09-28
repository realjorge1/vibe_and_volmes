/**
 * Services & events: bills and the repo man, maid, repairman, pizza, burglars
 * and police, firefighters and fire spread, visitors, parties, and the social
 * worker. NPCs run tiny scripts (no free will — they are professionals).
 */

import type { Lot, PendingService, Sim, World } from './types';
import { clampMotive, newId, weekday } from './types';
import { getDef } from '../data/catalog';
import {
  findObjects,
  findObjectsWhere,
  findPath,
  lotAssetValue,
  removeObject,
  spawnProp,
  tileAt,
} from './grid';
import { chance, pick, randInt } from './rng';
import { logMsg } from './log';
import { THOUGHT } from '../data/names';
import {
  BILL_EVERY_DAYS,
  BILL_MIN,
  BILL_RATE,
  BURGLAR_CHANCE,
  BURGLAR_HOUR,
  BURGLAR_MIN_ASSETS,
  FIRE_MAX_TILES,
  FIRE_SPREAD_CHANCE,
  MAID_COST,
  PIZZA_COST,
  REPAIR_COST_PER_FIX,
  REPO_AFTER_DAYS,
  VISIT_MINUTES,
  VISITOR_CHANCE,
  VISITOR_HOUR,
} from '../data/tuning';
import { setThought } from './sim';
import { despawnNpc, reaperTick, spawnNpc } from './death';

// ─── Scheduling ─────────────────────────────────────────────────────────────

export function processServices(world: World): void {
  const due = world.services.filter((s) => s.arriveAt <= world.totalMinutes);
  world.services = world.services.filter((s) => s.arriveAt > world.totalMinutes);
  for (const svc of due) arrive(world, svc);
}

function arrive(world: World, svc: PendingService): void {
  const lot = world.lots[svc.lotId];
  if (!lot) return;

  if (svc.role === 'visitor' || svc.role === 'party_guest') {
    const sim = svc.data?.simId ? world.sims[svc.data.simId as string] : null;
    if (!sim || sim.dead || sim.lotId !== null || sim.career?.atWork) return;
    sim.lotId = lot.id;
    sim.pos = { ...lot.spawn };
    sim.visitLeaveAt =
      world.totalMinutes + (svc.role === 'party_guest' ? 320 : VISIT_MINUTES);
    sim.greeted = false;
    logMsg(world, '🔔', `Ding dong! ${sim.name} is at the door.`);
    for (const id in world.sims) {
      const resident = world.sims[id];
      if (resident.householdId === lot.householdId && resident.lotId === lot.id) {
        setThought(world, resident, '🔔', 15);
      }
    }
    return;
  }

  const npc = spawnNpc(world, svc.role, lot.id, svc.data ?? {});

  if (svc.role === 'burglar') {
    // The alarm is the counter-play; without it, only a phone call saves you.
    const alarm = findObjects(lot, 'burglar_alarm').length > 0;
    if (alarm) {
      logMsg(world, '🚨', 'BURGLAR ALARM! The police are on their way.');
      world.services.push({ role: 'police', lotId: lot.id, arriveAt: world.totalMinutes + 10 });
      for (const id in world.sims) {
        const s = world.sims[id];
        if (s.lotId === lot.id && !s.npc) {
          s.asleep = false;
          setThought(world, s, THOUGHT.burglar, 60);
        }
      }
    } else {
      logMsg(world, THOUGHT.burglar, 'Someone is creeping around the lot…');
    }
    npc.action!.data.stolen = 0;
  }
  if (svc.role === 'reaper') {
    logMsg(world, THOUGHT.death, 'A hooded figure has arrived. He checks a small ledger.');
  }
}

// ─── NPC scripts ────────────────────────────────────────────────────────────

function npcWalkTo(world: World, npc: Sim, lot: Lot, target: { x: number; y: number }): boolean {
  const d = Math.abs(npc.pos.x - target.x) + Math.abs(npc.pos.y - target.y);
  if (d <= 1) return true;
  if (!npc.path || npc.path.length === 0) {
    npc.path =
      findPath(lot, npc.pos, target) ??
      findPath(lot, npc.pos, target, { sitTarget: true }) ??
      [];
  }
  for (let i = 0; i < 2 && npc.path.length > 0; i++) {
    const next = npc.path.shift()!;
    npc.pos = { x: next.x, y: next.y };
  }
  if (npc.path.length === 0 && d > 1) {
    // Walls between us: NPCs are pragmatic, they sidle (no tantrums on duty).
    npc.pos = {
      x: npc.pos.x + Math.sign(target.x - npc.pos.x),
      y: npc.pos.y + Math.sign(target.y - npc.pos.y),
    };
  }
  return Math.abs(npc.pos.x - target.x) + Math.abs(npc.pos.y - target.y) <= 1;
}

function leaveLot(world: World, npc: Sim, lot: Lot): void {
  if (npcWalkTo(world, npc, lot, lot.spawn)) despawnNpc(world, npc);
}

export function npcTick(world: World, npc: Sim): void {
  const lot = npc.lotId ? world.lots[npc.lotId] : null;
  if (!lot) {
    despawnNpc(world, npc);
    return;
  }
  const data = npc.action!.data;
  const hh = lot.householdId ? world.households[lot.householdId] : null;

  switch (npc.npc) {
    case 'reaper':
      reaperTick(world, npc);
      return;

    case 'maid': {
      const mess = findObjectsWhere(lot, (o, def) =>
        ['plate_dirty', 'puddle', 'trash_pile', 'ash_pile', 'newspaper'].includes(def.id) ||
        o.dirty
      )[0];
      if (!mess) {
        if (!data.charged) {
          data.charged = true;
          if (hh && hh.funds >= MAID_COST) {
            hh.funds -= MAID_COST;
            logMsg(world, '🧹', `The maid finished up. -§${MAID_COST}.`);
          } else {
            lot.maidHired = false;
            logMsg(world, '🧹', 'Unpaid, the maid quits on the spot.');
          }
        }
        leaveLot(world, npc, lot);
        return;
      }
      if (npcWalkTo(world, npc, lot, mess)) {
        data.cleanTicks = ((data.cleanTicks as number) ?? 0) + 1;
        if ((data.cleanTicks as number) >= 5) {
          data.cleanTicks = 0;
          if (mess.dirty) mess.dirty = false;
          else removeObject(lot, mess.id);
        }
      }
      return;
    }

    case 'repairman': {
      const broken = findObjectsWhere(lot, (o) => o.broken)[0];
      if (!broken) {
        leaveLot(world, npc, lot);
        return;
      }
      if (npcWalkTo(world, npc, lot, broken)) {
        data.fixTicks = ((data.fixTicks as number) ?? 0) + 1;
        if ((data.fixTicks as number) >= 8) {
          data.fixTicks = 0;
          broken.broken = false;
          if (hh) {
            hh.funds = Math.max(0, hh.funds - REPAIR_COST_PER_FIX);
            logMsg(world, '🔧', `Fixed the ${getDef(broken.defId).name}. -§${REPAIR_COST_PER_FIX}.`);
          }
        }
      }
      return;
    }

    case 'pizza': {
      if (npcWalkTo(world, npc, lot, lot.spawn)) {
        if (hh && hh.funds >= PIZZA_COST) {
          hh.funds -= PIZZA_COST;
          const box = spawnProp(world, lot, 'pizza_box', lot.spawn.x, lot.spawn.y);
          box.data.slices = 8;
          logMsg(world, '🍕', 'Pizza delivered to the front step!');
        } else {
          logMsg(world, '🍕', 'No § at the door. The pizza leaves with its owner.');
        }
        despawnNpc(world, npc);
      }
      return;
    }

    case 'burglar': {
      // Burglars grab the priciest LOOSE valuables. Plumbed-in or survival-
      // critical fixtures (fridge, stove, plumbing) are left behind — both
      // realistic and a guard against unrecoverable starvation.
      const CRITICAL = ['fridge_cheap', 'fridge_lux', 'stove', 'stove_lux'];
      const loot = findObjectsWhere(
        lot,
        (o, def) =>
          !def.unbuyable &&
          def.price > 200 &&
          def.category !== 'plumbing' &&
          !CRITICAL.includes(def.id)
      ).sort((a, b) => getDef(b.defId).price - getDef(a.defId).price)[0];
      const stolen = (data.stolen as number) ?? 0;
      if (!loot || stolen >= 2) {
        if (npcWalkTo(world, npc, lot, lot.spawn)) {
          if (stolen > 0) logMsg(world, THOUGHT.burglar, 'The burglar slipped away into the night.');
          despawnNpc(world, npc);
        }
        return;
      }
      if (npcWalkTo(world, npc, lot, loot)) {
        data.stealTicks = ((data.stealTicks as number) ?? 0) + 1;
        if ((data.stealTicks as number) >= 8) {
          data.stealTicks = 0;
          data.stolen = stolen + 1;
          logMsg(world, THOUGHT.burglar, `The ${getDef(loot.defId).name} was STOLEN!`);
          removeObject(lot, loot.id);
        }
      }
      return;
    }

    case 'police': {
      const burglar = Object.values(world.sims).find(
        (s) => s.npc === 'burglar' && s.lotId === lot.id
      );
      if (burglar) {
        if (npcWalkTo(world, npc, lot, burglar.pos)) {
          despawnNpc(world, burglar);
          if (hh) hh.funds += 500;
          logMsg(world, '🚓', 'Burglar apprehended! The city pays a §500 reward.');
        }
        return;
      }
      data.patrol = ((data.patrol as number) ?? 0) + 1;
      if ((data.patrol as number) > 6) leaveLot(world, npc, lot);
      return;
    }

    case 'firefighter': {
      let nearest: { x: number; y: number } | null = null;
      let bestD = Infinity;
      for (let y = 0; y < lot.h; y++) {
        for (let x = 0; x < lot.w; x++) {
          if (lot.tiles[y * lot.w + x].fire > 0) {
            const d = Math.abs(npc.pos.x - x) + Math.abs(npc.pos.y - y);
            if (d < bestD) {
              bestD = d;
              nearest = { x, y };
            }
          }
        }
      }
      if (!nearest) {
        leaveLot(world, npc, lot);
        return;
      }
      if (npcWalkTo(world, npc, lot, nearest) || bestD <= 2) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const t = tileAt(lot, nearest.x + dx, nearest.y + dy);
            if (t && t.fire > 0) t.fire = 0;
          }
        }
      }
      return;
    }

    case 'social_worker': {
      const crib = findObjects(lot, 'crib').find((c) => c.data.babyId);
      if (!crib) {
        leaveLot(world, npc, lot);
        return;
      }
      if (npcWalkTo(world, npc, lot, crib)) {
        const baby = world.sims[crib.data.babyId as string];
        if (baby) {
          if (baby.householdId) {
            const bh = world.households[baby.householdId];
            if (bh) bh.simIds = bh.simIds.filter((id) => id !== baby.id);
          }
          delete world.sims[baby.id];
        }
        crib.data.babyId = undefined;
        logMsg(world, '🚨', 'The social worker took the baby. The house is very quiet now.');
        leaveLot(world, npc, lot);
      }
      return;
    }

    case 'repo': {
      if (!hh || hh.bills.length === 0) {
        leaveLot(world, npc, lot);
        return;
      }
      const owed = hh.bills[0].amount;
      const target = findObjectsWhere(lot, (o, def) => !def.unbuyable)
        .sort((a, b) => getDef(b.defId).price - getDef(a.defId).price)[0];
      if (!target) {
        hh.bills.shift();
        leaveLot(world, npc, lot);
        return;
      }
      if (npcWalkTo(world, npc, lot, target)) {
        logMsg(world, '📦', `The repo man seized the ${getDef(target.defId).name} with total indifference.`);
        removeObject(lot, target.id);
        hh.bills.shift();
        if (hh.bills.length === 0) leaveLot(world, npc, lot);
      }
      return;
    }

    default:
      leaveLot(world, npc, lot);
  }
}

// ─── Fire spread & panic ────────────────────────────────────────────────────

export function fireTick(world: World, lot: Lot): void {
  let burning: { x: number; y: number }[] = [];
  for (let y = 0; y < lot.h; y++) {
    for (let x = 0; x < lot.w; x++) {
      const t = lot.tiles[y * lot.w + x];
      if (t.fire > 0) {
        t.fire += 1;
        burning.push({ x, y });
      }
    }
  }
  if (burning.length === 0) return;

  for (const b of burning) {
    const t = tileAt(lot, b.x, b.y)!;
    // Objects on a burning tile are destroyed after a few minutes.
    for (const id of Object.keys(lot.objects)) {
      const obj = lot.objects[id];
      if (obj.x === b.x && obj.y === b.y && t.fire > 4) {
        removeObject(lot, obj.id);
        spawnProp(world, lot, 'ash_pile', b.x, b.y);
      }
    }
    // Burn out after a while, leaving scorched nothing.
    if (t.fire > 12) {
      t.fire = 0;
      t.floor = 0;
      continue;
    }
    // Spread to adjacent flammables.
    if (burning.length < FIRE_MAX_TILES && chance(world, FIRE_SPREAD_CHANCE)) {
      const [dx, dy] = pick(world, [[1, 0], [-1, 0], [0, 1], [0, -1]] as const);
      const nt = tileAt(lot, b.x + dx, b.y + dy);
      if (nt && nt.fire === 0 && !nt.pool) {
        const objHere = Object.values(lot.objects).find(
          (o) => o.x === b.x + dx && o.y === b.y + dy
        );
        const flammable = objHere ? !!getDef(objHere.defId).flammable : nt.floor > 0;
        if (flammable) {
          nt.fire = 1;
          if (objHere) objHere.onFire = true;
        }
      }
    }
  }

  // Smoke detector auto-dispatch (once per blaze).
  if (findObjects(lot, 'smoke_detector').length > 0) {
    const alreadyComing =
      world.services.some((s) => s.role === 'firefighter' && s.lotId === lot.id) ||
      Object.values(world.sims).some((s) => s.npc === 'firefighter' && s.lotId === lot.id);
    if (!alreadyComing) {
      world.services.push({ role: 'firefighter', lotId: lot.id, arriveAt: world.totalMinutes + 10 });
      logMsg(world, '🚨', 'The smoke alarm shrieks — firefighters dispatched automatically.');
    }
  }

  // Sims near flame drop everything and panic. This is mandatory.
  for (const id in world.sims) {
    const sim = world.sims[id];
    if (sim.dead || sim.npc || sim.lotId !== lot.id || sim.career?.atWork) continue;
    const near = burning.some(
      (b) => Math.abs(b.x - sim.pos.x) + Math.abs(b.y - sim.pos.y) <= 3
    );
    if (near && sim.action?.label !== 'Panic' && sim.action?.label !== 'Extinguish') {
      sim.asleep = false;
      sim.queue = sim.queue.filter((a) => a.forced);
      sim.queue.unshift({
        id: newId(world, 'act'),
        kind: 'system',
        label: 'Panic',
        icon: THOUGHT.fire,
        x: sim.pos.x,
        y: sim.pos.y,
        forced: true,
      });
      setThought(world, sim, THOUGHT.fire, 30);
    }
  }
}

// ─── Daily schedule (bills, mail, burglars, visitors) ───────────────────────

export function scheduleTick(world: World): void {
  const lot = world.activeLotId ? world.lots[world.activeLotId] : null;
  if (!lot || !lot.householdId) return;
  const hh = world.households[lot.householdId];
  if (!hh) return;

  // 7 AM: newspaper lands near the street.
  if (world.minute === 7 * 60) {
    const papers = findObjects(lot, 'newspaper');
    if (papers.length < 3) {
      spawnProp(world, lot, 'newspaper', lot.spawn.x, Math.max(0, lot.spawn.y - 1));
    }
  }

  // 9 AM every third day: bills.
  if (world.minute === 9 * 60 && world.day % BILL_EVERY_DAYS === 0) {
    const amount = Math.max(BILL_MIN, Math.round(lotAssetValue(world, lot) * BILL_RATE));
    hh.bills.push({ amount, issuedDay: world.day });
    logMsg(world, '📫', `Bills arrived: §${amount}. The mailbox waits.`);
  }

  // 10 AM: overdue bills summon the repo man; the maid arrives if hired.
  if (world.minute === 10 * 60) {
    const overdue = hh.bills.some((b) => world.day - b.issuedDay >= REPO_AFTER_DAYS);
    const repoActive =
      world.services.some((s) => s.role === 'repo' && s.lotId === lot.id) ||
      Object.values(world.sims).some((s) => s.npc === 'repo' && s.lotId === lot.id);
    if (overdue && !repoActive) {
      world.services.push({ role: 'repo', lotId: lot.id, arriveAt: world.totalMinutes + 5 });
      logMsg(world, '📦', 'A very calm man with a clipboard is walking up the path.');
    }
    if (lot.maidHired) {
      world.services.push({ role: 'maid', lotId: lot.id, arriveAt: world.totalMinutes + 5 });
    }
  }

  // Afternoon visitors drop by uninvited (the welcome wagon on day 1).
  if (world.minute === VISITOR_HOUR * 60) {
    const isDayOne = world.day === 1;
    if (isDayOne || chance(world, VISITOR_CHANCE)) {
      const candidates = Object.values(world.sims).filter(
        (s) =>
          !s.dead && !s.npc && !s.ghost && s.age === 'adult' &&
          s.householdId !== hh.id && s.lotId === null && !s.career?.atWork
      );
      const count = isDayOne ? Math.min(2, candidates.length) : 1;
      for (let i = 0; i < count && candidates.length > 0; i++) {
        const guest = candidates.splice(randInt(world, 0, candidates.length - 1), 1)[0];
        world.services.push({
          role: 'visitor',
          lotId: lot.id,
          arriveAt: world.totalMinutes + randInt(world, 1, 20),
          data: { simId: guest.id },
        });
      }
      if (isDayOne) logMsg(world, '🧁', 'The neighbors are coming to say hello!');
    }
  }

  // 2 AM: burglars case wealthy, unprotected lots.
  if (world.minute === BURGLAR_HOUR * 60) {
    const burglarActive = Object.values(world.sims).some((s) => s.npc === 'burglar');
    if (
      !burglarActive &&
      lotAssetValue(world, lot) > BURGLAR_MIN_ASSETS &&
      chance(world, BURGLAR_CHANCE)
    ) {
      world.services.push({ role: 'burglar', lotId: lot.id, arriveAt: world.totalMinutes + 2 });
    }
  }
}

// ─── Visitor departure & guest upkeep ───────────────────────────────────────

export function visitorTick(world: World, sim: Sim): void {
  const lot = sim.lotId ? world.lots[sim.lotId] : null;
  if (!lot || sim.visitLeaveAt === undefined) return;

  // Ungreeted guests wait by the door, then politely let themselves in.
  if (sim.greeted === false) {
    const waited = world.totalMinutes - (sim.visitLeaveAt - VISIT_MINUTES);
    if (waited > 20) {
      sim.greeted = true;
      logMsg(world, '🚪', `${sim.name} let themselves in. Bold.`);
    } else {
      return; // stand at the door
    }
  }

  const wornOut =
    sim.motives.hunger < -60 || sim.motives.energy < -60 || sim.motives.fun < -70;
  if (world.totalMinutes >= sim.visitLeaveAt || wornOut) {
    if (Math.abs(sim.pos.x - lot.spawn.x) + Math.abs(sim.pos.y - lot.spawn.y) <= 1) {
      sim.lotId = null;
      sim.visitLeaveAt = undefined;
      sim.greeted = undefined;
      sim.queue = [];
      sim.action = null;
      sim.path = null;
      logMsg(world, '👋', `${sim.name} headed home.`);
    } else if (!sim.action || sim.action.label !== 'Leave') {
      sim.queue = [];
      if (sim.action) sim.action = null;
      sim.queue.push({
        id: newId(world, 'act'),
        kind: 'goto',
        label: 'Leave',
        icon: '👋',
        x: lot.spawn.x,
        y: lot.spawn.y,
        auto: true,
      });
    }
  }
}
