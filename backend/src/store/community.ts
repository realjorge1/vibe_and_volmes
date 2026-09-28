import type { CommunityLegend, PublishedStoryCard } from '../types/contracts';

/**
 * Community legend store. In-memory for now (seed legends + careers players
 * publish this process lifetime). Everything goes through these functions so
 * swapping in a real database (Render Postgres / a disk volume) later is a
 * one-file change with no route or client impact. Mirrors the client's bundled
 * SEED_LEGENDS (app data/community/seedLegends.ts) so discovery looks the same
 * online or off.
 */

const SEED_LEGENDS: CommunityLegend[] = [
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
    signatureMoment: 'Cancelled three times, headlined a stadium each time after',
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
    legacyTotal: 880,
    legacyTier: 'immortal',
    era: 'Post-Authenticity',
    signatureMoment: 'Bought the streaming platform that tried to bury them',
    seeded: true,
  },
];

/** Player-published careers, newest first. Capped to keep memory bounded. */
const published: CommunityLegend[] = [];
const MAX_PUBLISHED = 1000;

function titleCase(s: string): string {
  return s
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

export function publishCareer(card: PublishedStoryCard): { ok: boolean; id: string } {
  const id = `pub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  published.unshift({
    id,
    artistName: card.artistName || 'Unknown Artist',
    identityTitle: card.tagline ? titleCase(card.tagline) : 'The Newcomer',
    legacyTier: card.legacyTier ?? 'respected',
    legacyTotal: Number.isFinite(card.legacyTotal) ? Number(card.legacyTotal) : 0,
    era: 'Community',
    signatureMoment: card.signatureMoment ?? 'A career worth remembering',
    seeded: false,
  });
  if (published.length > MAX_PUBLISHED) published.length = MAX_PUBLISHED;
  return { ok: true, id };
}

export function fetchLegends(limit: number): CommunityLegend[] {
  return [...published, ...SEED_LEGENDS].slice(0, limit);
}

export function fetchHallOfFame(limit: number): CommunityLegend[] {
  return [...published, ...SEED_LEGENDS]
    .sort((a, b) => b.legacyTotal - a.legacyTotal)
    .slice(0, limit);
}
