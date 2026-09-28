import type { Beat, BeatGenre } from '../../types/audio';
import type { MusicGenre } from '../../types/player';
import { resolveBeatAsset } from './beatAssets';
import { getPremiumBeat } from '../premium/premiumBeats';

const FLATTERS: Record<BeatGenre, MusicGenre[]> = {
  trap: ['hip-hop'],
  drill: ['hip-hop'],
  afrobeats: ['pop', 'r&b', 'latin'],
  'r&b': ['r&b', 'pop'],
  pop: ['pop', 'electronic'],
  indie: ['rock', 'pop'],
  hyperpop: ['electronic', 'pop'],
};

const CC0 = 'Replace with your own royalty-free / CC0 instrumental.';

type RawBeat = Omit<Beat, 'asset' | 'flattersGenres' | 'license'>;

const RAW: RawBeat[] = [
  // ── Trap ──
  { id: 'trap-midnight-bloom', title: 'Midnight Bloom', producer: 'Prod. NOVA', genre: 'trap', mood: 'dark', bpm: 140, musicalKey: 'F# min', durationSec: 118, quality: 82, producerReputation: 78 },
  { id: 'trap-foreign-engine', title: 'Foreign Engine', producer: 'Prod. KZ', genre: 'trap', mood: 'hype', bpm: 146, musicalKey: 'C min', durationSec: 112, quality: 74, producerReputation: 62 },
  { id: 'trap-glass-tears', title: 'Glass Tears', producer: 'Prod. Lune', genre: 'trap', mood: 'melodic', bpm: 132, musicalKey: 'A min', durationSec: 120, quality: 79, producerReputation: 70 },
  { id: 'trap-velvet-smoke', title: 'Velvet Smoke', producer: 'Prod. Lune', genre: 'trap', mood: 'melodic', bpm: 136, musicalKey: 'D# min', durationSec: 118, quality: 80, producerReputation: 70 },
  { id: 'trap-paranoia', title: 'Paranoia', producer: 'Prod. Ghost', genre: 'trap', mood: 'dark', bpm: 138, musicalKey: 'B min', durationSec: 116, quality: 77, producerReputation: 66 },
  { id: 'trap-victory-lap', title: 'Victory Lap', producer: 'Prod. NOVA', genre: 'trap', mood: 'triumphant', bpm: 144, musicalKey: 'G# min', durationSec: 114, quality: 84, producerReputation: 79 },

  // ── Drill ──
  { id: 'drill-cold-corner', title: 'Cold Corner', producer: 'Prod. Frost', genre: 'drill', mood: 'aggressive', bpm: 144, musicalKey: 'G min', durationSec: 110, quality: 76, producerReputation: 66 },
  { id: 'drill-sliding', title: 'Sliding', producer: 'Prod. Mira', genre: 'drill', mood: 'dark', bpm: 142, musicalKey: 'D min', durationSec: 115, quality: 71, producerReputation: 58 },
  { id: 'drill-no-hook', title: 'No Hook', producer: 'Prod. 8AM', genre: 'drill', mood: 'hype', bpm: 145, musicalKey: 'E min', durationSec: 108, quality: 68, producerReputation: 52 },
  { id: 'drill-trenches', title: 'Trenches', producer: 'Prod. Frost', genre: 'drill', mood: 'aggressive', bpm: 143, musicalKey: 'A min', durationSec: 110, quality: 75, producerReputation: 63 },
  { id: 'drill-midnight-run', title: 'Midnight Run', producer: 'Prod. Mira', genre: 'drill', mood: 'dark', bpm: 141, musicalKey: 'F min', durationSec: 112, quality: 72, producerReputation: 60 },
  { id: 'drill-opps-down', title: 'Opps Down', producer: 'Prod. 8AM', genre: 'drill', mood: 'hype', bpm: 146, musicalKey: 'C# min', durationSec: 107, quality: 70, producerReputation: 56 },

  // ── Afrobeats ──
  { id: 'afro-lagos-nights', title: 'Lagos Nights', producer: 'Prod. Sade', genre: 'afrobeats', mood: 'romantic', bpm: 108, musicalKey: 'B maj', durationSec: 120, quality: 85, producerReputation: 80 },
  { id: 'afro-sunlight', title: 'Sunlight', producer: 'Prod. Ayo', genre: 'afrobeats', mood: 'triumphant', bpm: 112, musicalKey: 'F maj', durationSec: 117, quality: 77, producerReputation: 64 },
  { id: 'afro-slow-wind', title: 'Slow Wind', producer: 'Prod. Tola', genre: 'afrobeats', mood: 'melodic', bpm: 102, musicalKey: 'A maj', durationSec: 119, quality: 73, producerReputation: 60 },
  { id: 'afro-island-time', title: 'Island Time', producer: 'Prod. Ayo', genre: 'afrobeats', mood: 'romantic', bpm: 105, musicalKey: 'E maj', durationSec: 121, quality: 82, producerReputation: 74 },
  { id: 'afro-gold-coast', title: 'Gold Coast', producer: 'Prod. Sade', genre: 'afrobeats', mood: 'triumphant', bpm: 110, musicalKey: 'D maj', durationSec: 118, quality: 86, producerReputation: 82 },
  { id: 'afro-palm-wine', title: 'Palm Wine', producer: 'Prod. Tola', genre: 'afrobeats', mood: 'melodic', bpm: 100, musicalKey: 'G maj', durationSec: 122, quality: 75, producerReputation: 62 },

  // ── R&B ──
  { id: 'rnb-2am-text', title: '2AM Text', producer: 'Prod. Velvet', genre: 'r&b', mood: 'romantic', bpm: 88, musicalKey: 'E maj', durationSec: 120, quality: 88, producerReputation: 84 },
  { id: 'rnb-afterglow', title: 'Afterglow', producer: 'Prod. Sable', genre: 'r&b', mood: 'dreamy', bpm: 76, musicalKey: 'Db maj', durationSec: 118, quality: 80, producerReputation: 72 },
  { id: 'rnb-bruised', title: 'Bruised', producer: 'Prod. Onyx', genre: 'r&b', mood: 'sad', bpm: 82, musicalKey: 'C min', durationSec: 116, quality: 75, producerReputation: 63 },
  { id: 'rnb-silk-sheets', title: 'Silk Sheets', producer: 'Prod. Velvet', genre: 'r&b', mood: 'romantic', bpm: 84, musicalKey: 'A maj', durationSec: 119, quality: 87, producerReputation: 83 },
  { id: 'rnb-3am-confession', title: '3AM Confession', producer: 'Prod. Sable', genre: 'r&b', mood: 'dreamy', bpm: 72, musicalKey: 'F# maj', durationSec: 120, quality: 81, producerReputation: 73 },
  { id: 'rnb-overrated', title: 'Overrated', producer: 'Prod. Onyx', genre: 'r&b', mood: 'sad', bpm: 90, musicalKey: 'E min', durationSec: 115, quality: 76, producerReputation: 64 },

  // ── Pop ──
  { id: 'pop-neon-rush', title: 'Neon Rush', producer: 'Prod. Halo', genre: 'pop', mood: 'hype', bpm: 124, musicalKey: 'A maj', durationSec: 114, quality: 90, producerReputation: 88 },
  { id: 'pop-paper-hearts', title: 'Paper Hearts', producer: 'Prod. Júne', genre: 'pop', mood: 'melodic', bpm: 100, musicalKey: 'G maj', durationSec: 118, quality: 83, producerReputation: 74 },
  { id: 'pop-comeback', title: 'Comeback', producer: 'Prod. Stelle', genre: 'pop', mood: 'triumphant', bpm: 118, musicalKey: 'D maj', durationSec: 115, quality: 86, producerReputation: 81 },
  { id: 'pop-supernova', title: 'Supernova', producer: 'Prod. Halo', genre: 'pop', mood: 'hype', bpm: 128, musicalKey: 'B maj', durationSec: 113, quality: 90, producerReputation: 88 },
  { id: 'pop-daydream', title: 'Daydream', producer: 'Prod. Júne', genre: 'pop', mood: 'melodic', bpm: 104, musicalKey: 'C maj', durationSec: 117, quality: 83, producerReputation: 75 },
  { id: 'pop-glow-up', title: 'Glow Up', producer: 'Prod. Stelle', genre: 'pop', mood: 'triumphant', bpm: 120, musicalKey: 'F maj', durationSec: 115, quality: 87, producerReputation: 82 },

  // ── Indie ──
  { id: 'indie-old-film', title: 'Old Film', producer: 'Prod. Wren', genre: 'indie', mood: 'dreamy', bpm: 96, musicalKey: 'C maj', durationSec: 120, quality: 72, producerReputation: 55 },
  { id: 'indie-static', title: 'Static', producer: 'Prod. Fawn', genre: 'indie', mood: 'sad', bpm: 90, musicalKey: 'A min', durationSec: 119, quality: 69, producerReputation: 50 },
  { id: 'indie-rooftops', title: 'Rooftops', producer: 'Prod. Cael', genre: 'indie', mood: 'triumphant', bpm: 112, musicalKey: 'E maj', durationSec: 117, quality: 76, producerReputation: 61 },
  { id: 'indie-polaroid', title: 'Polaroid', producer: 'Prod. Wren', genre: 'indie', mood: 'dreamy', bpm: 98, musicalKey: 'G maj', durationSec: 120, quality: 73, producerReputation: 56 },
  { id: 'indie-grey-skies', title: 'Grey Skies', producer: 'Prod. Fawn', genre: 'indie', mood: 'sad', bpm: 88, musicalKey: 'D min', durationSec: 121, quality: 70, producerReputation: 51 },
  { id: 'indie-first-light', title: 'First Light', producer: 'Prod. Cael', genre: 'indie', mood: 'triumphant', bpm: 110, musicalKey: 'A maj', durationSec: 118, quality: 77, producerReputation: 62 },

  // ── Hyperpop ──
  { id: 'hyper-sugar-crash', title: 'Sugar Crash', producer: 'Prod. GLO', genre: 'hyperpop', mood: 'hype', bpm: 160, musicalKey: 'F# maj', durationSec: 104, quality: 81, producerReputation: 69 },
  { id: 'hyper-melt', title: 'Melt', producer: 'Prod. KIT', genre: 'hyperpop', mood: 'dreamy', bpm: 150, musicalKey: 'B maj', durationSec: 108, quality: 78, producerReputation: 66 },
  { id: 'hyper-screwface', title: 'Screwface', producer: 'Prod. V3X', genre: 'hyperpop', mood: 'aggressive', bpm: 168, musicalKey: 'D min', durationSec: 102, quality: 74, producerReputation: 59 },
  { id: 'hyper-glitter-bomb', title: 'Glitter Bomb', producer: 'Prod. GLO', genre: 'hyperpop', mood: 'hype', bpm: 162, musicalKey: 'C# maj', durationSec: 103, quality: 82, producerReputation: 70 },
  { id: 'hyper-feels', title: 'Feels', producer: 'Prod. KIT', genre: 'hyperpop', mood: 'dreamy', bpm: 148, musicalKey: 'E maj', durationSec: 109, quality: 79, producerReputation: 67 },
  { id: 'hyper-rage-quit', title: 'Rage Quit', producer: 'Prod. V3X', genre: 'hyperpop', mood: 'aggressive', bpm: 170, musicalKey: 'F min', durationSec: 101, quality: 75, producerReputation: 60 },
];

export const BEAT_CATALOG: Beat[] = RAW.map((b) => ({
  ...b,
  asset: resolveBeatAsset(b.id),
  flattersGenres: FLATTERS[b.genre],
  license: CC0,
}));

export const BEAT_GENRES: BeatGenre[] = [
  'trap',
  'drill',
  'afrobeats',
  'r&b',
  'pop',
  'indie',
  'hyperpop',
];

export function getBeat(id: string | null): Beat | null {
  if (!id) return null;
  // Premium pack beats resolve here too so released songs that used one still
  // display correctly even if the owning pack isn't being browsed.
  return BEAT_CATALOG.find((b) => b.id === id) ?? getPremiumBeat(id);
}

export function beatsByGenre(genre: BeatGenre): Beat[] {
  return BEAT_CATALOG.filter((b) => b.genre === genre);
}
