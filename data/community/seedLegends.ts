import type { CommunityLegend } from '../../types/sync';

/**
 * Bundled, offline "hall of fame". These ship with the game so Community
 * Discovery works with zero network — the local sync adapter serves these
 * plus the player's own retired careers. When/if a real async community
 * layer is enabled, fetched entries simply augment this list. Pure content.
 */
export const SEED_LEGENDS: CommunityLegend[] = [
  {
    id: 'seed-aurelia',
    artistName: 'AURELIA',
    identityTitle: 'The Authentic Legend',
    legacyTier: 'immortal',
    legacyTotal: 921,
    era: 'The Streaming Boom',
    signatureMoment:
      'Turned down a $40M deal on live radio and outsold the label that offered it',
    seeded: true,
  },
  {
    id: 'seed-vex',
    artistName: 'VEX MONROE',
    identityTitle: 'The Cancelled Icon',
    legacyTier: 'legend',
    legacyTotal: 788,
    era: 'The Short-Video Age',
    signatureMoment:
      'Cancelled three times, headlined a stadium each time after',
    seeded: true,
  },
  {
    id: 'seed-koi',
    artistName: 'KOI',
    identityTitle: 'The Cult Favorite',
    legacyTier: 'icon',
    legacyTotal: 604,
    era: 'The Blog Era',
    signatureMoment:
      'Never charted higher than #60. Sold out every venue for nineteen years',
    seeded: true,
  },
  {
    id: 'seed-saint',
    artistName: 'SAINT AUGUST',
    identityTitle: 'The Tragic Prodigy',
    legacyTier: 'legend',
    legacyTotal: 742,
    era: 'The AI Flood',
    signatureMoment:
      'The last fully human #1 before the flood — released, then vanished',
    seeded: true,
  },
  {
    id: 'seed-dynasty',
    artistName: 'THE HALE DYNASTY',
    identityTitle: 'The Untouchable Mogul',
    legacyTier: 'immortal',
    legacyTotal: 880,
    era: 'Post-Authenticity',
    signatureMoment: 'Bought the streaming platform that tried to bury them',
    seeded: true,
  },
];
