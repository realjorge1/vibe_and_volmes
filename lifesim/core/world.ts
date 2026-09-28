/**
 * World/neighborhood creation and household management. One lot simulates at
 * a time; the rest of the neighborhood is frozen (faithful to the classic
 * museum-neighborhood model).
 */

import type { Household, Sim, World } from './types';
import { newId } from './types';
import { createSim } from './sim';
import { createLot, buildStarterHome, buildNeighborHome } from './lot';
import { STARTING_FUNDS } from '../data/tuning';
import { pick } from './rng';
import { LAST_NAMES } from '../data/names';
import { logMsg } from './log';

export function createWorld(artist?: { name: string; householdName: string }): World {
  const world: World = {
    seed: Date.now() % 2147483647,
    rngState: Date.now() % 2147483647,
    day: 1,
    minute: 8 * 60,
    totalMinutes: 8 * 60,
    speed: 1,
    mode: 'live',
    activeLotId: null,
    selectedSimId: null,
    playerHouseholdId: null,
    autonomy: 60,
    sims: {},
    lots: {},
    households: {},
    dialogs: [],
    log: [],
    services: [],
    cheats: { unbreakable: false, moveObjects: false },
    idSeq: 0,
  };

  // ── The artist's crib (bridged household) ─────────────────────────────────
  const homeLot = createLot(world, artist ? `${artist.name}'s Crib` : 'Starter Crib', 12000);
  buildStarterHome(world, homeLot);
  const playerHh: Household = {
    id: newId(world, 'hh'),
    name: artist?.householdName ?? 'The Household',
    funds: STARTING_FUNDS,
    simIds: [],
    lotId: homeLot.id,
    bills: [],
  };
  world.households[playerHh.id] = playerHh;
  homeLot.householdId = playerHh.id;
  world.playerHouseholdId = playerHh.id;

  const player = createSim(world, {
    name: artist?.name ?? undefined,
    householdId: playerHh.id,
    outfit: 0,
  });
  player.lotId = homeLot.id;
  player.pos = { x: 10, y: 14 };
  playerHh.simIds.push(player.id);
  world.selectedSimId = player.id;
  world.activeLotId = homeLot.id;

  // ── Neighbor households (2 furnished lots) ────────────────────────────────
  for (let i = 0; i < 2; i++) {
    const lastName = pick(world, LAST_NAMES);
    const lot = createLot(world, `${lastName} Residence`, 14000);
    buildNeighborHome(world, lot);
    const hh: Household = {
      id: newId(world, 'hh'),
      name: `The ${lastName}s`,
      funds: STARTING_FUNDS,
      simIds: [],
      lotId: lot.id,
      bills: [],
    };
    world.households[hh.id] = hh;
    lot.householdId = hh.id;
    for (let s = 0; s < 2; s++) {
      const sim = createSim(world, { lastName, householdId: hh.id });
      sim.lotId = lot.id;
      sim.pos = { x: 8 + s * 3, y: 10 };
      hh.simIds.push(sim.id);
    }
  }

  // ── Empty lots for sale (upgrade path as the music career grows) ──────────
  createLot(world, '9 Vista Point', 8000);
  createLot(world, '14 Solano Way', 9500);
  createLot(world, '3 Crescent Rise', 7000);

  // ── Townies: the visit/friend/romance pool ────────────────────────────────
  for (let i = 0; i < 5; i++) {
    const hh: Household = {
      id: newId(world, 'hh'),
      name: 'About Town',
      funds: 800,
      simIds: [],
      lotId: null,
      bills: [],
    };
    world.households[hh.id] = hh;
    const sim = createSim(world, { householdId: hh.id });
    hh.simIds.push(sim.id);
  }

  logMsg(world, '🏠', 'Welcome home. The needs bars are already draining.');
  return world;
}

/** Move a household to a new (empty) lot, paying its price from funds. */
export function moveHousehold(world: World, householdId: string, lotId: string): string | null {
  const hh = world.households[householdId];
  const lot = world.lots[lotId];
  if (!hh || !lot) return 'Missing household or lot';
  if (lot.householdId) return 'Lot is occupied';
  if (hh.funds < lot.price) return `Need §${lot.price}`;

  const oldLot = hh.lotId ? world.lots[hh.lotId] : null;
  if (oldLot) oldLot.householdId = null;
  hh.funds -= lot.price;
  hh.lotId = lot.id;
  lot.householdId = hh.id;
  for (const simId of hh.simIds) {
    const sim = world.sims[simId];
    if (!sim) continue;
    sim.lotId = lot.id;
    sim.pos = { ...lot.spawn };
    sim.action = null;
    sim.queue = [];
    sim.path = null;
  }
  if (world.activeLotId === oldLot?.id) world.activeLotId = lot.id;
  logMsg(world, '🚚', `${hh.name} moved to ${lot.name} (-§${lot.price}).`);
  return null;
}

export function activeLot(world: World) {
  return world.activeLotId ? world.lots[world.activeLotId] ?? null : null;
}

export function activeHousehold(world: World): Household | null {
  const lot = activeLot(world);
  return lot?.householdId ? world.households[lot.householdId] ?? null : null;
}

export function selectedSim(world: World): Sim | null {
  return world.selectedSimId ? world.sims[world.selectedSimId] ?? null : null;
}
