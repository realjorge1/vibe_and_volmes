import type { NpcAccount, Platform, PostSentiment, SocialPost, TrendingTopic, TrendKind } from '../../types/social';
import type { ThreadReply } from './threadGenerator';
import { REGULARS, regularById, type EverydayVibe, type NewsSection, type RegularAccount } from '../../data/social/everyday/accounts';
import { ANY_COMMENTS, VIBES } from '../../data/social/everyday/vibes';
import { ADS } from '../../data/social/everyday/ads';
import { ARTICLE, HEADLINES, SECTION_TAGS } from '../../data/social/everyday/news';
import { LEAGUES, type CalendarBeat } from '../../data/social/everyday/calendar';
import { beatById, beatsFor, fillWorld, seasonLeague, worldMoment, type WorldMoment } from './worldCalendar';
import { laneEngagement, laneId } from './lanes';
import { crowdPerson, seeded } from '../drama/crowd';
import type { RealTopic } from '../../types/realworld';
import { realPost, realThread, realTimeline } from '../realworld/posts';

/**
 * THE REGULAR INTERNET (pure).
 *
 * Posts that have nothing to do with the player: the meme pages, the food
 * account, the gym guy, the sports page, friends from home, the weather, the
 * news, and the ads between them, following the world's calendar (finals
 * week, a show's finale, the heatwave, the holidays). Each app gets its own
 * kind of post: takes on Chirp, photos on VibeGram, videos on TokTalk,
 * headlines on VibeNews.
 */

export interface EverydayOpts {
  week: number;
  /** The calendar year the career started in ("Class of ..."). */
  baseYear: number;
  /** The player's city, for local flavor. */
  city: string;
  count: number;
  idPrefix: string;
  /** Lock to one app (that app's infinite scroll). */
  platform?: Platform;
  rnd?: () => number;
  /** What's happening in the real world right now (systems/realworld): part of the feed talks about it. */
  real?: readonly RealTopic[];
}

type Rnd = () => number;
type AppKey = 'chirp' | 'gram' | 'tok';
const KEY: Record<Exclude<Platform, 'vibestream'>, AppKey> = { chirper: 'chirp', flashpic: 'gram', tunetok: 'tok' };
const PLATFORMS: readonly (readonly [Platform, number])[] = [
  ['chirper', 34],
  ['flashpic', 30],
  ['tunetok', 22],
  ['vibestream', 14],
];
const SECTIONS: readonly (readonly [NewsSection, number])[] = [
  ['world', 3],
  ['business', 2],
  ['sports', 3],
  ['tech', 2],
  ['health', 1],
  ['entertainment', 2],
  ['weather', 1],
];
/** Topics whose Chirp posts usually carry a picture. */
const VISUAL: ReadonlySet<string> = new Set(['memes', 'pets', 'food', 'cars', 'fashion', 'travel']);

const NEWS_COMMENTS: readonly string[] = [
  'finally some good news',
  'about time honestly',
  'this is huge',
  'source?',
  'wait what',
  'can’t believe this',
  'we’ll see if it actually happens',
  'they say this every year',
  'interesting',
  'this affects all of us',
];

const AD_COMMENTS: readonly string[] = [
  'is this actually good?',
  'I tried it, it’s decent ngl',
  'the ads know me too well 😭',
  'my phone is listening to me I swear',
  'need this',
  'how much?',
  'used it for a month, worth it',
];

function pickOf<T>(arr: readonly T[], rnd: Rnd): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function pickW<T>(items: readonly (readonly [T, number])[], rnd: Rnd): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let roll = rnd() * total;
  for (const [v, w] of items) if ((roll -= w) <= 0) return v;
  return items[items.length - 1][0];
}

const isOutlet = (a: RegularAccount) => !!a.sections && a.sections.length > 0;
const onApp = (a: RegularAccount, p: Platform) => a.preferredPlatforms.includes(p);

function sentimentOf(vibe: string): PostSentiment {
  if (vibe === 'memes') return 'meme';
  if (vibe.startsWith('news')) return 'news';
  if (vibe === 'motivation' || vibe === 'family' || vibe === 'pets') return 'positive';
  return 'neutral';
}

function mediaFor(platform: Platform, vibe: string, tags: readonly string[], scenes: readonly string[] | undefined, rnd: Rnd): SocialPost['media'] {
  if (platform === 'chirper' && rnd() > (VISUAL.has(vibe) ? 0.45 : 0.12)) return undefined;
  const scene = scenes && scenes.length > 0 && rnd() < 0.3 ? pickOf(scenes, rnd) : undefined;
  return { kind: platform === 'tunetok' ? 'video' : 'image', description: `lane:${vibe}`, tags: [...tags], scene };
}

/** A regular who posts on this app (about `vibe`, if anyone does). */
function accountFor(platform: Platform, vibe: string | null, rnd: Rnd): RegularAccount {
  const pool = REGULARS.filter((a) => !a.brand && !isOutlet(a) && !a.realWorld && onApp(a, platform));
  if (vibe) {
    const fits = pool.filter((a) => a.vibes.includes(vibe as EverydayVibe));
    // Mostly the accounts that cover it; pages and friends chime in on anything trending.
    if (fits.length > 0 && rnd() < 0.72) return pickOf(fits, rnd);
  }
  return pickOf(pool, rnd);
}

interface Ctx {
  o: EverydayOpts;
  world: WorldMoment;
  beats: CalendarBeat[];
  rnd: Rnd;
}

function base(c: Ctx, platform: Platform, account: NpcAccount, i: number, followers = account.followers): Pick<SocialPost, 'id' | 'platform' | 'account' | 'likes' | 'reposts' | 'replies' | 'shares' | 'views' | 'week' | 'lane'> {
  const e = laneEngagement(followers, platform, c.rnd);
  return {
    id: laneId(c.o.idPrefix, 'ev', i, c.rnd),
    platform,
    account,
    likes: e.likes,
    reposts: e.reposts,
    replies: e.comments,
    shares: e.shares,
    views: e.views,
    week: c.o.week,
    lane: 'everyday',
  };
}

function newsPost(c: Ctx, i: number, outlet?: RegularAccount, platform: Platform = 'vibestream'): SocialPost {
  const { rnd } = c;
  const withNews = c.beats.filter((b) => b.news && (!outlet || outlet.sections?.includes(b.news.section)));
  let beat: CalendarBeat | undefined;
  let section: NewsSection;
  let line: string;
  if (withNews.length > 0 && rnd() < 0.45) {
    beat = pickW(withNews.map((b) => [b, b.heat] as const), rnd);
    section = beat.news!.section;
    line = pickOf(beat.news!.lines, rnd);
  } else {
    const allowed = outlet?.sections ? SECTIONS.filter(([s]) => outlet.sections!.includes(s)) : SECTIONS;
    section = pickW(allowed.length > 0 ? allowed : SECTIONS, rnd);
    line = pickOf(HEADLINES[section], rnd);
  }
  const who =
    outlet ??
    (pickOf(
      REGULARS.filter((a) => a.sections?.includes(section) && onApp(a, platform)),
      rnd
    ) as RegularAccount | undefined) ??
    regularById('ev-ledger')!;
  return {
    ...base(c, platform, who, i),
    content: fillWorld(line, c.world, { city: c.o.city, league: beat?.league }),
    sentiment: 'news',
    media: { kind: 'image', description: `lane:news-${section}`, tags: [...SECTION_TAGS[section]] },
    vibe: `news-${section}`,
    beat: beat?.id,
  };
}

function adPost(c: Ctx, platform: Platform, i: number, brand?: RegularAccount): SocialPost | null {
  const who = brand ?? (pickOf(REGULARS.filter((a) => a.brand && onApp(a, platform)), c.rnd) as RegularAccount | undefined);
  const copy = who ? ADS[who.id] : undefined;
  if (!who || !copy) return null;
  return {
    // Ads get shown a lot and liked a little.
    ...base(c, platform, who, i, Math.round(who.followers * 0.12)),
    content: pickOf(copy.lines, c.rnd),
    sentiment: 'positive',
    media: { kind: platform === 'tunetok' ? 'video' : 'image', description: `lane:ad`, tags: [...copy.tags] },
    vibe: who.vibes[0],
    sponsored: true,
  };
}

function beatPost(c: Ctx, platform: Exclude<Platform, 'vibestream'>, i: number, forced?: RegularAccount): SocialPost | null {
  const { rnd } = c;
  // On someone's own profile, only the trending moments in their lane (the food account posts food).
  const pool = c.beats.filter((b) => b[KEY[platform]].length > 0 && (!forced || forced.vibes.includes(b.vibe)));
  if (pool.length === 0) return null;
  const beat = pickW(pool.map((b) => [b, b.heat] as const), rnd);
  const who = forced ?? accountFor(platform, beat.vibe, rnd);
  const tag = fillWorld(beat.hashtag, c.world, { city: c.o.city });
  let content = fillWorld(pickOf(beat[KEY[platform]], rnd), c.world, { city: c.o.city, league: beat.league });
  if (!content.toLowerCase().includes(tag.slice(1).toLowerCase()) && rnd() < (platform === 'chirper' ? 0.5 : 0.65)) content = `${content} ${tag}`;
  const vibeContent = beat.vibe === 'news' ? undefined : VIBES[beat.vibe];
  return {
    ...base(c, platform, who, i),
    content,
    sentiment: sentimentOf(beat.vibe),
    media: mediaFor(platform, beat.vibe, beat.tags ?? vibeContent?.tags ?? ['city'], vibeContent?.scenes, rnd),
    vibe: beat.vibe,
    beat: beat.id,
  };
}

function evergreenPost(c: Ctx, platform: Exclude<Platform, 'vibestream'>, i: number, forced?: RegularAccount): SocialPost {
  const { rnd } = c;
  const who = forced ?? accountFor(platform, null, rnd);
  const vibes = who.vibes.filter((v): v is Exclude<EverydayVibe, 'news'> => v !== 'news');
  const vibe = vibes.length > 0 ? pickOf(vibes, rnd) : 'memes';
  const v = VIBES[vibe];
  const lines = v[KEY[platform]].length > 0 ? v[KEY[platform]] : v.chirp;
  const league = vibe === 'sports' ? seasonLeague(c.world.month) : undefined;
  return {
    ...base(c, platform, who, i),
    content: fillWorld(pickOf(lines, rnd), c.world, { city: c.o.city, league }),
    sentiment: sentimentOf(vibe),
    media: mediaFor(platform, vibe, v.tags, v.scenes, rnd),
    vibe,
  };
}

function build(c: Ctx, platform: Platform, i: number, forced?: RegularAccount): SocialPost | null {
  const { rnd } = c;
  if (forced?.brand) return adPost(c, platform, i, forced);
  if (platform === 'vibestream' || (forced && isOutlet(forced))) return newsPost(c, i, forced, platform);
  if (!forced && rnd() < (platform === 'chirper' ? 0.04 : 0.07)) {
    const ad = adPost(c, platform, i);
    if (ad) return ad;
  }
  // The news accounts tweet their headlines too.
  if (!forced && platform === 'chirper' && rnd() < 0.1) {
    const outlet = pickOf(REGULARS.filter((a) => isOutlet(a) && onApp(a, 'chirper')), rnd);
    return newsPost(c, i, outlet, 'chirper');
  }
  if (c.beats.length > 0 && rnd() < 0.36) {
    const p = beatPost(c, platform, i, forced);
    if (p) return p;
  }
  return evergreenPost(c, platform, i, forced);
}

/**
 * How much of the everyday internet is about the real world: a good share
 * while there's live news (most of VibeNews' general news), a little from
 * the calendar when offline.
 */
export function realShare(platform: Platform, topics: readonly RealTopic[]): number {
  if (topics.length === 0) return 0;
  const live = topics.some((t) => !t.evergreen);
  if (platform === 'vibestream') return live ? 0.7 : 0;
  return live ? 0.32 : 0.12;
}

/** A real-world topic, the bigger stories more often. */
function realTopicFor(topics: readonly RealTopic[], platform: Platform, rnd: Rnd): RealTopic | null {
  const pool = platform === 'vibestream' ? topics.filter((t) => !t.evergreen && t.headline.url) : topics;
  if (pool.length === 0) return null;
  return pool[Math.min(pool.length - 1, Math.floor(Math.pow(rnd(), 1.6) * pool.length))];
}

/** `count` everyday posts for this week (on one app, or spread across them). */
export function everydayPosts(o: EverydayOpts): SocialPost[] {
  const rnd = o.rnd ?? Math.random;
  const c: Ctx = { o, world: worldMoment(o.week, o.baseYear), beats: beatsFor(o.week), rnd };
  const real = o.real ?? [];
  const out: SocialPost[] = [];
  for (let i = 0; i < o.count; i++) {
    const platform = o.platform ?? pickW(PLATFORMS, rnd);
    if (rnd() < realShare(platform, real)) {
      const t = realTopicFor(real, platform, rnd);
      if (t) {
        out.push(realPost(t, platform, i, { week: o.week, idPrefix: o.idPrefix, city: o.city, rnd: seeded(`${o.idPrefix}:rw:${i}:${Math.floor(rnd() * 1e9)}`) }));
        continue;
      }
    }
    const p = build(c, platform, i);
    if (p) out.push(p);
  }
  return out;
}

/** A regular's own recent posts (their profile), the same while it's open. */
export function everydayTimeline(account: NpcAccount, platform: Platform, o: Omit<EverydayOpts, 'count' | 'idPrefix' | 'platform'>, count = 9): SocialPost[] {
  const who = regularById(account.id);
  if (!who) return [];
  // The real-world news pages post the real stories.
  if (who.realWorld) return realTimeline(who, platform, o.real ?? [], { week: o.week, idPrefix: `ev-tl-${who.id}`, city: o.city }, count);
  const rnd = o.rnd ?? seeded(`ev-tl:${account.id}:${platform}:${o.week}`);
  const out: SocialPost[] = [];
  for (let i = 0; i < count; i++) {
    const week = Math.max(1, o.week - Math.floor(i / 3));
    const c: Ctx = { o: { ...o, week, count, idPrefix: `ev-tl-${account.id}` }, world: worldMoment(week, o.baseYear), beats: beatsFor(week), rnd };
    const p = build(c, platform, i, who);
    if (p) out.push(p);
  }
  return out;
}

/** The comments under an everyday post: strangers being strangers. */
export function everydayThread(post: SocialPost, ctx: { city: string; baseYear: number; real?: readonly RealTopic[] }): ThreadReply[] {
  // People talking about a real story.
  if (post.world) return realThread(post, ctx.real?.find((t) => t.id === post.world?.topicId) ?? null, { city: ctx.city });
  const r = seeded(`ev-thread:${post.id}`);
  const world = worldMoment(post.week, ctx.baseYear);
  const beat = beatById(post.beat);
  const vibe = post.vibe ?? '';
  const own = post.sponsored
    ? AD_COMMENTS
    : vibe.startsWith('news')
      ? NEWS_COMMENTS
      : vibe in VIBES
        ? VIBES[vibe as Exclude<EverydayVibe, 'news'>].comments
        : ANY_COMMENTS;
  const pool = [...(beat?.comments ?? []), ...(beat?.comments ?? []), ...own, ...own, ...ANY_COMMENTS];
  const league = beat?.league ?? (vibe === 'sports' ? seasonLeague(world.month) : undefined);
  const n = post.replies <= 0 ? 0 : Math.min(post.replies, 2 + Math.floor(r() * 7));
  const maxLikes = Math.max(3, Math.round(post.likes * 0.04));
  const used = new Set<string>();
  const out: ThreadReply[] = [];
  for (let i = 0, guard = 0; out.length < n && guard < n * 5; i++, guard++) {
    const friend = crowdPerson(`${post.id}:f:${i}`).handle;
    const content = fillWorld(pickOf(pool, r), world, { city: ctx.city, league, friend });
    if (used.has(content)) continue;
    used.add(content);
    const p = crowdPerson(`${post.id}:ev:${i}`, { vibe: 'casual' });
    out.push({
      id: `rep-${post.id}-${out.length}`,
      side: 'neutral',
      username: p.username,
      handle: p.handle,
      verified: false,
      content,
      likes: Math.floor(r() * maxLikes),
      accountId: p.id,
    });
  }
  return out.sort((a, b) => b.likes - a.likes);
}

const KIND_OF: Partial<Record<string, TrendKind>> = {
  sports: 'sports',
  tv: 'entertainment',
  tech: 'tech',
  weather: 'weather',
  memes: 'meme',
  fashion: 'fashion',
};

const DAILY_TAGS = ['#MondayMotivation', '#TuesdayThoughts', '#WednesdayWisdom', '#ThrowbackThursday', '#FridayFeeling', '#WeekendVibes', '#SelfCareSunday', '#FoodieFriday'];

/** What the world is trending on this week, regardless of who the player is. */
export function everydayTrends(week: number, baseYear: number, rnd: Rnd = Math.random): TrendingTopic[] {
  const world = worldMoment(week, baseYear);
  const out: TrendingTopic[] = [];
  const seen = new Set<string>();
  const push = (hashtag: string, volume: number, kind: TrendKind, momentum: TrendingTopic['momentum']) => {
    if (seen.has(hashtag)) return;
    seen.add(hashtag);
    out.push({ hashtag, volume, sentiment: 'neutral', kind, momentum, peakWeek: week, world: true });
  };
  const beats = beatsFor(week);
  for (const b of beats) {
    push(fillWorld(b.hashtag, world, { city: '' }), Math.round(b.heat * 110_000 * (0.7 + rnd() * 0.7)), KIND_OF[b.vibe] ?? 'lifestyle', b.heat >= 3 ? 'rising' : 'steady');
  }
  if (!beats.some((b) => b.league)) {
    const league = LEAGUES[seasonLeague(world.month)];
    push(`#${league.name.replace(/\s/g, '')}`, Math.round(60_000 + rnd() * 140_000), 'sports', 'steady');
  }
  const daily = [...DAILY_TAGS].sort(() => rnd() - 0.5).slice(0, 2);
  for (const t of daily) push(t, Math.round(30_000 + rnd() * 110_000), 'lifestyle', 'steady');
  return out;
}

/** VibeNews article text for a general news story (null for anything else). */
export function newsArticle(post: SocialPost): string[] | null {
  const section = post.vibe?.startsWith('news-') ? (post.vibe.slice(5) as NewsSection) : null;
  if (!section || !ARTICLE[section]) return null;
  return [...ARTICLE[section]];
}
