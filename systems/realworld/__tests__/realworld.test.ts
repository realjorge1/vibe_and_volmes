import '../../__testing__/nativeMocks';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { RealTopic } from '../../../types/realworld';
import { parseRss, parseTraffic, decodeEntities } from '../rss';
import { blocked, categorize, storyBlocked } from '../screen';
import { buildTopics, matchup, nameFor, seasonalTopics, trendName } from '../topics';
import { realPost, realThread, realTrends, bareName } from '../posts';
import { regionOf, feedsFor } from '../refresh';
import { REAL_TALK, REAL_WORLD_TAGS } from '../../../data/realworld/talk';
import { seasonalFor } from '../../../data/realworld/seasonal';
import { everydayPosts, everydayThread } from '../../social/everyday';

// --- Feeds, shaped like the real ones (Google Trends and Google News RSS) -------------

const TRENDS = `<?xml version="1.0" encoding="UTF-8"?><rss xmlns:ht="https://trends.google.com/trending/rss" version="2.0"><channel>
<item><title>sporting cp</title><ht:approx_traffic>2000+</ht:approx_traffic><pubDate>Fri, 9 Oct 2026 14:00:00 -0700</pubDate>
<ht:news_item><ht:news_item_title>Braga vs. Sporting Lineups, Live Streaming, How &amp;amp; Where to Watch on TV</ht:news_item_title><ht:news_item_url>https://example.com/a</ht:news_item_url><ht:news_item_source>Athlon Sports</ht:news_item_source></ht:news_item>
<ht:news_item><ht:news_item_title>Preview: Braga vs Sporting Lisbon - team news, lineups</ht:news_item_title><ht:news_item_url>https://example.com/b</ht:news_item_url><ht:news_item_source>Sports Mole</ht:news_item_source></ht:news_item></item>
<item><title>trump putin diesel</title><ht:approx_traffic>5000+</ht:approx_traffic><pubDate>Fri, 9 Oct 2026 14:00:00 -0700</pubDate>
<ht:news_item><ht:news_item_title>Trump announces diesel deal with Russia in bid to lower prices</ht:news_item_title><ht:news_item_url>https://example.com/c</ht:news_item_url><ht:news_item_source>Reuters</ht:news_item_source></ht:news_item></item>
<item><title>idowu sobowale former lagos commissioner</title><ht:approx_traffic>100+</ht:approx_traffic><pubDate>Fri, 9 Oct 2026 14:00:00 -0700</pubDate>
<ht:news_item><ht:news_item_title>Idowu Sobowale, journalism teacher, dies at 85</ht:news_item_title><ht:news_item_url>https://example.com/d</ht:news_item_url><ht:news_item_source>Punch</ht:news_item_source></ht:news_item></item>
<item><title>football bet</title><ht:approx_traffic>100+</ht:approx_traffic><pubDate>Fri, 9 Oct 2026 14:00:00 -0700</pubDate>
<ht:news_item><ht:news_item_title>Football Bet of the Day: shots are the way forward on Sunday</ht:news_item_title><ht:news_item_url>https://example.com/e</ht:news_item_url><ht:news_item_source>Telegraph</ht:news_item_source></ht:news_item></item>
</channel></rss>`;

const item = (title: string, source: string, related: [string, string][] = []) =>
  `<item><title>${title} - ${source}</title><link>https://news.google.com/rss/articles/${encodeURIComponent(title).slice(0, 20)}</link><pubDate>Fri, 09 Oct 2026 16:04:00 GMT</pubDate><description>${
    related.map(([t, s]) => `&lt;li&gt;&lt;a href="https://news.google.com/x/${encodeURIComponent(t).slice(0, 12)}" target="_blank"&gt;${t}&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;${s}&lt;/font&gt;&lt;/li&gt;`).join('')
  }</description><source url="https://${source.toLowerCase().replace(/\W/g, '')}.com">${source}</source></item>`;

const SPORTS = `<rss><channel>
${item('Mike Ditka, legendary Chicago Bears coach, dies at 86', 'NBC News')}
${item('5 reasons Dodgers-Brewers NLCS is different this time around', 'MLB.com', [['Dodgers vs. Brewers NLCS Game 1 preview', 'ESPN']])}
${item('LeBron James shines in Sixers debut; Sixers struggle vs. Nets', 'PHLY Sports')}
${item("Cowboys' Jerry Jones expresses interest in trades despite embarrassing loss to Buccaneers", 'CBS Sports')}
${item('49ers vs. Seahawks: The Standard’s 5 fast predictions', 'SF Standard', [['49ers vs Seahawks odds and picks', 'Covers']])}
${item('Stewards issue verdict over Verstappen yellow flag incident', 'Formula 1')}
${item('Ranking all 32 NFL teams into tiers: 49ers among the elite', 'CBS Sports', [['NFL power rankings Week 6', 'ESPN'], ['Player arrested after traffic stop', 'Local News']])}
</channel></rss>`;

const SCIENCE = `<rss><channel>
${item('Northern lights possible across the US tonight as 4 CMEs head for Earth', 'Space', [['How to see the aurora this weekend', 'NPR']])}
${item('Tooth study shows T. Rex was warmblooded, with human-like temperature', 'The Star')}
${item('Study Shows Big Bang Predictions Were Wrong Again', 'Answers in Genesis')}
${item('Southern California surfers are being diagnosed with a bizarre tumor condition', 'Yahoo Health')}
${item('4 astronauts return to Earth after 8 months in space', 'KSL News')}
</channel></rss>`;

const HEALTH = `<rss><channel>
${item('Why Weight Lifting Is Good for Your Heart', 'The New York Times')}
${item('US surpasses 4,000 measles cases with infections confirmed in 45 states', 'ABC News')}
${item('US health secretary launches new push on vaccine injuries', 'Reuters')}
${item('Clinical study on a new pill', 'Some Outlet')}
</channel></rss>`;

const TECH = `<rss><channel>
${item('Samsung Galaxy S27 tier prices reportedly leaked. See the list.', 'Mashable')}
${item("'GTA 6' Fandom Is Officially Shook After The Nude Jason Leak", 'Polygon.com')}
${item('Apple will reportedly debut its first touchscreen MacBook in three weeks', 'The Verge')}
${item('Inside The Failed Fight To Unionize One Of Gaming’s Most Idealized Studios', 'Kotaku')}
${item('Star Wars: Galactic Racer devs on how they bottled Burnout’s magic game feel', 'Eurogamer.net')}
</channel></rss>`;

const NOW = Date.parse('2026-10-10T06:00:00Z');

function batches() {
  return [
    { kind: 'trends' as const, region: 'NG', hint: null, items: parseRss(TRENDS) },
    { kind: 'news' as const, region: 'NG', hint: 'sports' as const, items: parseRss(SPORTS) },
    { kind: 'news' as const, region: 'US', hint: 'science' as const, items: parseRss(SCIENCE) },
    { kind: 'news' as const, region: 'US', hint: 'health' as const, items: parseRss(HEALTH) },
    { kind: 'news' as const, region: 'US', hint: 'tech' as const, items: parseRss(TECH) },
  ];
}

test('the feeds parse: trends with their traffic and stories, news with source and coverage', () => {
  const trends = parseRss(TRENDS);
  assert.equal(trends.length, 4);
  assert.equal(trends[0].title, 'sporting cp');
  assert.equal(trends[0].traffic, 2000);
  assert.equal(trends[0].news.length, 2);
  assert.equal(trends[0].news[0].source, 'Athlon Sports');
  assert.ok(trends[0].news[0].title.includes('How & Where'));
  const news = parseRss(SPORTS);
  assert.equal(news[1].title, '5 reasons Dodgers-Brewers NLCS is different this time around');
  assert.equal(news[1].source, 'MLB.com');
  assert.equal(news[1].news[0].title, 'Dodgers vs. Brewers NLCS Game 1 preview');
  assert.equal(news[1].news[0].source, 'ESPN');
  assert.ok(news[1].at > 0);
  assert.equal(parseTraffic('50K+'), 50_000);
  assert.equal(parseTraffic('1M+'), 1_000_000);
  assert.equal(decodeEntities('A&apos;ja &amp; co &#8217;'), 'A\'ja & co ’');
  assert.deepEqual(parseRss('<rss>broken'), []);
});

test('the screen keeps out politics, religion, crime, deaths, illness, betting, gossip and pile-ons', () => {
  const out = [
    'Trump announces diesel deal with Russia in bid to lower prices',
    'Kennedy Center doesn’t have to answer questions, DOJ asserts',
    'Iran war live: coalition attacks Houthis',
    '2027: Tinubu kicks off re-election campaign in Kaduna',
    'Pope calls for prayers at Vatican service',
    'Sam Wood denied bail over domestic violence charges',
    'Mike Ditka, legendary Chicago Bears coach, dies at 86',
    'Sanwo-Olu mourns ex-Lagos commissioner',
    'US surpasses 4,000 measles cases',
    'Florida officials meet amid fierce debate over childhood vaccine plans',
    'Football Bet of the Day: shots are the way forward',
    'Lens vs Sporting CP: Predictions, Picks, Odds & Lineups',
    'Basic Instinct star felt horrible after filming sex scene',
    'Elliot Page is terribly wrong about gender surgery',
    "Ex-Yankee rips former team: 'It's insanity'",
    'Cowboys owner expresses interest despite embarrassing loss',
    "'GTA 6' Fandom Is Officially Shook After The Nude Jason Leak",
    'Hurricane forces stadium evacuation',
    'Flick stuns Barcelona fans over Raphinha and embarrasses Ancelotti',
  ];
  for (const t of out) assert.ok(blocked(t), `should be blocked: ${t}`);
  const fine = [
    '5 reasons Dodgers-Brewers NLCS is different this time around',
    'Northern lights possible across the US tonight',
    'Tooth study shows T. Rex was warmblooded',
    'Samsung Galaxy S27 tier prices reportedly leaked. See the list.',
    'Star Wars: Galactic Racer devs on how they bottled game feel',
    'Gears of War: E-Day sells 230K copies',
    'Why Weight Lifting Is Good for Your Heart',
    'Ferrari unveils its first electric car',
    'Penalty shootout sends Ghana into the final',
  ];
  for (const t of fine) assert.equal(blocked(t), null, `should be allowed: ${t}`);
  // A story whose second headline turns ugly is out, and so is a side's publication.
  assert.ok(storyBlocked(['Ranking all 32 NFL teams', 'Player arrested after traffic stop']));
  assert.ok(storyBlocked(['Study Shows Big Bang Predictions Were Wrong Again'], ['Answers in Genesis']));
});

test('stories are filed under the light categories only, wellness only when it is wellness', () => {
  assert.equal(categorize(['Dodgers vs. Brewers NLCS Game 1 preview']), 'sports');
  assert.equal(categorize(['Northern lights possible tonight as CMEs head for Earth'], 'science'), 'space');
  assert.equal(categorize(['Apple will debut its first touchscreen MacBook'], 'tech'), 'tech');
  assert.equal(categorize(['Forza Horizon 6 delayed to 2027 on PS5'], 'tech'), 'gaming');
  assert.equal(categorize(['Why Weight Lifting Is Good for Your Heart'], 'health'), 'health');
  assert.equal(categorize(['Clinical study on a new pill'], 'health'), null);
  assert.equal(categorize(['Jennifer Hudson says marriage is not her focus']), null, 'celebrity gossip is not a category');
  assert.equal(categorize(['Rolex unveils new Daytona at watch fair'], 'luxury'), 'luxury');
});

test('topics come out clean, named, with matchups and real links', () => {
  const topics = buildTopics(batches(), NOW);
  const titles = topics.map((t) => t.headline.title).join(' | ');
  for (const bad of ['Trump', 'dies', 'Bet of the Day', 'embarrassing', 'predictions', 'measles', 'vaccine', 'Nude', 'Unionize', 'Big Bang', 'tumor', 'Ranking all 32']) {
    assert.ok(!titles.toLowerCase().includes(bad.toLowerCase()), `"${bad}" got through: ${titles}`);
  }
  const sporting = topics.find((t) => t.trend === 'Sporting CP');
  assert.ok(sporting, 'the safe search trend is there');
  assert.equal(sporting!.name, 'Sporting CP');
  assert.deepEqual(sporting!.sides, ['Braga', 'Sporting']);
  assert.equal(sporting!.region, 'NG');
  assert.equal(sporting!.traffic, 2000);
  assert.ok(topics.some((t) => t.name === 'the northern lights' && t.category === 'space'));
  assert.ok(topics.some((t) => t.name === 'T. rex'));
  assert.ok(topics.some((t) => t.name === 'Galaxy S27'));
  assert.ok(topics.some((t) => t.name === 'the touchscreen MacBook'));
  assert.ok(topics.some((t) => t.category === 'health' && t.headline.title.startsWith('Why Weight Lifting')));
  for (const t of topics) {
    assert.ok(t.headline.url.startsWith('https://'), 'every live story links to its article');
    assert.ok(t.headline.source.length > 0);
  }
});

test('names: teams, products and sky events, never a sentence opener', () => {
  assert.equal(nameFor('Knicks tabling Karl-Anthony Towns contract talks', 'sports'), 'the Knicks');
  assert.equal(nameFor('Apple rolls out update for iPhone 18 Pro Max on iOS 27.2 beta', 'tech'), 'iPhone 18 Pro Max');
  assert.equal(nameFor("'Dude! No way!' Scientists jump for joy over Artemis II moon results", 'space'), 'Artemis II');
  assert.equal(nameFor('Audacious space heist aims to bring home bits of a martian moon', 'science'), null);
  assert.equal(nameFor('Chinese camera rivals battle for dominance', 'tech'), null);
  assert.equal(nameFor('Eagles spotted nesting near the lake', 'science'), null, 'a team name only counts in sports');
  assert.equal(trendName("a'ja wilson mvp speech reaction"), 'A’ja Wilson MVP Speech Reaction');
  assert.deepEqual(matchup(['Liverpool XI vs Man City: team news']), ['Liverpool', 'Man City']);
  assert.equal(bareName('the Dodgers'), 'Dodgers');
});

test('nothing the game\'s people say about real news touches a blocked subject', () => {
  const names = ['the Dodgers', 'Galaxy S27', 'the northern lights', 'T. rex', 'Rolex', 'Porsche', 'GTA 6', 'weight lifting'];
  for (const [cat, talk] of Object.entries(REAL_TALK)) {
    const lines = [...talk.posts, ...talk.quotes, ...talk.comments, ...talk.named, ...(talk.matchup ?? []), ...talk.tok, ...talk.leads, ...REAL_WORLD_TAGS];
    for (const line of lines) {
      for (const n of names) {
        const filled = line.replace(/\{topic\}/g, n).replace(/\{a\}/g, 'Braga').replace(/\{b\}/g, 'Sporting').replace(/\{friend\}/g, 'kemi').replace(/\{city\}/g, 'Lagos');
        assert.equal(blocked(filled), null, `${cat} line trips the screen: ${filled}`);
      }
    }
  }
  const topics = buildTopics(batches(), NOW);
  for (const t of topics) {
    for (const platform of ['chirper', 'flashpic', 'tunetok', 'vibestream'] as const) {
      for (let i = 0; i < 6; i++) {
        const p = realPost(t, platform, i, { week: 3, idPrefix: 'test', city: 'Lagos' });
        assert.equal(blocked(p.content), null, `post trips the screen: ${p.content}`);
        assert.equal(p.lane, 'everyday');
        assert.equal(p.world?.topicId, t.id);
        if (platform === 'vibestream') assert.equal(p.content, t.headline.title, 'VibeNews carries the real headline as is');
        for (const r of realThread({ ...p, replies: 9 }, t, { city: 'Lagos' })) {
          assert.equal(blocked(r.content), null, `comment trips the screen: ${r.content}`);
        }
      }
    }
  }
});

test('the trend board: real trends, without "the", labelled by kind or by country', () => {
  const topics = buildTopics(batches(), NOW);
  const board = realTrends(topics, 'NG');
  assert.ok(board.length >= 3);
  assert.ok(board.every((t) => t.world && t.realId && t.label && !/^the /i.test(t.hashtag)));
  assert.equal(board.find((t) => t.hashtag === 'Sporting CP')?.label, 'Trending in Nigeria');
  assert.ok(board.some((t) => t.label === 'Space · Trending'));
});

test('offline, the calendar still knows what the world is talking about', () => {
  const oct9 = seasonalFor(10, 9).map((s) => s.id);
  for (const id of ['nobel-week', 'mlb-postseason', 'draconids', 'ucl-nights', 'phone-season']) assert.ok(oct9.includes(id), id);
  assert.ok(!oct9.includes('perseids'));
  assert.ok(seasonalFor(12, 26).some((s) => s.id === 'boxing-day'));
  const topics = seasonalTopics(Date.parse('2026-08-12T12:00:00Z'));
  assert.ok(topics.some((t) => t.name === 'the Perseid meteor shower'));
  assert.ok(topics.every((t) => t.evergreen && t.headline.url === ''));
});

test('the phone\'s time zone picks the country\'s news, and the feeds asked for are public ones', () => {
  assert.equal(regionOf('Africa/Lagos'), 'NG');
  assert.equal(regionOf('Europe/London'), 'GB');
  assert.equal(regionOf('America/Chicago'), 'US');
  assert.equal(regionOf('America/Toronto'), 'CA');
  assert.equal(regionOf('Asia/Tokyo'), 'US');
  const ng = feedsFor('NG');
  assert.ok(ng.some((f) => f.url.includes('geo=NG')) && ng.some((f) => f.url.includes('geo=US')));
  assert.ok(ng.some((f) => f.url.includes('topic/SPORTS?hl=en-NG&gl=NG')));
  assert.ok(ng.every((f) => /^https:\/\/(news|trends)\.google\.com\//.test(f.url)));
});

test('the everyday feed talks about real news, and its comment sections discuss it', () => {
  const topics: RealTopic[] = buildTopics(batches(), NOW);
  let real = 0;
  let r = 1;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const posts = everydayPosts({ week: 4, baseYear: 2026, city: 'Lagos', count: 200, idPrefix: 't', rnd, real: topics });
  for (const p of posts) {
    if (!p.world) continue;
    real++;
    const thread = everydayThread(p, { city: 'Lagos', baseYear: 2026, real: topics });
    assert.ok(thread.length >= 2, 'people talk under it');
  }
  assert.ok(real > 30 && real < 120, `a share of the everyday feed is real news (${real}/200)`);
  const none = everydayPosts({ week: 4, baseYear: 2026, city: 'Lagos', count: 100, idPrefix: 'u', rnd, real: [] });
  assert.equal(none.filter((p) => p.world).length, 0, 'switched off: the made-up world only');
});
