import type { Moment, PostMeme, PostPoll, Take } from '../../types/drama';
import type { AccountType, PostSentiment } from '../../types/social';
import type { Gender } from '../../types/player';
import { MEMES, POLLS, TAKES, THIRST, type TopicKind } from '../../data/drama/takes';
import type { CrowdGender, CrowdVibe } from './crowd';
import { admirerGender } from './crowd';

/**
 * THE DISCOURSE ENGINE (pure).
 *
 * What the internet is talking about this week, and how. Topics come from
 * the artist's life: the latest release, every moment still burning (by
 * heat), the rival war, a romance, plus background vibes and (rarely) their
 * looks. Each topic carries a mix of takes, and that mix is never unanimous:
 * fame grows the haters as fast as the fans (tall poppies), reputation tilts
 * the balance, and scandals bring out the draggers and the defenders.
 */

export interface DiscourseRival {
  id: string;
  name: string;
  handle: string;
  /** 0..100 rivalry heat. */
  intensity: number;
  /** 0..100 public support for the artist in the war (50 = even). */
  score: number;
}

export interface DiscourseInput {
  playerName: string;
  gender: Gender;
  genre: string;
  city: string;
  fans: number;
  /** 0..100, 50 neutral. */
  reputation: number;
  trackTitle: string | null;
  /** How the latest release is landing, 0..100 (null = unknown). */
  trackScore?: number | null;
  /** Moments still burning (heat > 0). */
  moments: readonly Moment[];
  rival: DiscourseRival | null;
  partnerName: string | null;
}

export interface Topic {
  kind: TopicKind;
  weight: number;
  moment?: Moment;
  takes: Partial<Record<Take, number>>;
}

/** Who should voice a post. */
export type Voice =
  | { kind: 'type'; type: AccountType }
  | { kind: 'crowd'; vibe: CrowdVibe; gender?: CrowdGender }
  | { kind: 'rival' };

export interface ComposedPost {
  topic: TopicKind;
  take: Take;
  text: string;
  sentiment: PostSentiment;
  voice: Voice;
  momentId?: string;
  meme?: PostMeme;
  poll?: PostPoll;
}

export const TAKE_SENTIMENT: Record<Take, PostSentiment> = {
  love: 'hype',
  hate: 'hostile',
  banter: 'meme',
  meme: 'meme',
  drag: 'hostile',
  defend: 'positive',
  thirst: 'hype',
  news: 'news',
  stanwar: 'shade',
  subtweet: 'shade',
  poll: 'neutral',
  wholesome: 'positive',
  skeptic: 'critical',
  shade: 'shade',
};

/** 0..1 log fame: 1K → .33, 100K → .67, 10M → 1. */
export function reach(fans: number): number {
  return Math.min(1, Math.max(0, (Math.log10(Math.max(0, fans) + 10) - 1) / 6));
}

/** Love/hate tilt from reputation: -1 (hated) .. 1 (beloved). */
function repTilt(reputation: number): number {
  return Math.max(-1, Math.min(1, (reputation - 50) / 40));
}

const MOMENT_TAKES: Record<string, Partial<Record<Take, number>>> = {
  scandal: { drag: 5, defend: 2, banter: 3, news: 2, shade: 2, skeptic: 1.5, hate: 2, meme: 2, poll: 1 },
  ugly: { meme: 5, banter: 4, drag: 2, defend: 1.5, love: 1, news: 1, poll: 1 },
  charity: { wholesome: 6, skeptic: 2.5, banter: 1, news: 1.5, love: 1 },
  best: { love: 6, hate: 1.5, meme: 2, news: 2, skeptic: 0.8 },
  romance: { shade: 3, love: 3, hate: 2, banter: 3, meme: 1.5, news: 1, poll: 1 },
  beef: { stanwar: 4, hate: 3, banter: 3, meme: 2, news: 1.5, defend: 1, poll: 2 },
  flop: { drag: 4, banter: 3, defend: 2, hate: 2, news: 1 },
  meme: { meme: 5, banter: 2, love: 1 },
};

/** What people are talking about this week, weighted. */
export function topicsFor(input: DiscourseInput): Topic[] {
  const r = reach(input.fans);
  const tilt = repTilt(input.reputation);
  // An unknown gets critics and curious listeners first; hype and memes need a name.
  const fresh = 1 - r;
  const topics: Topic[] = [];

  // Background vibes: always some love, always some hate, more of both with fame.
  topics.push({
    kind: 'vibe',
    weight: 4,
    takes: {
      love: (3 + 4 * r) * (1 + 0.6 * tilt) * (1 - 0.5 * fresh),
      hate: (1.2 + 5 * r) * (1 - 0.5 * tilt),
      banter: 3 + 2 * r,
      meme: (1 + 3 * r) * (1 - 0.6 * fresh),
      skeptic: 1.5 + r + 3 * fresh,
      defend: 0.5 + 1.5 * r,
      news: 0.3 + 1.5 * r * r,
      shade: 0.2 + 2 * r * r,
      poll: 0.5 * r,
    },
  });

  if (input.trackTitle) {
    const s = input.trackScore ?? 60;
    topics.push({
      kind: 'track',
      weight: 4.5,
      takes: {
        love: (2 + s / 18) * (1 - 0.4 * fresh),
        hate: 1 + (100 - s) / 22 + 2 * r,
        banter: 2.5,
        meme: (1 + 2 * r) * (1 - 0.6 * fresh),
        skeptic: 0.8 + (s > 75 ? 1.5 : 0) + 2.5 * fresh,
        defend: s < 55 ? 2 : 0.5,
        news: 0.4 + r,
        poll: 0.6,
      },
    });
  }

  for (const m of input.moments) {
    if (m.heat <= 3) continue;
    const base = MOMENT_TAKES[m.kind] ?? { banter: 1 };
    const takes: Partial<Record<Take, number>> = { ...base };
    // Loved artists get defended harder; disliked ones get dragged harder.
    if (takes.defend !== undefined) takes.defend *= 1 + 0.8 * Math.max(0, tilt);
    if (takes.drag !== undefined) takes.drag *= 1 + 0.6 * Math.max(0, -tilt);
    topics.push({ kind: m.kind, weight: m.heat / 9, moment: m, takes });
  }

  if (input.rival && input.rival.intensity >= 25) {
    const i = input.rival.intensity;
    topics.push({
      kind: 'beef',
      weight: i / 14,
      takes: { ...MOMENT_TAKES.beef, subtweet: i >= 35 ? 2.5 : 0 },
    });
  }

  if (input.partnerName && !input.moments.some((m) => m.kind === 'romance')) {
    topics.push({ kind: 'romance', weight: 0.6 + r, takes: { love: 2, banter: 2, shade: 1, hate: 1 } });
  }

  // Looks: a little thirst, never the whole feed.
  topics.push({ kind: 'looks', weight: 0.35 + 1.1 * r, takes: { thirst: 1 } });

  return topics.filter((t) => t.weight > 0);
}

function weighted<T extends string>(w: Partial<Record<T, number>>, rnd: () => number): T | null {
  let total = 0;
  for (const k in w) total += Math.max(0, w[k] ?? 0);
  if (total <= 0) return null;
  let x = rnd() * total;
  for (const k in w) {
    x -= Math.max(0, w[k] ?? 0);
    if (x < 0) return k;
  }
  return null;
}

export function pickTopic(topics: readonly Topic[], rnd: () => number): Topic {
  let total = 0;
  for (const t of topics) total += t.weight;
  let x = rnd() * total;
  for (const t of topics) {
    x -= t.weight;
    if (x < 0) return t;
  }
  return topics[topics.length - 1];
}

// --- Filling text -----------------------------------------------------------------------

const PRONOUNS: Record<Gender, Record<string, string>> = {
  male: { he: 'he', him: 'him', his: 'his', "he's": "he's", himself: 'himself', king: 'king', bro: 'bro', spouse: 'wife' },
  female: { he: 'she', him: 'her', his: 'her', "he's": "she's", himself: 'herself', king: 'queen', bro: 'sis', spouse: 'husband' },
  nonbinary: { he: 'they', him: 'them', his: 'their', "he's": "they're", himself: 'themself', king: 'icon', bro: 'bestie', spouse: 'partner' },
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export interface FillVars {
  topic?: string;
  rival?: string;
  partner?: string;
}

export function fillText(text: string, input: Pick<DiscourseInput, 'playerName' | 'gender' | 'genre' | 'city' | 'trackTitle'>, v: FillVars = {}): string {
  const p = PRONOUNS[input.gender] ?? PRONOUNS.nonbinary;
  return text
    .replace(/\{playerName\}/g, input.playerName)
    .replace(/\{trackTitle\}/g, input.trackTitle ?? 'the new one')
    .replace(/\{genre\}/g, input.genre)
    .replace(/\{city\}/g, input.city)
    .replace(/\{topic\}/g, v.topic ?? 'all this')
    .replace(/\{rival\}/g, v.rival ?? 'the other guy')
    .replace(/\{partner\}/g, v.partner ?? 'the mystery date')
    .replace(/\{(He's|he's|He|he|Him|him|His|his|himself|king|bro|spouse)\}/g, (_m, k: string) => {
      const lower = k.charAt(0).toLowerCase() + k.slice(1);
      const val = p[lower] ?? k;
      return k.charAt(0) === k.charAt(0).toUpperCase() ? cap(val) : val;
    });
}

// --- Voices -------------------------------------------------------------------------------

function voiceFor(take: Take, input: DiscourseInput, rnd: () => number): Voice {
  const v = rawVoice(take, input, rnd);
  // Stan accounts, gossip pages and the news only show up once there's a name to talk about.
  const r = reach(input.fans);
  if (v.kind === 'type' && v.type === 'stan' && r < 0.4) return { kind: 'crowd', vibe: 'fan' };
  if (v.kind === 'type' && (v.type === 'gossip' || v.type === 'news') && r < 0.45) return { kind: 'type', type: 'critic' };
  return v;
}

function rawVoice(take: Take, input: DiscourseInput, rnd: () => number): Voice {
  const x = rnd();
  switch (take) {
    case 'love':
      return x < 0.35 ? { kind: 'type', type: 'stan' } : x < 0.6 ? { kind: 'type', type: 'fan' } : { kind: 'crowd', vibe: 'fan' };
    case 'defend':
      return x < 0.5 ? { kind: 'type', type: 'stan' } : { kind: 'crowd', vibe: 'stan' };
    case 'hate':
      if (input.rival && input.rival.intensity >= 35 && x < 0.3) return { kind: 'type', type: 'rival-fan' };
      return x < 0.55 ? { kind: 'crowd', vibe: 'hater' } : { kind: 'type', type: 'hater' };
    case 'drag':
      return x < 0.25 ? { kind: 'type', type: 'gossip' } : x < 0.55 ? { kind: 'crowd', vibe: 'hater' } : { kind: 'crowd', vibe: 'casual' };
    case 'banter':
    case 'meme':
      return x < 0.25 ? { kind: 'type', type: 'public' } : { kind: 'crowd', vibe: 'casual' };
    case 'thirst':
      return { kind: 'crowd', vibe: 'admirer', gender: admirerGender(input.gender, rnd) };
    case 'news':
      return x < 0.6 ? { kind: 'type', type: 'news' } : { kind: 'type', type: 'industry' };
    case 'shade':
      return { kind: 'type', type: 'gossip' };
    case 'stanwar':
      return x < 0.5 ? { kind: 'type', type: 'stan' } : { kind: 'crowd', vibe: 'stan' };
    case 'subtweet':
      return { kind: 'rival' };
    case 'poll':
      return x < 0.4 ? { kind: 'type', type: 'gossip' } : { kind: 'crowd', vibe: 'casual' };
    case 'wholesome':
      return x < 0.4 ? { kind: 'type', type: 'fan' } : { kind: 'crowd', vibe: 'fan' };
    case 'skeptic':
      return x < 0.3 ? { kind: 'type', type: 'critic' } : x < 0.65 ? { kind: 'crowd', vibe: 'casual' } : { kind: 'crowd', vibe: 'hater' };
  }
}

function pickLine(lines: readonly string[] | undefined, rnd: () => number): string | null {
  if (!lines || lines.length === 0) return null;
  return lines[Math.floor(rnd() * lines.length)];
}

/** Lines for a take on a topic, falling back to the general vibe pool. */
function linesFor(topic: TopicKind, take: Take, gender: Gender): readonly string[] | undefined {
  if (take === 'thirst') return THIRST[gender];
  if (take === 'subtweet') return TAKES.rival.subtweet;
  return TAKES[topic]?.[take] ?? TAKES.vibe[take];
}

/** Poll split for a topic: who the internet sides with. */
function pollPct(topic: Topic, input: DiscourseInput, rnd: () => number): number {
  const jitter = (rnd() - 0.5) * 16;
  if (topic.kind === 'beef' && input.rival) return clampPct(input.rival.score + jitter);
  if (topic.kind === 'track') return clampPct(35 + (input.trackScore ?? 60) * 0.5 + jitter);
  if (topic.kind === 'vibe') return clampPct(50 - (input.reputation - 50) * 0.6 + jitter); // "overrated? yes"
  return clampPct(50 + jitter);
}

function clampPct(x: number): number {
  return Math.round(Math.max(4, Math.min(96, x)));
}

/**
 * Write one post about a topic. Returns null when nothing fits (a topic with
 * no lines for the drawn take); callers just draw again.
 */
export function composePost(topic: Topic, input: DiscourseInput, rnd: () => number, opts: { visual?: boolean } = {}): ComposedPost | null {
  const take = weighted(topic.takes, rnd);
  if (!take) return null;
  if (take === 'subtweet' && !input.rival) return null;
  const vars: FillVars = {
    topic: topic.moment?.topic,
    rival: topic.moment?.rivalName ?? input.rival?.name,
    partner: topic.moment?.partnerName ?? input.partnerName ?? undefined,
  };
  const fill = (s: string) => fillText(s, input, vars);
  const base = {
    topic: topic.kind,
    take,
    sentiment: TAKE_SENTIMENT[take],
    voice: voiceFor(take, input, rnd),
    momentId: topic.moment?.id,
  };

  if (take === 'poll') {
    const polls = POLLS[topic.kind] ?? POLLS.vibe;
    const p = polls && polls[Math.floor(rnd() * polls.length)];
    if (!p) return null;
    const votes = Math.round(200 + rnd() * 4000 * (1 + 20 * reach(input.fans)));
    return { ...base, text: fill(p.q), poll: { options: [fill(p.a), fill(p.b)], pct: pollPct(topic, input, rnd), votes } };
  }

  // Memes on visual apps: a reaction face with a caption.
  if ((take === 'meme' || take === 'banter') && opts.visual && rnd() < 0.7) {
    const memes = MEMES[topic.kind] ?? MEMES.vibe;
    const m = memes && memes[Math.floor(rnd() * memes.length)];
    if (m) {
      const caption = pickLine(['😭😭😭', 'I can\'t 💀', 'the internet is undefeated', 'tag someone who needs this', 'no thoughts just this', '💀', 'stop 😭'], rnd);
      return {
        ...base,
        take: 'meme',
        sentiment: 'meme',
        text: caption ?? '💀',
        meme: { format: 'caption', top: fill(m.top), bottom: m.bottom ? fill(m.bottom) : undefined, reaction: m.face },
      };
    }
  }

  const line = pickLine(linesFor(topic.kind, take, input.gender), rnd);
  if (!line) return null;
  const text = fill(line);

  // Visual apps repost hot takes as screenshots of a Chirp post.
  if (opts.visual && (take === 'hate' || take === 'drag' || take === 'banter' || take === 'thirst') && rnd() < 0.3) {
    return {
      ...base,
      text: pickLine(['the comments 😭', 'this app is undefeated', 'y\'all are so mean 💀', 'not this being the top post', 'they said what they said', 'LMAOOO'], rnd) ?? '💀',
      meme: { format: 'tweet', top: text },
    };
  }
  return { ...base, text };
}
