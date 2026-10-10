import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Player } from '../../../types/player';
import type { MyComment, PhotoKind, PhotoRead, SocialPost } from '../../../types/social';
import { fileParts, readPhoto, readStock } from '../sense/classify';
import { generateThread, type ThreadReply } from '../threadGenerator';
import { commentCount, visibleCommentCount } from '../talk/myThread';
import { readComment, readText } from '../talk/topic';
import { answersTo, assemble, hostId } from '../talk/conversation';
import { guardThread, hasNegative, isApproved } from '../protect';
import { realKey } from '../realPhotos';
import { THIRST_COMMENTS } from '../../../data/drama/comments';
import { THING_WORDS } from '../../../data/social/realPhotoComments';

function makePlayer(fans: number, reputation = 50, name = 'Test Artist'): Player {
  return {
    id: 'p1',
    artistName: name,
    realName: 'Test',
    gender: 'female',
    genre: 'pop',
    city: 'Atlanta',
    archetype: 'indie-dreamer',
    money: 0,
    week: 10,
    createdAt: 0,
    startAge: 21,
    stats: {
      talent: 60, writing: 55, vocalSkill: 60, charisma: 65, authenticity: 55,
      creativity: 55, discipline: 50, reputation, fans,
      fanLoyalty: 60, industryRespect: 40, mentalHealth: 70, energy: 80,
    },
  };
}

const T0 = 1_760_000_000_000;

function myPost(i: number, opts: { caption?: string; read?: PhotoRead; real?: boolean; reads?: PhotoRead[]; text?: boolean } = {}): SocialPost {
  const at = T0 + i * 1000;
  const reads = opts.reads ?? (opts.read ? [opts.read] : []);
  const keys = opts.text ? [] : reads.map((_, k) => (opts.real ? realKey(at + k, () => ((i + k) % 97) / 97) : `stock${k}abcde`));
  return {
    id: `my-flashpic-${at}`,
    platform: 'flashpic',
    account: { id: 'player', username: 'Test Artist', handle: 'testartist', accountType: 'fan', followers: 1000, isVerified: false, preferredPlatforms: ['flashpic'] },
    content: opts.caption ?? '',
    sentiment: 'hype',
    likes: 0,
    reposts: 0,
    replies: 0,
    media: opts.text ? undefined : { kind: 'image', description: `📸 photo:${keys[0]}`, photoKeys: keys, real: opts.real || undefined, reads },
    week: 10,
  };
}

const read = (kind: PhotoKind, thing?: string, confidence = 0.8): PhotoRead => ({ kind, thing, confidence, via: 'vision' });

/** Every comment and reply in a thread. */
function all(thread: readonly ThreadReply[]): ThreadReply[] {
  return thread.flatMap((r) => [r, ...(r.children ?? [])]);
}

// --- Reading photos ---------------------------------------------------------------

test('the classifier tells the photos apart', () => {
  const big = { x: 0.3, y: 0.2, w: 0.4, h: 0.45 };
  const small = { x: 0.1, y: 0.1, w: 0.12, h: 0.14 };
  const L = (...pairs: [string, number][]) => pairs.map(([text, confidence]) => ({ text, confidence }));

  assert.equal(readPhoto({ labels: L(['Dog', 0.93], ['Pet', 0.88]), faces: [] }).kind, 'pet');
  assert.equal(readPhoto({ labels: L(['Dog', 0.93]), faces: [] }).thing, 'dog');
  assert.equal(readPhoto({ labels: L(['Cat', 0.9], ['Fur', 0.7]), faces: [] }).thing, 'cat');
  assert.equal(readPhoto({ labels: L(['Selfie', 0.8], ['Smile', 0.85]), faces: [big] }).kind, 'selfie');
  assert.equal(readPhoto({ labels: L(['Smile', 0.8]), faces: [small, { ...small, x: 0.5 }] }).kind, 'duo');
  assert.equal(readPhoto({ labels: L(['Fun', 0.7], ['Event', 0.6]), faces: [small, small, small, small] }).kind, 'group');
  // A dog in a selfie steals the show.
  const withDog = readPhoto({ labels: L(['Dog', 0.9], ['Selfie', 0.7]), faces: [big] });
  assert.equal(withDog.kind, 'pet');
  assert.ok(withDog.also?.includes('selfie'));
  assert.equal(readPhoto({ labels: L(['Car', 0.92], ['Wheel', 0.8], ['Vehicle', 0.85]), faces: [] }).kind, 'ride');
  assert.equal(readPhoto({ labels: L(['Jewellery', 0.85], ['Necklace', 0.8]), faces: [] }).kind, 'drip');
  assert.equal(readPhoto({ labels: L(['Sneakers', 0.9], ['Shoe', 0.8]), faces: [] }).thing, 'sneakers');
  assert.equal(readPhoto({ labels: L(['Food', 0.9], ['Pizza', 0.85]), faces: [] }).thing, 'pizza');
  assert.equal(readPhoto({ labels: L(['Sunset', 0.9], ['Sky', 0.95]), faces: [] }).thing, 'sunset');
  assert.equal(readPhoto({ labels: L(['Bedroom', 0.8], ['Couch', 0.7], ['Room', 0.75]), faces: [] }).kind, 'home');
  assert.equal(readPhoto({ labels: L(['Graduation', 0.9], ['Mortarboard', 0.8]), faces: [big] }).kind, 'milestone');
  assert.equal(readPhoto({ labels: L(['Baby', 0.9]), faces: [big] }).kind, 'baby');
  assert.equal(readPhoto({ labels: L(['Money', 0.9]), faces: [] }).kind, 'money');
  assert.equal(readPhoto({ labels: L(['Concert', 0.85], ['Crowd', 0.8]), faces: [] }).kind, 'music');
  assert.equal(readPhoto({ labels: L(['Muscle', 0.8], ['Sports', 0.7]), faces: [] }).kind, 'active');
});

test('memes and screenshots are memes and screenshots, not photos', () => {
  const memeText = { chars: 48, lines: 3, blocks: 2, coverage: 0.12, top: 0.55, bottom: 0.45 };
  const reaction = { x: 0.3, y: 0.35, w: 0.3, h: 0.3 };
  // A WhatsApp meme: caption text at the top and bottom, a face in the middle.
  const meme = readPhoto({ labels: [{ text: 'Smile', confidence: 0.7 }], faces: [reaction], text: memeText, file: { name: 'IMG-20261009-WA0012.jpg', folder: 'WhatsApp/Media/WhatsApp Images' } });
  assert.equal(meme.kind, 'meme');
  // The same text in a real camera photo (a sign, a T-shirt) is not a meme.
  const sign = readPhoto({ labels: [{ text: 'Selfie', confidence: 0.8 }], faces: [reaction], text: memeText, file: { name: 'IMG_20261009_101010.jpg', folder: 'DCIM/Camera', camera: true } });
  assert.notEqual(sign.kind, 'meme');
  // Screenshots, by name, by label, or by being mostly text.
  assert.equal(readPhoto({ file: { name: 'Screenshot_20261009-221500_Chrome.jpg', folder: 'Pictures/Screenshots' } }).kind, 'screenshot');
  assert.equal(readPhoto({ labels: [{ text: 'Screenshot', confidence: 0.9 }], faces: [] }).kind, 'screenshot');
  assert.equal(readPhoto({ labels: [], faces: [], text: { chars: 420, lines: 18, blocks: 6, coverage: 0.5, top: 0.3, bottom: 0.3 } }).kind, 'screenshot');
  assert.equal(readPhoto({ labels: [{ text: 'Comics', confidence: 0.8 }], faces: [] }).kind, 'meme');
});

test('without vision the caption and the file carry the read; nothing is a guess', () => {
  assert.equal(readPhoto({}, 'my dog thinks he runs the house').kind, 'pet');
  assert.equal(readPhoto({}, 'new whip 🔥').kind, 'ride');
  assert.equal(readPhoto({}, 'fit check').kind, 'fit');
  assert.equal(readPhoto({}, 'graduated!!!').kind, 'milestone');
  const blank = readPhoto({});
  assert.equal(blank.kind, 'other');
  assert.equal(blank.via, 'none');
  assert.equal(readPhoto({ labels: [{ text: 'Dog', confidence: 0.9 }] }).via, 'vision');
});

test('the game roll is read from its tags, and every {thing} is a word the guard knows', () => {
  assert.equal(readStock(['pets']).kind, 'pet');
  assert.equal(readStock(['stage', 'player']).kind, 'music');
  assert.equal(readStock(['car', 'flex']).kind, 'ride');
  assert.equal(readStock(['watch', 'fit']).kind, 'drip');
  assert.equal(readStock(['food', 'nightlife']).kind, 'food');
  assert.deepEqual(fileParts('file:///storage/emulated/0/DCIM/Screenshots/Screenshot_1.png'), { name: 'Screenshot_1.png', folder: 'DCIM/Screenshots' });
  // Things the classifier can name must all be fillable under a real photo.
  const things = new Set<string>();
  const L = (t: string) => [{ text: t, confidence: 0.95 }];
  for (const label of ['Dog', 'Cat', 'Bird', 'Horse', 'Gerbil', 'Turtle', 'Aquarium', 'Pizza', 'Sushi', 'Cheeseburger', 'Hot dog', 'Cake', 'Cookie', 'Gelato', 'Bread', 'Coffee', 'Juice', 'Wine', 'Alcohol', 'Menu', 'Car', 'Motorcycle', 'Bicycle', 'Van', 'Airplane', 'Helicopter', 'Passport', 'Speedboat', 'Train', 'Camping', 'Bedroom', 'Kitchen', 'Bathroom', 'Couch', 'Pool', 'Roof', 'Jewellery', 'Necklace', 'Bracelet', 'Ring', 'Chain', 'Sunglasses', 'Handbag', 'Clock', 'Sneakers', 'Shoe', 'Lipstick', 'Nail', 'Gown', 'Swimwear', 'Money', 'Sunset', 'Beach', 'Mountain', 'Rainbow', 'Aurora', 'Moon', 'Nebula', 'Lightning', 'Sky', 'Flower', 'Plant', 'Underwater', 'Butterfly', 'Skyline', 'Cathedral', 'Neon', 'Prom', 'Fireworks', 'Christmas', 'Thanksgiving', 'Concert', 'Musical instrument', 'Piano', 'Deejay', 'Subwoofer', 'Muscle', 'Running', 'Cycling', 'Soccer', 'Stadium', 'Skiing', 'Skateboard', 'Watercolor paint', 'Crochet', 'Lego', 'Tattoo', 'Toy', 'Receipt', 'Graduation', 'Bride', 'Computer', 'Mobile phone', 'Television', 'Grandparent', 'Baby']) {
    const r = readPhoto({ labels: L(label), faces: [] });
    if (r.thing) things.add(r.thing);
  }
  for (const t of ['pets', 'food', 'coffee', 'car', 'yacht', 'jet', 'hotel', 'home', 'pool', 'watch', 'jewelry', 'sneakers', 'money', 'fit', 'fashion', 'beach', 'sky', 'rooftop', 'festival', 'studio', 'mic', 'vinyl', 'dj', 'stage', 'crowd', 'night']) {
    const r = readStock([t]);
    if (r.thing) things.add(r.thing);
  }
  for (const t of things) assert.ok(THING_WORDS.includes(t), `"${t}" can't fill {thing} under a real photo`);
});

// --- What people say --------------------------------------------------------------

const SELFIE_TALK = /you look|face card|selfie|the glow|main character|happiness looks good on you|this pic of you|such a good picture of you/i;
const PHOTO_PRAISE = /beautiful|gorgeous|stunning|what a view|belongs in a frame|golden hour|the lighting/i;
const thirst = new Set(Object.values(THIRST_COMMENTS).flat().map((t) => t.toLowerCase()));

test('a pet gets pet comments: nobody tells a dog "you look good"', () => {
  let petLines = 0;
  for (let i = 0; i < 300; i++) {
    for (const real of [false, true]) {
      const post = myPost(i, { caption: i % 3 === 0 ? 'my boy' : '', read: read('pet', 'dog'), real });
      const t = all(generateThread(post, makePlayer([500, 40_000, 2_000_000][i % 3]), {}, Infinity));
      for (const r of t) {
        assert.ok(!SELFIE_TALK.test(r.content), `selfie talk under a dog: ${r.content}`);
        assert.ok(!thirst.has(r.content.toLowerCase()), `thirst under a dog: ${r.content}`);
        if (/dog|doggo|baby|cutest|adorable|little face|pets make/i.test(r.content)) petLines++;
      }
    }
  }
  assert.ok(petLines > 300, `pet lines show up (${petLines})`);
});

test('a meme gets meme comments: nothing calls it beautiful', () => {
  let laughs = 0;
  for (let i = 0; i < 300; i++) {
    for (const real of [false, true]) {
      const post = myPost(i, { caption: i % 2 ? 'me every monday' : '', read: read('meme'), real });
      for (const r of all(generateThread(post, makePlayer(80_000), {}, Infinity))) {
        assert.ok(!PHOTO_PRAISE.test(r.content), `photo praise under a meme: ${r.content}`);
        assert.ok(!SELFIE_TALK.test(r.content), `selfie talk under a meme: ${r.content}`);
        if (/😂|lmao|so me|seen|group chat|accurate|laughed|💀/i.test(r.content)) laughs++;
      }
    }
  }
  assert.ok(laughs > 200, `meme reactions show up (${laughs})`);
});

test('a selfie can hear "you look amazing", but a real one never gets flirting', () => {
  let compliments = 0;
  for (let i = 0; i < 200; i++) {
    const t = all(generateThread(myPost(i, { read: read('selfie'), real: true }), makePlayer(300_000), {}, Infinity));
    for (const r of t) {
      assert.ok(!thirst.has(r.content.toLowerCase()), `thirst under a real selfie: ${r.content}`);
      assert.ok(isApproved(r.content) && !hasNegative(r.content), `unvetted: ${r.content}`);
      if (SELFIE_TALK.test(r.content) || /smile|glowing|radiant|serving/i.test(r.content)) compliments++;
    }
  }
  assert.ok(compliments > 100, `selfie compliments show up (${compliments})`);
});

test('food, rides, homes and drip each get their own talk', () => {
  const cases: [PhotoKind, string | undefined, RegExp][] = [
    ['food', 'pizza', /delicious|hungry|plate|pizza|taste|chef|meal|recipe|😋/i],
    ['ride', 'car', /car|ride|drive|spin|clean|model|road trip|engine|whip/i],
    ['home', 'kitchen', /home|space|interior|cozy|decor|house|kitchen|place/i],
    ['drip', 'watch', /watch|wrist|piece|drip|shine|details|brand|timeless/i],
  ];
  for (const [kind, thing, fits] of cases) {
    let hits = 0;
    for (let i = 0; i < 150; i++) {
      for (const r of all(generateThread(myPost(i, { read: read(kind, thing) }), makePlayer(120_000), {}, Infinity))) {
        assert.ok(!SELFIE_TALK.test(r.content), `selfie talk under ${kind}: ${r.content}`);
        if (fits.test(r.content)) hits++;
      }
    }
    assert.ok(hits > 150, `${kind} lines show up (${hits})`);
  }
});

test('text posts are answered, not complimented like photos', () => {
  for (let i = 0; i < 200; i++) {
    const post = myPost(i, { caption: 'what should I name my next album?', text: true });
    for (const r of all(generateThread(post, makePlayer(60_000), {}, Infinity))) {
      assert.ok(!/this pic|gorgeous shot|the fit|what a view|so adorable|delicious|belongs in a frame/i.test(r.content), `photo talk under a text post: ${r.content}`);
    }
  }
  assert.equal(readText('what should I name my next album?'), 'question');
  assert.equal(readText('new single drops friday!!'), 'music');
  assert.equal(readText('good morning world'), 'greeting');
  assert.equal(readText('so tired today honestly'), 'vent');
  assert.equal(readText('thank you for 1 million 🙏'), 'gratitude');
  assert.equal(readComment('this is mid'), 'hostile');
  assert.equal(readComment('where is this?'), 'question');
  assert.equal(readComment('love this 😍'), 'kind');
  assert.equal(readComment('lmao'), 'joke');
});

test('comments come in over time, and how many fits the fame', () => {
  const post = myPost(1, { read: read('pet', 'cat') });
  const at = T0 + 1000;
  const player = makePlayer(250_000);
  assert.equal(generateThread(post, player, {}, at + 3_000).length, 0, 'nothing in the first seconds');
  assert.ok(generateThread(post, player, {}, at + 20_000).length >= 1, 'the first one lands fast');
  const later = generateThread(post, player, {}, at + 6 * 3_600_000).length;
  assert.equal(later, commentCount(250_000, post.id), 'all of them by a few hours');
  assert.equal(visibleCommentCount(post.id, 250_000, 6 * 3_600_000), later);
  // An unknown gets a couple, a star a busy section.
  let small = 0;
  let big = 0;
  for (let i = 0; i < 100; i++) {
    small += commentCount(30, `p${i}`);
    big += commentCount(8_000_000, `p${i}`);
  }
  assert.ok(small / 100 <= 3, `unknowns get a few (${small / 100})`);
  assert.ok(big / 100 >= 12, `stars get plenty (${big / 100})`);
});

test('people reply to each other, and a photo dump gets slide comments', () => {
  let kids = 0;
  let slides = 0;
  for (let i = 0; i < 200; i++) {
    const dump = myPost(i, { reads: [read('selfie'), read('food', 'sushi'), read('pet', 'dog'), read('scenery', 'beach')] });
    const t = generateThread(dump, makePlayer(1_500_000), {}, Infinity);
    kids += t.reduce((n, r) => n + (r.children?.length ?? 0), 0);
    if (t.some((r) => /slide \d|slide [2-4]|number \d/i.test(r.content))) slides++;
  }
  assert.ok(kids > 200, `replies under comments (${kids})`);
  assert.ok(slides > 20, `slide comments (${slides})`);
});

test('the real-photo guard still holds for every kind, replies included', () => {
  const kinds: PhotoKind[] = ['selfie', 'fit', 'duo', 'group', 'baby', 'pet', 'food', 'ride', 'travel', 'home', 'drip', 'money', 'scenery', 'city', 'party', 'music', 'active', 'art', 'meme', 'screenshot', 'milestone', 'tech', 'other'];
  for (let i = 0; i < 460; i++) {
    const kind = kinds[i % kinds.length];
    const post = myPost(i, { read: read(kind, kind === 'pet' ? 'cat' : undefined), real: true, caption: ['', 'birthday!!', 'they said I would flop'][i % 3] });
    const player = makePlayer([0, 900, 2_000_000][i % 3], [0, 9, 80][i % 3], i % 7 === 0 ? 'Lil Trash' : 'Test Artist');
    for (const r of all(generateThread(post, player, { rivalNames: ['Blaze Omen'] }, Infinity))) {
      assert.ok(isApproved(r.content), `unvetted under a real ${kind}: ${r.content}`);
      assert.ok(!hasNegative(r.content), `negative under a real ${kind}: ${r.content}`);
      assert.ok(['fan', 'stan', 'friend'].includes(r.side), `side ${r.side}`);
    }
  }
});

// --- The artist in the comments -----------------------------------------------------

function comment(id: number, post: SocialPost, text: string, parent?: ThreadReply): MyComment {
  return {
    id: `mc-${T0 + id}`,
    postId: post.id,
    platform: post.platform,
    parentId: parent?.id,
    toHandle: parent?.handle,
    toName: parent?.username,
    toAccountId: parent?.accountId,
    toSide: parent?.side,
    text,
    at: T0 + 5_000_000 + id,
  };
}

test('a fan the artist replies to loses it, and under a real photo it stays kind', () => {
  const post = myPost(3, { read: read('pet', 'dog'), real: true });
  const player = makePlayer(400_000);
  const thread = generateThread(post, player, {}, Infinity);
  const fan = thread[0];
  let backs = 0;
  for (let i = 0; i < 100; i++) {
    const c = comment(i, post, 'thank you!! he says hi', fan);
    const ans = answersTo(c, post, player, 'player', 'testartist');
    for (const a of ans) {
      assert.ok(isApproved(a.content) && !hasNegative(a.content), `unvetted answer under a real photo: ${a.content}`);
      assert.ok((a.at ?? 0) > c.at, 'answers come after the comment');
    }
    assert.deepEqual(guardThread(post, ans), ans);
    if (ans.some((a) => a.accountId === fan.accountId)) backs++;
  }
  assert.ok(backs > 60, `the fan answers back (${backs})`);
});

test('a famous artist in a stranger\'s comments is an event; an unknown barely registers', () => {
  const stranger: SocialPost = {
    id: 'ev-1-abc',
    platform: 'chirper',
    account: { id: 'c-w-kemi.o', username: 'Kemi', handle: 'kemi.o', accountType: 'public', followers: 300, isVerified: false, preferredPlatforms: ['chirper'] },
    content: 'finally tried the new taco place',
    sentiment: 'neutral',
    likes: 12,
    reposts: 0,
    replies: 2,
    week: 10,
    lane: 'everyday',
  };
  let starStruck = 0;
  let unknownCrowd = 0;
  let starCrowd = 0;
  for (let i = 0; i < 100; i++) {
    const c = comment(i, stranger, 'this looks amazing');
    const big = answersTo(c, stranger, makePlayer(5_000_000), 'person', 'testartist');
    const small = answersTo(c, stranger, makePlayer(40), 'person', 'testartist');
    if (big.some((a) => a.accountId === stranger.account.id && /commented|saw this|never deleting|done for|shaking|fell off my bed/i.test(a.content))) starStruck++;
    starCrowd += big.filter((a) => a.accountId !== stranger.account.id).length;
    unknownCrowd += small.filter((a) => a.accountId !== stranger.account.id).length;
  }
  assert.ok(starStruck > 60, `the author can't believe it (${starStruck})`);
  assert.ok(starCrowd > unknownCrowd * 3, `a star draws a crowd (${starCrowd} vs ${unknownCrowd})`);
});

test('the artist\'s replies sit under the comment they answer, answers arrive on time', () => {
  const post = myPost(5, { read: read('food', 'sushi') });
  const player = makePlayer(100_000);
  const base = generateThread(post, player, {}, Infinity);
  const target = base[1];
  const c = comment(1, post, 'right?? best sushi in town', target);
  const answers = (x: MyComment) => answersTo(x, post, player, 'player', 'testartist');
  const me = { username: 'Test Artist', handle: 'testartist', verified: false };
  const early = assemble(base, [c], answers, me, c.at);
  const host = early.find((t) => t.id === target.id)!;
  assert.ok(host.children?.some((k) => k.id === c.id && k.mine), 'the reply is under the comment it answers');
  const late = assemble(base, [c], answers, me, c.at + 3_600_000);
  const lateHost = late.find((t) => t.id === target.id)!;
  assert.ok((lateHost.children?.length ?? 0) >= (host.children?.length ?? 0));
  // A comment on the post itself goes on top.
  const top = comment(2, post, 'thank you all ❤️');
  assert.equal(assemble(base, [top], answers, me, top.at)[0].id, top.id);
  // Notifications open on the comment a reply sits under.
  assert.equal(hostId(`${target.id}-c1`, 'x', []), target.id);
  assert.equal(hostId(target.id, 'x', []), target.id);
  assert.equal(hostId(`${top.id}-a0`, 'x', [top]), top.id);
});

// --- Story replies ---------------------------------------------------------------------

test('story replies land in the DMs, fit the story, scale with fame, and stay kind under real photos', async () => {
  const { storyReplies, storyThread, answerStory } = await import('../talk/stories');
  let unknown = 0;
  let star = 0;
  for (let i = 0; i < 200; i++) {
    const story = myPost(i, { read: read('pet', 'dog'), real: true });
    unknown += storyReplies(story, makePlayer(20)).length;
    const replies = storyReplies(story, makePlayer(4_000_000));
    star += replies.length;
    for (const r of replies) {
      assert.ok(isApproved(r.text) && !hasNegative(r.text), `unvetted story reply: ${r.text}`);
      assert.ok(!SELFIE_TALK.test(r.text), `selfie talk to a dog story: ${r.text}`);
      assert.ok(r.after >= 25_000);
    }
  }
  assert.ok(unknown / 200 <= 1 && star / 200 >= 2, `stars hear back more (${unknown / 200} vs ${star / 200})`);
  const story = myPost(1, { read: read('food', 'sushi'), real: true });
  const reply = storyReplies(story, makePlayer(4_000_000))[0];
  const thread = storyThread(story, reply, 0, T0, 10);
  assert.equal(thread.options.length, 0, 'no quick replies: the weekly DM engine leaves it alone');
  const answered = answerStory(thread, 'thank you!!', makePlayer(4_000_000), T0 + 1000);
  assert.equal(answered.messages.length, 3);
  assert.equal(answered.messages[1].from, 'me');
  assert.ok(answered.messages[2].at > T0 + 1000, 'they answer a few seconds later');
  assert.ok(isApproved(answered.messages[2].text) && !hasNegative(answered.messages[2].text));
  const again = answerStory(answered, 'haha', makePlayer(4_000_000), T0 + 60_000);
  assert.equal(again.messages.length, 4, 'a fan answers once, then the chat is yours');
});
