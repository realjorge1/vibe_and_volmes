import type { LabelProfile } from '../../types/industry';

/**
 * Label roster. Data-driven and expandable — add a profile here and the
 * offer generator will start surfacing it once the player meets fame gates.
 * Tiers escalate in reach AND in exploitation risk: "success has a cost".
 */
export const LABELS: LabelProfile[] = [
  {
    id: 'self-released',
    name: 'Independent (Self-Released)',
    tier: 'independent',
    budget: 0,
    marketingPower: 8,
    artistReputation: 50,
    strictness: 0,
    exploitation: 0,
    genreBias: [],
    blurb: 'No deal. Total freedom, zero reach, every dollar is yours.',
  },
  {
    id: 'basement-tapes',
    name: 'Basement Tapes Collective',
    tier: 'indie',
    budget: 25_000,
    marketingPower: 28,
    artistReputation: 65,
    strictness: 20,
    exploitation: 10,
    genreBias: ['hip-hop', 'r&b', 'electronic'],
    blurb: 'Cred-heavy indie. They love you for the art and pay like it too.',
  },
  {
    id: 'neon-district',
    name: 'Neon District Records',
    tier: 'indie',
    budget: 70_000,
    marketingPower: 42,
    artistReputation: 60,
    strictness: 40,
    exploitation: 28,
    genreBias: ['pop', 'electronic'],
    blurb: 'Tastemaker indie with playlist plugs. Friendly until you sell.',
  },
  {
    id: 'goldline',
    name: 'Goldline Music Group',
    tier: 'major',
    budget: 400_000,
    marketingPower: 72,
    artistReputation: 55,
    strictness: 65,
    exploitation: 55,
    genreBias: ['pop', 'hip-hop', 'latin'],
    blurb: 'A real major. Massive push, brutal contracts, owns your masters.',
  },
  {
    id: 'apex-worldwide',
    name: 'Apex Worldwide',
    tier: 'major',
    budget: 1_200_000,
    marketingPower: 92,
    artistReputation: 45,
    strictness: 85,
    exploitation: 78,
    genreBias: ['pop', 'hip-hop'],
    blurb: 'The machine. Global domination guaranteed. They will own you.',
  },
];

export function getLabel(id: string): LabelProfile | undefined {
  return LABELS.find((l) => l.id === id);
}

export const SELF_RELEASED_ID = 'self-released';
