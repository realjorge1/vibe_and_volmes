import type { HomeDef, HomeId } from '../../types/status';

/**
 * The home ladder: where the artist lives. Pure content. Each home sets the
 * economy's lifestyle tier (and so the weekly lifestyle burn in
 * systems/simulation/phase3Tick.ts) and nudges mental health and energy every
 * week — the text-only version of the Crib's mood bonus. The top two rungs
 * are unlocked by owning the matching property from the luxury catalog.
 */
export const HOMES: readonly HomeDef[] = [
  {
    id: 'childhood-bedroom',
    label: 'Childhood bedroom',
    title: 'your childhood bedroom',
    blurb: 'Posters, a single bed, and a parent who knocks.',
    lifestyleTier: 0,
    weekly: { mentalHealth: -1, energy: 1 },
    moveInLine: 'You moved back into your childhood bedroom. The glow-in-the-dark stars are still on the ceiling.',
  },
  {
    id: 'shared-apartment',
    label: 'Shared apartment',
    title: 'your shared apartment',
    blurb: 'Two roommates, one bathroom, thin walls.',
    lifestyleTier: 1,
    weekly: { mentalHealth: 0, energy: -1 },
    moveInLine: 'You moved into a shared apartment. Your roommate has already labeled the milk.',
  },
  {
    id: 'own-place',
    label: 'Your own place',
    title: 'your apartment',
    blurb: 'Your name on the lease, your rules, your mess.',
    lifestyleTier: 2,
    weekly: { mentalHealth: 1, energy: 1 },
    moveInLine: 'You got your own place. The first night, you played music as loud as you wanted.',
  },
  {
    id: 'penthouse',
    label: 'The penthouse',
    title: 'your penthouse',
    blurb: 'Floor-to-ceiling windows over the whole city.',
    lifestyleTier: 4,
    weekly: { mentalHealth: 2, energy: 2 },
    requiresItem: ['penthouse'],
    moveInLine: 'You moved into the penthouse. You can see the club where you played your first show.',
  },
  {
    id: 'mansion',
    label: 'The mansion',
    title: 'your mansion',
    blurb: 'A gate, a studio in the basement, rooms you never enter.',
    lifestyleTier: 5,
    weekly: { mentalHealth: 3, energy: 2, isolation: 1 },
    requiresItem: ['hills-mansion', 'private-estate'],
    moveInLine: 'You moved into the mansion. It echoes when you talk to yourself, which is more often now.',
  },
];

export function getHome(id: HomeId): HomeDef {
  return HOMES.find((h) => h.id === id) ?? HOMES[1];
}

/** Where a career starts: teenagers at home, everyone else sharing. */
export function startingHome(startAge: number): HomeId {
  return startAge <= 20 ? 'childhood-bedroom' : 'shared-apartment';
}
