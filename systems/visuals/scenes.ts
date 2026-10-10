import type { PostSentiment, SocialPost } from '../../types/social';
import { hashOf, photoByKey, pickPhoto, pickPhotos, postPhotoKeys, type Orientation, type PhotoTag, type StockPhoto } from './photoIndex';
import { faceFor, peopleByKey, reactionFace, rivalPhoto, scenePhoto, type Gender } from './people';
import { regularById } from '../../data/social/everyday/accounts';

/**
 * WHAT A POST LOOKS LIKE.
 *
 * The sim describes a post's media in words ("fancam of X hitting the run
 * live"). This turns those words into real pictures from the photo pack: a
 * single photo, a carousel, or one of the formats people actually post on
 * these apps (a screenshot circled in red, a then-vs-now split, a gossip-page
 * headline card, a song shared to a story). Pure and deterministic: the same
 * post always gets the same pictures.
 */

export type MediaPlan =
  | { kind: 'photo'; photos: StockPhoto[] }
  /** The artist's own release: the real cover art. */
  | { kind: 'cover'; trackId: string; title: string }
  /** A song shared to a story or feed: cover art on a blurred backdrop. */
  | { kind: 'nowPlaying'; title: string; photo: StockPhoto }
  | { kind: 'circled'; photo: StockPhoto }
  | { kind: 'split'; left: StockPhoto; right: StockPhoto; labels: readonly [string, string]; caption: string }
  | { kind: 'receipts'; photo: StockPhoto }
  | { kind: 'poster'; photo: StockPhoto }
  /** A text post as a gossip-page card: photo, bold headline, page logo. */
  | { kind: 'headline'; photo: StockPhoto; text: string }
  /** A meme: a reaction face with captions over it. */
  | { kind: 'meme'; photo: StockPhoto; top?: string; bottom?: string }
  /** A screenshot of someone else's post (the internet's favorite format). */
  | { kind: 'tweet'; name: string; handle: string; verified: boolean; text: string; accountId: string };

/** Keyword to scene. First match wins, so the specific rules come first. */
const RULES: readonly (readonly [RegExp, readonly PhotoTag[]])[] = [
  [/dance challenge|choreo|dancing|\bdance\b/i, ['dance', 'friends']],
  [/private jet|\bjet\b|flight|airport|plane/i, ['jet', 'flex']],
  [/yacht|\bboat\b|marina|international waters/i, ['yacht', 'beach', 'flex']],
  [/mansion|penthouse|new (?:house|home|place|crib)|\bestate\b|compound|apartment|moved in|house tour|\bcrib\b/i, ['home', 'flex']],
  [/rolex|patek|audemars|wristwatch|\bnew watch\b|on (?:my|the|his|her) wrist/i, ['watch', 'jewelry', 'flex']],
  [/supercar|hypercar|\bwhip\b|lambo|ferrari|doors go up/i, ['car', 'drive', 'flex']],
  [/\bdog\b|\bcat\b|puppy|kitten|\bpet\b/i, ['pets']],
  [/beach|vacation|island|holiday|getaway/i, ['beach', 'travel', 'sky']],
  [/\bgym\b|workout|lifting/i, ['fit']],
  [/brunch|\bfood\b|eating|restaurant|takeout|\bdinner\b/i, ['food', 'nightlife']],
  [/tour bus/i, ['tourbus', 'moody']],
  [/rooftop|golden hour/i, ['rooftop', 'city', 'sky']],
  [/listening party|vinyl|record store|turntable/i, ['vinyl', 'party']],
  [/hugging a fan|fan who is|crying|sobbing/i, ['fans', 'crowd', 'love']],
  [/mirror selfie|chain|drip|outfit|\bfit\b|fashion|red carpet/i, ['fashion', 'jewelry', 'flex']],
  [/paparazzi|leaving a building|head down/i, ['street', 'moody', 'city']],
  [/contract|\bdeal\b|signed|table read|in talks/i, ['contract', 'paper']],
  [/sunset drive|in the car|\bcar\b|\bdrive\b/i, ['drive', 'car']],
  [/studio|notebook|hood up|b-roll|melody|wrote|writing/i, ['studio', 'lyrics', 'mic']],
  [/rain|slowed \+ reverb|window/i, ['rain', 'moody']],
  [/\bclub\b|friday|party|confetti/i, ['party', 'nightlife']],
  [/fancam|crowd|\blive\b|stage|concert|\btour\b|the run|high note|erupts/i, ['stage', 'crowd']],
  [/\bmic\b|eyes closed|interview/i, ['mic', 'stage']],
  [/chart|numbers|streams|#1/i, ['crowd', 'stage']],
  [/money|\bbag\b|financial|bought|\$/i, ['money', 'flex']],
  [/\bmom\b|therapist|explaining/i, ['lifestyle', 'pets']],
];

const MOOD_TAGS: Record<PostSentiment, readonly PhotoTag[]> = {
  hype: ['stage', 'crowd', 'party'],
  positive: ['stage', 'studio', 'crowd'],
  meme: ['party', 'pets', 'lifestyle'],
  neutral: ['city', 'moody', 'phone'],
  news: ['press', 'stage', 'city'],
  critical: ['moody', 'press', 'street'],
  shade: ['moody', 'press', 'street'],
  hostile: ['moody', 'rain', 'press'],
};

/** The scene a piece of text is about, falling back to its mood. */
export function sceneTags(text: string, sentiment: PostSentiment): PhotoTag[] {
  for (const [re, tags] of RULES) if (re.test(text)) return [...tags, ...MOOD_TAGS[sentiment]];
  return [...MOOD_TAGS[sentiment]];
}

/** The quoted title in a media line (cover art for "Title"), if any. */
export function quotedTitle(text: string): string {
  return text.match(/["“]([^"”]+)["”]/)?.[1] ?? '';
}

/** The track behind one of the artist's own posts (`me-<platform>-<trackId>`). */
export function ownTrackId(post: SocialPost): string | null {
  const m = post.id.match(/^me-[a-z]+-(.+)$/);
  return m ? m[1] : null;
}

export interface PlanOpts {
  /** The shape the surface prefers (feed photos are portrait, banners wide). */
  orientation?: Orientation;
  /** Text posts may become a headline card (VibeGram) or stay text (Chirp). */
  textCards?: boolean;
}

/** Descriptions that are about PEOPLE: these come from the people pack when it has them. */
const PEOPLE_RULES: readonly (readonly [RegExp, readonly string[]])[] = [
  [/candlelit dinner|leaving dinner|holding hands|getting into a car/i, ['dinner-paparazzi', 'paparazzi-hoodie']],
  [/paparazzi|in sunglasses|head down|leaving a building/i, ['paparazzi-hoodie', 'security']],
  [/red carpet/i, ['red-carpet-back']],
  [/community kitchen|volunteer/i, ['charity-food', 'charity-boxes']],
  [/donation|packing/i, ['charity-boxes', 'charity-food']],
  [/free show in the park|whole block/i, ['charity-event']],
  [/fan crying|crying in the front row|crying/i, ['concert-cry', 'concert-scream']],
  [/crowd losing it|phones up|fancam|crowd screams|front row/i, ['concert-scream', 'concert-phones']],
  [/argument|security|escorted|chaotic/i, ['argument', 'security']],
  [/dance challenge|dancing/i, ['dance-party']],
  [/friends|group chat|girls night|the squad/i, ['friends-selfie', 'girls-night', 'boys-night']],
  [/couple|soft.launch|date night/i, ['couple-selfie', 'dinner-paparazzi']],
  [/on stage, arms out|whole arena|arena lit|on stage with a mic|on stage, close-up/i, ['stage-back']],
  [/studio, hood up|recording booth/i, ['studio-silhouette']],
];

function peopleScene(text: string, seed: string): StockPhoto | null {
  for (const [re, scenes] of PEOPLE_RULES) {
    if (re.test(text)) {
      const p = scenePhoto(scenes, seed);
      if (p) return p;
    }
  }
  return null;
}

/**
 * A generated post's photo reference: `rival:<id>:<shot>` (a named artist's
 * own photo), `face:<accountId>` (the face that account uses as its avatar),
 * or a people-pack scene name.
 */
function sceneRef(scene: string, seed: string): StockPhoto | null {
  if (scene.startsWith('rival:')) {
    const [, id, shot] = scene.split(':');
    return rivalPhoto(id, shot === 'stage' ? 'stage' : 'portrait');
  }
  if (scene.startsWith('face:')) {
    const acct = scene.slice(5);
    return faceFor(acct, acct.startsWith('npc-w-') ? 'woman' : acct.startsWith('npc-m-') ? 'man' : undefined);
  }
  return scenePhoto([scene], seed);
}

/** The picture(s) a post carries, or null for a plain text post. */
export function planPostMedia(post: SocialPost, opts: PlanOpts = {}): MediaPlan | null {
  const d = post.media?.description ?? '';
  const seed = post.id;
  const orientation = opts.orientation ?? 'any';
  const own = ownTrackId(post);

  if (post.meme) {
    if (post.meme.format === 'tweet') {
      return {
        kind: 'tweet',
        name: post.meme.name ?? 'someone',
        handle: post.meme.handle ?? 'someone',
        verified: !!post.meme.verified,
        text: post.meme.top ?? post.content,
        accountId: `c-${hashOf(seed) % 2 === 0 ? 'w' : 'm'}-${post.meme.handle ?? 'someone'}`,
      };
    }
    const face = reactionFace(post.meme.reaction, seed) ?? pickPhoto(['moody', 'phone', 'lifestyle'], `${seed}:meme`);
    return { kind: 'meme', photo: face, top: post.meme.top, bottom: post.meme.bottom };
  }

  if (own && /cover art/i.test(d)) return { kind: 'cover', trackId: own, title: quotedTitle(d) };
  // Photos the artist picked from their camera roll (their real ones included).
  const picked = postPhotoKeys(post.media)
    .map(photoByKey)
    .filter((p): p is StockPhoto => p !== null);
  if (picked.length > 0) return { kind: 'photo', photos: picked };
  // A real photo that is no longer on this phone is never swapped for a stranger's.
  if (post.media?.real) return null;
  // Posts from the generators say what their photo shows.
  if (post.media?.scene) {
    const p = sceneRef(post.media.scene, seed);
    if (p) return { kind: 'photo', photos: [p] };
  }
  if (post.media?.tags && post.media.tags.length > 0) {
    const tags = post.media.tags as PhotoTag[];
    const dump = post.media.kind === 'image' && hashOf(`${seed}:dump`) % 4 === 0;
    return { kind: 'photo', photos: pickPhotos(tags, seed, dump ? 2 + (hashOf(seed) % 2) : 1, { orientation }) };
  }
  if (/story repost|phone screen/i.test(d)) {
    return { kind: 'nowPlaying', title: quotedTitle(d), photo: pickPhoto(['texture', 'night'], seed) };
  }
  if (/circled in red/i.test(d)) {
    return { kind: 'circled', photo: pickPhoto(['stage', 'mic', 'press'], seed, { orientation }) };
  }
  if (/then vs now|side-by-side/i.test(d)) {
    return {
      kind: 'split',
      left: pickPhoto(['stage', 'crowd'], `${seed}:then`, { orientation: 'portrait' }),
      right: pickPhoto(['moody', 'rain'], `${seed}:now`, { orientation: 'portrait' }),
      labels: ['then', 'now'],
      caption: 'what happened',
    };
  }
  if (/receipts|cracked-glass/i.test(d)) return { kind: 'receipts', photo: pickPhoto(['moody', 'night'], seed) };
  if (/empty venue|tour poster/i.test(d)) return { kind: 'poster', photo: pickPhoto(['empty', 'venue'], seed) };
  if (/carousel/i.test(d)) {
    const a = pickPhoto(['vinyl'], `${seed}:a`, { orientation });
    const b = pickPhoto(['party', 'nightlife'], `${seed}:b`, { orientation, avoid: new Set([a.key]) });
    const c = pickPhoto(['friends', 'crowd', 'love'], `${seed}:c`, { orientation, avoid: new Set([a.key, b.key]) });
    return { kind: 'photo', photos: [a, b, c] };
  }

  if (post.media) {
    const person = peopleScene(d, seed);
    if (person) return { kind: 'photo', photos: [person] };
    const tags = sceneTags(`${d} ${post.content}`, post.sentiment);
    // Some posts are photo dumps: a few frames of the same scene.
    const dump = post.media.kind === 'image' && hashOf(`${seed}:dump`) % 4 === 0;
    return { kind: 'photo', photos: pickPhotos(tags, seed, dump ? 2 + (hashOf(seed) % 3) : 1, { orientation }) };
  }

  if (opts.textCards) {
    return {
      kind: 'headline',
      photo: pickPhoto(sceneTags(post.content, post.sentiment), seed, { orientation }),
      text: post.content,
    };
  }
  return null;
}

/** A news story's lead photo: what the headline is about. */
export function newsPhoto(post: SocialPost, orientation: Orientation = 'landscape'): StockPhoto {
  if (post.media?.tags && post.media.tags.length > 0) return pickPhoto(post.media.tags as PhotoTag[], `${post.id}:news`, { orientation });
  const text = `${post.media?.description ?? ''} ${post.content}`;
  return pickPhoto(sceneTags(text, post.sentiment), `${post.id}:news`, { orientation });
}

// --- Avatars ----------------------------------------------------------------

export type AvatarPlan =
  | { kind: 'photo'; photo: StockPhoto }
  | { kind: 'logo'; text: string; bg: string; fg: string }
  | { kind: 'letter'; letter: string; bg: string }
  | { kind: 'default' };

/** Real outlets and pages have real logos; these are ours. */
const LOGOS: Record<string, { text: string; bg: string; fg: string }> = {
  'news-1': { text: 'RAP\nDAILY', bg: '#0A0A0A', fg: '#FFD60A' },
  'news-2': { text: 'POP\nWIRE', bg: '#FF2E63', fg: '#FFFFFF' },
  'news-3': { text: 'MN', bg: '#101820', fg: '#2EE6D6' },
  'industry-1': { text: 'CW', bg: '#0B1F3A', fg: '#FFFFFF' },
  'industry-2': { text: 'M', bg: '#121212', fg: '#E8C46A' },
  'industry-3': { text: 'SW', bg: '#E3294A', fg: '#FFFFFF' },
  'industry-4': { text: 'VS', bg: '#5B3FD8', fg: '#FFFFFF' },
  'gossip-1': { text: 'TEA', bg: '#FF5FA2', fg: '#FFFFFF' },
  'gossip-2': { text: 'II', bg: '#1C1C1E', fg: '#FFB347' },
  'gossip-3': { text: 'SPILL', bg: '#F2C94C', fg: '#111111' },
  'gossip-4': { text: 'UB', bg: '#FF4500', fg: '#FFFFFF' },
  'gossip-5': { text: 'BTB', bg: '#202020', fg: '#FFFFFF' },
};

const LOGO_COLORS: readonly (readonly [string, string])[] = [
  ['#0A0A0A', '#FFFFFF'],
  ['#E3294A', '#FFFFFF'],
  ['#1D4ED8', '#FFFFFF'],
  ['#F2C94C', '#111111'],
  ['#14532D', '#FFFFFF'],
];

const LETTER_COLORS = ['#7856FF', '#FF7A00', '#00A884', '#E0245E', '#1D9BF0', '#C2185B', '#5D4037', '#455A64'];

/** What casual people use as a profile picture. */
const CASUAL: readonly (readonly PhotoTag[])[] = [
  ['pets'],
  ['pets'],
  ['sky', 'beach', 'travel'],
  ['fashion', 'sneakers'],
  ['aesthetic', 'texture'],
  ['coffee', 'food'],
  ['city', 'night'],
  ['car', 'drive'],
  ['music', 'headphones'],
  ['love', 'moody'],
];

function initials(name: string): string {
  const words = name
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function casual(seed: string, name: string): AvatarPlan {
  const h = hashOf(seed);
  if (h % 9 === 0) return { kind: 'default' };
  if (h % 9 === 1) {
    return {
      kind: 'letter',
      letter: (name.trim()[0] ?? '?').toUpperCase(),
      bg: LETTER_COLORS[(h >>> 4) % LETTER_COLORS.length],
    };
  }
  return { kind: 'photo', photo: pickPhoto(CASUAL[(h >>> 3) % CASUAL.length], `avatar:${seed}`) };
}

/** Meme pages and brands have logos too. */
const EXTRA_LOGOS: Record<string, { text: string; bg: string; fg: string }> = {
  'public-4': { text: 'MEME\nDAILY', bg: '#111111', fg: '#FFE600' },
  'public-5': { text: 'UMT', bg: '#7C3AED', fg: '#FFFFFF' },
  'brand-luxora': { text: 'LX', bg: '#0F0F0F', fg: '#D4AF37' },
};

/** A stranger's profile picture: usually their face (by gender), sometimes not. */
function crowdAvatar(id: string, name: string, gender: Gender): AvatarPlan {
  const h = hashOf(`crowd-av:${id}`);
  const roll = h % 100;
  if (roll < 65) {
    const face = faceFor(id, gender);
    if (face) return { kind: 'photo', photo: face };
  }
  return casual(id, name);
}

/**
 * The profile picture for an account id. Outlets get a logo, stans use a
 * photo of the artist they stan, strangers mostly use their own face (one
 * that matches their name), and everyone else uses what people actually
 * use: their pet, a sunset, their sneakers, or the default they never changed.
 * A rival's account shows the rival.
 */
export function planAvatar(id: string, name: string): AvatarPlan {
  if (id === 'player') return { kind: 'photo', photo: pickPhoto(['player'], `player:${name}`) };
  const regular = regularById(id);
  if (regular) {
    const a = regular.avatar;
    if (a.kind === 'logo') return { kind: 'logo', text: a.text, bg: a.bg, fg: a.fg };
    if (a.kind === 'face') {
      const face = faceFor(id, a.gender);
      if (face) return { kind: 'photo', photo: face };
      return { kind: 'letter', letter: (name.trim()[0] ?? '?').toUpperCase(), bg: LETTER_COLORS[hashOf(id) % LETTER_COLORS.length] };
    }
    return { kind: 'photo', photo: pickPhoto(a.tags, `avatar:${id}`) };
  }
  const logo = LOGOS[id] ?? EXTRA_LOGOS[id];
  if (logo) return { kind: 'logo', ...logo };
  if (id.startsWith('c-w-')) return crowdAvatar(id, name, 'woman');
  if (id.startsWith('c-m-')) return crowdAvatar(id, name, 'man');
  // The world engine's artists: the face that matches their name (the same one their selfies show).
  if (id.startsWith('npc-')) {
    const face = faceFor(id, id.startsWith('npc-w-') ? 'woman' : 'man');
    if (face) return { kind: 'photo', photo: face };
    return { kind: 'letter', letter: (name.trim()[0] ?? '?').toUpperCase(), bg: LETTER_COLORS[hashOf(id) % LETTER_COLORS.length] };
  }
  // Fan accounts use a photo of the artist they stan.
  if (id.startsWith('cf-')) return planAvatar(id.slice(3).replace(/-\d+$/, ''), name);
  if (id.startsWith('artist-')) {
    const own = rivalPhoto(id.slice('artist-'.length));
    if (own) return { kind: 'photo', photo: own };
    return { kind: 'photo', photo: pickPhoto(['stage', 'mic'], `avatar:${id}`) };
  }
  if (id.startsWith('hater-')) {
    const face = reactionFace(hashOf(id) % 2 === 0 ? 'side-eye' : 'unimpressed', id);
    if (face) return { kind: 'photo', photo: face };
    return { kind: 'default' };
  }
  const direct = peopleByKey(id.startsWith('face:') ? id.slice(5) : null);
  if (direct) return { kind: 'photo', photo: direct };
  // News outlets, the game's and real publications (credited by name; no real logos).
  if (/^(news|industry|gossip|rw-src)-/.test(id)) {
    const [bg, fg] = LOGO_COLORS[hashOf(id) % LOGO_COLORS.length];
    return { kind: 'logo', text: initials(name), bg, fg };
  }
  if (id.startsWith('critic-')) {
    return { kind: 'photo', photo: pickPhoto(['vinyl', 'headphones', 'music'], `avatar:${id}`) };
  }
  if (id.startsWith('stan-')) return { kind: 'photo', photo: pickPhoto(['player', 'stage'], `avatar:${id}`) };
  if (id.startsWith('rival-fan-')) return { kind: 'photo', photo: pickPhoto(['stage', 'mic'], `avatar:${id}`) };
  return casual(id, name);
}
