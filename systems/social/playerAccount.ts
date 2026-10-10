import type { Platform, SocialPost, NpcAccount } from '../../types/social';
import type { Player } from '../../types/player';
import type { Track } from '../../types/music';
import { getGenre } from '../../data/genres';
import { genreLabel } from '../../utils/formatters';
import { algorithmOf } from './platformAlgorithms';

/**
 * THE ARTIST'S OWN ACCOUNTS.
 *
 * Every app on the phone has the artist's own profile. None of it is stored:
 * follower counts come from the fanbase and each platform's pull, and the
 * artist's posts are their releases, so a profile can never drift from the
 * sim. Deterministic (no Math.random): the same state always renders the same
 * numbers, so a profile doesn't reshuffle on every visit.
 */

export interface PlayerAccount {
  platform: Platform;
  /** An NpcAccount-shaped view so the artist's posts render like any other. */
  account: NpcAccount;
  bio: string;
  following: number;
  /** Lifetime likes across the artist's posts (TokTalk's profile shows it). */
  likes: number;
}

/** Small stable hash, so per-artist numbers don't change between renders. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function playerHandle(player: Player): string {
  const slug = player.artistName.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return slug.length > 0 ? slug : `artist${hash(player.id) % 10_000}`;
}

/** How much of the fanbase follows the artist on each platform. */
function followerShare(player: Player, platform: Platform): number {
  const g = getGenre(player.genre);
  switch (platform) {
    case 'chirper':
      return 0.42;
    case 'flashpic':
      return 0.55 + g.mainstreamScore * 0.02;
    case 'tunetok':
      return 0.35 + g.viralPotential * 0.05;
    case 'vibestream':
      return 0.12;
  }
}

function followersOn(player: Player, platform: Platform): number {
  // Friends and family follow even an unknown.
  const base = 30 + (hash(`${player.id}:${platform}:base`) % 90);
  return Math.round(base + player.stats.fans * followerShare(player, platform));
}

function bioFor(player: Player, platform: Platform, latest: Track | null): string {
  const genre = genreLabel(player.genre);
  switch (platform) {
    case 'chirper':
      return latest
        ? `${genre} out of ${player.city}. "${latest.title}" out now.`
        : `${genre} out of ${player.city}. new music soon.`;
    case 'flashpic':
      return `${genre} 🎙️ ${player.city}\n${latest ? `"${latest.title}" ↓ link in bio` : 'something’s coming…'}`;
    case 'tunetok':
      return latest ? `🎧 use my sound "${latest.title}"` : `${genre} from ${player.city} 🎧`;
    case 'vibestream':
      return `${genre} artist · ${player.city}`;
  }
}

/** Posts for each platform get a slightly different voice. */
const RELEASE_LINES: Record<Platform, string[]> = {
  chirper: [
    '"{title}" is out now. go run it up',
    'NEW MUSIC. "{title}". that’s it that’s the tweet',
    '"{title}" out everywhere. tell a friend to tell a friend',
    'i made "{title}" for the ones who stayed. it’s yours now',
  ],
  flashpic: [
    '"{title}" out now 🖤 link in bio',
    'a new chapter. "{title}" ✨',
    'this one’s personal. "{title}" out everywhere 🕊️',
  ],
  tunetok: [
    'the hook of "{title}" lives in my head rent free now it’s yours 🎧',
    'POV: you just found "{title}" #fyp',
    'use my sound "{title}" and i’ll duet the best one',
  ],
  vibestream: ['"{title}" is out now.'],
};

const MEDIA_LINES: Partial<Record<Platform, (t: Track) => SocialPost['media']>> = {
  flashpic: (t) => ({ kind: 'image', description: `📸 cover art for "${t.title}"` }),
  tunetok: (t) => ({ kind: 'video', description: `🎬 0:15 — snippet of "${t.title}", straight from the studio` }),
};

/** The artist's own posts on a platform: one per release, newest first. */
function releasePosts(
  player: Player,
  platform: Platform,
  account: NpcAccount,
  discography: Track[]
): SocialPost[] {
  const algo = algorithmOf(platform);
  return discography.map((t) => {
    const h = hash(`${t.id}:${platform}`);
    const lines = RELEASE_LINES[platform];
    const content = lines[h % lines.length].replace(/\{title\}/g, t.title);
    // The artist's own reach, lifted by how good and how big the song was.
    const reach =
      Math.pow(account.followers + 1, algo.reachExp) *
        algo.reachMul *
        (0.6 + t.quality / 100) *
        (t.wentViral ? 3.2 : 1) +
      t.totalStreams * 0.015;
    const spread = 0.85 + (h % 31) / 100;
    const views = Math.round(reach * algo.viewMul * spread);
    return {
      id: `me-${platform}-${t.id}`,
      platform,
      account,
      content,
      sentiment: 'hype' as const,
      likes: Math.round(views * algo.rates.like * 1.3),
      reposts: Math.round(views * algo.rates.repost),
      replies: Math.round(views * algo.rates.comment),
      shares: Math.round(views * algo.rates.share),
      views,
      media: MEDIA_LINES[platform]?.(t),
      week: t.releasedAtWeek,
    };
  });
}

export function playerAccount(
  player: Player,
  platform: Platform,
  discography: Track[]
): PlayerAccount & { posts: SocialPost[] } {
  const followers = followersOn(player, platform);
  const account: NpcAccount = {
    id: 'player',
    username: player.artistName,
    handle: playerHandle(player),
    accountType: 'public',
    followers,
    isVerified: player.stats.fans >= 200_000,
    preferredPlatforms: [platform],
  };
  const posts = releasePosts(player, platform, account, discography);
  return {
    platform,
    account,
    bio: bioFor(player, platform, discography[0] ?? null),
    following: 80 + (hash(`${player.id}:${platform}:following`) % 420),
    likes: posts.reduce((sum, p) => sum + p.likes, 0),
    posts,
  };
}
