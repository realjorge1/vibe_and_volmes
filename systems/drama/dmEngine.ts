import type { DmArc, DmArcReply, DmOutcome, DmPerson, DmReplyOption, DmStage, DmThread } from '../../types/drama';
import type { Platform } from '../../types/social';
import type { Gender } from '../../types/player';
import { DM_ARCS, getArc } from '../../data/drama/dmArcs';
import { WOMEN, MEN } from '../../data/drama/crowdNames';
import { admirerGender, crowdPerson, type CrowdGender, type CrowdVibe } from './crowd';

/**
 * THE DM ENGINE (pure).
 *
 * Decides which conversations open in the artist's inbox each week, writes
 * the sender, plays the arc forward when the artist answers, and has some
 * senders follow up when they're ignored. Applying an outcome (stats,
 * people, money, moments) is the action layer's job.
 */

export interface DmCtx {
  week: number;
  /** Wall-clock ms, for message timestamps. */
  now: number;
  fans: number;
  gender: Gender;
  partnerName: string | null;
  rival: { id: string; name: string; handle: string; intensity: number; followers: number } | null;
  /** A famous, single world NPC who could slide in (picked by the orchestrator). */
  celeb: { name: string; handle: string; npcId: string; followers: number } | null;
  playerName: string;
  trackTitle: string | null;
  city: string;
  stats?: Partial<Record<'charisma' | 'talent' | 'writing' | 'reputation' | 'authenticity', number>>;
}

export interface DmMemory {
  arcWeeks: Record<string, number>;
  lastRomanceWeek: number;
}

const ROMANCE: ReadonlySet<string> = new Set(['admirer', 'celeb-crush', 'ex']);
/** Romantic openers: at most one per this many weeks. */
export const ROMANCE_GAP = 2;
/** Unanswered threads close after this many weeks (unless they escalate). */
const STALE_WEEKS = 6;

export function isRomance(arc: DmArc): boolean {
  return ROMANCE.has(arc.kind);
}

export function arcEligible(arc: DmArc, ctx: DmCtx, threads: readonly DmThread[], mem: DmMemory): boolean {
  if (arc.minFans !== undefined && ctx.fans < arc.minFans) return false;
  if (arc.maxFans !== undefined && ctx.fans > arc.maxFans) return false;
  if (arc.partnered !== undefined && arc.partnered !== !!ctx.partnerName) return false;
  if (arc.needsRival && (!ctx.rival || ctx.rival.intensity < 30)) return false;
  if (arc.sender === 'celeb' && !ctx.celeb) return false;
  const last = mem.arcWeeks[arc.id];
  if (arc.cooldown !== undefined && last !== undefined && ctx.week - last < arc.cooldown) return false;
  if (isRomance(arc) && ctx.week - mem.lastRomanceWeek < ROMANCE_GAP) return false;
  // One open thread per arc at a time.
  if (threads.some((t) => t.arc === arc.id && t.state === 'open')) return false;
  return true;
}

/** How many new conversations open this week: the more famous, the busier the inbox. */
export function newThreadCount(fans: number, rnd: () => number): number {
  if (fans < 300) return rnd() < 0.3 ? 1 : 0;
  if (fans < 5_000) return 1;
  if (fans < 50_000) return 1 + (rnd() < 0.5 ? 1 : 0);
  if (fans < 500_000) return 2;
  return 2 + (rnd() < 0.5 ? 1 : 0);
}

function pick<T>(list: readonly T[], rnd: () => number): T {
  return list[Math.floor(rnd() * list.length)];
}

function genderOfName(name: string): CrowdGender | null {
  const first = name.split(/\s+/)[0];
  if (WOMEN.includes(first)) return 'woman';
  if (MEN.includes(first)) return 'man';
  return null;
}

function vibeFor(arc: DmArc): CrowdVibe {
  switch (arc.kind) {
    case 'superfan':
    case 'obsessed':
    case 'shipper':
      return 'stan';
    case 'hater':
      return 'hater';
    case 'ex':
      return 'admirer';
    default:
      return 'casual';
  }
}

export function senderFor(arc: DmArc, ctx: DmCtx, seed: string, platform: Platform, rnd: () => number): DmPerson | null {
  const toPerson = (a: ReturnType<typeof crowdPerson>, extra: Partial<DmPerson> = {}): DmPerson => ({
    id: a.id,
    name: a.username,
    handle: a.handle,
    gender: a.gender,
    followers: a.followers,
    verified: false,
    ...extra,
  });
  switch (arc.sender) {
    case 'admirer':
      return toPerson(crowdPerson(seed, { gender: admirerGender(ctx.gender, rnd), vibe: 'admirer', platform }));
    case 'kid':
      return toPerson(crowdPerson(seed, { gender: 'woman', vibe: 'casual', platform }));
    case 'crowd': {
      const gender = arc.kind === 'ex' ? admirerGender(ctx.gender, rnd) : undefined;
      return toPerson(crowdPerson(seed, { gender, vibe: vibeFor(arc), platform }));
    }
    case 'celeb': {
      if (!ctx.celeb) return null;
      const g = genderOfName(ctx.celeb.name) ?? admirerGender(ctx.gender, rnd);
      return {
        id: `c-${g === 'woman' ? 'w' : 'm'}-${ctx.celeb.handle}`,
        name: ctx.celeb.name,
        handle: ctx.celeb.handle,
        gender: g,
        followers: ctx.celeb.followers,
        verified: true,
        npcId: ctx.celeb.npcId,
      };
    }
    case 'rival':
      if (!ctx.rival) return null;
      return { id: `artist-${ctx.rival.id}`, name: ctx.rival.name, handle: ctx.rival.handle, followers: ctx.rival.followers, verified: true };
    case 'brand':
      return { id: 'brand-luxora', name: 'LUXORA Official 💎', handle: 'luxora.watches.official', followers: 1_240, verified: false };
  }
}

/** Fill the tokens in something said in a thread. */
export function fillDm(text: string, thread: Pick<DmThread, 'person' | 'vars'>, ctx: Pick<DmCtx, 'playerName' | 'trackTitle' | 'city' | 'partnerName' | 'rival'>): string {
  let out = text
    .replace(/\{playerName\}/g, ctx.playerName)
    .replace(/\{trackTitle\}/g, ctx.trackTitle ?? 'your new song')
    .replace(/\{city\}/g, ctx.city)
    .replace(/\{partner\}/g, ctx.partnerName ?? 'your partner')
    .replace(/\{rival\}/g, ctx.rival?.name ?? 'your rival')
    .replace(/\{name\}/g, thread.person.name.replace(/\s*[|].*$/, '').replace(/[^\p{L}\p{N} .'-]/gu, '').trim() || thread.person.handle);
  for (const [k, v] of Object.entries(thread.vars)) out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  return out;
}

export function optionsFor(stage: DmStage, ctx: Pick<DmCtx, 'partnerName'>): DmReplyOption[] {
  return stage.replies
    .filter((r) => r.partnered === undefined || r.partnered === !!ctx.partnerName)
    .map((r) => ({ id: r.id, label: r.label }));
}

/** Enter a stage: they say their lines (spaced like real typing), options appear. */
function enterStage(thread: DmThread, arc: DmArc, stageId: string, ctx: DmCtx, rnd: () => number, startAt: number): DmThread {
  const stage = arc.stages[stageId];
  if (!stage) return { ...thread, options: [], state: 'closed' };
  const lines = pick(stage.say, rnd);
  let at = startAt;
  const msgs = lines.map((l) => {
    at += 900 + Math.floor(rnd() * 1800);
    return { from: 'them' as const, text: fillDm(l, thread, ctx), at };
  });
  const options = optionsFor(stage, ctx);
  return {
    ...thread,
    stage: stageId,
    messages: [...thread.messages, ...msgs],
    options,
    unread: true,
    ignoredWeeks: 0,
    lastWeek: ctx.week,
    state: options.length === 0 ? 'closed' : 'open',
  };
}

export function startThread(arc: DmArc, ctx: DmCtx, rnd: () => number, n = 0): DmThread | null {
  const platform = pick(arc.platforms, rnd);
  const seed = `${arc.id}:${ctx.week}:${n}:${Math.floor(rnd() * 1e9)}`;
  const person = senderFor(arc, ctx, seed, platform, rnd);
  if (!person) return null;
  const vars: Record<string, string> = {};
  for (const [k, list] of Object.entries(arc.vars ?? {})) vars[k] = pick(list, rnd);
  const base: DmThread = {
    id: `dm-${ctx.week}-${arc.id}-${Math.floor(rnd() * 1e9).toString(36)}`,
    platform,
    arc: arc.id,
    kind: arc.kind,
    person,
    stage: arc.start,
    messages: [],
    options: [],
    unread: true,
    // Strangers land in Requests; the rival and the famous slide straight in.
    request: arc.sender !== 'rival' && arc.sender !== 'celeb',
    state: 'open',
    startedWeek: ctx.week,
    lastWeek: ctx.week,
    ignoredWeeks: 0,
    vars,
  };
  return enterStage(base, arc, arc.start, ctx, rnd, ctx.now - 60_000 * (1 + Math.floor(rnd() * 90)));
}

export interface WeeklyDms {
  threads: DmThread[];
  started: DmThread[];
  escalated: DmThread[];
  arcWeeks: Record<string, number>;
  lastRomanceWeek: number;
}

/** One week of inbox: follow-ups from the ignored, then new conversations. */
export function weeklyDms(ctx: DmCtx, threads: readonly DmThread[], mem: DmMemory, rnd: () => number): WeeklyDms {
  const escalated: DmThread[] = [];
  let next: DmThread[] = threads.map((t) => {
    if (t.state !== 'open' || t.options.length === 0) return t;
    const arc = getArc(t.arc);
    const stage = arc?.stages[t.stage];
    const ignoredWeeks = t.ignoredWeeks + 1;
    if (arc && stage?.ignored && ignoredWeeks >= stage.ignored.weeks) {
      const moved = enterStage({ ...t, ignoredWeeks }, arc, stage.ignored.next, ctx, rnd, ctx.now - 3_600_000);
      escalated.push(moved);
      return moved;
    }
    if (ignoredWeeks >= STALE_WEEKS) return { ...t, ignoredWeeks, state: 'closed' as const, options: [] };
    return { ...t, ignoredWeeks };
  });

  const arcWeeks = { ...mem.arcWeeks };
  let lastRomanceWeek = mem.lastRomanceWeek;
  const started: DmThread[] = [];
  const count = newThreadCount(ctx.fans, rnd);
  for (let i = 0; i < count; i++) {
    const pool = DM_ARCS.filter((a) => arcEligible(a, ctx, [...next, ...started], { arcWeeks, lastRomanceWeek }));
    if (pool.length === 0) break;
    const total = pool.reduce((s, a) => s + a.weight, 0);
    let x = rnd() * total;
    let arc = pool[pool.length - 1];
    for (const a of pool) {
      x -= a.weight;
      if (x < 0) {
        arc = a;
        break;
      }
    }
    const t = startThread(arc, ctx, rnd, i);
    if (!t) continue;
    started.push(t);
    arcWeeks[arc.id] = ctx.week;
    if (isRomance(arc)) lastRomanceWeek = ctx.week;
  }
  next = [...started, ...next];
  return { threads: next, started, escalated, arcWeeks, lastRomanceWeek };
}

export interface ReplyResult {
  thread: DmThread;
  /** What the artist sent (null for silent choices like leaving on read). */
  said: string | null;
  outcome: DmOutcome | null;
  reply: DmArcReply;
}

/** The artist picks a quick reply. */
export function replyDm(thread: DmThread, replyId: string, ctx: DmCtx, rnd: () => number): ReplyResult | null {
  const arc = getArc(thread.arc);
  const stage = arc?.stages[thread.stage];
  if (!arc || !stage || thread.state !== 'open') return null;
  if (!thread.options.some((o) => o.id === replyId)) return null;
  const reply = stage.replies.find((r) => r.id === replyId);
  if (!reply) return null;

  let next = reply.next;
  let end = reply.end;
  let outcome: DmOutcome | null = reply.outcome ?? null;
  if (reply.roll) {
    const stat = reply.roll.stat ? (ctx.stats?.[reply.roll.stat] ?? 50) : 50;
    const p = Math.max(0.05, Math.min(0.95, reply.roll.p + (stat - 50) / 200));
    const branch = rnd() < p ? reply.roll.then : reply.roll.otherwise;
    next = branch.next;
    end = branch.end;
    outcome = branch.outcome ?? outcome;
  }

  const said = reply.say.length > 0 ? fillDm(pick(reply.say, rnd), thread, ctx) : null;
  let t: DmThread = {
    ...thread,
    messages: said ? [...thread.messages, { from: 'me', text: said, at: ctx.now }] : thread.messages,
    options: [],
    unread: false,
    request: false,
    ignoredWeeks: 0,
    lastWeek: ctx.week,
  };
  if (end === 'block') t = { ...t, state: 'blocked' };
  else if (next) t = enterStage(t, arc, next, ctx, rnd, ctx.now + 600);
  else t = { ...t, state: 'closed' };
  // Their answer is something new to read.
  if (next && t.messages.some((m) => m.from === 'them' && m.at > ctx.now)) t = { ...t, unread: true };
  return { thread: t, said, outcome, reply };
}
