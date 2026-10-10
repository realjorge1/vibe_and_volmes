import type { RealCategory, RealHeadline, RealTopic } from '../../types/realworld';
import type { RssItem } from './rss';
import { categorize, norm, storyBlocked } from './screen';
import { CASING, ENTITIES } from '../../data/realworld/entities';
import { seasonalFor } from '../../data/realworld/seasonal';

/**
 * FROM FEEDS TO TOPICS (pure).
 *
 * Every item of every feed is screened (systems/realworld/screen: the lead
 * headline, every headline in its cluster and every source), filed under a
 * category, given the short name people would use, and deduplicated. The
 * result is ranked so the board has a mix: a few matchups, a launch, a sky
 * event, a study, a luxury drop.
 */

export interface FeedBatch {
  kind: 'trends' | 'news';
  /** Where the feed is from ('US', 'NG', 'GB'...). */
  region: string;
  /** The section a news feed is (null for trends and searches). */
  hint: RealCategory | null;
  items: readonly RssItem[];
}

const MAX_AGE_MS = 4 * 86_400_000;

/** How many of each kind the board keeps, so one sport can't drown out the sky. */
const QUOTA: Record<RealCategory, number> = { sports: 14, tech: 9, gaming: 6, science: 7, space: 7, health: 4, luxury: 5, auto: 4 };

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function cap(word: string): string {
  const known = CASING[word.toLowerCase()];
  if (known) return known;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** A search trend ("utah state football") the way a trend board prints it ("Utah State Football"). */
export function trendName(title: string): string {
  return title
    .trim()
    .split(/\s+/)
    .map((w) => w.split('-').map(cap).join('-'))
    .join(' ');
}

const ENTITY_RES: Record<keyof typeof ENTITIES, readonly (readonly [RegExp, string])[]> = Object.fromEntries(
  Object.entries(ENTITIES).map(([k, list]) => [k, list.map(([pat, name]) => [new RegExp(`[ ](?:${pat})(?=[ '.,:;!?])`), name] as const)])
) as unknown as Record<keyof typeof ENTITIES, readonly (readonly [RegExp, string])[]>;

const LISTS: Record<RealCategory, readonly (keyof typeof ENTITIES)[]> = {
  sports: ['sports'],
  tech: ['tech', 'gaming'],
  gaming: ['gaming', 'tech'],
  science: ['space'],
  space: ['space'],
  health: [],
  luxury: ['luxury'],
  auto: ['luxury'],
};

/** "$1 Grand Prix" with the captured words written properly. */
function expand(name: string, m: RegExpMatchArray): string {
  return name
    .replace(/\$(\d)/g, (_x, d: string) => {
      const g = m[Number(d)] ?? '';
      return g
        .split(' ')
        .map((w) => (w ? cap(w) : w))
        .join(' ');
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** Words that start a headline without being its subject. */
const SKIP = new Set([
  'report', 'reports', 'watch', 'live', 'breaking', 'exclusive', 'how', 'why', 'what', 'who', 'when', 'where', 'the', 'a', 'an', 'this', 'these', "here's", 'heres',
  'first', 'new', 'opinion', 'column', 'commentary', 'video', 'photos', 'preview', 'review', 'apod', 'analysis', 'explainer', 'inside', 'ranking', 'look', 'it’s', "it's",
  'is', 'are', 'can', 'will', 'did', 'does', 'should', 'meet', 'friday', 'monday', 'tuesday', 'wednesday', 'thursday', 'saturday', 'sunday', 'week', 'today', 'tonight',
  'ask', 'welcome', 'celebrating', 'from', 'after', 'inside', 'only', 'why', 'all', 'every', 'our', 'your', 'my',
]);

/** Single words too vague to be what a story is "about". */
const VAGUE = new Set(['scientists', 'study', 'researchers', 'experts', 'fans', 'news', 'update', 'sources', 'best', 'top', 'more', 'some', 'all', 'one', 'two', 'three', 'four', 'five', 'earth', 'humans', 'people', 'man', 'woman']);

/**
 * The short name for a headline: a known team, product, league or sky event
 * first, else the proper noun it opens with ("Webb Telescope"), else null.
 */
export function nameFor(title: string, category: RealCategory): string | null {
  const t = norm(title);
  for (const list of LISTS[category]) {
    for (const [re, name] of ENTITY_RES[list]) {
      const m = t.match(re);
      if (m) return expand(name, m);
    }
  }
  // A headline In Title Case gives no hint which capitals are names.
  const words = title.replace(/[“”"‘’']/g, "'").split(/\s+/).filter(Boolean);
  const capitals = words.filter((w) => /^[A-Z]/.test(w)).length;
  if (words.length >= 4 && capitals / words.length > 0.6) return null;
  let i = 0;
  while (i < words.length && SKIP.has(words[i].toLowerCase().replace(/[:,.!?]+$/, ''))) i++;
  const run: string[] = [];
  for (; i < words.length && run.length < 3; i++) {
    const w = words[i].replace(/[:,.!?;]+$/, '').replace(/'s$/, '');
    if (!/^[A-Z][A-Za-z0-9.&-]*$/.test(w)) break;
    run.push(w);
    if (/[:,;]$/.test(words[i])) break;
  }
  const name = run.join(' ');
  if (!name || name.length < 4) return null;
  // One plain capitalised word is usually just how the sentence starts ("Audacious", "Chinese"):
  // only a product-looking word (a digit, inner capitals, an acronym) counts on its own.
  if (run.length === 1 && (VAGUE.has(name.toLowerCase()) || !/\d|[a-z][A-Z]|^[A-Z]{2,}$/.test(name))) return null;
  return name;
}

const SIDE = "[A-Z][\\w.'’&-]*(?: [A-Z][\\w.'’&-]*){0,2}";
const VS = new RegExp(`(${SIDE}) (?:vs\\.?|v\\.?|versus) (${SIDE})`);

/** Words that ride along after a team's name in previews ("Braga vs Sporting Lineups"). */
const SIDE_TAIL = /\s+(?:lineups?|xi|preview|predictions?|prediction|live|stream|streaming|odds|highlights|result|results|score|scores|stats|team news|h2h|head-to-head|tickets?|kick-?off|time|channel|tv|updates?|recap|report)\b.*$/i;

function side(s: string): string {
  return s.replace(SIDE_TAIL, '').replace(/[:,;.!?]+$/, '').trim();
}

/** "Braga vs Sporting Lisbon" -> the two sides. */
export function matchup(texts: readonly string[]): [string, string] | undefined {
  for (const t of texts) {
    const m = t.match(VS);
    if (!m) continue;
    const a = side(m[1]);
    const b = side(m[2]);
    if (a && b && a !== b) return [a, b];
  }
  return undefined;
}

/** The name people would say for a search trend: a team or product in its news, else the search if it's short. */
function trendTalkName(trend: string, news: readonly string[], category: RealCategory): string | null {
  for (const n of news) {
    const t = norm(n);
    for (const list of LISTS[category]) {
      for (const [re, name] of ENTITY_RES[list]) {
        const m = t.match(re);
        if (m) return expand(name, m);
      }
    }
  }
  const words = trend.trim().split(/\s+/);
  return words.length <= 2 ? trendName(trend) : null;
}

function lead(item: RssItem, kind: FeedBatch['kind']): RealHeadline | null {
  if (kind === 'trends') {
    const n = item.news[0];
    return n ? { title: n.title, source: n.source, url: n.url, at: item.at } : null;
  }
  return { title: item.title, source: item.source ?? item.news[0]?.source ?? '', url: item.link, at: item.at };
}

/** All the light, current stories in a set of feeds. */
export function buildTopics(batches: readonly FeedBatch[], now: number): RealTopic[] {
  const byId = new Map<string, RealTopic>();
  const seenTitles = new Set<string>();
  for (const b of batches) {
    for (const item of b.items) {
      if (item.at > 0 && now - item.at > MAX_AGE_MS) continue;
      const texts = [item.title, ...item.news.map((n) => n.title)];
      const sources = [item.source, ...item.news.map((n) => n.source)];
      if (storyBlocked(texts, sources)) continue;
      const category = categorize(texts, b.hint);
      if (!category) continue;
      const head = lead(item, b.kind);
      if (!head || !head.url) continue;
      const key = norm(head.title).trim();
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);
      const name = b.kind === 'trends' ? trendTalkName(item.title, item.news.map((n) => n.title), category) : nameFor(item.title, category);
      const related = (b.kind === 'trends' ? item.news.slice(1) : item.news)
        .filter((n) => n.title && n.url && norm(n.title).trim() !== key)
        .slice(0, 5)
        .map((n) => ({ title: n.title, source: n.source, url: n.url, at: item.at }));
      const id = `rw-${category}-${hash(b.kind === 'trends' ? `t:${item.title.toLowerCase()}` : key)}`;
      const prev = byId.get(id);
      if (prev) {
        prev.traffic = Math.max(prev.traffic, item.traffic ?? 0);
        continue;
      }
      byId.set(id, {
        id,
        category,
        name,
        headline: head,
        related,
        traffic: item.traffic ?? 0,
        trend: b.kind === 'trends' ? trendName(item.title) : undefined,
        region: b.region,
        at: item.at || now,
        sides: category === 'sports' ? matchup(texts) : undefined,
      });
    }
  }
  return rankTopics([...byId.values()], now);
}

/** What leads: what people search most, then what's newest; capped per kind. */
export function rankTopics(topics: readonly RealTopic[], now: number): RealTopic[] {
  const score = (t: RealTopic) => {
    const hours = Math.max(0, (now - t.at) / 3_600_000);
    return Math.log10(10 + t.traffic) * 2 + (t.name ? 1 : 0) + (t.sides ? 0.6 : 0) - hours / 18 + (t.region !== 'US' ? 0.4 : 0);
  };
  const sorted = [...topics].sort((a, b) => score(b) - score(a));
  const used = new Map<RealCategory, number>();
  const out: RealTopic[] = [];
  for (const t of sorted) {
    const n = used.get(t.category) ?? 0;
    if (n >= QUOTA[t.category]) continue;
    used.set(t.category, n + 1);
    out.push(t);
  }
  return out;
}

/** What's true every year around `now` (no live data): talk only, no links. */
export function seasonalTopics(now: number): RealTopic[] {
  const d = new Date(now);
  return seasonalFor(d.getMonth() + 1, d.getDate()).map((s) => ({
    id: `rw-season-${s.id}`,
    category: s.category,
    name: s.name,
    headline: { title: s.blurb, source: '', url: '', at: now },
    related: [],
    traffic: 0,
    region: 'GLOBAL',
    at: now,
    evergreen: true,
  }));
}
