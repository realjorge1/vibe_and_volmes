import { create } from 'zustand';
import type { Player, PlayerStats, CreatePlayerData, MusicGenre } from '../types/player';
import { getArchetype, buildStartingStats } from '../data/archetypes';
import { applyStatDelta } from '../utils/statHelpers';
import { clamp } from '../utils/random';
import { saveData, loadData } from '../database/gameRepository';
import { DEFAULT_START_AGE, MIN_START_AGE } from '../constants/gameConfig';

interface PlayerStore {
  player: Player | null;

  // Actions
  createPlayer: (data: CreatePlayerData) => void;
  loadPlayer: () => void;
  updateStats: (changes: Array<{ stat: keyof PlayerStats; delta: number }>) => void;
  setStatDirect: (stat: keyof PlayerStats, value: number) => void;
  addMoney: (amount: number) => void;
  save: () => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  player: null,

  createPlayer(data) {
    const archetype = getArchetype(data.archetype);
    const stats = buildStartingStats(archetype);
    const player: Player = {
      id: `player-${Date.now()}`,
      artistName: data.artistName,
      realName: data.realName,
      gender: data.gender,
      genre: data.genre,
      city: data.city,
      archetype: data.archetype,
      stats,
      money: archetype.startingMoney,
      week: 1,
      createdAt: Date.now(),
      startAge: Math.max(MIN_START_AGE, Math.round(data.startAge)),
    };
    set({ player });
    saveData('player', player);
  },

  loadPlayer() {
    const saved = loadData<Player>('player');
    if (!saved) return;
    // Saves from before age existed get a default start age.
    const startAge =
      typeof saved.startAge === 'number' ? saved.startAge : DEFAULT_START_AGE;
    set({ player: { ...saved, startAge } });
  },

  updateStats(changes) {
    const { player } = get();
    if (!player) return;
    const next = applyStatDelta(player.stats, changes);
    set({ player: { ...player, stats: next } });
  },

  setStatDirect(stat, value) {
    const { player } = get();
    if (!player) return;
    const clamped = stat === 'fans' ? Math.max(0, value) : clamp(value, 0, 100);
    set({ player: { ...player, stats: { ...player.stats, [stat]: clamped } } });
  },

  addMoney(amount) {
    const { player } = get();
    if (!player) return;
    set({ player: { ...player, money: Math.max(0, player.money + amount) } });
  },

  save() {
    const { player } = get();
    if (player) saveData('player', player);
  },

  reset() {
    set({ player: null });
  },
}));
