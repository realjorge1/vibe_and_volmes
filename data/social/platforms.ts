import type { Platform } from '../../types/social';

/**
 * In-game platform identities. The underlying `Platform` union is kept
 * (chirper/flashpic/tunetok/vibestream) so nothing downstream churns;
 * this is the *presentation* layer that gives each its own feel —
 * emotionally mirroring Twitter / IG / TikTok-gossip / music-news.
 */
export interface PlatformIdentity {
  id: Platform;
  /** Display name shown everywhere in the UI. */
  name: string;
  tagline: string;
  color: string;
  /** Engagement verbs, platform-flavored. */
  likeIcon: string;
  repostIcon: string;
  replyIcon: string;
  /** How its feed reads — drives sort + density. */
  vibe: 'timeline' | 'visual' | 'viral' | 'news';
}

export const PLATFORMS: Record<Platform, PlatformIdentity> = {
  chirper: {
    id: 'chirper',
    name: 'Chirp',
    tagline: 'where the discourse never sleeps',
    color: '#1DA1F2',
    likeIcon: '♥',
    repostIcon: '↻',
    replyIcon: '💬',
    vibe: 'timeline',
  },
  flashpic: {
    id: 'flashpic',
    name: 'VibeSnap',
    tagline: 'the aesthetic. the lifestyle. the flex.',
    color: '#E1306C',
    likeIcon: '❤',
    repostIcon: '↗',
    replyIcon: '🗨',
    vibe: 'visual',
  },
  tunetok: {
    id: 'tunetok',
    name: 'HypeFeed',
    tagline: 'if it’s not viral here it didn’t happen',
    color: '#69C9D0',
    likeIcon: '🤍',
    repostIcon: '⇆',
    replyIcon: '💬',
    vibe: 'viral',
  },
  vibestream: {
    id: 'vibestream',
    name: 'PulseNews',
    tagline: 'music industry. breaking. always.',
    color: '#7B4FFF',
    likeIcon: '▲',
    repostIcon: '↻',
    replyIcon: '✎',
    vibe: 'news',
  },
};

export const PLATFORM_ORDER: Platform[] = [
  'chirper',
  'flashpic',
  'tunetok',
  'vibestream',
];

export function platformOf(id: Platform): PlatformIdentity {
  return PLATFORMS[id];
}
