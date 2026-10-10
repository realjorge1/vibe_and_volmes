import type { NpcAccount, Platform, SocialPost } from '../../types/social';
import type { NotificationActor } from '../../types/notifications';
import { useSocialStore } from '../../store/socialStore';
import { useNotificationStore } from '../../store/notificationStore';
import { usePlayerStore } from '../../store/playerStore';
import { useMusicStore } from '../../store/musicStore';
import { NPC_ACCOUNTS } from '../../data/social/npcAccounts';
import { playerAccount } from './playerAccount';
import { regularById } from '../../data/social/everyday/accounts';
import { castAccountById } from './celebContext';

/**
 * Find a post by id wherever it lives now: this week's feed, the history,
 * the notification that pointed at it, or the artist's own releases. A
 * notification tapped a week later still opens its post.
 */
export function findPost(id: string): SocialPost | null {
  const social = useSocialStore.getState();
  const hit = social.feed.find((p) => p.id === id) ?? social.postHistory.find((p) => p.id === id);
  if (hit) return hit;
  const mine = social.authored.find((p) => p.id === id);
  if (mine) return mine;
  const kept = useNotificationStore.getState().items.find((n) => n.post?.id === id)?.post;
  if (kept) return kept;
  const own = id.match(/^me-([a-z]+)-(.+)$/);
  const player = usePlayerStore.getState().player;
  if (own && player) {
    const posts = playerAccount(player, own[1] as Platform, useMusicStore.getState().discography).posts;
    return posts.find((p) => p.id === id) ?? null;
  }
  return null;
}

/**
 * An account by id: a known NPC, the artist, or someone who only exists in a
 * comment section (rebuilt from the notification that mentioned them).
 */
export function findAccount(id: string, platform: Platform, actor?: NotificationActor): NpcAccount | null {
  const npc = NPC_ACCOUNTS.find((a) => a.id === id);
  if (npc) return npc;
  // The regular internet and the other artists.
  const regular = regularById(id);
  if (regular) return regular;
  const artist = castAccountById(id);
  if (artist) return artist;
  if (!actor) return null;
  let h = 0;
  for (let i = 0; i < actor.handle.length; i++) h = (h * 31 + actor.handle.charCodeAt(i)) >>> 0;
  return {
    id,
    username: actor.name,
    handle: actor.handle,
    accountType: 'fan',
    followers: 40 + (h % 2400),
    isVerified: actor.verified,
    preferredPlatforms: [platform],
  };
}
