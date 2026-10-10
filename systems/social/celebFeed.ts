import type { Npc, WorldEventType, WorldState } from '../../types/world';
import type { NpcAccount, Platform, PostSentiment, SocialPost, TrendingTopic, TrendKind } from '../../types/social';
import type { ThreadReply } from './threadGenerator';
import { COMMENTS, COUPLE, EDITS, GOSSIP, HATE, LIFE, OWN, STAN } from '../../data/social/celebLines';
import { NPC_ACCOUNTS } from '../../data/social/npcAccounts';
import { crowdPerson, seeded } from '../drama/crowd';
import { handleOf } from '../drama/feedPosts';
import { laneEngagement, laneId } from './lanes';

/**
 * OTHER ARTISTS (pure).
 *
 * The celebrity lane: the ten named artists (rivals and non-rivals, with
 * their own photos) and the world engine's artists, living their lives
 * online. Each named artist is linked to one of the world engine's artists,
 * so the world's romances, breakups, collabs, feuds and scandals happen to
 * them too. Their posts get lovers and haters in the comments; the player's
 * rivals also get the player's fans dragging them (and their fans dragging
 * the player back).
 */

export type Relation = 'rival' | 'friend' | 'neutral';
export type Gender = 'woman' | 'man';

export interface PersonRef {
  id: string;
  name: string;
  handle: string;
  accountId: string;
  gender: Gender;
}

export interface CastMember extends PersonRef {
  fans: number;
  verified: boolean;
  /** One of the ten named artists (they have their own photos). */
  named: boolean;
  relation: Relation;
  /** The world engine artist whose life they live (named artists). */
  npcId?: string;
  partner?: PersonRef | null;
}

export interface CelebEvent {
  id: string;
  type: WorldEventType;
  subject: CastMember;
  other: PersonRef | null;
  headline: string;
  magnitude: number;
}

export interface CelebInput {
  week: number;
  playerName: string;
  city: string;
  cast: CastMember[];
  events: CelebEvent[];
}

export interface NamedInfo {
  id: string;
  name: string;
  genre: string;
  fans: number;
  gender: Gender;
  relation: Relation;
}

type Rnd = () => number;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickOf<T>(arr: readonly T[], rnd: Rnd): T {
  return arr[Math.floor(rnd() * arr.length)];
}

// --- Who's who ------------------------------------------------------------------

const WOMEN = new Set([
  'queen', 'lady', 'girl', 'aaliyah', 'brianna', 'ciara', 'diamond', 'faith', 'imani', 'jasmine', 'maya', 'olivia',
  'simone', 'carmen', 'renata', 'greta', 'naomi', 'priya', 'lena', 'sofia', 'yuki', 'kassia', 'mireya', 'nyla', 'juno', 'wren', 'sable',
]);
const MEN = new Set([
  'king', 'prince', 'sir', 'boy', 'marcus', 'devon', 'jaylen', 'xavier', 'malik', 'andre', 'elijah', 'isaiah', 'theo', 'wesley',
  'hassan', 'mateo', 'dimitri', 'axel', 'kairo', 'marlo',
]);

/** A world artist's gender, from their name when it says, otherwise stable per id. */
export function genderOfName(name: string, seed: string): Gender {
  const words = name.toLowerCase().split(/[^a-z]+/);
  if (words.some((w) => WOMEN.has(w))) return 'woman';
  if (words.some((w) => MEN.has(w))) return 'man';
  return hash(`g:${seed}`) % 2 === 0 ? 'woman' : 'man';
}

export function npcFans(npc: Npc): number {
  return npc.roleData.fans ?? npc.social.followers;
}

/** Account ids carry the gender so an avatar can match the name without the world. */
export function npcAccountId(npcId: string, gender: Gender): string {
  return `npc-${gender === 'woman' ? 'w' : 'm'}-${npcId}`;
}

function npcPerson(npc: Npc): PersonRef {
  const gender = genderOfName(npc.name, npc.id);
  return { id: npc.id, name: npc.name, handle: npc.handle || handleOf(npc.name), accountId: npcAccountId(npc.id, gender), gender };
}

/**
 * Which world artist each named artist "is": an active artist of the same
 * genre and a similar size. Links that still work are kept, so their story
 * carries on from week to week.
 */
export function linkNamed(named: readonly NamedInfo[], world: WorldState, existing: Readonly<Record<string, string>> = {}): Record<string, string> {
  const artists = world.npcIds.map((id) => world.npcs[id]).filter((n): n is Npc => !!n && n.role === 'artist' && n.active);
  const taken = new Set<string>();
  const out: Record<string, string> = {};
  for (const n of named) {
    const id = existing[n.id];
    const npc = id ? world.npcs[id] : undefined;
    if (npc && npc.role === 'artist' && npc.active && !taken.has(npc.id)) {
      out[n.id] = npc.id;
      taken.add(npc.id);
    }
  }
  for (const n of named) {
    if (out[n.id]) continue;
    const want = Math.log10(n.fans + 10);
    let best: Npc | null = null;
    let bestScore = Infinity;
    for (const a of artists) {
      if (taken.has(a.id)) continue;
      const score = Math.abs(Math.log10(npcFans(a) + 10) - want) + (a.genre === n.genre ? 0 : 1.5) + (hash(`${n.id}:${a.id}`) % 100) / 1e4;
      if (score < bestScore) {
        best = a;
        bestScore = score;
      }
    }
    if (best) {
      out[n.id] = best.id;
      taken.add(best.id);
    }
  }
  return out;
}

/** The cast: the named artists, then the world's biggest artists (and anyone in this week's stories). */
export function buildCast(
  named: readonly NamedInfo[],
  world: WorldState | null,
  links: Readonly<Record<string, string>>,
  opts: { extraNpcIds?: readonly string[]; max?: number } = {}
): CastMember[] {
  const members: CastMember[] = [];
  const byNpc = new Map<string, CastMember>();
  for (const n of named) {
    const m: CastMember = {
      id: n.id,
      name: n.name,
      handle: handleOf(n.name),
      accountId: `artist-${n.id}`,
      gender: n.gender,
      fans: n.fans,
      verified: true,
      named: true,
      relation: n.relation,
      npcId: links[n.id],
    };
    members.push(m);
    if (m.npcId) byNpc.set(m.npcId, m);
  }
  if (!world) return members;
  const linked = new Set(Object.values(links));
  const artists = world.npcIds
    .map((id) => world.npcs[id])
    .filter((n): n is Npc => !!n && n.role === 'artist' && n.active && !linked.has(n.id))
    .sort((a, b) => npcFans(b) - npcFans(a));
  const ids = new Set(artists.slice(0, opts.max ?? 30).map((a) => a.id));
  for (const id of opts.extraNpcIds ?? []) {
    const npc = world.npcs[id];
    if (npc && (npc.role === 'artist' || npc.role === 'influencer') && !linked.has(id)) ids.add(id);
  }
  for (const id of ids) {
    const npc = world.npcs[id];
    const p = npcPerson(npc);
    const m: CastMember = {
      ...p,
      fans: npcFans(npc),
      verified: npc.stage === 'star' || npc.stage === 'legend' || npc.stage === 'established' || npc.role === 'influencer',
      named: false,
      relation: 'neutral',
    };
    members.push(m);
    byNpc.set(id, m);
  }
  // Who they're with, from the world's relationships.
  for (const m of members) {
    const npc = world.npcs[m.named ? (m.npcId ?? '') : m.id];
    if (!npc) continue;
    const dating = Object.entries(npc.relationships).find(([, r]) => r.status === 'dating');
    if (!dating) continue;
    const other = byNpc.get(dating[0]) ?? (world.npcs[dating[0]] ? npcPerson(world.npcs[dating[0]]) : null);
    m.partner = other ? { id: other.id, name: other.name, handle: other.handle, accountId: other.accountId, gender: other.gender } : null;
  }
  return members;
}

/** Event types that never happen to the named artists (they belong to the rest of the game). */
const NOT_FOR_NAMED: ReadonlySet<WorldEventType> = new Set(['retirement', 'debut', 'deal-dropped']);

/**
 * The world's recent stories, retold with the cast's names (a named artist
 * lives their linked artist's life). Biggest first.
 */
export function celebEvents(world: WorldState, cast: readonly CastMember[], lookback = 2): CelebEvent[] {
  const byNpc = new Map<string, CastMember>();
  for (const m of cast) byNpc.set(m.named ? (m.npcId ?? `-${m.id}`) : m.id, m);
  const out: CelebEvent[] = [];
  for (const e of world.events) {
    if (world.week - e.week > lookback) continue;
    let subject = byNpc.get(e.primaryId);
    let otherId = e.secondaryId;
    // A journalist's feature or a fan war: the story is about the artist in it.
    if (!subject && e.secondaryId && byNpc.get(e.secondaryId)) {
      subject = byNpc.get(e.secondaryId);
      otherId = e.primaryId;
    }
    if (!subject) continue;
    if (subject.named && NOT_FOR_NAMED.has(e.type)) continue;
    const otherNpc = otherId ? world.npcs[otherId] : undefined;
    const otherMember = otherId ? byNpc.get(otherId) : undefined;
    const other: PersonRef | null = otherMember ?? (otherNpc ? npcPerson(otherNpc) : null);
    let headline = e.headline;
    const subjectNpc = world.npcs[subject.named ? (subject.npcId ?? '') : subject.id];
    if (subjectNpc && subject.named) headline = headline.split(subjectNpc.name).join(subject.name);
    if (otherNpc && otherMember?.named) headline = headline.split(otherNpc.name).join(otherMember.name);
    out.push({ id: e.id, type: e.type, subject, other, headline, magnitude: e.magnitude });
  }
  return out.sort((a, b) => b.magnitude - a.magnitude);
}

// --- Accounts -------------------------------------------------------------------

export function castAccount(m: CastMember): NpcAccount {
  return {
    id: m.accountId,
    username: m.name,
    handle: m.handle,
    accountType: 'artist',
    followers: Math.round(m.fans * 0.65),
    isVerified: m.verified,
    preferredPlatforms: ['chirper', 'flashpic', 'tunetok'],
    gender: m.gender,
  };
}

/** A fan account for an artist (they use the artist's photo as their avatar). */
export function fanAccount(m: CastMember, seed: string, platform: Platform): NpcAccount {
  const h = hash(`${seed}:${m.id}`);
  const first = m.name.split(' ')[0];
  const names = [`${m.name} Updates`, `${first}’s Angel`, `${m.name} Daily`, `${first} Nation`, `${first} Archive`];
  const handles = [`${m.handle}updates`, `${m.handle}sangel`, `${m.handle}daily`, `${m.handle}nation`, `${m.handle}archive`];
  const k = h % names.length;
  return {
    id: `cf-${m.accountId}-${k}`,
    username: names[k],
    handle: handles[k],
    accountType: 'stan',
    followers: 2_000 + (h % 60_000),
    isVerified: false,
    preferredPlatforms: [platform],
  };
}

const GOSSIP_PAGES = NPC_ACCOUNTS.filter((a) => a.accountType === 'gossip');
const NEWS_PAGES = NPC_ACCOUNTS.filter((a) => a.accountType === 'news');

// --- Posts ----------------------------------------------------------------------

function fill(s: string, a: PersonRef, b: PersonRef | null | undefined, you: string, city: string): string {
  return s
    .replace(/\{a\}/g, a.name)
    .replace(/\{b\}/g, b?.name ?? 'them')
    .replace(/\{you\}/g, you)
    .replace(/\{city\}/g, city || 'the city');
}

/** A named artist's own photo (portrait or stage), or a scene that fits. */
function selfMedia(m: CastMember, platform: Platform, rnd: Rnd, scene?: string, tags?: readonly string[]): SocialPost['media'] {
  const kind = platform === 'tunetok' ? 'video' : 'image';
  if (m.named && !scene && rnd() < 0.7) {
    return { kind, description: `lane:celeb`, scene: `rival:${m.id}:${rnd() < 0.5 ? 'stage' : 'portrait'}`, tags: [...(tags ?? ['stage', 'crowd'])] };
  }
  if (!m.named && !scene && rnd() < 0.55) {
    return { kind, description: `lane:celeb`, scene: `face:${m.accountId}`, tags: [...(tags ?? ['stage', 'crowd'])] };
  }
  return { kind, description: `lane:celeb`, scene, tags: [...(tags ?? ['stage', 'crowd'])] };
}

const SENTIMENT: Partial<Record<WorldEventType, PostSentiment>> = {
  scandal: 'shade',
  'feud-started': 'shade',
  'diss-track': 'shade',
  breakup: 'news',
  lawsuit: 'news',
  'mental-crisis': 'news',
};

interface PostCtx {
  input: CelebInput;
  idPrefix: string;
  rnd: Rnd;
}

function shell(c: PostCtx, platform: Platform, account: NpcAccount, i: number, subject: PersonRef): Omit<SocialPost, 'content' | 'sentiment'> {
  const e = laneEngagement(account.followers, platform, c.rnd);
  return {
    id: laneId(c.idPrefix, 'cl', i, c.rnd),
    platform,
    account,
    likes: e.likes,
    reposts: e.reposts,
    replies: e.comments,
    shares: e.shares,
    views: e.views,
    week: c.input.week,
    lane: 'celeb',
    subject: { id: subject.id, name: subject.name, handle: subject.handle },
  };
}

/** One post about an event: the artist, a gossip page, a fan or a hater. */
function eventPost(c: PostCtx, ev: CelebEvent, platform: Platform, i: number): SocialPost | null {
  const { rnd, input } = c;
  const a = ev.subject;
  const b = ev.other;
  const roll = rnd();
  if (platform === 'vibestream') {
    const page = pickOf(NEWS_PAGES.length > 0 ? NEWS_PAGES : GOSSIP_PAGES, rnd);
    return {
      ...shell(c, platform, page, i, a),
      content: ev.headline,
      sentiment: 'news',
      media: { kind: 'image', description: 'lane:celeb', scene: a.named ? `rival:${a.id}:stage` : undefined, tags: ['stage', 'crowd', 'paparazzi'] },
      vibe: 'news-entertainment',
    };
  }
  if (roll < 0.34 && OWN[ev.type]) {
    const romance = ev.type === 'romance-started';
    return {
      ...shell(c, platform, castAccount(a), i, a),
      content: fill(pickOf(OWN[ev.type]!, rnd), a, b, input.playerName, input.city),
      sentiment: SENTIMENT[ev.type] ?? 'hype',
      media: platform === 'chirper' && rnd() < 0.6 ? undefined : selfMedia(a, platform, rnd, romance ? 'couple-selfie' : undefined, romance ? ['love', 'night'] : undefined),
    };
  }
  if (roll < 0.66 && GOSSIP[ev.type]) {
    const page = pickOf(GOSSIP_PAGES, rnd);
    const romance = ev.type === 'romance-started' || ev.type === 'breakup';
    return {
      ...shell(c, platform, page, i, a),
      content: fill(pickOf(GOSSIP[ev.type]!, rnd), a, b, input.playerName, input.city),
      sentiment: SENTIMENT[ev.type] ?? 'news',
      media:
        platform === 'chirper' && rnd() < 0.5
          ? undefined
          : { kind: platform === 'tunetok' ? 'video' : 'image', description: 'lane:celeb', scene: romance ? 'dinner-paparazzi' : a.named ? `rival:${a.id}:portrait` : 'paparazzi-hoodie', tags: ['paparazzi', 'night', 'street'] },
    };
  }
  const stan = rnd() < 0.6;
  const lines = (stan ? STAN : HATE)[ev.type];
  if (!lines) return null;
  const who = stan ? fanAccount(a, `${ev.id}:${i}`, platform) : crowdPerson(`${ev.id}:h:${i}`, { vibe: 'hater', platform });
  return {
    ...shell(c, platform, who, i, a),
    content: fill(pickOf(lines, rnd), a, b, input.playerName, input.city),
    sentiment: stan ? 'hype' : 'hostile',
    media: platform === 'flashpic' || platform === 'tunetok' ? selfMedia(a, platform, rnd) : undefined,
  };
}

/** Between events: the artist's everyday life, a couple post, or a fan edit. */
function lifePost(c: PostCtx, m: CastMember, platform: Platform, i: number): SocialPost {
  const { rnd, input } = c;
  if (platform === 'vibestream') {
    const page = pickOf(NEWS_PAGES.length > 0 ? NEWS_PAGES : GOSSIP_PAGES, rnd);
    const lines = m.partner ? GOSSIP['romance-started']! : GOSSIP.release!;
    return {
      ...shell(c, platform, page, i, m),
      content: fill(pickOf(lines, rnd), m, m.partner, input.playerName, input.city),
      sentiment: 'news',
      media: { kind: 'image', description: 'lane:celeb', scene: m.named ? `rival:${m.id}:stage` : undefined, tags: ['stage', 'paparazzi'] },
      vibe: 'news-entertainment',
    };
  }
  if (platform === 'tunetok' && rnd() < 0.45) {
    return {
      ...shell(c, platform, fanAccount(m, `edit:${i}`, platform), i, m),
      content: fill(pickOf(EDITS, rnd), m, null, input.playerName, input.city),
      sentiment: 'hype',
      media: selfMedia(m, platform, rnd, undefined, ['stage', 'crowd', 'night']),
    };
  }
  if (m.partner && rnd() < 0.22) {
    return {
      ...shell(c, platform, castAccount(m), i, m),
      content: fill(pickOf(COUPLE, rnd), m, m.partner, input.playerName, input.city),
      sentiment: 'positive',
      media: { kind: platform === 'tunetok' ? 'video' : 'image', description: 'lane:celeb', scene: 'couple-selfie', tags: ['love', 'night'] },
    };
  }
  const life = pickOf(LIFE, rnd);
  return {
    ...shell(c, platform, castAccount(m), i, m),
    content: fill(life.text, m, null, input.playerName, input.city),
    sentiment: 'positive',
    media: platform === 'chirper' && rnd() < 0.55 ? undefined : selfMedia(m, platform, rnd, life.scene, life.tags),
  };
}

const PLATFORMS: readonly (readonly [Platform, number])[] = [
  ['chirper', 36],
  ['flashpic', 30],
  ['tunetok', 22],
  ['vibestream', 12],
];

function pickPlatform(rnd: Rnd): Platform {
  let roll = rnd() * 100;
  for (const [p, w] of PLATFORMS) if ((roll -= w) <= 0) return p;
  return 'chirper';
}

/** `count` posts about other artists (on one app, or across them). */
export function celebPosts(input: CelebInput, o: { count: number; idPrefix: string; platform?: Platform; rnd?: Rnd }): SocialPost[] {
  const rnd = o.rnd ?? Math.random;
  const c: PostCtx = { input, idPrefix: o.idPrefix, rnd };
  if (input.cast.length === 0) return [];
  // Named artists and the biggest stars get talked about the most.
  const weighted = input.cast.map((m) => [m, (m.named ? 3 : 1) * (1 + Math.log10(m.fans + 10) / 3)] as const);
  const total = weighted.reduce((s, [, w]) => s + w, 0);
  const pickMember = (): CastMember => {
    let roll = rnd() * total;
    for (const [m, w] of weighted) if ((roll -= w) <= 0) return m;
    return weighted[weighted.length - 1][0];
  };
  const events = input.events.slice(0, 12);
  const out: SocialPost[] = [];
  for (let i = 0, guard = 0; out.length < o.count && guard < o.count * 4; i++, guard++) {
    const platform = o.platform ?? pickPlatform(rnd);
    const ev = events.length > 0 && rnd() < 0.55 ? events[Math.floor(Math.pow(rnd(), 1.6) * events.length)] : null;
    const p = ev ? eventPost(c, ev, platform, i) : lifePost(c, pickMember(), platform, i);
    if (p) out.push(p);
  }
  return out;
}

const TREND_KIND: Partial<Record<WorldEventType, TrendKind>> = {
  release: 'song',
  'viral-moment': 'meme',
  'romance-started': 'scandal',
  breakup: 'scandal',
  scandal: 'scandal',
  'feud-started': 'beef',
  'diss-track': 'beef',
  award: 'artist',
  comeback: 'artist',
};

/** The other artists trending this week (the biggest stories). */
export function celebTrends(input: CelebInput | null, rnd: Rnd = Math.random): TrendingTopic[] {
  if (!input) return [];
  const seen = new Set<string>();
  const out: TrendingTopic[] = [];
  for (const e of input.events) {
    if (out.length >= 3 || e.magnitude < 25) break;
    const hashtag = `#${e.subject.name.replace(/[^A-Za-z0-9]/g, '')}`;
    if (seen.has(hashtag)) continue;
    seen.add(hashtag);
    out.push({
      hashtag,
      volume: Math.round((30_000 + e.magnitude * 5_000) * (0.7 + rnd() * 0.6)),
      sentiment: e.type === 'scandal' || e.type === 'breakup' ? 'shade' : 'neutral',
      kind: TREND_KIND[e.type] ?? 'artist',
      momentum: e.magnitude >= 50 ? 'rising' : 'steady',
      peakWeek: input.week,
      world: true,
    });
  }
  return out;
}

/** An artist's own profile: their recent posts on this app. */
export function celebTimeline(m: CastMember, platform: Platform, input: CelebInput, count = 9): SocialPost[] {
  const rnd = seeded(`cl-tl:${m.accountId}:${platform}:${input.week}`);
  const c: PostCtx = { input, idPrefix: `cl-tl-${m.accountId}`, rnd };
  const mine = input.events.filter((e) => e.subject.id === m.id && OWN[e.type]);
  const out: SocialPost[] = [];
  for (let i = 0; i < count; i++) {
    const ev = i < mine.length ? mine[i] : null;
    const week = Math.max(1, input.week - Math.floor(i / 2));
    if (ev) {
      out.push({
        ...shell(c, platform, castAccount(m), i, m),
        week,
        content: fill(pickOf(OWN[ev.type]!, rnd), m, ev.other, input.playerName, input.city),
        sentiment: SENTIMENT[ev.type] ?? 'hype',
        media: platform === 'chirper' && rnd() < 0.6 ? undefined : selfMedia(m, platform, rnd),
      });
      continue;
    }
    const p = lifePost(c, m, platform === 'vibestream' ? 'chirper' : platform, i);
    out.push({ ...p, account: castAccount(m), week, platform: platform === 'vibestream' ? 'chirper' : platform });
  }
  return out;
}

/** VibeNews article text for a story about another artist. */
export function celebArticle(post: SocialPost): string[] | null {
  const a = post.subject?.name;
  if (post.lane !== 'celeb' || !a) return null;
  const views = post.views ?? 0;
  const reach = views >= 1_000_000 ? `${(views / 1_000_000).toFixed(1).replace(/\.0$/, '')} million` : views >= 1_000 ? `${Math.round(views / 1_000)} thousand` : `${views}`;
  return [
    `${a} is the story everyone in music is talking about this week.`,
    `The reaction online was instant: fans rushed to defend ${a} while critics piled in, and the post that started it has been seen ${reach} times.`,
    `Industry insiders say the attention could not come at a more important moment in ${a}’s career.`,
    `Representatives for ${a} did not immediately respond to a request for comment.`,
  ];
}

/** A fan account's own posts: all about the artist they stan. */
export function fanTimeline(account: NpcAccount, idol: CastMember, platform: Platform, input: CelebInput, count = 9): SocialPost[] {
  const rnd = seeded(`cf-tl:${account.id}:${platform}:${input.week}`);
  const c: PostCtx = { input, idPrefix: `cf-tl-${account.id}`, rnd };
  const lines = [...EDITS, ...Object.values(STAN).flat(), ...COMMENTS.love];
  const app: Platform = platform === 'vibestream' ? 'chirper' : platform;
  const out: SocialPost[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      ...shell(c, app, account, i, idol),
      week: Math.max(1, input.week - Math.floor(i / 2)),
      content: fill(pickOf(lines, rnd), idol, idol.partner, input.playerName, input.city),
      sentiment: 'hype',
      media: app === 'chirper' && rnd() < 0.5 ? undefined : selfMedia(idol, app, rnd),
    });
  }
  return out;
}

/**
 * Comments under a post about another artist: their lovers and their haters,
 * shippers when there's a romance, the player's fans when it's the player's
 * rival (and the rival's fans hitting back), a nod to the player when the
 * artist is a friend.
 */
export function celebThread(post: SocialPost, input: Pick<CelebInput, 'playerName' | 'cast'>): ThreadReply[] {
  const subject = post.subject;
  if (!subject) return [];
  const r = seeded(`cl-thread:${post.id}`);
  const member = input.cast.find((m) => m.id === subject.id);
  const relation: Relation = member?.relation ?? 'neutral';
  const partner = member?.partner ?? null;
  const breakup = /unfollow|split|over for|deleted every photo|peace/i.test(post.content);
  const romance = !!partner && /dating|together|soft launch|spotted|date night|my person|🤍|favorite person|obsessed/i.test(post.content);
  const n = post.replies <= 0 ? 0 : Math.min(post.replies, 3 + Math.floor(r() * 7));
  const a: PersonRef = member ?? { id: subject.id, name: subject.name, handle: subject.handle, accountId: `artist-${subject.id}`, gender: 'woman' };
  const maxLikes = Math.max(4, Math.round(post.likes * 0.05));
  const used = new Set<string>();
  const out: ThreadReply[] = [];
  for (let i = 0, guard = 0; out.length < n && guard < n * 5; i++, guard++) {
    const roll = r();
    let side: ThreadReply['side'];
    let pool: readonly string[];
    if (relation === 'rival' && roll < 0.2) {
      side = 'stan';
      pool = COMMENTS.yourFans;
    } else if (relation === 'rival' && roll < 0.3) {
      side = 'rival';
      pool = COMMENTS.atYou;
    } else if (relation === 'friend' && roll < 0.1) {
      side = 'neutral';
      pool = COMMENTS.friendly;
    } else if (breakup && roll < 0.45) {
      side = 'neutral';
      pool = COMMENTS.breakup;
    } else if (romance && roll < 0.45) {
      side = 'fan';
      pool = COMMENTS.ship;
    } else if (roll < 0.66) {
      side = 'fan';
      pool = COMMENTS.love;
    } else if (roll < 0.88) {
      side = 'hater';
      pool = COMMENTS.hate;
    } else {
      side = 'neutral';
      pool = COMMENTS.neutral;
    }
    const content = fill(pickOf(pool, r), a, partner, input.playerName, '');
    if (used.has(content)) continue;
    used.add(content);
    const who =
      side === 'fan' && member && r() < 0.5
        ? fanAccount(member, `${post.id}:${i}`, post.platform)
        : crowdPerson(`${post.id}:cl:${i}`, { vibe: side === 'hater' ? 'hater' : side === 'fan' ? 'fan' : 'casual' });
    out.push({
      id: `rep-${post.id}-${out.length}`,
      side,
      username: who.username,
      handle: who.handle,
      verified: false,
      content,
      likes: Math.floor(r() * maxLikes),
      accountId: who.id,
    });
  }
  return out.sort((x, y) => y.likes - x.likes);
}
