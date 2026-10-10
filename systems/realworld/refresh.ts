import type { RealCategory, RealTopic } from '../../types/realworld';
import { useRealWorldStore } from '../../store/realWorldStore';
import { useSettingsStore } from '../../store/settingsStore';
import { parseRss } from './rss';
import { buildTopics, seasonalTopics, type FeedBatch } from './topics';

/**
 * KEEPING UP WITH THE REAL WORLD (network glue).
 *
 * Every few hours, when the phone apps open, the game reads public feeds:
 * Google Trends' daily searches (for the player's country and the US) and
 * Google News' sports, technology, science and health sections, plus a
 * search for luxury and cars. Everything goes through the screen
 * (systems/realworld/screen) before anyone in the game talks about it.
 * Nothing about the player is sent: these are plain public RSS reads.
 * Offline, or with the setting off, the feeds fall back to what's true every
 * year around today's date (or to the made-up world only).
 */

const REFRESH_MS = 3 * 3_600_000;
/** Live stories are used for a day and a half, then the calendar takes over until the next fetch. */
const FRESH_MS = 36 * 3_600_000;
const TIMEOUT_MS = 12_000;

/** Google editions the game reads (English). */
const EDITIONS: ReadonlySet<string> = new Set(['US', 'GB', 'NG', 'GH', 'KE', 'ZA', 'IN', 'AU', 'CA', 'IE', 'PH', 'SG', 'NZ']);

const ZONES: readonly (readonly [RegExp, string])[] = [
  [/^Africa\/Lagos$/, 'NG'],
  [/^Africa\/Accra$/, 'GH'],
  [/^Africa\/Nairobi$/, 'KE'],
  [/^Africa\/Johannesburg$/, 'ZA'],
  [/^Europe\/London$/, 'GB'],
  [/^Europe\/Dublin$/, 'IE'],
  [/^Asia\/(Kolkata|Calcutta)$/, 'IN'],
  [/^Australia\//, 'AU'],
  [/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina)$/, 'CA'],
  [/^Asia\/Manila$/, 'PH'],
  [/^Asia\/Singapore$/, 'SG'],
  [/^Pacific\/Auckland$/, 'NZ'],
  [/^America\//, 'US'],
];

/** The player's country, from the phone's time zone (no location permission needed). */
export function regionOf(timeZone?: string): string {
  let tz = timeZone;
  if (!tz) {
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      tz = '';
    }
  }
  for (const [re, region] of ZONES) if (re.test(tz ?? '')) return region;
  return 'US';
}

function edition(region: string): string {
  const r = EDITIONS.has(region) ? region : 'US';
  return `hl=en-${r}&gl=${r}&ceid=${r}:en`;
}

interface FeedSpec {
  url: string;
  kind: FeedBatch['kind'];
  region: string;
  hint: RealCategory | null;
}

export function feedsFor(region: string): FeedSpec[] {
  const ed = edition(region);
  const r = EDITIONS.has(region) ? region : 'US';
  const section = (topic: string, hint: RealCategory): FeedSpec => ({
    url: `https://news.google.com/rss/headlines/section/topic/${topic}?${ed}`,
    kind: 'news',
    region: r,
    hint,
  });
  const out: FeedSpec[] = [
    { url: `https://trends.google.com/trending/rss?geo=${r}`, kind: 'trends', region: r, hint: null },
    section('SPORTS', 'sports'),
    section('TECHNOLOGY', 'tech'),
    section('SCIENCE', 'science'),
    section('HEALTH', 'health'),
    {
      url: `https://news.google.com/rss/search?q=${encodeURIComponent('rolex OR ferrari OR lamborghini OR "louis vuitton" OR hermes OR porsche OR "fashion week" OR sneakers when:3d')}&hl=en-US&gl=US&ceid=US:en`,
      kind: 'news',
      region: 'US',
      hint: 'luxury',
    },
  ];
  if (r !== 'US') out.splice(1, 0, { url: 'https://trends.google.com/trending/rss?geo=US', kind: 'trends', region: 'US', hint: null });
  return out;
}

async function getText(url: string): Promise<string | null> {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => ctl?.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctl?.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36', Accept: 'application/rss+xml, application/xml, text/xml' },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

let inFlight: Promise<boolean> | null = null;

/**
 * Fetch fresh stories if it's been a while (or `force`). Never throws, never
 * blocks the game: callers fire and forget. True when new stories landed.
 */
export function refreshRealWorld(force = false): Promise<boolean> {
  if (inFlight) return inFlight;
  const store = useRealWorldStore.getState();
  store.load();
  if (!useSettingsStore.getState().realWorld) return Promise.resolve(false);
  const now = Date.now();
  if (!force && now - useRealWorldStore.getState().fetchedAt < REFRESH_MS) return Promise.resolve(false);
  inFlight = (async () => {
    try {
      const region = regionOf();
      const specs = feedsFor(region);
      const texts = await Promise.all(specs.map((s) => getText(s.url)));
      const batches: FeedBatch[] = [];
      specs.forEach((s, i) => {
        const xml = texts[i];
        if (xml) batches.push({ kind: s.kind, region: s.region, hint: s.hint, items: parseRss(xml) });
      });
      const topics = buildTopics(batches, Date.now());
      // A bad connection or a changed feed gives too little to work with: keep what we had.
      if (topics.length < 5) return false;
      useRealWorldStore.getState().setTopics(topics, Date.now(), region);
      return true;
    } catch {
      return false;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/**
 * What the feeds talk about right now: live stories while they're fresh,
 * otherwise what's true every year around today; nothing with the setting off.
 */
export function realTopicsNow(now = Date.now()): RealTopic[] {
  if (!useSettingsStore.getState().realWorld) return [];
  const s = useRealWorldStore.getState();
  s.load();
  const fresh = s.fetchedAt > 0 && now - s.fetchedAt < FRESH_MS ? s.topics : [];
  return fresh.length > 0 ? [...fresh, ...seasonalTopics(now).slice(0, 2)] : seasonalTopics(now);
}

/** The player's country as last seen ('US' until the first fetch). */
export function realRegion(): string {
  return useRealWorldStore.getState().region;
}
