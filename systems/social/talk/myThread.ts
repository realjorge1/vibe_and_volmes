import type { PhotoKind, SocialPost } from '../../../types/social';
import type { Player } from '../../../types/player';
import type { ReplySide, ThreadCtx, ThreadReply } from '../threadGenerator';
import { admirerGender, crowdPerson, seeded, type CrowdVibe } from '../../drama/crowd';
import { fillText } from '../../drama/discourse';
import { getAccountsByType } from '../../../data/social/npcAccounts';
import { fameReach } from '../../../utils/statHelpers';
import { guardThread, isProtected, shortLocation } from '../protect';
import { authoredAt } from '../authored';
import { postTopic, type PostTopic } from './topic';
import { typed, TYPISTS, type Typist } from './voice';
import {
  REAL_ANY,
  REAL_ARTIST_FRIEND,
  REAL_BY_CAPTION,
  REAL_BY_KIND,
  REAL_EMOJI,
  REAL_EMOJI_BY_KIND,
  REAL_GENERAL,
  REAL_LOCATION,
  REAL_REPLIES,
  REAL_SLIDE_KIND,
  REAL_SLIDES,
  REAL_TAG_BACK,
} from '../../../data/social/realPhotoComments';
import { FAN_ANY, OPEN_BY_KIND, TEXT_TALK } from '../../../data/social/talk/kinds';
import { AGREE, ANSWER_CROWD, DEFEND, DOUBLE_DOWN, LAUGH } from '../../../data/social/talk/replies';
import { ADDRESS_IT, BANTER, CRAZY, HATER, RIVAL_RAID, SHIPPER, THIRST_COMMENTS, WANNABE, WHOLESOME } from '../../../data/drama/comments';

/**
 * THE COMMENTS UNDER WHAT THE ARTIST POSTS (pure).
 *
 * They react to what the post actually shows (systems/social/sense read the
 * photo when it went up) and to what the caption says: pet comments under a
 * dog, "this is so me 😭" under a meme, "the fit 🔥" under an outfit, answers
 * under a question. They arrive over the next minutes like real ones (the
 * first after a few seconds, the rest as the post spreads), people reply to
 * each other under them, and how many there are fits how famous the artist
 * is.
 *
 * Under a real photo only the vetted kind lines are used (data/social/
 * realPhotoComments), and protect.guardThread checks everything again.
 * Elsewhere the drama follows the artist: haters who looked at the post,
 * the scandal, the rival's fans, the shippers.
 */

type Rnd = () => number;

/** Comments arrive on the same curve as the likes (systems/social/authored). */
const RISE_MS = 18 * 60 * 1000;

/** How many comments a post of the artist's ends up showing: a couple for an unknown, a busy section for a star. */
export function commentCount(fans: number, seed: string): number {
  const reach = fameReach(fans);
  const r = seeded(`ccount:${seed}`);
  const base = 1 + 16 * Math.pow(reach, 1.6);
  return Math.max(1, Math.round(base + (r() * 2 - 1)));
}

/** When each comment shows up, in ms after posting (ascending; the first after ~9-17 s). */
export function commentTimes(n: number, seed: string): number[] {
  const r = seeded(`ctimes:${seed}`);
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    const u = Math.min(0.995, (k + 0.25 + 0.5 * r()) / (n + 0.6));
    out.push(Math.round(-RISE_MS * Math.log(1 - u)));
  }
  out.sort((a, b) => a - b);
  // The first one lands within seconds (just before the phone's first comment ping).
  out[0] = 9_000 + Math.round(r() * 8_000);
  for (let k = 1; k < n; k++) if (out[k] <= out[k - 1]) out[k] = out[k - 1] + 4_000 + Math.round(r() * 20_000);
  return out;
}

/** How many comments are up `sinceMs` after posting (the count the post shows). */
export function visibleCommentCount(postId: string, fans: number, sinceMs: number): number {
  const n = commentCount(fans, postId);
  return commentTimes(n, postId).filter((t) => t <= sinceMs).length;
}

const DEFAULT_THING: Partial<Record<PhotoKind, string>> = {
  pet: 'baby',
  food: 'food',
  ride: 'ride',
  home: 'place',
  drip: 'piece',
  scenery: 'view',
  art: 'piece',
  tech: 'setup',
  music: 'setup',
};

const pick = <T,>(arr: readonly T[], r: Rnd): T => arr[Math.floor(r() * arr.length)];

/** A caption's keyword groups that suit what the photo shows. */
export function captionGroups(caption: string, kind: PhotoKind | null, known: boolean): (typeof REAL_BY_CAPTION)[number][] {
  const t = ` ${caption.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9#' -]/g, ' ')} `.replace(/#/g, ' ');
  const k: PhotoKind = known && kind ? kind : 'other';
  return REAL_BY_CAPTION.filter(
    (g) => g.words.some((w) => t.includes(` ${w} `)) && (!g.fits || g.fits.includes(k)) && !(g.not ?? []).includes(k)
  );
}

/** One source of lines in a comment section, how often it speaks, and who speaks it. */
interface Source {
  key: string;
  w: number;
  lines: readonly string[];
  side: ReplySide;
  vibe: CrowdVibe;
  typist: Typist;
  /** Drama lines use the discourse tokens ({topic}, {rival}, pronouns...). */
  drama?: boolean;
  /** Mentions a friend: {friend} is someone real in the crowd. */
  tag?: boolean;
  /** Fills {n} with a slide number. */
  slide?: { n: number; thing?: string };
  /** Only this many from this source. */
  max?: number;
}

interface Built {
  sources: Source[];
  thing: string;
}

function sourcesFor(post: SocialPost, player: Player, ctx: ThreadCtx, topic: PostTopic, safe: boolean, r: Rnd): Built {
  const kind = topic.kind;
  const k: PhotoKind = topic.known && kind ? kind : 'other';
  const real = REAL_BY_KIND[k];
  const thing = topic.thing ?? DEFAULT_THING[k] ?? 'this';
  const thingLines = topic.thing ? (real.things?.[topic.thing] ?? []) : [];
  const groups = captionGroups(post.content, kind, topic.known);
  const loc = shortLocation(post.location);
  const out: Source[] = [];
  const add = (s: Omit<Source, 'side' | 'vibe' | 'typist'> & Partial<Pick<Source, 'side' | 'vibe' | 'typist'>>) => {
    if (s.lines.length > 0 && s.w > 0) out.push({ side: 'fan', vibe: 'fan', typist: TYPISTS.casual, ...s });
  };
  const emoji = topic.known ? (REAL_EMOJI_BY_KIND[k] ?? REAL_EMOJI) : topic.photographic ? REAL_EMOJI : ['❤️', '🙌🙌', '💯'];

  // What everyone says, whatever the photo.
  if (topic.kind === null) {
    // A text post: people answer what it says.
    const talk = TEXT_TALK[topic.intent];
    add({ key: 'text', w: 0.5, lines: talk.lines, vibe: topic.intent === 'music' ? 'stan' : 'casual', typist: topic.intent === 'music' ? TYPISTS.stan : TYPISTS.casual });
  } else if (topic.known) {
    add({ key: 'kind', w: 0.34, lines: real.lines });
    add({ key: 'thing', w: 0.14, lines: thingLines });
    add({ key: 'ask', w: 0.06, lines: real.asks ?? [], typist: TYPISTS.calm, vibe: 'casual' });
    add({ key: 'tag', w: 0.06, lines: real.tags ?? [], tag: true, vibe: 'casual' });
    for (const s of topic.slides.slice(0, 2)) {
      add({ key: `slide${s.n}`, w: 0.05, lines: REAL_SLIDE_KIND[s.kind] ?? REAL_SLIDES, slide: s, max: 1 });
    }
    if (topic.count >= 3 && topic.slides.length === 0) add({ key: 'slides', w: 0.03, lines: REAL_SLIDES, slide: { n: 2 + Math.floor(r() * (topic.count - 1)) }, max: 1 });
  } else if (topic.photographic) {
    add({ key: 'general', w: 0.3, lines: REAL_GENERAL });
  }
  add({ key: 'caption', w: groups.length > 0 ? 0.16 : 0, lines: groups.flatMap((g) => g.lines) });
  add({ key: 'loc', w: loc ? 0.07 : 0, lines: REAL_LOCATION });
  add({ key: 'emoji', w: 0.12, lines: emoji, typist: TYPISTS.calm });
  add({ key: 'any', w: topic.known ? 0.05 : 0.22, lines: REAL_ANY });

  if (safe) {
    const friends = (ctx.friends ?? []).filter((f) => !(ctx.rivalNames ?? []).includes(f.name));
    if (friends.length > 0) add({ key: 'friend', w: 0.06, lines: REAL_ARTIST_FRIEND, side: 'friend', max: 2 });
    return { sources: out, thing };
  }

  // Everything else the internet says (never under a real photo).
  const open = OPEN_BY_KIND[k];
  const reputation = player.stats.reputation;
  const scandal = (ctx.moments ?? []).filter((m) => m.kind === 'scandal' || m.kind === 'ugly').sort((a, b) => b.heat - a.heat)[0];
  const goodDeed = (ctx.moments ?? []).filter((m) => m.kind === 'charity').sort((a, b) => b.heat - a.heat)[0];
  const hateBoost = (reputation < 20 ? 1.8 : reputation < 40 ? 1.3 : 1) * (scandal ? 1.4 : 1);
  if (topic.kind !== null) {
    add({ key: 'hype', w: 0.14, lines: open.hype, typist: TYPISTS.stan, vibe: 'stan' });
    add({ key: 'funny', w: 0.11, lines: open.funny, vibe: 'casual' });
    add({ key: 'shade', w: 0.07 * hateBoost, lines: open.shade, side: 'hater', vibe: 'hater', typist: TYPISTS.hater });
  } else {
    add({ key: 'shade', w: 0.07 * hateBoost, lines: TEXT_TALK[topic.intent].shade, side: 'hater', vibe: 'hater', typist: TYPISTS.hater });
  }
  add({ key: 'fanAny', w: 0.08, lines: FAN_ANY, typist: TYPISTS.stan, vibe: 'stan' });
  // Talk of new music: the anticipation, not reactions to a song nobody has heard yet.
  if (topic.music && topic.intent !== 'music') add({ key: 'music', w: 0.1, lines: TEXT_TALK.music.lines, typist: TYPISTS.stan, vibe: 'stan' });
  // Admirers only where there's a person to admire.
  if (k === 'selfie' || k === 'fit' || (topic.kind === null && r() < 0.5)) {
    add({ key: 'thirst', w: topic.kind === null ? 0.03 : 0.08, lines: THIRST_COMMENTS[player.gender] ?? THIRST_COMMENTS.nonbinary, side: 'admirer', vibe: 'admirer', typist: TYPISTS.stan, drama: true, max: 2 });
  }
  // Generic haters still show up, fewer when the post gives them nothing to say.
  if (open.shade.length > 0 || topic.kind === null) add({ key: 'hater', w: 0.025 * hateBoost, lines: HATER, side: 'hater', vibe: 'hater', typist: TYPISTS.hater, drama: true, max: 1 });
  if (scandal) add({ key: 'address', w: 0.16, lines: ADDRESS_IT, side: 'hater', vibe: 'hater', typist: TYPISTS.hater, drama: true });
  if (goodDeed) add({ key: 'wholesome', w: 0.08, lines: WHOLESOME, drama: true });
  if (ctx.rivalName) add({ key: 'rival', w: 0.04, lines: RIVAL_RAID, side: 'rival', vibe: 'hater', typist: TYPISTS.hater, drama: true, max: 1 });
  if (ctx.partnerName && (k === 'duo' || topic.romance || topic.kind === null)) add({ key: 'shipper', w: 0.05, lines: SHIPPER, drama: true, max: 1 });
  add({ key: 'crazy', w: 0.03, lines: CRAZY, side: 'crazy', vibe: 'stan', typist: TYPISTS.stan, drama: true, max: 1 });
  add({ key: 'wannabe', w: 0.025, lines: WANNABE, side: 'neutral', vibe: 'casual', drama: true, max: 1 });
  add({ key: 'banter', w: 0.03, lines: BANTER, side: 'neutral', vibe: 'casual', drama: true, max: 1 });
  return { sources: out, thing };
}

function pickSource(sources: readonly Source[], used: ReadonlyMap<string, number>, r: Rnd): Source | null {
  const open = sources.filter((s) => s.max === undefined || (used.get(s.key) ?? 0) < s.max);
  const total = open.reduce((a, s) => a + s.w, 0);
  if (total <= 0) return null;
  let roll = r() * total;
  for (const s of open) if ((roll -= s.w) <= 0) return s;
  return open[open.length - 1];
}

/** Who replies how under a comment from this source. */
function childPlan(key: string, safe: boolean, r: Rnd): { lines: readonly string[]; count: number; side: ReplySide; vibe: CrowdVibe; fromTagged?: boolean; doubleDown?: boolean } | null {
  if (safe) {
    if (key === 'tag') return r() < 0.55 ? { lines: REAL_TAG_BACK, count: 1, side: 'fan', vibe: 'fan', fromTagged: true } : null;
    if (key === 'ask' || key === 'emoji') return null;
    return r() < 0.16 ? { lines: REAL_REPLIES, count: 1 + Math.floor(r() * 2), side: 'fan', vibe: 'fan' } : null;
  }
  switch (key) {
    case 'shade':
    case 'hater':
    case 'rival':
      return r() < 0.7 ? { lines: DEFEND, count: 1 + Math.floor(r() * 3), side: 'stan', vibe: 'stan', doubleDown: r() < 0.4 } : null;
    case 'address':
      return r() < 0.5 ? { lines: [...DEFEND, ...AGREE], count: 1 + Math.floor(r() * 2), side: 'stan', vibe: 'stan' } : null;
    case 'funny':
    case 'banter':
    case 'thirst':
    case 'crazy':
      return r() < 0.38 ? { lines: LAUGH, count: 1 + Math.floor(r() * 2), side: 'neutral', vibe: 'casual' } : null;
    case 'ask':
      return r() < 0.45 ? { lines: ANSWER_CROWD, count: 1, side: 'neutral', vibe: 'casual' } : null;
    case 'tag':
      return r() < 0.55 ? { lines: [...REAL_TAG_BACK, 'LMAO stop', 'why would you expose me like this 😭'], count: 1, side: 'fan', vibe: 'casual', fromTagged: true } : null;
    case 'emoji':
      return null;
    default:
      return r() < 0.15 ? { lines: AGREE, count: 1, side: 'fan', vibe: 'fan' } : null;
  }
}

/**
 * Every comment the post will ever show, each with the time it appears
 * (`at`), and the replies under them. Seeded by the post id: the same post
 * always has the same comments, so the one a notification quoted is there.
 */
export function authoredThread(post: SocialPost, player: Player, ctx: ThreadCtx = {}): ThreadReply[] {
  const safe = isProtected(post);
  const r = seeded(`${safe ? 'real' : 'mine'}:${post.id}`);
  const topic = postTopic(post);
  const { sources, thing } = sourcesFor(post, player, ctx, topic, safe, r);
  const postedAt = authoredAt(post) ?? 0;
  const n = commentCount(player.stats.fans, post.id);
  const times = commentTimes(n, post.id);
  const maxLikes = 3 + Math.round(player.stats.fans * 0.0006);
  const loc = shortLocation(post.location) ?? '';
  const friends = (ctx.friends ?? []).filter((f) => !(ctx.rivalNames ?? []).includes(f.name));
  const used = new Map<string, number>();
  const seen = new Set<string>();
  const out: ThreadReply[] = [];

  const fill = (line: string, s: Source, friendHandle: string, slide?: { n: number; thing?: string }) => {
    let t = line
      .replace(/\{name\}/g, player.artistName)
      .replace(/\{thing\}/g, slide?.thing ?? thing)
      .replace(/\{loc\}/g, loc)
      .replace(/\{friend\}/g, friendHandle)
      .replace(/\{n\}/g, String(slide?.n ?? 2));
    if (s.drama || !safe) {
      t = fillText(t, { playerName: player.artistName, gender: player.gender, genre: '', city: player.city, trackTitle: null }, {
        topic: (ctx.moments ?? []).filter((m) => m.kind === 'scandal' || m.kind === 'ugly' || m.kind === 'charity').sort((a, b) => b.heat - a.heat)[0]?.topic,
        rival: ctx.rivalName ?? undefined,
        partner: ctx.partnerName ?? undefined,
      });
    } else {
      t = t.replace(/\{city\}/g, player.city);
    }
    return t;
  };

  for (let guard = 0; out.length < n && guard < n * 8; guard++) {
    const s = pickSource(sources, used, r);
    if (!s) break;
    const line = pick(s.lines, r);
    const tagged = s.tag ? crowdPerson(`${post.id}:tag:${guard}`, { vibe: 'casual' }) : null;
    const content = typed(fill(line, s, tagged ? tagged.handle : 'bestie', s.slide), r, s.typist);
    const key = content.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    used.set(s.key, (used.get(s.key) ?? 0) + 1);

    let who: { id: string; username: string; handle: string; verified: boolean };
    if (s.side === 'friend' && friends.length > 0) {
      const f = pick(friends, r);
      who = { id: `artist-${f.id}`, username: f.name, handle: f.handle, verified: true };
    } else if (!safe && s.side === 'rival') {
      const pool = getAccountsByType('rival-fan');
      const a = pool.length > 0 ? pick(pool, r) : null;
      const p = crowdPerson(`${post.id}:${out.length}:rv`, { vibe: 'hater' });
      who = a ? { id: a.id, username: a.username, handle: a.handle, verified: a.isVerified } : { id: p.id, username: p.username, handle: p.handle, verified: false };
    } else {
      const p = crowdPerson(`${post.id}:${out.length}:${Math.floor(r() * 1e6)}`, {
        vibe: s.vibe,
        gender: s.vibe === 'admirer' ? admirerGender(player.gender, r) : undefined,
      });
      who = { id: p.id, username: p.username, handle: p.handle, verified: false };
    }
    const side: ReplySide = s.side === 'fan' && s.vibe === 'stan' ? 'stan' : s.side;
    const at = postedAt + times[out.length];
    const rep: ThreadReply = {
      id: `rep-${post.id}-${out.length}`,
      side,
      username: who.username,
      handle: who.handle,
      verified: who.verified,
      content,
      likes: Math.floor(maxLikes * Math.pow(r(), 2.2) * (side === 'friend' ? 4 : 1)),
      accountId: who.id,
      at,
    };
    // Under a real photo a line that the guard would drop is never written (so the count still adds up).
    if (safe && guardThread(post, [rep], ctx).length === 0) continue;

    const plan = childPlan(s.key, safe, r);
    if (plan) {
      const kids: ThreadReply[] = [];
      const kidLines = new Set<string>();
      for (let j = 0; j < plan.count; j++) {
        const doubling = plan.doubleDown && j === plan.count - 1 && j > 0;
        const from = doubling
          ? { id: who.id, username: who.username, handle: who.handle }
          : plan.fromTagged && tagged && j === 0
            ? { id: tagged.id, username: tagged.username, handle: tagged.handle }
            : crowdPerson(`${post.id}:${out.length}:k${j}:${Math.floor(r() * 1e6)}`, { vibe: plan.vibe });
        let line = pick(doubling ? DOUBLE_DOWN : plan.lines, r);
        for (let tries = 0; kidLines.has(line) && tries < 6; tries++) line = pick(doubling ? DOUBLE_DOWN : plan.lines, r);
        kidLines.add(line);
        const text = typed(fill(line, s, 'bestie'), r, doubling ? TYPISTS.hater : TYPISTS.casual);
        kids.push({
          id: `${rep.id}-c${j}`,
          side: doubling ? side : plan.side,
          username: from.username,
          handle: from.handle,
          verified: false,
          content: text,
          likes: Math.floor(Math.max(1, rep.likes * 0.3) * Math.pow(r(), 2)),
          accountId: from.id,
          // A hater doubling down answers the first person who came for them, after they did.
          at: doubling && kids[0] ? (kids[0].at ?? at) + 30_000 + Math.round(r() * 4 * 60_000) : at + 20_000 + Math.round(r() * (j + 1) * 6 * 60_000),
          toHandle: doubling ? kids[0]?.handle : who.handle,
        });
      }
      kids.sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
      rep.children = kids;
    }
    out.push(rep);
  }
  // The section reads top comments first, like the real apps.
  return out.sort((a, b) => b.likes - a.likes);
}
