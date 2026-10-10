import type { SocialPost } from '../../types/social';
import { hashOf, photoByKey, pickPhoto, postPhotoKeys, type PhotoTag, type StockPhoto } from './photoIndex';
import { ownTrackId, sceneTags } from './scenes';

/**
 * SHORT VIDEOS.
 *
 * TokTalk clips and VibeGram reels are edits built from the photo pack, the
 * way a lot of real short videos are: a few shots with slow push-ins, cuts on
 * the beat, a flash on the transition, the creator's text burned in, and a
 * sound underneath. When a video is about the artist's song, the sound is the
 * artist's actual song. Pure: the same post is always the same edit.
 */

export interface ClipShot {
  photo: StockPhoto;
  /** ms from the start of the clip. */
  start: number;
  dur: number;
  /** Scale at the start and end of the shot (a push-in or a pull-out). */
  zoom: readonly [number, number];
  /** Drift, as a fraction of the frame, at the start and end. */
  pan: readonly [readonly [number, number], readonly [number, number]];
  /** How the shot arrives: a hard cut, a white flash, or a zoom punch. */
  enter: 'cut' | 'flash' | 'punch';
}

export interface ClipCaption {
  text: string;
  start: number;
  end: number;
  /** `tok`: white boxed text mid-frame. `title`: big top text. `list`: numbered beats. */
  style: 'tok' | 'title' | 'list';
}

export type ClipSoundSpec =
  /** The artist's latest release. */
  | { kind: 'track'; rate: number }
  /** One specific release (the artist's own post about it). */
  | { kind: 'own'; trackId: string; rate: number }
  /** An instrumental from the library: someone's "original sound" (or one picked). */
  | { kind: 'beat'; seed: string; rate: number; beatId?: string };

export interface ClipPlan {
  duration: number;
  shots: ClipShot[];
  captions: ClipCaption[];
  sound: ClipSoundSpec;
  /** `duet`: the original on the left, the creator reacting on the right. */
  layout: 'full' | 'duet';
  side: ClipShot[];
  /** A drama-channel thumbnail: red arrow and a shocked headline. */
  overlay: 'thumbnail' | null;
}

export interface ClipContext {
  playerName: string;
  /** The artist's latest release, if they have one. */
  trackTitle: string | null;
}

interface Recipe {
  match: RegExp;
  /** Shot groups; shot i draws from group i (the last group repeats). */
  tags: readonly (readonly PhotoTag[])[];
  shots: number;
  pace: 'slow' | 'medium' | 'fast';
  captions?: (c: ClipContext) => string[];
  style?: ClipCaption['style'];
  sound: 'track' | 'own' | 'beat';
  rate?: number;
  layout?: 'duet';
  side?: readonly PhotoTag[];
  overlay?: 'thumbnail';
  /** Two halves with a flash on the beat between them. */
  transition?: boolean;
}

const tagify = (s: string | null) => (s ?? 'NewMusic').replace(/[^A-Za-z0-9]/g, '');

const RECIPES: readonly Recipe[] = [
  { match: /snippet of/i, tags: [['studio', 'mic'], ['player', 'stage'], ['studio']], shots: 3, pace: 'medium', sound: 'own' },
  {
    match: /fancam/i,
    tags: [['fancam', 'crowd'], ['player', 'stage'], ['stage', 'crowd']],
    shots: 3,
    pace: 'medium',
    captions: () => ['the way they hit that note 😭'],
    sound: 'track',
  },
  {
    match: /dance challenge|choreo/i,
    tags: [['dance', 'friends']],
    shots: 5,
    pace: 'fast',
    captions: (c) => [`#${tagify(c.trackTitle)}Challenge 💃`],
    sound: 'track',
  },
  {
    match: /in the car/i,
    tags: [['car', 'drive'], ['drive']],
    shots: 2,
    pace: 'slow',
    captions: () => ['when your own song comes on in the car 😭'],
    sound: 'track',
  },
  {
    match: /transition edit|broke/i,
    tags: [['street', 'moody', 'bw'], ['jet', 'flex']],
    shots: 2,
    pace: 'medium',
    transition: true,
    captions: () => ['broke', 'now ✈️'],
    sound: 'track',
  },
  {
    match: /POV you discovered/i,
    tags: [['drive', 'sky'], ['sky', 'drive']],
    shots: 3,
    pace: 'slow',
    captions: (c) => [`POV: you discovered ${c.playerName} today`],
    sound: 'track',
  },
  {
    match: /kid on stage/i,
    tags: [['stage'], ['crowd'], ['stage', 'crowd']],
    shots: 3,
    pace: 'medium',
    captions: () => ['they brought a KID on stage to finish the hook 😭😭'],
    sound: 'track',
  },
  {
    match: /slowed \+ reverb/i,
    tags: [['rain', 'moody']],
    shots: 1,
    pace: 'slow',
    captions: (c) => [`${c.trackTitle ?? 'this song'} (slowed + reverb)`],
    style: 'title',
    sound: 'track',
    rate: 0.82,
  },
  {
    match: /timeline explained/i,
    tags: [['phone'], ['stage'], ['press'], ['city']],
    shots: 4,
    pace: 'medium',
    captions: () => ['1. how it started', '2. the first song', '3. the drama', '4. where we are now'],
    style: 'list',
    sound: 'beat',
  },
  {
    match: /b-roll|mumbling a melody/i,
    tags: [['studio', 'mic'], ['studio']],
    shots: 3,
    pace: 'slow',
    captions: () => ['unreleased?? 👀'],
    sound: 'beat',
  },
  {
    match: /talking-head|break it down/i,
    tags: [['phone', 'moody'], ['moody']],
    shots: 2,
    pace: 'slow',
    captions: (c) => [`is ${c.playerName} actually that deep? let's break it down`],
    sound: 'beat',
  },
  {
    match: /we need to talk/i,
    tags: [['press', 'moody'], ['moody']],
    shots: 2,
    pace: 'slow',
    overlay: 'thumbnail',
    captions: (c) => [`we need to talk about ${c.playerName}`],
    style: 'title',
    sound: 'beat',
  },
  {
    match: /stumbling on lyrics/i,
    tags: [['stage', 'mic']],
    shots: 1,
    pace: 'slow',
    captions: () => ["it's over 💀"],
    sound: 'track',
    rate: 0.8,
  },
  {
    match: /drama channel|sirens/i,
    tags: [['press'], ['paparazzi'], ['moody'], ['street']],
    shots: 4,
    pace: 'fast',
    captions: (c) => [`THE ${c.playerName.toUpperCase()} SITUATION 🚨`],
    style: 'title',
    sound: 'beat',
  },
  {
    match: /duet stitch/i,
    tags: [['stage']],
    shots: 2,
    pace: 'medium',
    layout: 'duet',
    side: ['moody', 'phone'],
    captions: () => ['not this 😭'],
    sound: 'track',
  },
];

/** "0:14" in a media line is the clip's runtime. */
export function runtimeOf(description: string, seed: string): number {
  const m = description.match(/(\d):(\d\d)/);
  if (m) return Math.max(6, Number(m[1]) * 60 + Number(m[2])) * 1000;
  return 9000 + (hashOf(`${seed}:len`) % 9000);
}

function shotsFor(
  groups: readonly (readonly PhotoTag[])[],
  n: number,
  duration: number,
  seed: string,
  pace: Recipe['pace'],
  transition: boolean
): ClipShot[] {
  const out: ClipShot[] = [];
  const used = new Set<string>();
  const dur = Math.round(duration / n);
  for (let i = 0; i < n; i++) {
    const tags = groups[Math.min(i, groups.length - 1)];
    const photo = pickPhoto(tags, `${seed}:shot${i}`, { orientation: 'portrait', avoid: used });
    used.add(photo.key);
    const h = hashOf(`${seed}:kb${i}`);
    const inward = h % 3 !== 0;
    const lo = 1.04 + (h % 5) * 0.015;
    const hi = lo + (pace === 'fast' ? 0.06 : 0.12);
    const dx = (((h >>> 5) % 9) - 4) * 0.01;
    const dy = (((h >>> 9) % 9) - 4) * 0.008;
    const enter: ClipShot['enter'] =
      i === 0 ? 'cut' : transition ? 'flash' : pace === 'fast' ? 'punch' : (h >>> 13) % 4 === 0 ? 'flash' : 'cut';
    out.push({
      photo,
      start: i * dur,
      dur: i === n - 1 ? duration - i * dur : dur,
      zoom: inward ? [lo, hi] : [hi, lo],
      pan: [
        [dx, dy],
        [-dx * 0.6, -dy * 0.6],
      ],
      enter,
    });
  }
  return out;
}

function captionsFor(texts: string[], duration: number, style: ClipCaption['style'], transition: boolean): ClipCaption[] {
  if (texts.length === 0) return [];
  if (texts.length === 1) return [{ text: texts[0], start: 0, end: duration, style }];
  const step = duration / texts.length;
  return texts.map((text, i) => ({
    text,
    start: Math.round(i * step),
    end: style === 'list' ? duration : Math.round((i + 1) * step),
    style: transition ? 'title' : style,
  }));
}

/** Does this text talk about the artist's song by name? */
function mentionsTrack(text: string, title: string | null): boolean {
  return !!title && text.toLowerCase().includes(title.toLowerCase());
}

/** The edit a short-video post plays as. */
export function planClip(post: SocialPost, ctx: ClipContext): ClipPlan {
  const d = post.media?.description ?? '';
  const seed = post.id;
  const duration = runtimeOf(d, seed);
  // Generated everyday/celebrity videos say what they show; they never match a format by accident.
  const recipe = d && !post.lane ? RECIPES.find((r) => r.match.test(d)) : undefined;
  const own = ownTrackId(post);

  // The artist's own video: the photos they picked lead, the sound they chose plays.
  // A video made of their real photos shows only those photos.
  const picked = postPhotoKeys(post.media)
    .map(photoByKey)
    .filter((p): p is StockPhoto => p !== null);
  if (picked.length > 0) {
    const real = !!post.media?.real;
    const shots = shotsFor([picked[0].tags, picked[0].tags], Math.max(3, Math.min(6, picked.length)), duration, seed, 'medium', false).map(
      (s, i) => (i < picked.length || real ? { ...s, photo: picked[i % picked.length] } : s)
    );
    const beatId = d.match(/sound:beat:([a-z0-9-]+)/)?.[1];
    return {
      duration,
      shots,
      captions: post.content ? captionsFor([post.content], duration, 'tok', false) : [],
      sound: beatId ? { kind: 'beat', seed, rate: 1, beatId } : ctx.trackTitle ? { kind: 'track', rate: 1 } : { kind: 'beat', seed, rate: 1 },
      layout: 'full',
      side: [],
      overlay: null,
    };
  }

  if (!recipe) {
    // A post without a known format: the scene it talks about, its words on top.
    const tags = post.media?.tags && post.media.tags.length > 0 ? (post.media.tags as PhotoTag[]) : sceneTags(`${d} ${post.content}`, post.sentiment);
    const n = 2 + (hashOf(`${seed}:n`) % 2);
    const songy = mentionsTrack(`${d} ${post.content}`, ctx.trackTitle);
    return {
      duration,
      shots: shotsFor([tags], n, duration, seed, 'medium', false),
      captions: captionsFor([post.content], duration, 'tok', false),
      sound: own ? { kind: 'own', trackId: own, rate: 1 } : songy ? { kind: 'track', rate: 1 } : { kind: 'beat', seed, rate: 1 },
      layout: 'full',
      side: [],
      overlay: null,
    };
  }

  const rate = recipe.rate ?? 1;
  const sound: ClipSoundSpec =
    recipe.sound === 'own' && own
      ? { kind: 'own', trackId: own, rate }
      : recipe.sound === 'track' && ctx.trackTitle
        ? { kind: 'track', rate }
        : { kind: 'beat', seed, rate };
  const shots = shotsFor(recipe.tags, recipe.shots, duration, seed, recipe.pace, !!recipe.transition);
  const side = recipe.side ? shotsFor([recipe.side], 1, duration, `${seed}:side`, 'slow', false) : [];
  return {
    duration,
    shots,
    captions: captionsFor(recipe.captions?.(ctx) ?? [], duration, recipe.style ?? 'tok', !!recipe.transition),
    sound,
    layout: recipe.layout ?? 'full',
    side,
    overlay: recipe.overlay ?? null,
  };
}
