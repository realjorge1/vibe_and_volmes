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
  /** Home-screen app icon: the face gradient (top → bottom) and its logo mark. */
  icon: { colors: readonly [string, string, ...string[]]; mark: 'bird' | 'lens' | 'note' | 'pulse' };
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
    icon: { colors: ['#5CC2FF', '#1D8CF0', '#0B5FC4'], mark: 'bird' },
  },
  flashpic: {
    id: 'flashpic',
    name: 'VibeGram',
    tagline: 'the aesthetic. the lifestyle. the flex.',
    color: '#E1306C',
    likeIcon: '❤',
    repostIcon: '↗',
    replyIcon: '🗨',
    vibe: 'visual',
    icon: { colors: ['#FFC65C', '#FF5E62', '#E1306C', '#8A3AB9'], mark: 'lens' },
  },
  tunetok: {
    id: 'tunetok',
    name: 'TokTalk',
    tagline: 'if it’s not viral here it didn’t happen',
    color: '#69C9D0',
    likeIcon: '🤍',
    repostIcon: '⇆',
    replyIcon: '💬',
    vibe: 'viral',
    icon: { colors: ['#2A2A33', '#101014', '#050507'], mark: 'note' },
  },
  vibestream: {
    id: 'vibestream',
    name: 'VibeNews',
    tagline: 'music industry. breaking. always.',
    color: '#7B4FFF',
    likeIcon: '▲',
    repostIcon: '↻',
    replyIcon: '✎',
    vibe: 'news',
    icon: { colors: ['#FF6B6B', '#E3294A', '#9E1238'], mark: 'pulse' },
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
