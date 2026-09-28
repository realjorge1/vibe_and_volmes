/**
 * LifeSim store — the seam between the pure simulation core and React.
 * The World is mutated in place by the engine; `version` bumps trigger
 * re-renders. Money is bridged both ways to the music game's wallet
 * (playerStore.money is canonical) around every mutation window.
 */

import { create } from 'zustand';
import type { World } from '../lifesim/core/types';
import { newId } from '../lifesim/core/types';
import { minuteTick } from '../lifesim/core/engine';
import { createWorld, moveHousehold, activeLot, selectedSim } from '../lifesim/core/world';
import {
  applyBuildTool,
  canPlaceObject,
  currentValue,
  placeObject,
  removeObject,
  objectAt,
  tileAt,
} from '../lifesim/core/grid';
import type { BuildTool } from '../lifesim/core/grid';
import { getDef } from '../lifesim/data/catalog';
import {
  enqueue,
  cancelQueued,
  interactionAvailable,
} from '../lifesim/core/interactions';
import { socialAvailable } from '../lifesim/core/social';
import { SOCIALS } from '../lifesim/data/socials';
import { haveBaby } from '../lifesim/core/social';
import { resolveChanceCard, acceptJob, departForWork } from '../lifesim/core/career';
import { resolvePlead } from '../lifesim/core/death';
import { logMsg } from '../lifesim/core/log';
import { DRIVER_INTERVAL_MS, MINUTES_PER_TICK } from '../lifesim/data/tuning';
import { saveData, loadData } from '../database/gameRepository';
import {
  applyPlayerMoneyDelta,
  getArtistIdentity,
  readPlayerMoney,
} from '../lifesim/bridge';

export interface PieOption {
  id: string;
  label: string;
  icon: string;
  disabled?: string;
}

export interface PieMenuState {
  title: string;
  icon: string;
  kind: 'object' | 'sim' | 'tile' | 'sell';
  objectId?: string;
  targetSimId?: string;
  x?: number;
  y?: number;
  options: PieOption[];
}

interface LifeSimStore {
  world: World | null;
  version: number;
  pie: PieMenuState | null;
  buyDefId: string | null;
  buildTool: BuildTool | null;
  floorStyle: number;

  init: () => void;
  save: () => void;
  resetLifeSim: () => void;
  /** Drop the in-memory world WITHOUT saving (retirement wipes the save). */
  reset: () => void;
  startDriver: () => void;
  stopDriver: () => void;

  setSpeed: (s: 0 | 1 | 2 | 3) => void;
  setMode: (m: 'live' | 'buy' | 'build') => void;
  setAutonomy: (n: number) => void;
  selectSim: (id: string) => void;
  setActiveLot: (id: string) => void;
  setBuyDef: (defId: string | null) => void;
  setBuildTool: (tool: BuildTool | null) => void;
  setFloorStyle: (n: number) => void;
  closePie: () => void;

  tapTile: (x: number, y: number) => void;
  choosePieOption: (optionId: string) => void;
  cancelQueuedAction: (simId: string, actionId: string) => void;
  sendToWork: (simId: string) => void;
  resolveDialog: (dialogId: string, optionId: string) => void;
  moveHouseholdTo: (lotId: string) => string | null;
  runCheat: (code: string) => string;
}

let timer: ReturnType<typeof setInterval> | null = null;
let saveCounter = 0;

/** Wrap a world mutation so household funds stay mirrored to player.money. */
function withWallet(world: World, fn: () => void): void {
  const hh = world.playerHouseholdId
    ? world.households[world.playerHouseholdId]
    : null;
  const bank = readPlayerMoney();
  if (hh && bank !== null) hh.funds = bank;
  const before = hh?.funds ?? 0;
  fn();
  if (hh && bank !== null) {
    const delta = hh.funds - before;
    if (delta !== 0) applyPlayerMoneyDelta(delta);
    const after = readPlayerMoney();
    if (after !== null) hh.funds = after;
  }
}

export const useLifeSimStore = create<LifeSimStore>((set, get) => ({
  world: null,
  version: 0,
  pie: null,
  buyDefId: null,
  buildTool: null,
  floorStyle: 2,

  init() {
    if (get().world) return;
    const saved = loadData<World>('lifesim_world');
    if (saved && saved.playerHouseholdId) {
      set({ world: saved, version: 1 });
      return;
    }
    const world = createWorld(getArtistIdentity() ?? undefined);
    set({ world, version: 1 });
    saveData('lifesim_world', world);
  },

  save() {
    const { world } = get();
    if (world) saveData('lifesim_world', world);
  },

  resetLifeSim() {
    get().stopDriver();
    const world = createWorld(getArtistIdentity() ?? undefined);
    set({ world, version: get().version + 1, pie: null, buyDefId: null, buildTool: null });
    saveData('lifesim_world', world);
  },

  reset() {
    // Not stopDriver(): that saves, which would write the old world back
    // into the save we are wiping.
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    saveCounter = 0;
    set({ world: null, version: get().version + 1, pie: null, buyDefId: null, buildTool: null });
  },

  startDriver() {
    if (timer) return;
    timer = setInterval(() => {
      const { world } = get();
      if (!world) return;
      // Time flows only in Live mode, unpaused, with no dialog on screen.
      if (world.mode !== 'live' || world.speed === 0 || world.dialogs.length > 0)
        return;
      withWallet(world, () => {
        const minutes = MINUTES_PER_TICK[world.speed as 1 | 2 | 3];
        for (let i = 0; i < minutes; i++) minuteTick(world);
      });
      saveCounter += 1;
      if (saveCounter >= 120) {
        saveCounter = 0;
        saveData('lifesim_world', world);
      }
      set({ version: get().version + 1 });
    }, DRIVER_INTERVAL_MS);
  },

  stopDriver() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    get().save();
  },

  setSpeed(s) {
    const { world } = get();
    if (!world) return;
    world.speed = s;
    set({ version: get().version + 1 });
  },

  setMode(m) {
    const { world } = get();
    if (!world) return;
    world.mode = m;
    set({
      version: get().version + 1,
      pie: null,
      buyDefId: m === 'buy' ? get().buyDefId : null,
      buildTool: m === 'build' ? get().buildTool : null,
    });
    get().save();
  },

  setAutonomy(n) {
    const { world } = get();
    if (!world) return;
    world.autonomy = Math.max(0, Math.min(100, n));
    set({ version: get().version + 1 });
  },

  selectSim(id) {
    const { world } = get();
    if (!world) return;
    world.selectedSimId = id;
    set({ version: get().version + 1 });
  },

  setActiveLot(id) {
    const { world } = get();
    if (!world || !world.lots[id]) return;
    world.activeLotId = id;
    const hh = world.lots[id].householdId
      ? world.households[world.lots[id].householdId!]
      : null;
    if (hh && hh.simIds.length > 0) world.selectedSimId = hh.simIds[0];
    set({ version: get().version + 1, pie: null });
    get().save();
  },

  setBuyDef(defId) {
    set({ buyDefId: defId, pie: null });
  },

  setBuildTool(tool) {
    set({ buildTool: tool, pie: null });
  },

  setFloorStyle(n) {
    set({ floorStyle: n });
  },

  closePie() {
    set({ pie: null });
  },

  tapTile(x, y) {
    const { world, buyDefId, buildTool, floorStyle } = get();
    if (!world) return;
    const lot = activeLot(world);
    if (!lot) return;
    const hh = world.playerHouseholdId
      ? world.households[world.playerHouseholdId]
      : null;

    // ── Build mode ────────────────────────────────────────────────────────
    if (world.mode === 'build') {
      if (!buildTool) return;
      withWallet(world, () => {
        const funds = hh?.funds ?? 0;
        const result = applyBuildTool(world, lot, buildTool, x, y, floorStyle, funds);
        if (result.ok && hh) hh.funds -= result.cost;
        else if (!result.ok && result.reason) logMsg(world, '🚫', result.reason);
      });
      set({ version: get().version + 1 });
      return;
    }

    // ── Buy mode ──────────────────────────────────────────────────────────
    if (world.mode === 'buy') {
      const existing = objectAt(lot, x, y);
      if (buyDefId) {
        const def = getDef(buyDefId);
        withWallet(world, () => {
          if (!hh || hh.funds < def.price) {
            logMsg(world, '🚫', `Not enough § for the ${def.name}.`);
            return;
          }
          if (!canPlaceObject(lot, def, x, y)) {
            logMsg(world, '🚫', `The ${def.name} doesn't fit there.`);
            return;
          }
          placeObject(world, lot, buyDefId, x, y);
          hh.funds -= def.price;
        });
        set({ version: get().version + 1 });
        return;
      }
      if (existing && !getDef(existing.defId).unbuyable) {
        const value = currentValue(world, existing);
        set({
          pie: {
            title: getDef(existing.defId).name,
            icon: getDef(existing.defId).icon,
            kind: 'sell',
            objectId: existing.id,
            options: [{ id: 'sell', label: `Sell for §${value}`, icon: '💰' }],
          },
        });
      }
      return;
    }

    // ── Live mode: pie menus ──────────────────────────────────────────────
    const actor = selectedSim(world);
    if (!actor || actor.dead) return;

    const tile = tileAt(lot, x, y);
    if (tile && tile.fire > 0) {
      set({
        pie: {
          title: 'Fire!',
          icon: '🔥',
          kind: 'tile',
          x,
          y,
          options: [{ id: 'extinguish', label: 'Extinguish', icon: '🧯' }],
        },
      });
      return;
    }

    // A sim on the tile?
    const targetSim = Object.values(world.sims).find(
      (s) =>
        s.lotId === lot.id &&
        !s.dead &&
        s.pos.x === x &&
        s.pos.y === y &&
        s.id !== actor.id &&
        !s.career?.atWork
    );
    if (targetSim && !targetSim.npc && !targetSim.ghost && targetSim.age !== 'baby') {
      const options: PieOption[] = [];
      for (const id in SOCIALS) {
        const def = SOCIALS[id];
        const blocked = socialAvailable(world, actor, targetSim, def);
        if (blocked === null) {
          options.push({ id, label: def.label, icon: def.icon });
        }
      }
      set({
        pie: {
          title: targetSim.name,
          icon: '🙂',
          kind: 'sim',
          targetSimId: targetSim.id,
          options: options.slice(0, 12),
        },
      });
      return;
    }

    const obj = objectAt(lot, x, y);
    if (obj) {
      const def = getDef(obj.defId);
      const options: PieOption[] = [];
      for (const inter of def.interactions) {
        const blocked = interactionAvailable(world, actor, obj, inter);
        if (blocked === null) {
          options.push({ id: inter.id, label: inter.label, icon: inter.icon });
        } else if (blocked !== 'On duty' && blocked !== 'Adults only' && blocked !== 'Kids only') {
          options.push({ id: inter.id, label: inter.label, icon: inter.icon, disabled: blocked });
        }
      }
      if (options.length > 0) {
        set({
          pie: {
            title: def.name,
            icon: def.icon,
            kind: 'object',
            objectId: obj.id,
            options,
          },
        });
      }
      return;
    }

    // Bare ground: go here.
    set({
      pie: {
        title: 'Ground',
        icon: '📍',
        kind: 'tile',
        x,
        y,
        options: [{ id: 'goto', label: 'Go Here', icon: '🚶' }],
      },
    });
  },

  choosePieOption(optionId) {
    const { world, pie } = get();
    if (!world || !pie) return;
    const actor = selectedSim(world);
    const lot = activeLot(world);
    if (!actor || !lot) {
      set({ pie: null });
      return;
    }

    if (pie.kind === 'sell' && pie.objectId && optionId === 'sell') {
      const obj = lot.objects[pie.objectId];
      if (obj) {
        withWallet(world, () => {
          const hh = world.playerHouseholdId
            ? world.households[world.playerHouseholdId]
            : null;
          const value = currentValue(world, obj);
          removeObject(lot, obj.id);
          if (hh) hh.funds += value;
          logMsg(world, '💰', `Sold the ${getDef(obj.defId).name} for §${value}.`);
        });
      }
    } else if (pie.kind === 'object' && pie.objectId) {
      const obj = lot.objects[pie.objectId];
      const inter = obj
        ? getDef(obj.defId).interactions.find((i) => i.id === optionId)
        : undefined;
      if (obj && inter) {
        enqueue(world, actor, {
          kind: 'object',
          label: inter.label,
          icon: inter.icon,
          objectId: obj.id,
          interactionId: inter.id,
        });
      }
    } else if (pie.kind === 'sim' && pie.targetSimId) {
      const def = SOCIALS[optionId];
      if (def) {
        const target = world.sims[pie.targetSimId];
        enqueue(world, actor, {
          kind: 'social',
          label: `${def.label}: ${target?.name.split(' ')[0] ?? ''}`,
          icon: def.icon,
          targetSimId: pie.targetSimId,
          socialId: optionId,
        });
      }
    } else if (pie.kind === 'tile' && pie.x !== undefined && pie.y !== undefined) {
      if (optionId === 'goto') {
        enqueue(world, actor, {
          kind: 'goto',
          label: 'Go Here',
          icon: '🚶',
          x: pie.x,
          y: pie.y,
        });
      }
      if (optionId === 'extinguish') {
        enqueue(world, actor, {
          kind: 'system',
          label: 'Extinguish',
          icon: '🧯',
          x: pie.x,
          y: pie.y,
        });
      }
    }
    set({ pie: null, version: get().version + 1 });
  },

  cancelQueuedAction(simId, actionId) {
    const { world } = get();
    if (!world) return;
    const sim = world.sims[simId];
    if (sim) cancelQueued(world, sim, actionId);
    set({ version: get().version + 1 });
  },

  sendToWork(simId) {
    const { world } = get();
    if (!world) return;
    const sim = world.sims[simId];
    if (sim) departForWork(world, sim);
    set({ version: get().version + 1 });
  },

  resolveDialog(dialogId, optionId) {
    const { world } = get();
    if (!world) return;
    const idx = world.dialogs.findIndex((d) => d.id === dialogId);
    if (idx < 0) return;
    const dialog = world.dialogs[idx];
    world.dialogs.splice(idx, 1);

    withWallet(world, () => {
      switch (dialog.kind) {
        case 'chanceCard': {
          if (dialog.simId && dialog.data?.cardId) {
            const result = resolveChanceCard(
              world,
              dialog.simId,
              dialog.data.cardId as string,
              optionId === 'risk'
            );
            world.dialogs.push({
              id: newId(world, 'dlg'),
              kind: 'info',
              title: 'The Outcome',
              body: result,
              options: [{ id: 'ok', label: 'OK' }],
            });
          }
          break;
        }
        case 'baby': {
          if (optionId === 'yes' && dialog.simId && dialog.data?.partnerId) {
            haveBaby(world, dialog.simId, dialog.data.partnerId as string);
          }
          break;
        }
        case 'plead': {
          if (dialog.data?.deceasedId) {
            resolvePlead(world, dialog.data.deceasedId as string, optionId === 'plead');
          }
          break;
        }
        case 'jobOffer': {
          if (optionId !== 'none' && dialog.simId) {
            acceptJob(world, dialog.simId, optionId);
          }
          break;
        }
        default:
          break;
      }
    });
    set({ version: get().version + 1 });
    get().save();
  },

  moveHouseholdTo(lotId) {
    const { world } = get();
    if (!world || !world.playerHouseholdId) return 'No household';
    let error: string | null = null;
    withWallet(world, () => {
      error = moveHousehold(world, world.playerHouseholdId!, lotId);
    });
    set({ version: get().version + 1 });
    get().save();
    return error;
  },

  runCheat(code) {
    const { world } = get();
    if (!world) return 'No world';
    const cmd = code.trim().toLowerCase();
    let msg = 'Nothing happens. The universe is unimpressed.';
    withWallet(world, () => {
      const hh = world.playerHouseholdId
        ? world.households[world.playerHouseholdId]
        : null;
      if (cmd === 'jackpot' && hh) {
        hh.funds += 5000;
        msg = '+§5000. Your secret is safe.';
      } else if (cmd === 'kaching' && hh) {
        hh.funds += 1000;
        msg = '+§1000. Every little helps.';
      } else if (cmd === 'unbreakable') {
        world.cheats.unbreakable = !world.cheats.unbreakable;
        msg = `Objects ${world.cheats.unbreakable ? 'will never break' : 'break again'}.`;
      } else if (cmd === 'needsfull') {
        const sim = selectedSim(world);
        if (sim) {
          for (const k of Object.keys(sim.motives)) {
            sim.motives[k as keyof typeof sim.motives] = 100;
          }
          msg = `${sim.name} feels suspiciously fantastic.`;
        }
      }
      if (msg !== 'Nothing happens. The universe is unimpressed.') {
        logMsg(world, '🧪', `Cheat: ${cmd}`);
      }
    });
    set({ version: get().version + 1 });
    return msg;
  },
}));
