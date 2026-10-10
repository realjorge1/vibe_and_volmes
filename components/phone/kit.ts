import type { AccountType, NpcAccount, Platform, PostSentiment, SocialPost, TrendKind } from '../../types/social';
import { NPC_ACCOUNTS } from '../../data/social/npcAccounts';
import { regularById } from '../../data/social/everyday/accounts';
import { castBio, castMemberOf } from '../../systems/social/celebContext';

/**
 * Small deterministic helpers shared by the phone apps: stable hashes so an
 * account always has the same avatar, a post always has the same art and the
 * same "3h ago", however often it re-renders.
 */

export function hashOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const AVATAR_PAIRS: readonly (readonly [string, string])[] = [
  ['#FF9A8B', '#C2415D'],
  ['#8EC5FC', '#3E64D8'],
  ['#F6D365', '#E0782F'],
  ['#84FAB0', '#1F9C7A'],
  ['#C471F5', '#6A2FC4'],
  ['#FBC2EB', '#B0438F'],
  ['#5EE7DF', '#2B7FBF'],
  ['#FFD86F', '#C9832F'],
  ['#A1C4FD', '#5B5FD8'],
  ['#FF7EB3', '#D13A6B'],
];

export function avatarColors(id: string): readonly [string, string] {
  return AVATAR_PAIRS[hashOf(id) % AVATAR_PAIRS.length];
}

/** "3h", "2w" — in-game weeks, with a stable fake hour for this week's posts. */
export function postAge(post: SocialPost, week: number): string {
  const diff = week - post.week;
  if (diff <= 0) return `${(hashOf(post.id) % 22) + 1}h`;
  return `${diff}w`;
}

/** The long form some apps print under a post ("3 HOURS AGO"). */
export function postAgeLong(post: SocialPost, week: number): string {
  const diff = week - post.week;
  if (diff <= 0) {
    const h = (hashOf(post.id) % 22) + 1;
    return `${h} hour${h === 1 ? '' : 's'} ago`;
  }
  return `${diff} week${diff === 1 ? '' : 's'} ago`;
}

/** Media descriptions carry a leading emoji and, for clips, a runtime. */
export function mediaCaption(description: string): { runtime: string | null; text: string } {
  const runtime = description.match(/(\d:\d\d)/)?.[1] ?? null;
  const text = description
    .replace(/^[^\w"'\u201C(]+/, '')
    .replace(/^\d:\d\d\s*[—-]\s*/, '')
    .trim();
  return { runtime, text };
}

type Mood = 'bright' | 'calm' | 'dark';

const MOOD: Record<PostSentiment, Mood> = {
  hype: 'bright',
  positive: 'bright',
  meme: 'bright',
  neutral: 'calm',
  news: 'calm',
  critical: 'dark',
  shade: 'dark',
  hostile: 'dark',
};

const PALETTES: Record<Mood, readonly (readonly [string, string, string])[]> = {
  bright: [
    ['#FFB36B', '#FF4F8B', '#6B2FD6'],
    ['#FFE17A', '#FF8A4C', '#D6336C'],
    ['#7CF5C8', '#2AA8F0', '#5B3FD8'],
    ['#FF9AD5', '#B35CFF', '#3A2A9E'],
    ['#FFD1A1', '#F76B8A', '#7A2D8C'],
  ],
  calm: [
    ['#9DB7D8', '#4A5F8C', '#1C2440'],
    ['#C9B8A6', '#6E5A4E', '#241B17'],
    ['#8FD3C8', '#3D7A83', '#122A33'],
    ['#B7A7E0', '#5A4C8F', '#1D1838'],
  ],
  dark: [
    ['#6B6B7B', '#2B2B36', '#0B0B10'],
    ['#8C3A45', '#3A1520', '#0E0508'],
    ['#4F5663', '#1E2229', '#08090C'],
  ],
};

export function artPalette(post: SocialPost): readonly [string, string, string] {
  const set = PALETTES[MOOD[post.sentiment]];
  return set[hashOf(post.id) % set.length];
}

/** Pick a subject glyph for procedural post art from what the post is about. */
const SUBJECTS: readonly (readonly [RegExp, string])[] = [
  [/jet|plane|flight|airport/i, 'airplane'],
  [/car|drive|parking/i, 'car-sport'],
  [/vinyl|record|album|cover art/i, 'disc'],
  [/mic|stage|live|crowd|concert|tour|fancam/i, 'mic'],
  [/studio|notebook|writing/i, 'headset'],
  [/dance|choreo|challenge/i, 'body'],
  [/chain|fit|drip|outfit|mirror/i, 'diamond'],
  [/contract|deal|label|signed/i, 'document-text'],
  [/chart|number|#1|streams/i, 'trending-up'],
  [/receipt|screenshot|circled/i, 'eye'],
  [/cry|hug|love/i, 'heart'],
  [/song|sound|track|hook|snippet|single/i, 'musical-notes'],
];

export function artGlyph(post: SocialPost): string {
  const text = `${post.media?.description ?? ''} ${post.content}`;
  for (const [re, glyph] of SUBJECTS) if (re.test(text)) return glyph;
  if (MOOD[post.sentiment] === 'dark') return 'flash';
  return post.media?.kind === 'video' ? 'videocam' : 'camera';
}

/** A one-line bio for someone else's profile, by what kind of account it is. */
export const ACCOUNT_BIO: Record<AccountType, string> = {
  stan: 'fan account. notifications on 🔔 streaming is a lifestyle',
  fan: 'music is the whole personality 🎧',
  critic: 'Music critic. Reviews, takes, receipts.',
  gossip: 'the tea, first. tips in the DMs 👀',
  'rival-fan': 'fan account for the REAL number one',
  industry: 'Charts, deals and data from inside the business.',
  public: 'just here for the music',
  news: 'Music news, as it breaks.',
  hater: 'saying what everyone is thinking. no I will not log off',
  artist: 'Artist. New music out now.',
};

export const ACCOUNT_KIND: Record<AccountType, string> = {
  stan: 'Stan account',
  fan: 'Fan',
  critic: 'Music critic',
  gossip: 'Gossip page',
  'rival-fan': 'Rival fanbase',
  industry: 'Industry',
  public: 'Listener',
  news: 'Music news',
  hater: 'Hater',
  artist: 'Artist',
};

/** What an account's profile says: a regular's own bio, an artist's, a fan account's, or the type's. */
export function bioOf(account: NpcAccount): string {
  const regular = regularById(account.id);
  if (regular) return regular.bio;
  const artist = castBio(account.id);
  if (artist) return artist;
  if (account.id.startsWith('cf-')) {
    const idol = castMemberOf(account.id);
    if (idol) return `fan account for ${idol.name} 🔔 not affiliated`;
  }
  return ACCOUNT_BIO[account.accountType];
}

export function followingOf(account: NpcAccount): number {
  return 40 + (hashOf(`${account.id}:following`) % 1600);
}

/** A stable handful of accounts on the platform, e.g. who liked a post. */
export function someAccounts(seed: string, platform: Platform, n: number): NpcAccount[] {
  return NPC_ACCOUNTS.filter((a) => a.preferredPlatforms.includes(platform))
    .map((a) => ({ a, k: hashOf(`${seed}:${a.id}`) }))
    .sort((x, y) => x.k - y.k)
    .slice(0, n)
    .map((x) => x.a);
}

export const TREND_KIND: Record<TrendKind, string> = {
  song: 'Music',
  artist: 'Music',
  scandal: 'Drama',
  beef: 'Beef',
  meme: 'Memes',
  fashion: 'Fashion',
  movement: 'Culture',
  ambient: 'Trending',
  sports: 'Sports',
  entertainment: 'Entertainment',
  tech: 'Technology',
  weather: 'Weather',
  lifestyle: 'Lifestyle',
};
