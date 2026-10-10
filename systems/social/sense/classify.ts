import type { PhotoKind, PhotoRead } from '../../../types/social';

/**
 * WHAT IS IN THIS PHOTO? (pure)
 *
 * Turns what the phone saw (ML Kit labels, face boxes, how much text sits
 * on the picture), the file's details (a screenshot, a WhatsApp save, a
 * camera shot) and the caption into one reading: a selfie, a couple, the
 * squad, a dog, food, a car, a house, a watch, a meme, a screenshot... The
 * comment sections use it so a pet gets pet comments and a meme gets meme
 * comments. Nothing here sees the picture itself, only those signals.
 */

export interface PhotoSignals {
  labels?: readonly { text: string; confidence: number }[] | null;
  faces?: readonly { x: number; y: number; w: number; h: number; smile?: number | null }[] | null;
  text?: { chars: number; lines: number; blocks: number; coverage: number; top: number; bottom: number } | null;
  /** Details of the file on the phone. */
  file?: {
    name?: string;
    folder?: string;
    w?: number;
    h?: number;
    /** EXIF says a camera took it. */
    camera?: boolean;
    /** EXIF says the front camera. */
    front?: boolean;
  };
}

type Hit = readonly [PhotoKind, number, string?];

/** ML Kit's labels (lower case) -> what they say about the post, with a weight and the word for it. */
const LABELS: Record<string, readonly Hit[]> = {};
function lab(names: string | readonly string[], ...hits: Hit[]): void {
  for (const n of typeof names === 'string' ? [names] : names) LABELS[n] = [...(LABELS[n] ?? []), ...hits];
}

// People
lab('selfie', ['selfie', 3]);
lab(['smile', 'laugh'], ['selfie', 0.5]);
lab(['beard', 'moustache', 'eyelash', 'bangs', 'hair'], ['selfie', 0.7]);
lab(['dude', 'person', 'cool', 'model'], ['selfie', 0.4], ['fit', 0.4]);
lab('love', ['duo', 1.4]);
lab('interaction', ['duo', 0.6], ['group', 0.4]);
lab(['team', 'crew'], ['group', 1.5]);
lab('community', ['group', 1.2]);
lab('grandparent', ['group', 1.2, 'family']);
lab('baby', ['baby', 3.6, 'baby']);
// Pets
lab('dog', ['pet', 3.2, 'dog']);
lab(['shetland sheepdog', 'dalmatian', 'cairn terrier', 'basset hound', 'shikoku', 'cavalier'], ['pet', 3.2, 'dog']);
lab('cat', ['pet', 3.2, 'cat']);
lab(['himalayan', 'ragdoll', 'sphynx', 'pixie-bob'], ['pet', 3.2, 'cat']);
lab('pet', ['pet', 2.6]);
lab('fur', ['pet', 0.8]);
lab('bird', ['pet', 1.6, 'bird']);
lab('horse', ['pet', 1.6, 'horse']);
lab(['gerbil'], ['pet', 2.6, 'hamster']);
lab('turtle', ['pet', 1.6, 'turtle']);
lab('aquarium', ['pet', 1.4, 'fish']);
// Food and drink
lab(['food', 'cuisine', 'meal'], ['food', 2.6]);
lab(['lunch', 'supper'], ['food', 2.4]);
lab('pizza', ['food', 3.2, 'pizza']);
lab('sushi', ['food', 3.2, 'sushi']);
lab(['cheeseburger', 'fast food'], ['food', 3, 'burger']);
lab('hot dog', ['food', 3, 'hot dog']);
lab(['bento', 'pho', 'couscous', 'pasteles'], ['food', 3]);
lab('cake', ['food', 2.6, 'cake'], ['milestone', 0.6]);
lab(['cookie', 'pie', 'icing'], ['food', 2.4, 'dessert']);
lab('gelato', ['food', 2.8, 'ice cream']);
lab(['bread'], ['food', 2.2, 'bread']);
lab(['fruit', 'vegetable'], ['food', 2]);
lab(['eating', 'tableware', 'cookware and bakeware', 'saucer'], ['food', 1.4]);
lab(['cutlery', 'tablecloth', 'placemat', 'centrepiece', 'steaming'], ['food', 0.9]);
lab(['coffee', 'cappuccino'], ['food', 2.8, 'coffee']);
lab('juice', ['food', 2.4, 'juice']);
lab('wine', ['food', 2.2, 'wine']);
lab(['alcohol', 'cola'], ['food', 1.6, 'drinks']);
lab('cup', ['food', 0.8]);
lab('menu', ['food', 1.6, 'menu']);
// Rides
lab('car', ['ride', 3.2, 'car']);
lab(['bumper', 'odometer'], ['ride', 2.2, 'car']);
lab(['vehicle', 'windshield'], ['ride', 1.8, 'car']);
lab(['wheel', 'tire'], ['ride', 1.4, 'car']);
lab('motorcycle', ['ride', 3.2, 'bike']);
lab('bicycle', ['ride', 1.6, 'bike'], ['active', 0.6]);
lab('van', ['ride', 1.4, 'van']);
// Travel
lab(['airplane', 'airliner'], ['travel', 2.8, 'plane']);
lab(['aircraft', 'aviation'], ['travel', 2, 'plane']);
lab('helicopter', ['travel', 2.4, 'helicopter']);
lab('passport', ['travel', 3.4, 'passport']);
lab(['vacation', 'safari', 'backpacking'], ['travel', 2]);
lab('camping', ['travel', 1.4, 'camping'], ['scenery', 0.8]);
lab(['speedboat', 'sailboat'], ['travel', 2.6, 'boat']);
lab(['boat', 'clipper', 'brig', 'skiff', 'frigate'], ['travel', 1.6, 'boat']);
lab('train', ['travel', 1.6, 'train']);
lab(['museum', 'monument', 'ruins', 'castle', 'palace', 'lighthouse', 'ferris wheel'], ['travel', 1.5], ['city', 0.8]);
lab('pier', ['travel', 0.8], ['scenery', 0.8]);
// Home
lab(['room', 'bedroom'], ['home', 2.4, 'room']);
lab('kitchen', ['home', 2.6, 'kitchen']);
lab('bathroom', ['home', 2.2, 'bathroom']);
lab(['couch', 'loveseat'], ['home', 2, 'living room']);
lab(['countertop', 'cabinetry'], ['home', 1.8, 'kitchen']);
lab('pool', ['home', 2, 'pool']);
lab(['bunk bed', 'cushion', 'pillow', 'lampshade', 'curtain', 'sink', 'armrest', 'drawer', 'shelf'], ['home', 1.1]);
lab(['stairs', 'chair', 'flowerpot'], ['home', 0.6]);
lab(['roof', 'ranch'], ['home', 1.4, 'house']);
lab('building', ['home', 0.8, 'house'], ['city', 0.8]);
// Drip
lab('jewellery', ['drip', 3, 'jewelry']);
lab('necklace', ['drip', 3, 'necklace']);
lab(['bracelet', 'bangle'], ['drip', 3, 'bracelet']);
lab('ring', ['drip', 2.4, 'ring']);
lab('chain', ['drip', 2, 'chain']);
lab('sunglasses', ['drip', 2, 'shades']);
lab('glasses', ['drip', 0.8]);
lab('handbag', ['drip', 3.2, 'bag']);
lab('bag', ['drip', 1.6, 'bag']);
lab('clock', ['drip', 1.4, 'watch']);
lab(['strap', 'leather'], ['drip', 0.8]);
lab('sneakers', ['drip', 3.2, 'sneakers']);
lab('shoe', ['drip', 2, 'shoes']);
lab(['hat', 'cap', 'beanie', 'scarf', 'tie'], ['drip', 0.8], ['fit', 0.6]);
lab(['lipstick'], ['drip', 1.6, 'makeup']);
lab('nail', ['drip', 1.6, 'nails']);
// Outfits
lab(['gown', 'tuxedo', 'sari'], ['fit', 2.6, 'outfit']);
lab(['dress', 'blazer'], ['fit', 2, 'outfit']);
lab(['jacket', 'jeans', 'outerwear', 'leggings', 'denim'], ['fit', 1.4, 'outfit']);
lab(['shorts', 'tights', 'polo', 'pocket', 'mufti', 'standing'], ['fit', 0.8]);
lab('swimwear', ['fit', 1, 'swimwear'], ['scenery', 0.8, 'beach']);
lab('jersey', ['fit', 0.8], ['active', 1.2]);
// Money
lab('money', ['money', 3.4, 'cash']);
// Scenery
lab('sunset', ['scenery', 2.8, 'sunset']);
lab('beach', ['scenery', 2.8, 'beach']);
lab(['mountain', 'cliff', 'canyon', 'glacier', 'volcano', 'iceberg'], ['scenery', 2.6, 'view']);
lab(['lake', 'waterfall', 'river'], ['scenery', 2.4, 'view']);
lab(['forest', 'jungle', 'desert', 'dune', 'prairie', 'swamp'], ['scenery', 2.2, 'view']);
lab('rainbow', ['scenery', 2.8, 'rainbow']);
lab('aurora', ['scenery', 3.2, 'northern lights']);
lab('moon', ['scenery', 2.2, 'moon']);
lab(['nebula', 'comet', 'star', 'space'], ['scenery', 1.6, 'night sky']);
lab(['lightning', 'storm', 'fog'], ['scenery', 1.6, 'sky']);
lab('sky', ['scenery', 1.3, 'sky']);
lab(['flower', 'petal'], ['scenery', 2.6, 'flowers']);
lab(['garden', 'flora', 'plant'], ['scenery', 1.8, 'plants']);
lab(['park', 'field', 'sand', 'farm', 'branch', 'twig', 'rock'], ['scenery', 0.9]);
lab(['underwater', 'reef', 'scuba diving', 'snorkeling'], ['scenery', 2.4, 'ocean'], ['travel', 0.8]);
lab(['butterfly'], ['scenery', 1.8, 'butterfly']);
lab(['cattle', 'herd', 'bull', 'insect', 'ice', 'icicle'], ['scenery', 0.8]);
// City
lab(['skyline', 'skyscraper'], ['city', 2.8, 'skyline']);
lab(['tower', 'bridge'], ['city', 1.6]);
lab(['cathedral', 'temple', 'church', 'mosque'], ['city', 1.4, 'architecture'], ['travel', 0.8]);
lab(['road', 'asphalt', 'infrastructure', 'handrail'], ['city', 0.8]);
lab('neon', ['city', 1.2, 'lights'], ['party', 0.8]);
// Party and holidays
lab(['party', 'nightclub'], ['party', 2.6]);
lab('prom', ['party', 2.8, 'prom'], ['fit', 0.8]);
lab(['event', 'carnival', 'circus'], ['party', 1.6]);
lab('fireworks', ['party', 2.8, 'fireworks']);
lab(['balloon', 'sparkler', 'glitter'], ['party', 1.8], ['milestone', 0.4]);
lab(['christmas', 'santa claus', 'wreath'], ['party', 2.4, 'christmas']);
lab(['thanksgiving', 'hanukkah'], ['party', 2.2, 'holidays']);
lab(['bar', 'casino'], ['party', 1.4]);
lab(['dance', 'ballroom'], ['party', 1.4], ['music', 0.6]);
lab(['bonfire', 'picnic'], ['party', 1.8]);
lab('fun', ['party', 0.6], ['group', 0.4]);
lab('crowd', ['party', 1.2], ['music', 1]);
// Music
lab('concert', ['music', 2.8, 'concert']);
lab(['musical instrument'], ['music', 2.6, 'instrument']);
lab('piano', ['music', 2.8, 'piano']);
lab('deejay', ['music', 2.8, 'decks']);
lab(['musician', 'singer'], ['music', 2]);
lab(['pop music', 'song', 'musical'], ['music', 1.4]);
lab('subwoofer', ['music', 1.4, 'speakers']);
// Active
lab(['muscle', 'gymnastics'], ['active', 2.2, 'gym']);
lab(['running', 'marathon', 'track'], ['active', 2.2, 'run']);
lab('cycling', ['active', 2.2, 'ride']);
lab(['sports', 'competition'], ['active', 1.8]);
lab(['soccer', 'rugby', 'pitch'], ['active', 2.6, 'football']);
lab('stadium', ['active', 2, 'stadium'], ['music', 0.6]);
lab(['badminton', 'softball', 'archery', 'curling'], ['active', 2.4]);
lab(['skiing', 'snowboarding', 'sledding', 'sled'], ['active', 2.2, 'slopes'], ['scenery', 0.8]);
lab(['skateboard', 'skateboarder', 'longboard', 'roller', 'unicycle'], ['active', 2.2, 'skate']);
lab(['surfing', 'surfboard', 'windsurfing', 'wakeboarding', 'waterskiing', 'kayak', 'canoe', 'rowing', 'rafting', 'tubing', 'swimming'], ['active', 1.8], ['scenery', 0.8]);
lab(['helmet', 'net', 'racing', 'race'], ['active', 1]);
// Art, crafts, toys
lab(['watercolor paint'], ['art', 3, 'painting']);
lab(['crochet', 'knitting', 'needlework', 'quilting', 'doily', 'wool'], ['art', 2.6, 'craft']);
lab('lego', ['art', 2.8, 'lego']);
lab('tattoo', ['art', 2.8, 'tattoo']);
lab(['statue', 'porcelain', 'miniature', 'pattern'], ['art', 1.4]);
lab(['toy', 'stuffed toy', 'plush'], ['art', 1.6, 'toy']);
lab(['dinosaur', 'dragon'], ['art', 0.8]);
lab(['superhero', 'superman', 'supervillain', 'joker'], ['meme', 1], ['art', 0.6]);
// Memes and screenshots
lab('comics', ['meme', 2.6]);
lab(['poster', 'fiction', 'icon'], ['meme', 1]);
lab('screenshot', ['screenshot', 3]);
lab('web page', ['screenshot', 3]);
lab('receipt', ['screenshot', 2.6, 'receipt']);
lab(['news', 'newspaper'], ['screenshot', 1.4]);
lab(['paper', 'whiteboard', 'blackboard', 'presentation'], ['screenshot', 1]);
// Milestones
lab(['graduation', 'mortarboard'], ['milestone', 3.6, 'graduation']);
lab(['bride', 'groom', 'marriage', 'veil'], ['milestone', 3.2, 'wedding']);
// Tech
lab('computer', ['tech', 2.2, 'setup']);
lab('mobile phone', ['tech', 2, 'phone']);
lab('television', ['tech', 1.6, 'tv']);
lab('desk', ['tech', 0.8], ['home', 0.4]);
lab(['rocket', 'aerospace engineering'], ['tech', 1.2], ['scenery', 0.6]);

/** Caption words that say what the photo is (weighed more when the phone couldn't look). */
const CAPTION_HINTS: readonly (readonly [RegExp, PhotoKind, number, string?])[] = [
  [/\b(my|our|the) (dog|doggo|pup|puppy|boy|baby boy|girl) is\b|\b(dog|doggo|puppy|pup)\b/, 'pet', 2.4, 'dog'],
  [/\b(cat|kitty|kitten)\b/, 'pet', 2.4, 'cat'],
  [/\bpets?\b|\bfur ?baby\b/, 'pet', 2],
  [/\b(newborn|my baby|our baby|my son|my daughter|little one)\b/, 'baby', 2.2, 'baby'],
  [/\b(food|dinner|lunch|breakfast|brunch|dessert|cooked|cooking|chef|recipe|foodie|yum|delicious)\b/, 'food', 2],
  [/\b(coffee|latte|matcha)\b/, 'food', 2, 'coffee'],
  [/\b(pizza|sushi|burger|pasta|jollof|suya|tacos|ramen|steak|wings)\b/, 'food', 2.4],
  [/\b(new (car|whip|ride)|whip|my car|g-wagon|benz|lambo|ferrari|porsche|tesla|bmw|range rover)\b/, 'ride', 2.4, 'car'],
  [/\b(new (house|home|crib|place|apartment|flat)|keys|moved in|house ?warming|my crib)\b/, 'home', 2.4, 'house'],
  [/\b(watch|rolex|patek|audemars|ap)\b/, 'drip', 2.2, 'watch'],
  [/\b(chain|iced out|jewelry|jewellery|necklace|earrings|bracelet|ring)\b/, 'drip', 2, 'jewelry'],
  [/\b(bag|birkin|purse|handbag)\b/, 'drip', 1.8, 'bag'],
  [/\b(kicks|sneakers|jordans|yeezys|trainers|new shoes)\b/, 'drip', 2.2, 'sneakers'],
  [/\b(ootd|outfit|fit check|fitcheck|the fit|drip|dressed)\b/, 'fit', 2.2, 'outfit'],
  [/\b(selfie|face card|me again|new pfp|pfp)\b/, 'selfie', 2.2],
  [/\b(bae|my love|my person|anniversary|date night|wifey|hubby|my man|my girl)\b/, 'duo', 2.2],
  [/\b(squad|the gang|my friends|besties|the girls|the boys|crew|homies)\b/, 'group', 2.2],
  [/\b(gym|workout|leg day|lifting|run club|5k|10k|marathon|training)\b/, 'active', 2.2, 'gym'],
  [/\b(studio|new music|session|recording|on stage|show tonight|concert)\b/, 'music', 1.8],
  [/\b(sunset|sunrise|view|beach|ocean|mountains|nature|sky)\b/, 'scenery', 1.8],
  [/\b(vacation|vacay|trip|travel|airport|flight|passport|getaway)\b/, 'travel', 1.8],
  [/\b(party|turn up|club|night out|lit)\b/, 'party', 1.6],
  [/\b(graduated|graduation|grad|degree|class of)\b/, 'milestone', 2.6, 'graduation'],
  [/\b(wedding|married|engaged|bride|groom)\b/, 'milestone', 2.6, 'wedding'],
  [/(^|\s)(meme|me when|nobody:|pov|be like|lmao|lmfao)(?=\W)|💀|😂/, 'meme', 1.6],
  [/\b(screenshot|receipt|look at this|read this)\b/, 'screenshot', 1.4],
  [/\b(setup|new laptop|new phone|pc build|gaming)\b/, 'tech', 1.8, 'setup'],
  [/\b(cash|racks|bands|money)\b/, 'money', 1.6, 'cash'],
  [/\b(painting|drew|drawing|art|tattoo|crochet)\b/, 'art', 1.8],
];

export function captionHints(caption: string): { kind: PhotoKind; weight: number; thing?: string }[] {
  const t = ` ${caption.toLowerCase().replace(/[’‘]/g, "'")} `;
  const out: { kind: PhotoKind; weight: number; thing?: string }[] = [];
  for (const [re, kind, weight, thing] of CAPTION_HINTS) if (re.test(t)) out.push({ kind, weight, thing });
  return out;
}

/** Saved-from-somewhere files (where memes come from): WhatsApp, Facebook, downloads, Twitter, Telegram... */
const SAVED_NAME = /^(img-\d{8}-wa\d+|fb_img|received_|snapchat-|pinterest|twitter|telegram|reddit|9gag|tiktok|ig_|instasave)/;
const SAVED_FOLDER = /(whatsapp|download|telegram|twitter|pinterest|reddit|messenger|facebook|instagram|snapchat|9gag|saved)/;
const SCREENSHOT = /(screenshot|screen_shot|screen shot|screencap|screen-capture)/;

interface Tally {
  score: Map<PhotoKind, number>;
  thing: Map<PhotoKind, { word: string; w: number }>;
}

function add(t: Tally, kind: PhotoKind, w: number, thing?: string): void {
  if (w === 0) return;
  t.score.set(kind, (t.score.get(kind) ?? 0) + w);
  if (thing && w > 0) {
    const cur = t.thing.get(kind);
    if (!cur || w > cur.w) t.thing.set(kind, { word: thing, w });
  }
}

/** Faces big enough to be a person in the picture (not a face on a poster in the back). */
function realFaces(faces: PhotoSignals['faces']): { n: number; largest: number; smallest: number } {
  const list = (faces ?? []).map((f) => Math.max(0, f.w) * Math.max(0, f.h)).filter((a) => a >= 0.004);
  if (list.length === 0) return { n: 0, largest: 0, smallest: 0 };
  return { n: list.length, largest: Math.max(...list), smallest: Math.min(...list) };
}

/**
 * The reading for one photo. `caption` is what the player wrote: it nudges
 * the vision, and carries the reading alone when the phone couldn't look.
 */
export function readPhoto(sig: PhotoSignals, caption = ''): PhotoRead {
  const t: Tally = { score: new Map(), thing: new Map() };
  const looked = Array.isArray(sig.labels) || Array.isArray(sig.faces) || !!sig.text;
  let usedMeta = false;

  for (const l of sig.labels ?? []) {
    const hits = LABELS[l.text.toLowerCase()];
    if (!hits) continue;
    const c = Math.max(0, Math.min(1, l.confidence));
    for (const [kind, w, thing] of hits) add(t, kind, w * c, thing);
  }

  const faces = realFaces(sig.faces);
  if (faces.n === 1) {
    if (faces.largest >= 0.08) add(t, 'selfie', 3.2);
    else if (faces.largest >= 0.025) {
      add(t, 'selfie', 1.5);
      add(t, 'fit', 1.2, 'outfit');
    } else add(t, 'fit', 0.6);
  } else if (faces.n === 2) {
    add(t, 'duo', faces.smallest >= 0.006 ? 3 : 1.8);
  } else if (faces.n >= 3) {
    add(t, 'group', 2.6 + Math.min(1.5, (faces.n - 3) * 0.3));
  }

  const tx = sig.text;
  const camera = sig.file?.camera;
  if (tx && tx.chars >= 6) {
    const memeLayout = tx.top + tx.bottom >= 0.6 && tx.lines <= 8;
    if (tx.coverage >= 0.22 || tx.chars >= 140) add(t, 'screenshot', 3);
    if (memeLayout && tx.chars >= 10 && tx.chars <= 180) add(t, 'meme', 2.6);
    else if (tx.chars >= 20) {
      add(t, 'meme', 0.8);
      add(t, 'screenshot', 1);
    }
  }

  const name = (sig.file?.name ?? '').toLowerCase();
  const folder = (sig.file?.folder ?? '').toLowerCase();
  if (SCREENSHOT.test(name) || SCREENSHOT.test(folder)) {
    add(t, 'screenshot', 3.4);
    usedMeta = true;
  }
  const saved = SAVED_NAME.test(name) || SAVED_FOLDER.test(folder);
  if (saved) {
    add(t, 'meme', tx && tx.chars >= 10 ? 2 : 0.8);
    usedMeta = true;
  }
  if (sig.file?.front) {
    add(t, 'selfie', 2);
    usedMeta = true;
  }
  if (camera === true) {
    // A sign or a T-shirt in a real photo doesn't make it a meme.
    add(t, 'meme', -2.6);
    add(t, 'screenshot', -3);
    usedMeta = true;
  }
  const w = sig.file?.w ?? 0;
  const h = sig.file?.h ?? 0;
  if (camera !== true && w > 0 && h / w >= 1.95) add(t, 'screenshot', 1);

  const hints = captionHints(caption);
  const hintWeight = looked ? 0.6 : 1.2;
  for (const hnt of hints) add(t, hnt.kind, hnt.weight * hintWeight, hnt.thing);

  const ranked = [...t.score.entries()].filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]);
  const via: PhotoRead['via'] = looked ? 'vision' : usedMeta ? 'meta' : hints.length > 0 ? 'caption' : 'none';
  const facesOut = Array.isArray(sig.faces) ? faces.n : undefined;
  if (ranked.length === 0 || ranked[0][1] < 1.4) {
    return { kind: 'other', faces: facesOut, confidence: 0.1, via };
  }

  let [kind, top] = ranked[0];
  const score = (k: PhotoKind) => t.score.get(k) ?? 0;
  const people: readonly PhotoKind[] = ['selfie', 'fit', 'duo', 'group'];
  // A pet in the shot steals the show; a baby too.
  if (people.includes(kind) && score('pet') >= 2.2) {
    kind = 'pet';
    top = score('pet');
  } else if (people.includes(kind) && score('baby') >= 2) {
    kind = 'baby';
    top = score('baby');
  } else if (kind === 'selfie' && score('fit') >= 2.4 && faces.largest < 0.08) {
    kind = 'fit';
    top = score('fit');
  }
  const second = ranked.find(([k]) => k !== kind)?.[1] ?? 0;
  const also = ranked
    .filter(([k, s]) => k !== kind && s >= Math.max(2, top * 0.55))
    .slice(0, 2)
    .map(([k]) => k);
  const confidence = Math.max(0.15, Math.min(0.98, (top - second) / 3 + top / 8));
  return {
    kind,
    thing: t.thing.get(kind)?.word,
    faces: facesOut,
    also: also.length > 0 ? also : undefined,
    confidence: Math.round(confidence * 100) / 100,
    via,
  };
}

// --- The game's own photos ------------------------------------------------------

const STOCK: readonly (readonly [string, PhotoKind, string?])[] = [
  ['pets', 'pet'],
  ['food', 'food'],
  ['coffee', 'food', 'coffee'],
  ['car', 'ride', 'car'],
  ['drive', 'ride', 'car'],
  ['yacht', 'travel', 'yacht'],
  ['jet', 'travel', 'jet'],
  ['hotel', 'travel', 'hotel'],
  ['travel', 'travel'],
  ['home', 'home', 'house'],
  ['pool', 'home', 'pool'],
  ['watch', 'drip', 'watch'],
  ['jewelry', 'drip', 'jewelry'],
  ['sneakers', 'drip', 'sneakers'],
  ['money', 'money', 'cash'],
  ['fit', 'active', 'gym'],
  ['fashion', 'fit', 'outfit'],
  ['beach', 'scenery', 'beach'],
  ['sky', 'scenery', 'sky'],
  ['rooftop', 'city', 'rooftop'],
  ['city', 'city'],
  ['street', 'city'],
  ['nightlife', 'party'],
  ['party', 'party'],
  ['dance', 'party'],
  ['festival', 'party', 'festival'],
  ['studio', 'music', 'studio'],
  ['mic', 'music', 'mic'],
  ['vinyl', 'music', 'vinyl'],
  ['headphones', 'music'],
  ['dj', 'music', 'decks'],
  ['stage', 'music', 'stage'],
  ['venue', 'music'],
  ['crowd', 'music', 'crowd'],
  ['love', 'duo'],
  ['friends', 'group'],
  ['phone', 'tech', 'phone'],
  ['screen', 'tech'],
  ['flex', 'drip'],
  ['night', 'city', 'night'],
  ['player', 'fit'],
];

/** People-pack scenes the roll can hold. */
const SCENES: Record<string, readonly [PhotoKind, string?]> = {
  'couple-selfie': ['duo'],
  'friends-selfie': ['group'],
  'girls-night': ['group'],
  'boys-night': ['group'],
  'gym-selfie': ['active', 'gym'],
  'street-style': ['fit', 'outfit'],
  'late-food': ['food'],
  'car-singalong': ['ride', 'car'],
  barbershop: ['selfie'],
  'dance-party': ['party'],
  festival: ['party', 'festival'],
};

/** A photo from the game's own camera roll: its tags already say what it shows. */
export function readStock(tags: readonly string[], scene?: string): PhotoRead {
  if (scene && SCENES[scene]) {
    const [kind, thing] = SCENES[scene];
    return { kind, thing, confidence: 0.95, via: 'stock' };
  }
  for (const [tag, kind, thing] of STOCK) {
    if (tags.includes(tag)) return { kind, thing, confidence: 0.9, via: 'stock' };
  }
  return { kind: tags.length > 0 ? 'scenery' : 'other', confidence: 0.4, via: 'stock' };
}

/** Where a phone file lives: its name and folder, from a file:// path. */
export function fileParts(uri: string): { name: string; folder: string } {
  const path = decodeURIComponent(uri.replace(/^[a-z]+:\/\//i, '')).split('?')[0];
  const parts = path.split('/').filter(Boolean);
  return { name: parts[parts.length - 1] ?? '', folder: parts.slice(-3, -1).join('/') };
}
