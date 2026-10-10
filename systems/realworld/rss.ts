/**
 * Reading news feeds (pure): Google Trends' daily RSS (what people are
 * searching, with the news behind it) and Google News' RSS (headlines by
 * section, each with its "full coverage" cluster). Small and forgiving: a
 * feed that changes shape just yields fewer items, never a crash.
 */

export interface RssNews {
  title: string;
  url: string;
  source: string;
}

export interface RssItem {
  title: string;
  link: string;
  /** Published (ms), 0 when missing. */
  at: number;
  /** The publication (Google News). */
  source?: string;
  /** Search volume (Google Trends "2000+" -> 2000). */
  traffic?: number;
  /** The stories behind a trend, or the full-coverage cluster of a headline. */
  news: RssNews[];
}

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

function stripCdata(s: string): string {
  return s.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1');
}

function clean(s: string): string {
  // Feeds sometimes encode twice ("&amp;amp;"): decoding again is harmless for headlines.
  return decodeEntities(decodeEntities(stripCdata(s))).replace(/\s+/g, ' ').trim();
}

/** The text inside the first <name>…</name> (name may carry a namespace: "ht:news_item"). */
function tag(block: string, name: string): string | null {
  const re = new RegExp(`<${name.replace(':', '\\:')}(?:\\s[^>]*)?>([\\s\\S]*?)</${name.replace(':', '\\:')}>`);
  const m = block.match(re);
  return m ? m[1] : null;
}

function tags(block: string, name: string): string[] {
  const re = new RegExp(`<${name.replace(':', '\\:')}(?:\\s[^>]*)?>([\\s\\S]*?)</${name.replace(':', '\\:')}>`, 'g');
  return [...block.matchAll(re)].map((m) => m[1]);
}

/** "2000+", "50K+", "1M+" -> a number. */
export function parseTraffic(s: string | null): number {
  if (!s) return 0;
  const m = s.replace(/,/g, '').match(/([\d.]+)\s*([km])?/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const mult = m[2]?.toLowerCase() === 'm' ? 1_000_000 : m[2]?.toLowerCase() === 'k' ? 1000 : 1;
  return Number.isFinite(n) ? Math.round(n * mult) : 0;
}

/** Google News puts related headlines in the description as an HTML list. */
function cluster(description: string | null): RssNews[] {
  if (!description) return [];
  const html = decodeEntities(decodeEntities(stripCdata(description)));
  const out: RssNews[] = [];
  const re = /<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>(?:\s|&nbsp;| )*(?:<font[^>]*>([\s\S]*?)<\/font>)?/g;
  for (const m of html.matchAll(re)) {
    const title = clean(m[2].replace(/<[^>]+>/g, ''));
    if (title) out.push({ url: m[1], title, source: clean((m[3] ?? '').replace(/<[^>]+>/g, '')) });
  }
  return out;
}

/** Every <item> of an RSS feed (Google Trends or Google News). */
export function parseRss(xml: string): RssItem[] {
  const out: RssItem[] = [];
  for (const m of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)) {
    const block = m[1];
    let title = clean(tag(block, 'title') ?? '');
    if (!title) continue;
    const link = clean(tag(block, 'link') ?? '');
    const date = Date.parse(clean(tag(block, 'pubDate') ?? ''));
    const source = tag(block, 'source');
    const src = source ? clean(source) : undefined;
    // Google News titles end in " - Source".
    if (src && title.endsWith(` - ${src}`)) title = title.slice(0, -(src.length + 3)).trim();
    const trendNews = tags(block, 'ht:news_item').map((n) => ({
      title: clean(tag(n, 'ht:news_item_title') ?? ''),
      url: clean(tag(n, 'ht:news_item_url') ?? ''),
      source: clean(tag(n, 'ht:news_item_source') ?? ''),
    }));
    const news = trendNews.length > 0 ? trendNews.filter((n) => n.title) : cluster(tag(block, 'description'));
    out.push({
      title,
      link,
      at: Number.isFinite(date) ? date : 0,
      source: src,
      traffic: block.includes('ht:approx_traffic') ? parseTraffic(tag(block, 'ht:approx_traffic')) : undefined,
      news,
    });
  }
  return out;
}
