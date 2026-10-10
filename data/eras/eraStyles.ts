import type { EraAestheticDef, EraPersona, EraPersonaDef } from '../../types/identity';

/**
 * Eras: the looks and personas an artist moves through. Picking one is the
 * game's character-creator moment, done again every time the artist
 * reinvents. The persona is the part with teeth: it moves numbers for as long
 * as the era lasts.
 */

/** Signature colors an era can take (the Deck and the Chronicle wear it). */
export const ERA_COLORS: readonly string[] = [
  '#8B6CFF', // violet
  '#FF4FA3', // hot pink
  '#36D6FF', // cyan
  '#FFCE5C', // gold
  '#3BE8A6', // mint
  '#FF5470', // red
  '#FF8A3D', // orange
  '#B9B5D6', // silver
  '#1FC98A', // emerald
  '#4DA8FF', // blue
];

export const ERA_AESTHETICS: EraAestheticDef[] = [
  { id: 'noir', label: 'Noir', blurb: 'Black and white, cigarette smoke, rain on the window.', icon: 'contrast' },
  { id: 'y2k', label: 'Y2K', blurb: 'Chrome, butterflies, flip phones, low-rise everything.', icon: 'phone-portrait' },
  { id: 'luxe', label: 'Luxe', blurb: 'Gold, velvet, champagne towers, private jets.', icon: 'diamond' },
  { id: 'grunge', label: 'Grunge', blurb: 'Thrifted, torn, unwashed on purpose.', icon: 'shirt' },
  { id: 'futurist', label: 'Futurist', blurb: 'Neon, holograms, the sound of next year.', icon: 'planet' },
  { id: 'retro', label: 'Retro', blurb: 'Seventies film grain, flares and soul.', icon: 'disc' },
  { id: 'minimal', label: 'Minimal', blurb: 'White rooms, plain tees, one word titles.', icon: 'square-outline' },
  { id: 'western', label: 'Western', blurb: 'Boots, desert highways, sunset gold.', icon: 'sunny' },
  { id: 'gothic', label: 'Gothic', blurb: 'Lace, candles, cathedrals and heartbreak.', icon: 'moon' },
  { id: 'sport', label: 'Sport', blurb: 'Jerseys, track suits, stadium lights.', icon: 'basketball' },
];

export const ERA_PERSONAS: EraPersonaDef[] = [
  {
    id: 'sweetheart',
    label: 'Sweetheart',
    blurb: 'Soft, open, adored. The internet’s little sibling.',
    icon: 'heart',
    streamsMult: 1.05,
    criticsBonus: 0,
    weekly: { reputation: 0.5, fanLoyalty: 0.3 },
    valence: 60,
  },
  {
    id: 'villain',
    label: 'Villain',
    blurb: 'Every interview a threat. Every song a diss. Controversy sells.',
    icon: 'skull',
    streamsMult: 1.12,
    criticsBonus: 0,
    weekly: { reputation: -0.6, charisma: 0.3 },
    valence: -20,
  },
  {
    id: 'mysterious',
    label: 'Mysterious',
    blurb: 'No posts, no interviews, then everything at once.',
    icon: 'eye-off',
    streamsMult: 1.08,
    criticsBonus: 3,
    weekly: { authenticity: 0.3 },
    valence: 20,
  },
  {
    id: 'party',
    label: 'Party',
    blurb: 'Big hooks, bright lights, no thoughts. The summer era.',
    icon: 'wine',
    streamsMult: 1.1,
    criticsBonus: -5,
    weekly: { charisma: 0.3 },
    valence: 40,
  },
  {
    id: 'conscious',
    label: 'Conscious',
    blurb: 'Saying something. Critics lean in; radio leans out.',
    icon: 'bulb',
    streamsMult: 0.95,
    criticsBonus: 7,
    weekly: { authenticity: 0.5, industryRespect: 0.3 },
    valence: 30,
  },
  {
    id: 'heartbroken',
    label: 'Heartbroken',
    blurb: 'Every song about one person. Everyone knows who.',
    icon: 'heart-dislike',
    streamsMult: 1.04,
    criticsBonus: 4,
    weekly: { fanLoyalty: 0.4, mentalHealth: -0.4 },
    valence: 35,
  },
];

const PERSONA = new Map(ERA_PERSONAS.map((p) => [p.id, p]));
const AESTHETIC = new Map(ERA_AESTHETICS.map((a) => [a.id, a]));

export function getPersona(id: EraPersona): EraPersonaDef {
  return PERSONA.get(id) ?? ERA_PERSONAS[0];
}

export function getAesthetic(id: string): EraAestheticDef | undefined {
  return AESTHETIC.get(id);
}

/** Era names to suggest when the field is empty. */
export const ERA_NAME_IDEAS: readonly string[] = [
  'Velvet',
  'Neon Hymns',
  'Glass House',
  'Midnight Run',
  'Gold Teeth',
  'Static',
  'Paper Crown',
  'Afterglow',
  'Burn Book',
  'Holy Water',
  'Wildfire',
  'Satellite',
];

/** A new era needs this many weeks since the last one or it reads as flailing. */
export const ERA_MIN_WEEKS = 8;
/** After this long, the era starts to feel stale (releases get less pull). */
export const ERA_STALE_WEEKS = 30;
/** Releases right after a new era begins get the novelty lift. */
export const ERA_NOVELTY_WEEKS = 10;
export const ERA_NOVELTY_MULT = 1.15;
export const ERA_STALE_MULT = 0.9;
/** What a rollout costs (photographer, stylist, set). Scales with fame. */
export function eraRolloutCost(fans: number): number {
  return Math.round(Math.min(150_000, 500 + fans * 0.02) / 100) * 100;
}
