import type { MyComment, SocialPost } from '../../../types/social';
import type { Player } from '../../../types/player';
import type { ReplySide, ThreadReply } from '../threadGenerator';
import { crowdPerson, seeded, type CrowdVibe } from '../../drama/crowd';
import { fameReach } from '../../../utils/statHelpers';
import { guardThread, isProtected } from '../protect';
import { readComment, type CommentIntent } from './topic';
import { typed, TYPISTS, type Typist } from './voice';
import { REAL_ARTIST_FRIEND, REAL_REPLY_BACK, REAL_REPLY_NOTICED } from '../../../data/social/realPhotoComments';
import {
  AGREE,
  ANSWER_CROWD,
  ANSWER_OWNER,
  ARTIST_HURT,
  ARTIST_REPLY,
  BRAND_REPLY,
  BRAND_SORRY,
  CROWD_NOTICES,
  DISAGREE,
  DOUBLE_DOWN,
  HATER_SOFTENS,
  LAUGH,
  OWNER_STARSTRUCK,
  OWNER_THANKS,
  PEER_REPLY,
  REPLY_BACK,
  REPLY_TO_HOSTILE,
  REPLY_TO_JOKE,
  REPLY_TO_KIND,
  RIVAL_REPLY,
} from '../../../data/social/talk/replies';

/**
 * PEOPLE ANSWER THE ARTIST (pure).
 *
 * When the artist comments (on their own post or anyone's) or replies to
 * someone, the comment section reacts the way a real one does: the person
 * they answered answers back (a fan loses it, a hater doubles down or
 * softens), the post's author replies (a brand thanks them, another artist
 * shows love or shade, a stranger can't believe who just commented), and
 * the rest of the section notices, more of them the more famous the artist
 * is. Every answer has a time (`at`): they come in over the next minutes.
 *
 * Under the player's own real photos only vetted kind lines answer, and the
 * guard checks them like everything else there.
 */

/** Whose post it is. */
export type OwnerKind = 'player' | 'brand' | 'page' | 'artist' | 'rival' | 'press' | 'person';

const FAN_HURT: readonly string[] = ['wow ok', 'damn {name}, I was just showing love', 'not {name} coming for fans now', 'that’s cold'];
const CLAPBACK_CHEER: readonly string[] = ['{name} said what they said', 'not {name} clapping back', 'the clapback!!', 'they really replied to the hater', 'somebody get this hater a bandage'];
const RIVAL_SURPRISED: readonly string[] = ['appreciate it.', 'oh. thanks 👀', 'who is this and what did you do with the real {name}', 'didn’t expect that from you. respect'];
const PERSON_HURT: readonly string[] = ['why are you like this', 'wow ok', 'didn’t ask but ok', 'that was unnecessary'];

type Who = { id: string; username: string; handle: string; verified: boolean };

/** The person a reply answers, rebuilt from what the artist's comment remembers. */
export function parentOf(c: MyComment): Who & { side: ReplySide } {
  return {
    id: c.toAccountId ?? `c-w-${c.toHandle ?? 'someone'}`,
    username: c.toName ?? c.toHandle ?? 'someone',
    handle: c.toHandle ?? 'someone',
    verified: false,
    side: (c.toSide as ReplySide | undefined) ?? 'fan',
  };
}

/**
 * Everyone who answers this comment, each with the time they do. Seeded by
 * the comment: the same comment always gets the same answers.
 */
export function answersTo(c: MyComment, post: SocialPost, player: Player, owner: OwnerKind, meHandle: string, ctx: { rivalNames?: readonly string[] } = {}): ThreadReply[] {
  const r = seeded(`answers:${c.id}`);
  const intent: CommentIntent = readComment(c.text);
  const reach = fameReach(player.stats.fans);
  const famous = reach >= 0.45;
  const safe = isProtected(post);
  const out: ThreadReply[] = [];
  const chance = (p: number) => r() < p;
  const pick = (lines: readonly string[]) => lines[Math.floor(r() * lines.length)];
  const fill = (s: string) => s.replace(/\{name\}/g, player.artistName).replace(/\{city\}/g, player.city).replace(/\{owner\}/g, post.account.username);

  const say = (who: Who, side: ReplySide, lines: readonly string[], after: [number, number], typist: Typist = TYPISTS.casual) => {
    if (lines.length === 0) return;
    out.push({
      id: `${c.id}-a${out.length}`,
      side,
      username: who.username,
      handle: who.handle,
      verified: who.verified,
      content: typed(fill(pick(lines)), r, typist),
      likes: Math.floor(r() * (3 + player.stats.fans * 0.00005)),
      accountId: who.id,
      at: c.at + after[0] + Math.round(r() * (after[1] - after[0])),
      toHandle: meHandle,
    });
  };
  const stranger = (k: number, vibe: CrowdVibe): Who => {
    const p = crowdPerson(`${c.id}:crowd:${k}`, { vibe });
    return { id: p.id, username: p.username, handle: p.handle, verified: false };
  };

  // A reply to someone (not to the artist's own comment) gets that someone back.
  const parent = c.parentId && c.toHandle ? parentOf(c) : null;
  const author: Who = { id: post.account.id, username: post.account.username, handle: post.account.handle, verified: post.account.isVerified };

  if (owner === 'player') {
    // The artist answering people under their own post.
    if (parent) {
      const p = parent.side;
      if (safe) {
        if (p === 'friend') {
          if (chance(0.6)) say(parent, 'friend', REAL_ARTIST_FRIEND, [20_000, 150_000]);
        } else if (chance(0.85)) say(parent, 'fan', REAL_REPLY_BACK, [12_000, 120_000], TYPISTS.stan);
      } else if (p === 'hater' || p === 'rival') {
        if (intent === 'hostile') {
          if (chance(0.65)) say(parent, p, DOUBLE_DOWN, [15_000, 120_000], TYPISTS.hater);
        } else if (intent === 'kind') {
          if (chance(0.6)) say(parent, p, HATER_SOFTENS, [20_000, 150_000], TYPISTS.hater);
        } else if (chance(0.4)) say(parent, p, DOUBLE_DOWN, [20_000, 150_000], TYPISTS.hater);
      } else if (intent === 'hostile') {
        if (chance(0.8)) say(parent, p, FAN_HURT, [15_000, 120_000]);
      } else if (p === 'friend') {
        if (chance(0.6)) say(parent, 'friend', ARTIST_REPLY, [20_000, 150_000]);
      } else if (p === 'neutral') {
        if (chance(0.5)) say(parent, p, PEER_REPLY, [20_000, 150_000]);
      } else if (chance(p === 'crazy' ? 0.95 : 0.85)) {
        say(parent, p, [...REPLY_BACK, ...REAL_REPLY_BACK], [12_000, 120_000], TYPISTS.stan);
      }
    }
    // The rest of the section sees the artist in the comments.
    const k = Math.round(reach * 2.5 * r() + (parent ? 0.3 : 0.8));
    for (let i = 0; i < k; i++) {
      const who = stranger(i, 'fan');
      if (safe) say(who, 'fan', REAL_REPLY_NOTICED, [40_000, 600_000], TYPISTS.stan);
      else if (intent === 'hostile') say(who, parent?.side === 'hater' || parent?.side === 'rival' ? 'stan' : 'neutral', parent?.side === 'hater' || parent?.side === 'rival' ? CLAPBACK_CHEER : REPLY_TO_HOSTILE, [40_000, 600_000]);
      else if (intent === 'joke') say(who, 'fan', REPLY_TO_JOKE, [40_000, 600_000]);
      else say(who, 'fan', REAL_REPLY_NOTICED, [40_000, 600_000], TYPISTS.stan);
    }
    out.sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
    return safe ? guardThread(post, out, ctx) : out;
  }

  // Someone else's post: its author may answer.
  switch (owner) {
    case 'brand':
      if (intent === 'hostile') {
        if (chance(0.5)) say(author, 'neutral', BRAND_SORRY, [60_000, 600_000], TYPISTS.calm);
      } else if (intent === 'question') {
        if (chance(0.5)) say(author, 'neutral', ANSWER_OWNER, [60_000, 600_000], TYPISTS.calm);
      } else if (chance(0.35)) say(author, 'neutral', BRAND_REPLY, [60_000, 600_000], TYPISTS.calm);
      break;
    case 'page':
      if (intent === 'question') {
        if (chance(0.3)) say(author, 'neutral', ANSWER_OWNER, [60_000, 900_000], TYPISTS.calm);
      } else if (intent !== 'hostile') {
        if (famous ? chance(0.5) : chance(0.25)) say(author, 'neutral', famous ? OWNER_STARSTRUCK : OWNER_THANKS, [60_000, 900_000]);
      }
      break;
    case 'artist':
      if (intent === 'hostile') {
        if (chance(0.6)) say(author, 'friend', ARTIST_HURT, [40_000, 400_000], TYPISTS.calm);
      } else if (chance(0.45)) say(author, 'friend', ARTIST_REPLY, [40_000, 400_000]);
      break;
    case 'rival':
      if (intent === 'kind') {
        if (chance(0.4)) say(author, 'rival', RIVAL_SURPRISED, [40_000, 400_000], TYPISTS.calm);
      } else if (chance(0.55)) say(author, 'rival', RIVAL_REPLY, [30_000, 300_000], TYPISTS.hater);
      break;
    case 'press':
      if (intent !== 'hostile' && chance(0.08)) say(author, 'neutral', OWNER_THANKS, [120_000, 900_000], TYPISTS.calm);
      break;
    default:
      if (intent === 'question') {
        if (chance(0.6)) say(author, 'neutral', ANSWER_OWNER, [30_000, 300_000]);
      } else if (intent === 'hostile') {
        if (chance(0.6)) say(author, 'neutral', PERSON_HURT, [30_000, 300_000]);
      } else if (famous ? chance(0.85) : chance(0.55)) {
        say(author, 'fan', famous ? OWNER_STARSTRUCK : OWNER_THANKS, [25_000, 240_000], famous ? TYPISTS.stan : TYPISTS.casual);
      }
  }

  // The person the artist replied to.
  if (parent && parent.handle !== author.handle) {
    const p = parent.side;
    if (famous && intent !== 'hostile' && p !== 'hater' && p !== 'rival') {
      if (chance(0.75)) say(parent, p, REPLY_BACK, [15_000, 180_000], TYPISTS.stan);
    } else if (intent === 'hostile') {
      if (chance(0.6)) say(parent, p, [...DISAGREE, ...DOUBLE_DOWN], [15_000, 180_000], TYPISTS.hater);
    } else if (intent === 'joke') {
      if (chance(0.6)) say(parent, p, LAUGH, [15_000, 180_000]);
    } else if (chance(0.5)) say(parent, p, PEER_REPLY, [15_000, 180_000]);
  }

  // Onlookers: almost nobody notices an unknown; a star in the comments is an event.
  const k = Math.round(reach * 3.2 * r() + (famous ? 0.6 : 0));
  for (let i = 0; i < k; i++) {
    const who = stranger(i, famous ? 'fan' : 'casual');
    const lines =
      intent === 'hostile' ? REPLY_TO_HOSTILE
      : intent === 'joke' ? REPLY_TO_JOKE
      : intent === 'question' ? ANSWER_CROWD
      : intent === 'kind' && famous ? REPLY_TO_KIND
      : famous ? CROWD_NOTICES
      : AGREE;
    say(who, famous ? 'fan' : 'neutral', lines, [40_000, 900_000], famous ? TYPISTS.stan : TYPISTS.casual);
  }
  return out.sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
}

/**
 * The comment section with the artist in it: their comments (newest on top,
 * like the real apps show your own), their replies tucked under the comment
 * they answered, and everyone's answers under those, all as of `now`.
 */
export function assemble(
  base: readonly ThreadReply[],
  mine: readonly MyComment[],
  answers: (c: MyComment) => ThreadReply[],
  me: { username: string; handle: string; verified: boolean },
  now: number,
  likesFor: (c: MyComment) => number = () => 0
): ThreadReply[] {
  const tops: ThreadReply[] = base.map((t) => ({ ...t, children: [...(t.children ?? [])] }));
  const host = new Map<string, ThreadReply>();
  for (const t of tops) {
    host.set(t.id, t);
    for (const k of t.children ?? []) host.set(k.id, t);
  }
  const myTops: ThreadReply[] = [];
  const ordered = [...mine].sort((a, b) => a.at - b.at);
  for (const c of ordered) {
    const node: ThreadReply = {
      id: c.id,
      side: 'fan',
      username: me.username,
      handle: me.handle,
      verified: me.verified,
      content: c.text,
      likes: likesFor(c),
      accountId: 'player',
      at: c.at,
      mine: true,
      toHandle: c.toHandle,
    };
    const ans = answers(c).filter((a) => a.at === undefined || a.at <= now);
    const into = c.parentId ? host.get(c.parentId) : undefined;
    if (into) {
      into.children = [...(into.children ?? []), node, ...ans].sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
      host.set(node.id, into);
      for (const a of ans) host.set(a.id, into);
    } else {
      const top: ThreadReply = { ...node, children: ans };
      myTops.push(top);
      host.set(top.id, top);
      for (const a of ans) host.set(a.id, top);
    }
  }
  return [...myTops.reverse(), ...tops];
}

/** The top-level comment a reply ends up under (what a notification opens on). */
export function hostId(parentId: string | undefined, selfId: string, mine: readonly MyComment[]): string {
  let id = parentId;
  for (let hops = 0; id && hops < 20; hops++) {
    // A reply under a comment: rep-<post>-<n>-c<k> lives under rep-<post>-<n>.
    const child = id.match(/^(rep-.+)-c\d+$/);
    if (child) return child[1];
    if (id.startsWith('rep-')) return id;
    // An answer to one of the artist's comments: <commentId>-a<k>.
    const answer = id.match(/^(mc-\d+)-a\d+$/);
    const own = mine.find((m) => m.id === (answer ? answer[1] : id));
    if (!own) return id;
    if (!own.parentId) return own.id;
    id = own.parentId;
  }
  return id ?? selfId;
}
