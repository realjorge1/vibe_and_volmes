import type { Bloodline } from '../../types/meta';

/**
 * Bloodlines = inherited reputation from a previous LEGENDARY run. Each is
 * gated behind retiring at a high tier with a matching identity, and grants
 * a themed StartingPerk (see data/meta/perks). This is the long-tail
 * retention hook: a legend you build now seeds the artist you build next.
 */
export const BLOODLINES: Bloodline[] = [
  {
    id: 'house-of-legends',
    label: 'House of Legends',
    lore: 'Your name already means something. People expect greatness — and resent it.',
    unlockIdentity: ['authentic-legend', 'untouchable-mogul'],
    unlockTier: 'legend',
    perkId: 'second-generation',
  },
  {
    id: 'cursed-bloodline',
    label: 'The Cursed Bloodline',
    lore: 'The last one burned bright and burned out. The industry remembers, and it is watching you for the same cracks.',
    unlockIdentity: ['tragic-prodigy', 'cancelled-icon'],
    unlockTier: 'icon',
    perkId: 'thick-skin',
  },
  {
    id: 'old-craft',
    label: 'Keeper of the Old Craft',
    lore: 'A revered cult artist taught you everything before they vanished. The craft is in your hands now.',
    unlockIdentity: ['cult-favorite', 'chaotic-genius'],
    unlockTier: 'icon',
    perkId: 'old-soul',
  },
  {
    id: 'dynasty',
    label: 'The Dynasty',
    lore: 'An empire was built and left to you. Now prove it was not just the money.',
    unlockIdentity: ['untouchable-mogul', 'commercial-sellout'],
    unlockTier: 'legend',
    perkId: 'war-chest',
  },
];

export function getBloodline(id: string): Bloodline | undefined {
  return BLOODLINES.find((b) => b.id === id);
}
