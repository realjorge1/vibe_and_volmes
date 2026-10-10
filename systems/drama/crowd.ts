import type { NpcAccount, AccountType, Platform } from '../../types/social';
import type { Gender } from '../../types/player';
import { WOMEN, MEN, SUFFIXES, PREFIXES, HATER_HANDLES } from '../../data/drama/crowdNames';

/**
 * THE CROWD: the endless strangers who post, comment and DM. Pure and
 * seeded: the same seed is always the same person, with a name, handle and
 * gender that agree, so their face (picked from the people pack by gender)
 * matches who they say they are.
 *
 * Account ids encode the gender so avatars can find a matching face:
 * `c-w-<handle>` for women, `c-m-<handle>` for men.
 */

export type CrowdGender = 'woman' | 'man';

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 over a string seed. */
export function seeded(seed: string): () => number {
  let a = hashStr(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Who notices an artist romantically: the opposite gender, or anyone for nonbinary artists. */
export function admirerGender(artist: Gender, r: () => number = Math.random): CrowdGender {
  if (artist === 'male') return 'woman';
  if (artist === 'female') return 'man';
  return r() < 0.5 ? 'woman' : 'man';
}

export function genderOfId(id: string): CrowdGender | undefined {
  if (id.startsWith('c-w-')) return 'woman';
  if (id.startsWith('c-m-')) return 'man';
  return undefined;
}

export type CrowdVibe = 'fan' | 'stan' | 'hater' | 'admirer' | 'casual' | 'troll';

const TYPE_OF: Record<CrowdVibe, AccountType> = {
  fan: 'fan',
  stan: 'stan',
  hater: 'hater',
  admirer: 'fan',
  casual: 'public',
  troll: 'hater',
};

/** Display names: some use their name, some an emoji, some nothing like their name. */
function displayName(first: string, r: () => number, vibe: CrowdVibe): string {
  const roll = r();
  const deco = ['🦋', '✨', '🖤', '💫', '🌙', '🔥', '😮‍💨', '🫶', '⚡', '🍯', '🌸', '👑'];
  if (vibe === 'stan' && roll < 0.5) return `${first} | stream the album`;
  if (vibe === 'admirer' && roll < 0.35) return `${first} ${deco[Math.floor(r() * deco.length)]}`;
  if (roll < 0.15) return first.toLowerCase();
  if (roll < 0.25) return first.toUpperCase();
  if (roll < 0.4) return `${first} ${deco[Math.floor(r() * deco.length)]}`;
  if (roll < 0.5) return `${first}.`;
  return first;
}

function handleFor(first: string, r: () => number, vibe: CrowdVibe): string {
  if (vibe === 'hater' || vibe === 'troll') {
    if (r() < 0.6) return HATER_HANDLES[Math.floor(r() * HATER_HANDLES.length)] + (r() < 0.5 ? String(1 + Math.floor(r() * 98)) : '');
  }
  const base = first.toLowerCase().replace(/[^a-z]/g, '');
  const pre = PREFIXES[Math.floor(r() * PREFIXES.length)];
  const suf = SUFFIXES[Math.floor(r() * SUFFIXES.length)];
  const num = r() < 0.35 ? String(1 + Math.floor(r() * 98)) : '';
  return `${pre}${pre && r() < 0.5 ? '.' : ''}${base}${suf}${num}`;
}

/** A stranger: the same seed is always the same person. */
export function crowdPerson(seed: string, opts: { gender?: CrowdGender; vibe?: CrowdVibe; platform?: Platform } = {}): NpcAccount & {
  gender: CrowdGender;
} {
  const r = seeded(`crowd:${seed}`);
  const gender: CrowdGender = opts.gender ?? (r() < 0.5 ? 'woman' : 'man');
  const vibe = opts.vibe ?? 'casual';
  const names = gender === 'woman' ? WOMEN : MEN;
  const first = names[Math.floor(r() * names.length)];
  const handle = handleFor(first, r, vibe);
  const followers =
    vibe === 'stan' ? 800 + Math.floor(r() * 30_000)
    : vibe === 'admirer' ? 300 + Math.floor(r() * 25_000)
    : vibe === 'hater' || vibe === 'troll' ? 40 + Math.floor(r() * 4_000)
    : 20 + Math.floor(r() * 2_500);
  return {
    id: `c-${gender === 'woman' ? 'w' : 'm'}-${handle}`,
    username: displayName(first, r, vibe),
    handle,
    accountType: TYPE_OF[vibe],
    followers,
    isVerified: false,
    preferredPlatforms: opts.platform ? [opts.platform] : ['chirper', 'flashpic', 'tunetok'],
    gender,
  };
}
