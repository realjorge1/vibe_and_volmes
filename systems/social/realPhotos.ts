import type { StockPhoto } from '../../data/photos/photoPack';
import { fameReach } from '../../utils/statHelpers';

/**
 * THE PLAYER'S REAL PHOTOS.
 *
 * Photos the player picked from their phone's gallery to post in VibeGram,
 * Chirp or TokTalk. Each one is copied into the app's private folder (so a
 * post still shows after the original is deleted from the gallery) and gets
 * a key, `real<time><rand>`, that posts reference like any photo from the
 * pack. They never leave the phone: no AI, no sync, no sharing.
 *
 * Everything here is pure. The store (store/realPhotoStore) registers the
 * photos it holds, and the photo index resolves their keys through here.
 */

export interface RealPhoto {
  key: string;
  /** file:// uri of the private copy. */
  uri: string;
  w: number;
  h: number;
  /** When it was imported (ms). */
  at: number;
}

/** Real keys are longer than the pack's 10-character keys and always start with "real". */
export function realKey(now: number, rnd: () => number = Math.random): string {
  const tail = Math.floor(rnd() * 36 ** 3)
    .toString(36)
    .padStart(3, '0');
  return `real${now.toString(36)}${tail}`;
}

export function isRealKey(key: string | null | undefined): boolean {
  return !!key && /^real[a-z0-9]{6,}$/.test(key);
}

const REGISTRY = new Map<string, StockPhoto>();

/** A real photo shaped like a pack photo, so every renderer can show it. */
export function asStockPhoto(p: RealPhoto): StockPhoto {
  return {
    key: p.key,
    src: { uri: p.uri },
    w: Math.max(1, p.w),
    h: Math.max(1, p.h),
    tags: [],
    focus: [0.5, 0.5],
    tint: '#1C1C1E',
    dark: true,
  };
}

export function registerRealPhotos(list: readonly RealPhoto[]): void {
  for (const p of list) REGISTRY.set(p.key, asStockPhoto(p));
}

export function unregisterRealPhoto(key: string): void {
  REGISTRY.delete(key);
}

export function clearRealPhotos(): void {
  REGISTRY.clear();
}

export function realPhotoByKey(key: string | null | undefined): StockPhoto | null {
  return key ? (REGISTRY.get(key) ?? null) : null;
}

/** The size a post shows a photo at: Instagram keeps it between 4:5 portrait and 1.91:1 landscape. */
export function feedAspect(w: number, h: number): number {
  const r = w > 0 && h > 0 ? w / h : 1;
  return Math.min(1.91, Math.max(0.8, r));
}

/** Longest side of the private copy: what Instagram serves, and small enough to keep dozens. */
export const REAL_MAX_SIDE = 1080;

/** The resize that keeps a photo inside REAL_MAX_SIDE (null when it already fits). */
export function fitSize(w: number, h: number, max = REAL_MAX_SIDE): { width: number } | { height: number } | null {
  if (w <= max && h <= max) return null;
  return w >= h ? { width: max } : { height: max };
}

// --- What posting does for the career -------------------------------------------

const DAY_MS = 24 * 3_600_000;

/** How much each post today counts: the first one fully, then less, then nothing. */
const DAILY_WEIGHT: readonly number[] = [1, 0.5, 0.25];

export interface PostBoost {
  fans: number;
  /** A good post lifts the mood a little (first post of the day only). */
  mental: number;
  /** 0..1: how much this post counted (0 = already posted plenty today). */
  weight: number;
}

/**
 * Posting keeps fans engaged: a small bump that fits the artist's size, worth
 * less with every extra post in a day, and never a penalty. `recent` is when
 * the artist's earlier posts went up (ms).
 */
export function postBoost(fans: number, recent: readonly number[], now = Date.now()): PostBoost {
  const today = recent.filter((t) => now - t >= 0 && now - t < DAY_MS).length;
  const weight = DAILY_WEIGHT[today] ?? 0;
  if (weight === 0) return { fans: 0, mental: 0, weight: 0 };
  // 0.15% of the fanbase for a star's post, a handful of people for an unknown.
  const base = 3 + Math.round(Math.max(0, fans) * 0.0015) + Math.round(6 * fameReach(fans));
  return { fans: Math.max(1, Math.round(base * weight)), mental: today === 0 ? 1 : 0, weight };
}
