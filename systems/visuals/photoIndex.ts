import { PHOTOS, type PhotoTag, type StockPhoto } from '../../data/photos/photoPack';
import { realPhotoByKey } from '../social/realPhotos';

/**
 * The photo pack, indexed by what each photo shows. Every pick is a pure
 * function of a seed, so a post, an avatar or a story always gets the same
 * photo however often it re-renders, and different posts spread across the
 * pack instead of repeating the first match.
 */

export type { PhotoTag, StockPhoto };
export type Orientation = 'portrait' | 'landscape' | 'any';

export function hashOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const BY_TAG = new Map<PhotoTag, StockPhoto[]>();
for (const p of PHOTOS) {
  for (const t of p.tags) {
    const list = BY_TAG.get(t);
    if (list) list.push(p);
    else BY_TAG.set(t, [p]);
  }
}

const BY_KEY = new Map<string, StockPhoto>(PHOTOS.map((p) => [p.key, p]));

/** A pack photo, or one of the player's own real photos (see systems/social/realPhotos). */
export function photoByKey(key: string | undefined | null): StockPhoto | null {
  return key ? (BY_KEY.get(key) ?? realPhotoByKey(key)) : null;
}

/** Every photo a post carries by key: the artist's carousel, or the one `photo:` key. */
export function postPhotoKeys(media: { description: string; photoKeys?: string[] } | undefined): string[] {
  if (!media) return [];
  if (media.photoKeys && media.photoKeys.length > 0) return media.photoKeys;
  const one = media.description.match(/photo:([a-z0-9]+)/)?.[1];
  return one ? [one] : [];
}

export function photosTagged(tag: PhotoTag): readonly StockPhoto[] {
  return BY_TAG.get(tag) ?? [];
}

export function isPortrait(p: StockPhoto): boolean {
  return p.h > p.w * 1.05;
}

function fits(p: StockPhoto, o: Orientation): boolean {
  if (o === 'any') return true;
  return o === 'portrait' ? isPortrait(p) : !isPortrait(p);
}

/**
 * The pool a pick is drawn from: photos of the first tag that has any in the
 * wanted orientation, widened with the next tags until there is some variety.
 * Orientation is a preference, never a reason to come back empty.
 */
function poolFor(tags: readonly PhotoTag[], orientation: Orientation, avoid?: ReadonlySet<string>): StockPhoto[] {
  const seen = new Set<string>();
  const pool: StockPhoto[] = [];
  const add = (strict: boolean) => {
    for (const t of tags) {
      for (const p of photosTagged(t)) {
        if (seen.has(p.key) || avoid?.has(p.key)) continue;
        if (strict && !fits(p, orientation)) continue;
        seen.add(p.key);
        pool.push(p);
      }
      if (pool.length >= 6) return;
    }
  };
  add(true);
  if (pool.length < 3) add(false);
  if (pool.length === 0) {
    for (const p of PHOTOS) if (!avoid?.has(p.key)) pool.push(p);
  }
  return pool.length > 0 ? pool : [...PHOTOS];
}

export interface PickOpts {
  orientation?: Orientation;
  /** Keys to skip (e.g. photos already used in the same carousel). */
  avoid?: ReadonlySet<string>;
}

/** One stable photo for `seed`, matching the tags in priority order. */
export function pickPhoto(tags: readonly PhotoTag[], seed: string, opts: PickOpts = {}): StockPhoto {
  const pool = poolFor(tags, opts.orientation ?? 'any', opts.avoid);
  return pool[hashOf(seed) % pool.length];
}

/** `n` distinct stable photos (a carousel, the shots of a clip). */
export function pickPhotos(
  tags: readonly PhotoTag[],
  seed: string,
  n: number,
  opts: PickOpts = {}
): StockPhoto[] {
  const out: StockPhoto[] = [];
  const avoid = new Set(opts.avoid ?? []);
  for (let i = 0; i < n; i++) {
    const p = pickPhoto(tags, `${seed}:${i}`, { ...opts, avoid });
    if (avoid.has(p.key)) break;
    out.push(p);
    avoid.add(p.key);
  }
  return out;
}
