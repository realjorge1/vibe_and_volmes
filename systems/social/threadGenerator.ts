import type { SocialPost } from '../../types/social';
import type { Player } from '../../types/player';
import type { Moment } from '../../types/drama';
import type { RealTopic } from '../../types/realworld';
import { getAccountsByType } from '../../data/social/npcAccounts';
import { crowdPerson, admirerGender, type CrowdVibe } from '../drama/crowd';
import { fillText } from '../drama/discourse';
import { guardThread, isProtected } from './protect';
import { isAuthored } from './authored';
import { authoredThread } from './talk/myThread';
import { everydayThread } from './everyday';
import { celebThread, type CastMember } from './celebFeed';
import { baseYearOf } from './worldCalendar';
import {
  FAN,
  THIRST_COMMENTS,
  HATER,
  BANTER,
  CRAZY,
  WANNABE,
  ADDRESS_IT,
  RIVAL_RAID,
  WHOLESOME,
  SHIPPER,
} from '../../data/drama/comments';

/**
 * Comment threads + stan wars. A high-heat post spawns an escalating
 * back-and-forth between the artist's stans and a rival fanbase — the
 * exact dopamine-rage loop real fandoms run on. The artist's own posts get
 * what an artist's posts actually get: fans losing it, a few haters.
 *
 * Seeded by the post id, so a post always has the same comments: the one a
 * notification quoted is still there when you open the post.
 */

export type ReplySide = 'stan' | 'rival' | 'neutral' | 'critic' | 'fan' | 'hater' | 'admirer' | 'crazy' | 'friend';

/** What the comment section knows about: the drama that follows the artist around. */
export interface ThreadCtx {
  moments?: readonly Moment[];
  rivalName?: string | null;
  partnerName?: string | null;
  /** Artists who like the player (they show up under the player's real photos). */
  friends?: readonly { id: string; name: string; handle: string }[];
  /** Every rival's name (kept away from the player's real photos). */
  rivalNames?: readonly string[];
  /** Other artists (their comment sections know who's who). */
  cast?: readonly CastMember[];
  /** The real-world stories posts may be about (systems/realworld). */
  real?: readonly RealTopic[];
}

export interface ThreadReply {
  id: string;
  side: ReplySide;
  username: string;
  handle: string;
  verified: boolean;
  content: string;
  likes: number;
  /** Avatar / profile key: an NPC account id or `r-<handle>`. */
  accountId: string;
  /** When it shows up (ms). Missing: it's already there. */
  at?: number;
  /** The replies under it ("View 3 replies"), oldest first. */
  children?: ThreadReply[];
  /** The handle it answers (a reply under someone's comment). */
  toHandle?: string;
  /** The artist wrote it. */
  mine?: boolean;
}

/** What has arrived by `now`: comments and replies that haven't come in yet stay hidden. */
export function arrived(replies: readonly ThreadReply[], now: number): ThreadReply[] {
  return replies
    .filter((r) => r.at === undefined || r.at <= now)
    .map((r) => (r.children && r.children.length > 0 ? { ...r, children: arrived(r.children, now) } : r));
}

const STAN_LINES = [
  'be so for real right now. {name} carried this entire genre.',
  'the obsession is diabolical. touch grass and stream {name}.',
  'imagine being this pressed over someone you claim to not listen to 💀',
  'screenshotting this so we can laugh when {name} drops next week',
  'not the daily {name} hate thread again. we get it, you’re jealous.',
  'the numbers don’t lie babe. {name} won. cope.',
];

const RIVAL_LINES = [
  '{name} is the most overrated artist alive and you all know it.',
  'industry plant behavior. nobody actually listens to this.',
  'this flopped and you’re all in denial. it’s actually sad.',
  'the bar was on the floor and {name} still tripped over it 😭',
  'manufactured hype. real ones remember the old sound.',
  'crazy how the stans show up in 0.2 seconds but the songs still flop',
];

const NEUTRAL_LINES = [
  'why is every thread like this now. just listen to what you like??',
  'the replies are a war zone and I’m only here for the chaos 🍿',
  'genuinely cannot tell if this is satire anymore',
  'logging off, the internet is undefeated today',
];

const CRITIC_LINES = [
  'objectively the production is solid, the discourse is not.',
  'this take ages like milk. screenshot it.',
  'context matters and nobody in these replies has it.',
];

function hashOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32: a tiny seeded generator. */
function seeded(seed: string): () => number {
  let a = hashOf(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stranger with a believable handle (new followers, story posters). */
export function strangerFor(seed: string): { accountId: string; username: string; handle: string } {
  const p = crowdPerson(`stranger:${seed}`);
  return { accountId: p.id, username: p.username, handle: p.handle };
}

/**
 * Comments under a post, the same every time it opens (only those that have
 * arrived by `now`: the artist's own posts fill up over real minutes).
 *
 * What the artist posts gets comments about what it shows (talk/myThread);
 * a post with the player's real photo gets only the vetted kind lines, and
 * every thread passes the guard last, so nothing negative can ever reach a
 * real photo whatever builds the thread.
 */
export function generateThread(post: SocialPost, player: Player, ctx: ThreadCtx = {}, now = Date.now()): ThreadReply[] {
  if (isAuthored(post) || isProtected(post)) return arrived(guardThread(post, authoredThread(post, player, ctx), ctx), now);
  if (post.lane === 'everyday') return everydayThread(post, { city: player.city, baseYear: baseYearOf(player.createdAt), real: ctx.real });
  if (post.lane === 'celeb') return celebThread(post, { playerName: player.artistName, cast: [...(ctx.cast ?? [])] });
  return guardThread(post, rawThread(post, player, ctx), ctx);
}

/**
 * Hostile/hype/shade/meme posts escalate into a stan war; calmer posts get a
 * normal reply spread. The artist's own posts get what an artist's posts
 * actually get: fans losing it, a few admirers, haters, jokers, the ones who
 * are a little too much, people plugging their own music, and whatever drama
 * is following them that week.
 */
function rawThread(post: SocialPost, player: Player, ctx: ThreadCtx): ThreadReply[] {
  const r = seeded(`thread:${post.id}`);
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  const pickOf = <T,>(arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];
  const scandal = (ctx.moments ?? []).filter((m) => m.kind === 'scandal' || m.kind === 'ugly').sort((a, b) => b.heat - a.heat)[0];
  const goodDeed = (ctx.moments ?? []).filter((m) => m.kind === 'charity').sort((a, b) => b.heat - a.heat)[0];
  const fill = (s: string, topic?: string) =>
    fillText(
      s.replace(/\{name\}/g, player.artistName),
      { playerName: player.artistName, gender: player.gender, genre: '', city: player.city, trackTitle: null },
      { topic, rival: ctx.rivalName ?? undefined, partner: ctx.partnerName ?? undefined }
    );
  const out: ThreadReply[] = [];

  const npc = (side: ReplySide, content: string) => {
    const typeMap = { stan: 'stan', rival: 'rival-fan', neutral: 'public', critic: 'critic', fan: 'fan', hater: 'hater', admirer: 'fan', crazy: 'stan', friend: 'fan' } as const;
    const pool = getAccountsByType(typeMap[side]);
    const acct = pool.length > 0 ? pickOf(pool) : pickOf(getAccountsByType('public'));
    out.push({
      id: `rep-${post.id}-${out.length}`,
      side,
      username: acct.username,
      handle: acct.handle,
      verified: acct.isVerified,
      content,
      likes: int(0, side === 'stan' || side === 'rival' ? 4200 : 600),
      accountId: acct.id,
    });
  };
  /** Someone with no history: most comment sections are strangers, with faces that match their names. */
  const stranger = (side: ReplySide, content: string, maxLikes: number, vibe: CrowdVibe = 'casual', admirer = false) => {
    const p = crowdPerson(`${post.id}:${out.length}:${int(0, 1e6)}`, {
      vibe,
      gender: admirer ? admirerGender(player.gender, r) : undefined,
    });
    out.push({
      id: `rep-${post.id}-${out.length}`,
      side,
      username: p.username,
      handle: p.handle,
      verified: false,
      content,
      likes: int(0, Math.max(1, Math.round(maxLikes))),
      accountId: p.id,
    });
  };

  if (post.account.id === 'player') {
    const n = int(7, 12);
    for (let i = 0; i < n; i++) {
      const roll = r();
      if (scandal && roll < 0.22) {
        stranger(r() < 0.75 ? 'hater' : 'stan', fill(pickOf(ADDRESS_IT), scandal.topic), scandal.heat * 120);
        continue;
      }
      if (goodDeed && roll < 0.12) {
        stranger('fan', fill(pickOf(WHOLESOME), goodDeed.topic), 4000, 'fan');
        continue;
      }
      if (ctx.rivalName && roll > 0.93) {
        npc('rival', fill(pickOf(RIVAL_RAID)));
        continue;
      }
      if (roll < 0.45) stranger('fan', fill(pickOf(FAN)), 9000, 'fan');
      else if (roll < 0.6) npc('stan', fill(pickOf(FAN)));
      else if (roll < 0.68) stranger('admirer', fill(pickOf(THIRST_COMMENTS[player.gender] ?? THIRST_COMMENTS.nonbinary)), 6000, 'admirer', true);
      else if (roll < 0.8) stranger('hater', fill(pickOf(HATER)), 900, 'hater');
      else if (roll < 0.88) stranger('neutral', fill(pickOf(BANTER)), 2500);
      else if (roll < 0.94) stranger('crazy', fill(pickOf(CRAZY)), 1200, 'stan');
      else if (ctx.partnerName && roll < 0.97) stranger('fan', fill(pickOf(SHIPPER)), 3000, 'fan');
      else stranger('neutral', fill(pickOf(WANNABE)), 40);
    }
  } else if (post.sentiment === 'hostile' || post.sentiment === 'shade' || post.sentiment === 'hype' || post.sentiment === 'meme') {
    const rounds = int(4, 7);
    let turn: ReplySide = post.sentiment === 'hostile' ? 'stan' : 'rival';
    for (let i = 0; i < rounds; i++) {
      if (turn === 'stan') npc('stan', fill(pickOf(STAN_LINES)));
      else if (r() < 0.5) npc('rival', fill(pickOf(RIVAL_LINES)));
      else stranger('hater', fill(pickOf(HATER)), 1500, 'hater');
      turn = turn === 'stan' ? 'rival' : 'stan';
      if (r() < 0.3) stranger('neutral', fill(pickOf([...NEUTRAL_LINES, ...BANTER])), 800);
    }
    if (r() < 0.5) npc('critic', fill(pickOf(CRITIC_LINES)));
  } else {
    const n = int(3, 6);
    for (let i = 0; i < n; i++) {
      const roll = r();
      if (roll < 0.35) npc('stan', fill(pickOf(STAN_LINES)));
      else if (roll < 0.5) npc('critic', fill(pickOf(CRITIC_LINES)));
      else if (roll < 0.65) stranger('hater', fill(pickOf(HATER)), 400, 'hater');
      else stranger('neutral', fill(pickOf([...NEUTRAL_LINES, ...BANTER])), 800);
    }
  }

  return out.sort((a, b) => b.likes - a.likes);
}
