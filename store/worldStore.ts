import { create } from 'zustand';
import type { Npc, WorldEvent, WorldGenConfig, WorldState } from '../types/world';
import { generateWorld, DEFAULT_WORLD_CONFIG } from '../systems/world/generateNpc';
import { simulateWeek, simulateWeeks, summarizeWorld, type WorldSummary } from '../systems/world/worldEngine';
import { saveData, loadData } from '../database/gameRepository';

/**
 * Store for the Living World / NPC Life Engine.
 *
 * The store is a thin shell around the *pure* engine: it holds the current
 * `WorldState`, and `advanceWeek` simply replaces it with the result of
 * `simulateWeek`. All simulation logic stays in `systems/world` so it can be
 * unit-tested and reasoned about without React/Zustand in the loop.
 *
 * Designed to be driven from the existing weekly transition (alongside
 * `runPhase3Week`): call `advanceWeek()` once per in-game week.
 */

const SAVE_KEY = 'world';

interface WorldStoreState {
  world: WorldState | null;
  lastWeekEvents: WorldEvent[];
}

interface WorldStoreActions {
  /** Create a fresh world from a seed (idempotent per seed). */
  initWorld: (seed: number, config?: WorldGenConfig) => void;
  /** Advance the simulation one week; returns the events that occurred. */
  advanceWeek: () => WorldEvent[];
  /**
   * Advance the simulation `n` weeks at once (idle / "while you were away"
   * catch-up) and return the freshest stories from the resulting log,
   * biggest-and-newest first.
   */
  advanceWeeks: (n: number) => WorldEvent[];
  getNpc: (id: string) => Npc | undefined;
  /**
   * Change one NPC (a label's marketing push, a past life added to the
   * world). The engine stays pure; this is the store-level escape hatch.
   */
  updateNpc: (id: string, update: (npc: Npc) => Npc) => void;
  /** Add NPCs that didn't come from generation (past lives). */
  addNpcs: (npcs: Npc[]) => void;
  /** Recent newsworthy events, biggest first. */
  recentEvents: (limit?: number) => WorldEvent[];
  summary: () => WorldSummary | null;
  saveWorld: () => void;
  loadWorld: () => boolean;
  reset: () => void;
}

type WorldStore = WorldStoreState & WorldStoreActions;

export const useWorldStore = create<WorldStore>((set, get) => ({
  world: null,
  lastWeekEvents: [],

  initWorld(seed, config = DEFAULT_WORLD_CONFIG) {
    set({ world: generateWorld(seed, config), lastWeekEvents: [] });
  },

  advanceWeek() {
    const { world } = get();
    if (!world) return [];
    const { world: next, events } = simulateWeek(world);
    set({ world: next, lastWeekEvents: events });
    return events;
  },

  advanceWeeks(n) {
    const { world } = get();
    if (!world || n <= 0) return [];
    const next = simulateWeeks(world, n);
    // simulateWeeks discards intermediate event arrays, but the rolling log on
    // the world holds the most recent stories across the span we just ran.
    const events = next.events.slice(0, 30);
    set({ world: next, lastWeekEvents: events });
    return events;
  },

  getNpc(id) {
    return get().world?.npcs[id];
  },

  updateNpc(id, update) {
    const { world } = get();
    const npc = world?.npcs[id];
    if (!world || !npc) return;
    set({ world: { ...world, npcs: { ...world.npcs, [id]: update(npc) } } });
  },

  addNpcs(npcs) {
    const { world } = get();
    if (!world || npcs.length === 0) return;
    const fresh = npcs.filter((n) => !world.npcs[n.id]);
    if (fresh.length === 0) return;
    const added = Object.fromEntries(fresh.map((n) => [n.id, n]));
    set({
      world: {
        ...world,
        npcs: { ...world.npcs, ...added },
        npcIds: [...world.npcIds, ...fresh.map((n) => n.id)],
      },
    });
  },

  recentEvents(limit = 20) {
    const w = get().world;
    return w ? w.events.slice(0, limit) : [];
  },

  summary() {
    const w = get().world;
    return w ? summarizeWorld(w) : null;
  },

  saveWorld() {
    const { world } = get();
    if (world) saveData(SAVE_KEY, world);
  },

  loadWorld() {
    const saved = loadData<WorldState>(SAVE_KEY);
    if (saved) {
      set({ world: saved, lastWeekEvents: [] });
      return true;
    }
    return false;
  },

  reset() {
    set({ world: null, lastWeekEvents: [] });
  },
}));
