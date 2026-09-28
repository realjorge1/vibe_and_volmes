import type { Beat, BeatGenre } from '../../types/audio';
import type { MusicGenre } from '../../types/player';

/**
 * Cosmetic premium beat packs. Delivered ONLY when the owning CosmeticItem
 * (matching `packId`) is owned. Critically, their `quality`/`producerReputation`
 * distribution mirrors the free catalog (data/beats/beatCatalog) — a pack buys
 * variety and flavor, never a mechanical edge. No shipped audio assets (asset
 * null): fully selectable in the sim, just silent, exactly like unshipped free
 * beats.
 */

const FLATTERS: Record<BeatGenre, MusicGenre[]> = {
  trap: ['hip-hop'],
  drill: ['hip-hop'],
  afrobeats: ['pop', 'r&b', 'latin'],
  'r&b': ['r&b', 'pop'],
  pop: ['pop', 'electronic'],
  indie: ['rock', 'pop'],
  hyperpop: ['electronic', 'pop'],
};

const LICENSE = 'Premium cosmetic pack — replace with your own licensed instrumental.';

type RawPremiumBeat = Omit<Beat, 'asset' | 'flattersGenres' | 'license' | 'premium'>;

const RAW: RawPremiumBeat[] = [
  // ── Pack: After Hours (lo-fi / late night) ──
  { id: 'pk-afterhours-velour', packId: 'pack-after-hours', title: 'Velour', producer: 'Prod. Mirage', genre: 'r&b', mood: 'dreamy', bpm: 78, musicalKey: 'D maj', durationSec: 119, quality: 84, producerReputation: 76 },
  { id: 'pk-afterhours-streetlight', packId: 'pack-after-hours', title: 'Streetlight', producer: 'Prod. Mirage', genre: 'r&b', mood: 'sad', bpm: 82, musicalKey: 'B min', durationSec: 117, quality: 79, producerReputation: 70 },
  { id: 'pk-afterhours-noir', packId: 'pack-after-hours', title: 'Noir', producer: 'Prod. Sablon', genre: 'trap', mood: 'dark', bpm: 134, musicalKey: 'C# min', durationSec: 116, quality: 81, producerReputation: 73 },

  // ── Pack: Main Stage (festival / triumphant) ──
  { id: 'pk-mainstage-ignite', packId: 'pack-main-stage', title: 'Ignite', producer: 'Prod. Apex', genre: 'pop', mood: 'triumphant', bpm: 126, musicalKey: 'E maj', durationSec: 115, quality: 88, producerReputation: 85 },
  { id: 'pk-mainstage-skyline', packId: 'pack-main-stage', title: 'Skyline', producer: 'Prod. Apex', genre: 'pop', mood: 'hype', bpm: 122, musicalKey: 'A maj', durationSec: 114, quality: 85, producerReputation: 80 },
  { id: 'pk-mainstage-anthem', packId: 'pack-main-stage', title: 'Anthem', producer: 'Prod. Vela', genre: 'afrobeats', mood: 'triumphant', bpm: 110, musicalKey: 'G maj', durationSec: 120, quality: 83, producerReputation: 77 },
];

export const PREMIUM_BEATS: Beat[] = RAW.map((b) => ({
  ...b,
  asset: null,
  flattersGenres: FLATTERS[b.genre],
  license: LICENSE,
  premium: true,
}));

export function premiumBeatsForPacks(ownedPackIds: string[]): Beat[] {
  const owned = new Set(ownedPackIds);
  return PREMIUM_BEATS.filter((b) => b.packId && owned.has(b.packId));
}

export function getPremiumBeat(id: string | null): Beat | null {
  if (!id) return null;
  return PREMIUM_BEATS.find((b) => b.id === id) ?? null;
}
