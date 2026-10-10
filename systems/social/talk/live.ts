import type { MyComment, SocialPost } from '../../../types/social';
import type { ThreadReply } from '../threadGenerator';
import { useSocialStore } from '../../../store/socialStore';
import { usePlayerStore } from '../../../store/playerStore';
import { regularById } from '../../../data/social/everyday/accounts';
import { castMemberOf } from '../celebContext';
import { rivalIds } from '../relations';
import { playerHandle } from '../playerAccount';
import { threadContext } from '../threadContext';
import { generateThread } from '../threadGenerator';
import { fameReach } from '../../../utils/statHelpers';
import { answersTo, assemble, type OwnerKind } from './conversation';
import { answerStory, STORY_ARC } from './stories';
import { useDramaStore } from '../../../store/dramaStore';

/**
 * The comment sections with the artist in them (store glue): what they wrote
 * stays, and the people they talked to answer over the next minutes.
 */

/** Whose post it is, for how its author answers. */
export function ownerKind(post: SocialPost): OwnerKind {
  const a = post.account;
  if (a.id === 'player') return 'player';
  if (post.sponsored || a.id.startsWith('ad-')) return 'brand';
  const regular = regularById(a.id);
  if (regular) {
    if (regular.brand) return 'brand';
    if (regular.sections && regular.sections.length > 0) return 'press';
    return regular.avatar.kind === 'logo' ? 'page' : 'person';
  }
  if (a.accountType === 'artist' || a.id.startsWith('artist-') || a.id.startsWith('npc-')) {
    const m = castMemberOf(a.id);
    const rivals = rivalIds();
    if ((m && (m.relation === 'rival' || rivals.has(m.id))) || rivals.has(a.id.replace(/^artist-/, ''))) return 'rival';
    return 'artist';
  }
  if (a.accountType === 'news' || a.accountType === 'gossip' || a.accountType === 'critic' || a.accountType === 'industry') return 'press';
  return 'person';
}

/** Everyone who answers one of the artist's comments (all of them, with their times). */
export function answersFor(c: MyComment, post: SocialPost): ThreadReply[] {
  const player = usePlayerStore.getState().player;
  if (!player) return [];
  return answersTo(c, post, player, ownerKind(post), playerHandle(player), { rivalNames: threadContext().rivalNames });
}

/** Likes on the artist's own comment: a star's comment climbs to the top. */
function likesFor(c: MyComment, now: number): number {
  const fans = usePlayerStore.getState().player?.stats.fans ?? 0;
  const grown = 1 - Math.exp(-Math.max(0, now - c.at) / (20 * 60_000));
  return Math.round((fans * 0.0004 + 2 * fameReach(fans)) * grown);
}

/** The full section as of `now`: everyone's comments, the artist's, and the answers. */
export function conversation(post: SocialPost, now = Date.now()): ThreadReply[] {
  const player = usePlayerStore.getState().player;
  if (!player) return [];
  const base = generateThread(post, player, threadContext(), now);
  const mine = useSocialStore.getState().myComments.filter((c) => c.postId === post.id);
  if (mine.length === 0) return base;
  const me = { username: player.artistName, handle: playerHandle(player), verified: fameReach(player.stats.fans) >= 0.6 };
  return assemble(base, mine, (c) => answersFor(c, post), me, now, (c) => likesFor(c, now));
}

/** When something in this section is still on its way (ms), or null. */
export function nextArrival(post: SocialPost, now = Date.now()): number | null {
  const player = usePlayerStore.getState().player;
  if (!player) return null;
  let next: number | null = null;
  const consider = (list: readonly ThreadReply[]) => {
    for (const r of list) {
      if (r.at !== undefined && r.at > now && (next === null || r.at < next)) next = r.at;
      if (r.children) consider(r.children);
    }
  };
  consider(generateThread(post, player, threadContext(), Infinity));
  for (const c of useSocialStore.getState().myComments) if (c.postId === post.id) consider(answersFor(c, post));
  return next;
}

/** The artist comments (or replies to someone): it stays, and people answer. */
export function sendComment(post: SocialPost, text: string, parent?: ThreadReply | null): MyComment | null {
  const t = text.trim();
  if (!t) return null;
  const now = Date.now();
  const c: MyComment = {
    id: `mc-${now}`,
    postId: post.id,
    platform: post.platform,
    parentId: parent?.id,
    toHandle: parent && !parent.mine ? parent.handle : undefined,
    toName: parent && !parent.mine ? parent.username : undefined,
    toAccountId: parent && !parent.mine ? parent.accountId : undefined,
    toSide: parent && !parent.mine ? parent.side : undefined,
    text: t,
    at: now,
    // The artist's own posts can always be found again; anyone else's rides along.
    post: post.account.id === 'player' ? undefined : post,
  };
  useSocialStore.getState().addMyComment(c);
  return c;
}

/** The artist writes back to a story reply: it's kept, and they answer once. */
export function answerStoryDm(threadId: string, text: string): void {
  const player = usePlayerStore.getState().player;
  const thread = useDramaStore.getState().getDm(threadId);
  if (!player || !thread || thread.arc !== STORY_ARC || !text.trim()) return;
  useDramaStore.getState().upsertDm(answerStory(thread, text, player, Date.now()));
  useDramaStore.getState().save();
}
