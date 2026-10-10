import type { NpcAccount, Platform, SocialPost, TrendingTopic, TrendKind } from '../../types/social';
import type { RealCategory, RealTopic } from '../../types/realworld';
import type { ThreadReply } from '../social/threadGenerator';
import type { PhotoTag } from '../../data/photos/photoPack';
import { REGULARS, type EverydayVibe, type RegularAccount } from '../../data/social/everyday/accounts';
import { REAL_TALK, REAL_WORLD_TAGS } from '../../data/realworld/talk';
import { AGREE, LAUGH } from '../../data/social/talk/replies';
import { crowdPerson, seeded } from '../drama/crowd';
import { laneEngagement, laneId } from '../social/lanes';
import { typed, TYPISTS } from '../social/talk/voice';

/**
 * REAL-WORLD POSTS (pure).
 *
 * News pages post the headline and credit where it's from, regular people
 * post about it ("who else is watching the Dodgers tonight 👀") or quote the
 * headline with a reaction, TokTalk has videos about it, VibeNews carries
 * the real headline and links to the real article, and the comments under
 * all of it are people talking about the thing itself. Nothing here invents
 * facts beyond the headline or says anything about a real person.
 */

type Rnd = () => number;

export interface RealPostOpts {
  week: number;
  idPrefix: string;
  city: string;
  rnd?: Rnd;
}

const pick = <T,>(arr: readonly T[], r: Rnd): T => arr[Math.floor(r() * arr.length)];

/** Stock photos that suit each kind of story (the game never shows the publisher's photos). */
export const CATEGORY_TAGS: Record<RealCategory, readonly PhotoTag[]> = {
  sports: ['crowd', 'stadium', 'night'],
  tech: ['phone', 'screen'],
  gaming: ['screen', 'night', 'phone'],
  science: ['sky', 'night', 'texture'],
  space: ['sky', 'night'],
  health: ['fit', 'food', 'sky'],
  luxury: ['watch', 'jewelry', 'fashion', 'yacht'],
  auto: ['car', 'drive'],
};

/** The everyday vibe that cares about each kind of story (who posts about it). */
const VIBE_OF: Record<RealCategory, EverydayVibe> = {
  sports: 'sports',
  tech: 'tech',
  gaming: 'gaming',
  science: 'tech',
  space: 'tech',
  health: 'fitness',
  luxury: 'fashion',
  auto: 'cars',
};

export const CATEGORY_LABEL: Record<RealCategory, string> = {
  sports: 'Sports',
  tech: 'Technology',
  gaming: 'Gaming',
  science: 'Science',
  space: 'Space',
  health: 'Health',
  luxury: 'Fashion',
  auto: 'Cars',
};

const TREND_KIND: Record<RealCategory, TrendKind> = {
  sports: 'sports',
  tech: 'tech',
  gaming: 'tech',
  science: 'lifestyle',
  space: 'lifestyle',
  health: 'lifestyle',
  luxury: 'fashion',
  auto: 'lifestyle',
};

const COUNTRY: Record<string, string> = {
  NG: 'Nigeria', GH: 'Ghana', KE: 'Kenya', ZA: 'South Africa', GB: 'United Kingdom', IE: 'Ireland', IN: 'India', AU: 'Australia', CA: 'Canada', PH: 'Philippines',
  SG: 'Singapore', NZ: 'New Zealand', US: 'United States',
};

const outlets = (c: RealCategory): RegularAccount[] => REGULARS.filter((a) => a.realWorld?.includes(c));

/** The page that posts this kind of story (sports has two). */
export function outletFor(c: RealCategory, r: Rnd): RegularAccount {
  const list = outlets(c);
  return list.length > 0 ? pick(list, r) : REGULARS.find((a) => a.realWorld)!;
}

/** The publication behind a story, as VibeNews shows it (its name; no logo). */
export function sourceAccount(source: string): NpcAccount {
  const slug = source.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'news';
  return { id: `rw-src-${slug}`, username: source, handle: slug, accountType: 'news', followers: 1_000_000, isVerified: true, preferredPlatforms: ['vibestream'] };
}

/** "the Dodgers" -> "Dodgers" (trend boards drop the article). */
export function bareName(name: string): string {
  return name.replace(/^the /i, '');
}

function fill(line: string, t: RealTopic, city: string, r: Rnd): string {
  const name = t.name ?? 'this';
  return line
    .replace(/\{topic\}/g, name)
    .replace(/\{a\}/g, t.sides?.[0] ?? name)
    .replace(/\{b\}/g, t.sides?.[1] ?? 'everyone else')
    .replace(/\{city\}/g, city)
    .replace(/\{friend\}/g, crowdPerson(`rw-tag:${t.id}:${Math.floor(r() * 1e6)}`).handle);
}

/** A regular person who'd post about it: someone whose thing it is, else a stranger. */
function poster(t: RealTopic, platform: Platform, r: Rnd, seed: string): NpcAccount {
  const fans = REGULARS.filter((a) => !a.brand && !a.realWorld && !(a.sections && a.sections.length > 0) && a.avatar.kind === 'face' && a.preferredPlatforms.includes(platform) && a.vibes.includes(VIBE_OF[t.category]));
  if (fans.length > 0 && r() < 0.35) return pick(fans, r);
  return crowdPerson(`rw:${seed}`, { vibe: 'casual', platform });
}

function base(t: RealTopic, platform: Platform, account: NpcAccount, i: number, o: RealPostOpts, r: Rnd, reach = account.followers) {
  const e = laneEngagement(reach, platform, r);
  return {
    id: laneId(o.idPrefix, 'rw', i, r),
    platform,
    account,
    likes: e.likes,
    reposts: e.reposts,
    replies: Math.max(e.comments, 2 + Math.floor(r() * 6)),
    shares: e.shares,
    views: e.views,
    week: o.week,
    lane: 'everyday' as const,
    vibe: `real-${t.category}`,
    world: {
      topicId: t.id,
      category: t.category,
      name: t.name,
      headline: t.headline.title,
      source: t.headline.source || undefined,
      url: t.headline.url || undefined,
      at: t.at,
      evergreen: t.evergreen,
    },
  };
}

/** One post about a real-world story, in the way `platform` does it. */
export function realPost(t: RealTopic, platform: Platform, i: number, o: RealPostOpts): SocialPost {
  const r = o.rnd ?? seeded(`rw-post:${t.id}:${platform}:${i}:${o.idPrefix}`);
  const talk = REAL_TALK[t.category];
  const live = !t.evergreen && !!t.headline.url;
  const via = t.headline.source ? ` (via ${t.headline.source})` : '';

  if (platform === 'vibestream') {
    // VibeNews: the real headline, from the real publication.
    const account = live ? sourceAccount(t.headline.source || 'News') : outletFor(t.category, r);
    return {
      ...base(t, platform, account, i, o, r, 400_000),
      content: t.headline.title,
      sentiment: 'news',
      media: { kind: 'image', description: `lane:real-${t.category}`, tags: [...CATEGORY_TAGS[t.category]] },
    };
  }

  // A news page posting the story.
  if (live && r() < (platform === 'chirper' ? 0.38 : 0.3)) {
    const page = outletFor(t.category, r);
    const leadIn = pick(talk.leads, r);
    const content =
      platform === 'chirper'
        ? `${leadIn}${t.headline.title}${r() < 0.6 ? via : ''}`
        : `${leadIn}${t.headline.title}\n\n📰 ${t.headline.source || page.username}${t.name ? ` · #${bareName(t.name).replace(/[^A-Za-z0-9]+/g, '')}` : ''}`;
    return {
      ...base(t, platform, page, i, o, r),
      content,
      sentiment: 'news',
      media: platform === 'chirper' ? undefined : { kind: platform === 'tunetok' ? 'video' : 'image', description: `lane:real-${t.category}`, tags: [...CATEGORY_TAGS[t.category]] },
    };
  }

  const who = poster(t, platform, r, `${t.id}:${platform}:${i}:${o.idPrefix}`);
  // Someone quoting the headline with a reaction (no name needed: the card shows the story).
  if (platform === 'chirper' && live && (!t.name || r() < 0.4)) {
    const page = outletFor(t.category, r);
    return {
      ...base(t, platform, who, i, o, r),
      content: typed(pick(talk.quotes, r), r, TYPISTS.casual),
      sentiment: 'neutral',
      meme: { format: 'tweet', name: page.username, handle: page.handle, verified: true, top: `${t.headline.title}${via}` },
    };
  }
  // Someone posting about it by name (a matchup gets matchup talk).
  const pool = t.sides && talk.matchup && r() < 0.45 ? talk.matchup : platform === 'tunetok' ? talk.tok : talk.posts;
  const lines = t.name ? pool : talk.quotes;
  const content = typed(fill(pick(lines, r), t, o.city, r), r, TYPISTS.casual);
  const showPhoto = platform !== 'chirper' || r() < 0.25;
  return {
    ...base(t, platform, who, i, o, r),
    content,
    sentiment: 'neutral',
    media: showPhoto ? { kind: platform === 'tunetok' ? 'video' : 'image', description: `lane:real-${t.category}`, tags: [...CATEGORY_TAGS[t.category]] } : undefined,
  };
}

/** `count` posts about the stories, newest-ranked stories most often. */
export function realPosts(topics: readonly RealTopic[], count: number, o: RealPostOpts & { platform?: Platform }): SocialPost[] {
  if (topics.length === 0 || count <= 0) return [];
  const r = o.rnd ?? Math.random;
  const out: SocialPost[] = [];
  for (let i = 0; i < count; i++) {
    // Earlier topics are the bigger stories: favour them, but reach down the list too.
    const t = topics[Math.min(topics.length - 1, Math.floor(Math.pow(r(), 1.6) * topics.length))];
    const platform = o.platform ?? pick<Platform>(['chirper', 'chirper', 'flashpic', 'tunetok', 'vibestream'], r);
    if (platform === 'vibestream' && (t.evergreen || !t.headline.url)) continue;
    out.push(realPost(t, platform, i, { ...o, rnd: seeded(`rw:${o.idPrefix}:${i}:${Math.floor(r() * 1e9)}`) }));
  }
  return out;
}

/** A real-world page's profile: their latest stories. */
export function realTimeline(account: NpcAccount, platform: Platform, topics: readonly RealTopic[], o: Omit<RealPostOpts, 'rnd'>, count = 9): SocialPost[] {
  const cats = REGULARS.find((a) => a.id === account.id)?.realWorld ?? [];
  const mine = topics.filter((t) => cats.includes(t.category) && !t.evergreen && t.headline.url);
  const r = seeded(`rw-tl:${account.id}:${platform}`);
  return mine.slice(0, count).map((t, i) => {
    const p = realPost(t, platform, i, { ...o, idPrefix: `rw-tl-${account.id}`, rnd: r });
    return { ...p, account, content: `${pick(REAL_TALK[t.category].leads, r)}${t.headline.title}${t.headline.source ? ` (via ${t.headline.source})` : ''}`, sentiment: 'news', meme: undefined };
  });
}

/** People talking about the story under a post about it. */
export function realThread(post: SocialPost, topic: RealTopic | null, ctx: { city: string }): ThreadReply[] {
  const r = seeded(`rw-thread:${post.id}`);
  const cat = post.world?.category ?? topic?.category ?? 'tech';
  const talk = REAL_TALK[cat];
  const t: RealTopic =
    topic ??
    ({
      id: post.world?.topicId ?? post.id,
      category: cat,
      name: post.world?.name ?? null,
      headline: { title: post.world?.headline ?? post.content, source: post.world?.source ?? '', url: post.world?.url ?? '', at: post.world?.at ?? 0 },
      related: [],
      traffic: 0,
      region: 'US',
      at: post.world?.at ?? 0,
    } satisfies RealTopic);
  const pool: string[] = [...talk.comments, ...talk.comments];
  if (t.name) pool.push(...talk.named, ...talk.named);
  if (t.sides && talk.matchup) pool.push(...talk.matchup);
  pool.push(...REAL_WORLD_TAGS, '😭😭', '🔥🔥', 'no way', 'WOW', 'this is huge', 'finally!!');
  const n = Math.min(Math.max(post.replies, 2), 3 + Math.floor(r() * 7));
  const maxLikes = Math.max(3, Math.round(post.likes * 0.05));
  const used = new Set<string>();
  const out: ThreadReply[] = [];
  for (let i = 0, guard = 0; out.length < n && guard < n * 6; i++, guard++) {
    const line = pick(pool, r);
    if (used.has(line)) continue;
    used.add(line);
    const p = crowdPerson(`${post.id}:rw:${i}`, { vibe: 'casual' });
    const content = typed(fill(line, t, ctx.city, r), r, TYPISTS.casual);
    const rep: ThreadReply = {
      id: `rep-${post.id}-${out.length}`,
      side: 'neutral',
      username: p.username,
      handle: p.handle,
      verified: false,
      content,
      likes: Math.floor(maxLikes * Math.pow(r(), 2)),
      accountId: p.id,
    };
    if (r() < 0.22) {
      const k = crowdPerson(`${post.id}:rw:${i}:k`, { vibe: 'casual' });
      rep.children = [
        {
          id: `${rep.id}-c0`,
          side: 'neutral',
          username: k.username,
          handle: k.handle,
          verified: false,
          content: typed(pick(r() < 0.6 ? AGREE : LAUGH, r), r, TYPISTS.casual),
          likes: Math.floor(rep.likes * 0.3 * r()),
          accountId: k.id,
          toHandle: p.handle,
        },
      ];
    }
    out.push(rep);
  }
  return out.sort((a, b) => b.likes - a.likes);
}

/** The real stories on the trend board: their names, how loud they are, and the line above them. */
export function realTrends(topics: readonly RealTopic[], localRegion: string, count = 8): TrendingTopic[] {
  const out: TrendingTopic[] = [];
  const seen = new Set<string>();
  for (const t of topics) {
    const label = t.trend ?? t.name;
    if (!label || out.length >= count) continue;
    const tag = bareName(label);
    const key = tag.toLowerCase();
    if (seen.has(key) || tag.length > 32) continue;
    seen.add(key);
    const r = seeded(`rw-trend:${t.id}`);
    const volume = t.traffic > 0 ? Math.round(t.traffic * (8 + r() * 17)) : Math.round(1_500 + t.related.length * 2_400 + r() * 30_000);
    const local = t.region !== 'US' && t.region !== 'GLOBAL' && t.region === localRegion && t.traffic > 0;
    out.push({
      hashtag: tag,
      volume,
      sentiment: 'neutral',
      kind: TREND_KIND[t.category],
      momentum: t.traffic >= 1000 ? 'rising' : 'steady',
      peakWeek: 0,
      world: true,
      realId: t.id,
      label: local ? `Trending in ${COUNTRY[t.region] ?? t.region}` : `${CATEGORY_LABEL[t.category]} · Trending`,
    });
  }
  return out;
}
