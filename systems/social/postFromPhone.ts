import type { NpcAccount, PhotoRead, Platform, SocialPost } from '../../types/social';
import type { StockPhoto } from '../../data/photos/photoPack';
import { useSocialStore } from '../../store/socialStore';
import { useRealPhotoStore } from '../../store/realPhotoStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { createAuthored } from './authored';
import { importPhoto, type DeviceAsset } from './deviceGallery';
import { postBoost, type RealPhoto } from './realPhotos';
import { notifyMyPost, notifyStoryReplies } from '../notifications/triggers';
import { readDevicePhoto, readStock } from './sense';

/**
 * Posting from the phone apps: one path for VibeGram, Chirp and TokTalk.
 * Real photos are copied into the private folder first; the post then
 * behaves like any other (likes over real minutes, pings), its comments
 * are only ever kind (systems/social/protect), and posting gives a small,
 * daily-capped fan bump that never goes negative.
 */

/** A photo the player picked: one of the game's, or a real one from their phone. */
export type PhotoPick = { kind: 'stock'; photo: StockPhoto } | { kind: 'device'; asset: DeviceAsset };

export function pickKey(p: PhotoPick): string {
  return p.kind === 'stock' ? `s:${p.photo.key}` : `d:${p.asset.id}`;
}

export interface PhonePost {
  platform: Platform;
  account: NpcAccount;
  caption: string;
  picks: readonly PhotoPick[];
  mode?: 'post' | 'story';
  location?: string;
  /** TokTalk: the sound the video plays. */
  beatId?: string | null;
}

export type PostResult = { ok: true; post: SocialPost } | { ok: false; reason: 'photo' | 'empty' };

const PLATFORM_NAME: Record<Platform, string> = { chirper: 'Chirp', flashpic: 'VibeGram', tunetok: 'TokTalk', vibestream: 'VibeNews' };

export async function postFromPhone(o: PhonePost): Promise<PostResult> {
  const now = Date.now();
  const imported: RealPhoto[] = [];
  const keys: string[] = [];
  // What each photo shows, so the comments fit it (read on the phone; only the reading is kept).
  const reading: Promise<PhotoRead>[] = [];
  for (const p of o.picks) {
    if (p.kind === 'stock') {
      keys.push(p.photo.key);
      reading.push(Promise.resolve(readStock(p.photo.tags)));
      continue;
    }
    const real = await importPhoto(p.asset, now + imported.length);
    if (!real) continue;
    imported.push(real);
    keys.push(real.key);
    reading.push(readDevicePhoto(real.uri, { uri: p.asset.uri, w: p.asset.w, h: p.asset.h }, o.caption));
  }
  const reads = await Promise.all(reading);
  if (o.picks.length > 0 && keys.length === 0) return { ok: false, reason: 'photo' };
  if (keys.length === 0 && o.caption.trim().length === 0) return { ok: false, reason: 'empty' };

  const story = o.mode === 'story';
  const media: SocialPost['media'] =
    keys.length > 0
      ? {
          kind: o.platform === 'tunetok' ? 'video' : 'image',
          // TokTalk posts are photo-mode videos (the clip planner reads the runtime and the sound).
          description: `${o.platform === 'tunetok' ? `🎬 0:${Math.min(59, 9 + 3 * keys.length)}` : '📸'} ${story ? 'story ' : ''}photo:${keys[0]}${o.beatId ? ` sound:beat:${o.beatId}` : ''}`,
          photoKeys: keys,
          real: imported.length > 0 || undefined,
          reads,
        }
      : undefined;
  const post: SocialPost = {
    ...createAuthored(o.platform, o.account, o.caption, useGameStore.getState().week, media, now),
    location: o.location?.trim() || undefined,
  };

  useRealPhotoStore.getState().add(imported);
  useSocialStore.getState().addAuthored(post);
  if (!story) notifyMyPost(post.id);
  else notifyStoryReplies(post);
  reward(o.platform, now);
  return { ok: true, post };
}

/** The fan bump: worth less with each post in a day, nothing after the third. */
function reward(platform: Platform, now: number): void {
  const photos = useRealPhotoStore.getState();
  const player = usePlayerStore.getState().player;
  const boost = player ? postBoost(player.stats.fans, photos.postedAt, now) : null;
  photos.notePost(now);
  if (!player || !boost || boost.weight === 0) return;
  const changes: { stat: 'fans' | 'mentalHealth'; delta: number }[] = [{ stat: 'fans', delta: boost.fans }];
  if (boost.mental > 0) changes.push({ stat: 'mentalHealth', delta: boost.mental });
  usePlayerStore.getState().updateStats(changes);
  usePlayerStore.getState().save();
  if (boost.weight === 1) {
    useGameStore
      .getState()
      .addStoryLine(`Your ${PLATFORM_NAME[platform]} post landed well: +${boost.fans.toLocaleString()} fans.`, 'social', 'phone:post');
  }
}
