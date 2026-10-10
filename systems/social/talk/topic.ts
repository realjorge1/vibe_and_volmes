import type { PhotoKind, PhotoRead, SocialPost } from '../../../types/social';
import type { TextIntent } from '../../../data/social/talk/kinds';

/**
 * WHAT A POST IS ABOUT (pure): the photo reads stored on it when it went up
 * (systems/social/sense) plus what the caption is doing. Comment sections
 * read this to say the right thing.
 */

export interface PostTopic {
  /** What the (first) photo shows; null for a text-only post. */
  kind: PhotoKind | null;
  thing?: string;
  also: PhotoKind[];
  /** Sure enough to talk about what's in the picture. */
  known: boolean;
  /** A photograph of the real world (not a meme or screenshot), so "gorgeous shot" fits. */
  photographic: boolean;
  /** Photos in the post. */
  count: number;
  /** Slides worth a comment in a photo dump (1-based). */
  slides: { n: number; kind: PhotoKind; thing?: string }[];
  /** What the words are doing. */
  intent: TextIntent;
  /** The caption is about a partner. */
  romance: boolean;
  /** The caption talks about the artist's music. */
  music: boolean;
}

const MUSIC = /\b(new (song|single|music|album|ep|mixtape|track)|dropping|drops? (friday|tonight|soon|tomorrow|at midnight)|out now|pre-?save|snippet|tracklist|album|single|my song|the song|studio|session|recording|music video|listening party)\b/;
const QUESTION_START = /^(who|what|where|when|why|how|which|should|would|could|can|do|does|did|is|are|anyone|any|y'?all|ya'?ll)\b/;
const GREETING = /^(good morning|gm\b|morning\b|good night|gn\b|goodnight|hello|hi\b|hey\b|happy (monday|tuesday|wednesday|thursday|friday|saturday|sunday))/;
const GRATITUDE = /\b(thank you|thanks|grateful|blessed|appreciate|thankful)\b/;
const VENT = /\b(tired|exhausted|can'?t sleep|sad|stressed|rough day|long day|anxious|lonely|hard week|burnt out|burned out|need a break|crying|overwhelmed|not okay|bad day)\b/;
const JOKE = /\b(lol|lmao|lmfao|haha+|jk|hehe)\b|😂|🤣|💀/;
const OPINION = /\b(hot take|unpopular opinion|i think|overrated|underrated|is the best|is better than|goat|the best (song|album|artist)|change my mind|debate)\b/;
const ROMANCE = /\b(bae|babe|my love|my person|anniversary|date night|wifey|hubby|my man|my girl|boo|soulmate)\b|❤️|💕/;

/** What a caption or a text post is doing. */
export function readText(text: string): TextIntent {
  const t = text.toLowerCase().replace(/[’‘]/g, "'").trim();
  if (!t) return 'statement';
  if (t.endsWith('?') || QUESTION_START.test(t)) return 'question';
  if (MUSIC.test(t)) return 'music';
  if (GREETING.test(t)) return 'greeting';
  if (GRATITUDE.test(t)) return 'gratitude';
  if (VENT.test(t)) return 'vent';
  if (JOKE.test(t)) return 'joke';
  if (OPINION.test(t)) return 'opinion';
  return 'statement';
}

const NOT_PHOTOGRAPH: ReadonlySet<PhotoKind> = new Set(['meme', 'screenshot']);
const SLIDE_WORTHY: ReadonlySet<PhotoKind> = new Set(['pet', 'food', 'selfie', 'duo', 'group', 'scenery', 'meme', 'baby']);

/** Sure enough about a read to talk about what is in it. */
export function isKnown(read: PhotoRead | undefined): read is PhotoRead {
  return !!read && read.kind !== 'other' && read.confidence >= 0.3;
}

export function postTopic(post: Pick<SocialPost, 'content' | 'media'>): PostTopic {
  const reads = post.media?.reads ?? [];
  const keys = post.media?.photoKeys ?? [];
  const count = Math.max(keys.length, reads.length);
  const first = reads[0];
  const intent = readText(post.content);
  const caption = post.content.toLowerCase();
  const known = isKnown(first);
  const kind: PhotoKind | null = count === 0 && !post.media ? null : (first?.kind ?? 'other');
  // A real-world photograph: the phone saw it (or it's the game's own photo) and it isn't a meme or a screenshot.
  const photographic = !!first && !NOT_PHOTOGRAPH.has(first.kind) && (first.via === 'vision' || first.via === 'stock' || known);
  const slides: PostTopic['slides'] = [];
  if (count >= 3) {
    reads.forEach((r, i) => {
      if (i > 0 && isKnown(r) && SLIDE_WORTHY.has(r.kind)) slides.push({ n: i + 1, kind: r.kind, thing: r.thing });
    });
  }
  return {
    kind,
    thing: known ? first.thing : undefined,
    also: known ? [...(first.also ?? [])] : [],
    known,
    photographic,
    count,
    slides,
    intent,
    romance: ROMANCE.test(caption),
    music: MUSIC.test(caption),
  };
}

/** What the artist's own comment is doing (for how people answer it). */
export type CommentIntent = 'hostile' | 'question' | 'joke' | 'kind' | 'neutral';

const HOSTILE = /\b(mid|trash|flop|flopped|ugly|cringe|overrated|who asked|ratio|wack|garbage|fraud|fake|clown|loser|washed|fell off|nobody cares|boring|corny|shut up|stfu|L)\b|🤡|💀🤣|🗑/;
const KIND = /\b(love|beautiful|amazing|fire|cute|great|nice|goals|congrats|congratulations|proud|gorgeous|stunning|best|perfect|talented|queen|king|slay|ate|obsessed|adorable|wow|yes)\b|🔥|😍|❤️|🥹|🙌|👏|💯|✨|🫶/;

export function readComment(text: string): CommentIntent {
  const t = text.toLowerCase().replace(/[’‘]/g, "'").trim();
  if (HOSTILE.test(text) || HOSTILE.test(t)) return 'hostile';
  if (t.endsWith('?') || QUESTION_START.test(t)) return 'question';
  if (JOKE.test(t)) return 'joke';
  if (KIND.test(t)) return 'kind';
  return 'neutral';
}
