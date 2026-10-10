import type { SocialPost } from '../../types/social';
import type { ThreadReply } from './threadGenerator';
import { isRealKey } from './realPhotos';
import { ALL_REAL_TEMPLATES, THING_WORDS } from '../../data/social/realPhotoComments';

/**
 * NOTHING NEGATIVE ON THE PLAYER'S REAL PHOTOS. EVER.
 *
 * A post that carries one of the player's own photos from their phone is
 * protected. The rest of the internet can be as brutal as the game wants
 * (haters, rival raids, scandal pile-ons), but under a real photo:
 *
 * 1. Comments come only from the vetted list in data/social/realPhotoComments
 *    (kind lines that fit what the photo shows). No haters, no rivals, no
 *    rival fans, no "address the scandal", no banter, no flirting, no
 *    obsessed fans. A cancelled artist's real photo gets fewer comments,
 *    never meaner ones. The same goes for the replies under those comments
 *    and for anyone answering the artist there.
 * 2. `guardThread` runs on every thread the game builds, last, replies
 *    included. Under a protected post it drops anything that isn't a vetted
 *    line, comes from a hostile side, names a rival, or trips the
 *    negative-word list. So even a future bug elsewhere can't put a bad
 *    word there.
 * 3. Nothing reuses a protected post: no memes, screenshots, news embeds or
 *    AI rewrites (`reusable`).
 *
 * The tests in __tests__/protect.test.ts throw the worst game states at it.
 */

/** True when the post shows one of the player's real photos. */
export function isProtected(post: Pick<SocialPost, 'media'> | null | undefined): boolean {
  const m = post?.media;
  if (!m) return false;
  if (m.real) return true;
  if (m.photoKeys?.some(isRealKey)) return true;
  return /photo:real[a-z0-9]{6,}/.test(m.description);
}

/** May another system quote, screenshot, meme or rewrite this post? Never a protected one. */
export function reusable(post: SocialPost): boolean {
  return !isProtected(post);
}

/** The only sides a comment under a real photo can come from. */
export const SAFE_SIDES: ReadonlySet<ThreadReply['side']> = new Set(['fan', 'stan', 'friend']);

/**
 * Words and emoji that never appear under a real photo, even inside an
 * otherwise vetted line (a typed location or artist name could carry one).
 */
/** Whole words and phrases ("mad" never matches "made"). */
const NEGATIVE_WORDS: readonly string[] = [
  'mid', 'trash', 'ugly', 'cringe', 'overrated', 'worst', 'plant', 'fell off', 'ratio', 'who asked',
  'nobody', 'pressed', 'boring', 'weird', 'gross', 'desperate', 'clout', 'try hard', 'tryhard', 'mess',
  'messy', 'disaster', 'yikes', 'ick', 'ew', 'eww', 'lame', 'corny', 'washed', 'irrelevant', 'annoying',
  'stop posting', 'address', 'explain yourself', 'scandal', 'receipts', 'shade', 'drag', 'fraud',
  'loser', 'stupid', 'dumb', 'idiot', 'bad', 'awful', 'terrible', 'horrible', 'pathetic', 'sad', 'cap',
  'touch grass', 'jealous', 'sexy', 'hot', 'body', 'daddy', 'mommy', 'marry me', 'dead', 'die', 'sick',
  'insane', 'crazy', 'mad', 'angry', 'beef', 'diss', 'enemy', 'block', 'report', 'liar', 'lying', 'old',
  'fat', 'skinny', 'filter', 'edited', 'botox', 'surgery', 'rival', 'opp', 'opps', 'l',
];

/** Stems: anything starting with these ("flop" catches "flopped", "hate" catches "hater"). */
const NEGATIVE_STEMS: readonly string[] = [
  'flop', 'fake', 'hate', 'cancel', 'delete', 'embarrass', 'apolog', 'disgust', 'thirst', 'kill',
  'fight', 'scam', 'photoshop', 'facetune', 'unfollow', 'creep', 'stalk',
];

const NEGATIVE_SYMBOLS: readonly string[] = [
  '💀', '🤡', '🙄', '🥱', '😬', '🤢', '🤮', '👎', '🗑', '😒', '😑', '🖕', '💩', '🐍', '🧢', '😏', '🥵', '👅', '🍑', '🍆',
];

/** Every marker, for the tests. */
export const NEGATIVE_MARKERS: readonly string[] = [...NEGATIVE_WORDS, ...NEGATIVE_STEMS, ...NEGATIVE_SYMBOLS];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const WORD_RE = new RegExp(
  `(^|[^a-z0-9])(?:(?:${NEGATIVE_WORDS.map(escapeRe).join('|')})(?=$|[^a-z0-9])|(?:${NEGATIVE_STEMS.map(escapeRe).join('|')}))`
);

/** True when the text carries a negative word or emoji. */
export function hasNegative(text: string): boolean {
  const t = text.toLowerCase().replace(/[’‘]/g, "'");
  if (WORD_RE.test(t)) return true;
  return NEGATIVE_SYMBOLS.some((m) => t.includes(m));
}

/** Emoji anyone may add to a vetted line (a heart on the end, a crying-happy face). */
const SAFE_DECOR = /(?:❤️|❤|🥹|😍|🔥|✨|🙌|😭|🫶|💯|👏|💖|😂|🎉|🥳|🙏|️)/gu;

/**
 * A line reduced to its words: the same however someone typed it (lower or
 * upper case, "sooo", "!!", a heart on the end). Only those differences
 * vanish; any other word or emoji still has to match a vetted line.
 */
export function canon(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(SAFE_DECOR, ' ')
    .replace(/[!?.,~]+/g, ' ')
    .replace(/([a-z])\1+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

let approvedRes: RegExp[] | null = null;

/**
 * What each placeholder may stand for, in canon form: {thing} only the known
 * object words, {friend} an @handle, {n} a slide number, {loc} and {name}
 * plain words (no emoji). A placeholder never becomes a hole any text fits.
 * ({friend} sits after an @ in the lines, so it is the handle alone.)
 */
function holes(): Record<string, string> {
  const things = [...new Set(THING_WORDS.map(canon))].sort((a, b) => b.length - a.length).map(escapeRe).join('|');
  const words = "[\\p{L}\\p{N}][\\p{L}\\p{N} '&_-]{0,39}";
  return { thing: `(?:${things})`, friend: '[a-z0-9_]{1,30}(?: [a-z0-9_]{1,30})?', n: '[0-9]{1,2}', loc: words, name: words };
}

/** True when the text is one of the vetted lines (placeholders filled in, typed any way). */
export function isApproved(text: string): boolean {
  if (!approvedRes) {
    const h = holes();
    approvedRes = [...new Set(ALL_REAL_TEMPLATES.map(canon))].map(
      (t) => new RegExp(`^${escapeRe(t).replace(/\\\{(\w+)\\\}/g, (_m, k: string) => h[k] ?? '(?!)')}$`, 'u')
    );
  }
  const c = canon(text);
  return approvedRes.some((re) => re.test(c));
}

export interface ProtectCtx {
  /** Artists who like the player (never a rival): they sometimes comment too. */
  friends?: readonly { id: string; name: string; handle: string }[];
  /** Every rival's name: none of them may appear under a real photo. */
  rivalNames?: readonly string[];
}

/** The place a comment can name: the first part of what the player typed, if it is short. */
export function shortLocation(location: string | undefined): string | null {
  const first = (location ?? '').split(',')[0].trim();
  return first.length >= 2 && first.length <= 28 ? first : null;
}

/** One comment (and the replies under it) that may stay under a real photo. */
function safeReply(rep: ThreadReply, rivals: readonly string[]): boolean {
  // The artist's own words are theirs to write.
  if (rep.mine) return true;
  if (!SAFE_SIDES.has(rep.side)) return false;
  if (!isApproved(rep.content)) return false;
  if (hasNegative(rep.content) || hasNegative(rep.username) || hasNegative(rep.handle)) return false;
  const text = `${rep.content} ${rep.username} ${rep.handle}`.toLowerCase();
  return !rivals.some((n) => text.includes(n));
}

/**
 * The last word on any thread. Under a protected post only vetted, positive
 * lines from friendly sides survive, replies included; under anything else
 * it changes nothing.
 */
export function guardThread(post: SocialPost, replies: readonly ThreadReply[], ctx: ProtectCtx = {}): ThreadReply[] {
  if (!isProtected(post)) return [...replies];
  const rivals = (ctx.rivalNames ?? []).map((n) => n.toLowerCase()).filter((n) => n.length > 1);
  const keep = (list: readonly ThreadReply[]): ThreadReply[] =>
    list
      .filter((rep) => safeReply(rep, rivals))
      .map((rep) => (rep.children && rep.children.length > 0 ? { ...rep, children: keep(rep.children) } : rep));
  return keep(replies);
}
