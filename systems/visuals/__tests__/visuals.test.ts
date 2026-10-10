import '../../__testing__/nativeMocks';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PostSentiment, SocialPost } from '../../../types/social';
import { PHOTOS } from '../../../data/photos/photoPack';
import { IMAGE_DESCRIPTIONS, VIDEO_DESCRIPTIONS } from '../../../data/social/mediaTemplates';
import { isPortrait, pickPhoto, pickPhotos, photosTagged } from '../photoIndex';
import { planAvatar, planPostMedia, sceneTags } from '../scenes';
import { planClip, runtimeOf } from '../clips';

function post(over: Partial<SocialPost> = {}): SocialPost {
  return {
    id: 'post-1',
    platform: 'flashpic',
    account: {
      id: 'fan-1',
      username: 'Jordan K',
      handle: 'jordank',
      accountType: 'fan',
      followers: 100,
      isVerified: false,
      preferredPlatforms: ['flashpic'],
    },
    content: 'Nova is NOT playing around with this one',
    sentiment: 'hype',
    likes: 10,
    reposts: 1,
    replies: 2,
    week: 3,
    ...over,
  };
}

const fill = (s: string) =>
  s.replace(/\{playerName\}/g, 'Nova').replace(/\{trackTitle\}/g, 'Glass Heart').replace(/\{genre\}/g, 'Pop');

test('photo pack: every photo is tagged and has a sane focus point', () => {
  assert.ok(PHOTOS.length >= 300);
  for (const p of PHOTOS) {
    assert.ok(p.tags.length > 0, p.key);
    assert.ok(p.focus[0] >= 0 && p.focus[0] <= 1 && p.focus[1] >= 0 && p.focus[1] <= 1, p.key);
    assert.match(p.tint, /^#[0-9A-F]{6}$/);
  }
});

test('pickPhoto: stable for a seed, spread across seeds, on-tag', () => {
  const a = pickPhoto(['stage'], 'seed-a');
  assert.equal(pickPhoto(['stage'], 'seed-a').key, a.key);
  const keys = new Set(Array.from({ length: 60 }, (_, i) => pickPhoto(['stage'], `s${i}`).key));
  assert.ok(keys.size >= 6, `only ${keys.size} distinct stage photos`);
  for (let i = 0; i < 40; i++) {
    const p = pickPhoto(['pets'], `pet${i}`);
    assert.ok(p.tags.includes('pets'));
  }
});

test('pickPhoto: prefers the asked orientation when the tag has it', () => {
  assert.ok(photosTagged('stage').some(isPortrait));
  for (let i = 0; i < 30; i++) assert.ok(isPortrait(pickPhoto(['stage'], `p${i}`, { orientation: 'portrait' })));
});

test('pickPhotos: distinct frames', () => {
  const ps = pickPhotos(['crowd'], 'carousel', 4);
  assert.equal(ps.length, 4);
  assert.equal(new Set(ps.map((p) => p.key)).size, 4);
});

test('planPostMedia: formats people really post', () => {
  const desc = (description: string) => post({ media: { kind: 'image', description } });
  assert.equal(planPostMedia(desc("📸 blurry zoomed screenshot of Nova's face circled in red"))?.kind, 'circled');
  assert.equal(planPostMedia(desc('📸 side-by-side "then vs now" of Nova captioned "what happened"'))?.kind, 'split');
  assert.equal(planPostMedia(desc("📸 receipts thread cover image, Nova's name in a cracked-glass filter"))?.kind, 'receipts');
  assert.equal(planPostMedia(desc("📸 empty venue seats photoshopped under Nova's tour poster"))?.kind, 'poster');
  assert.equal(planPostMedia(desc('📸 a single story repost: "Glass Heart" on a phone screen, no caption'))?.kind, 'nowPlaying');
  const carousel = planPostMedia(desc('📸 carousel: Nova listening party — vinyl of "Glass Heart", candles, friends'));
  assert.equal(carousel?.kind, 'photo');
  if (carousel?.kind === 'photo') assert.equal(carousel.photos.length, 3);
  const own = planPostMedia(post({ id: 'me-flashpic-t9', media: { kind: 'image', description: '📸 cover art for "Glass Heart"' } }));
  assert.deepEqual(own, { kind: 'cover', trackId: 't9', title: 'Glass Heart' });
});

test('planPostMedia: text posts become cards only where asked', () => {
  assert.equal(planPostMedia(post()), null);
  assert.equal(planPostMedia(post(), { textCards: true })?.kind, 'headline');
});

test('every media template the sim can write gets real pictures', () => {
  for (const pool of [IMAGE_DESCRIPTIONS, VIDEO_DESCRIPTIONS]) {
    for (const list of Object.values(pool)) {
      for (const t of list) {
        const plan = planPostMedia(post({ id: `p-${t.length}`, media: { kind: 'image', description: fill(t) } }));
        assert.ok(plan, t);
      }
    }
  }
});

test('sceneTags: reads the scene, falls back to the mood', () => {
  assert.equal(sceneTags('fancam of Nova hitting the run live', 'hype')[0], 'stage');
  assert.equal(sceneTags('Nova on a private jet', 'hype')[0], 'jet');
  const moods: PostSentiment[] = ['hostile', 'news', 'meme'];
  for (const m of moods) assert.ok(sceneTags('nothing to see', m).length > 0);
});

test('planAvatar: logos for outlets, the idol for stans, pets and sunsets for the rest', () => {
  assert.equal(planAvatar('news-1', 'Rap Daily').kind, 'logo');
  assert.equal(planAvatar('industry-9', 'Some Label').kind, 'logo');
  const stan = planAvatar('stan-1', 'Main Character Energy');
  assert.equal(stan.kind, 'photo');
  const me = planAvatar('player', 'Nova');
  assert.ok(me.kind === 'photo' && me.photo.tags.includes('player'));
  assert.deepEqual(planAvatar('r-someone', 'Someone'), planAvatar('r-someone', 'Someone'));
  const kinds = new Set(Array.from({ length: 80 }, (_, i) => planAvatar(`r-user${i}`, `User ${i}`).kind));
  assert.ok(kinds.has('photo') && kinds.has('default'));
});

test('runtimeOf: the media line sets the length', () => {
  assert.equal(runtimeOf('🎬 0:14 — fancam', 'x'), 14_000);
  const free = runtimeOf('', 'x');
  assert.ok(free >= 9000 && free < 18_000);
});

test('planClip: shots fill the runtime, songs play the artist when there is one', () => {
  const ctx = { playerName: 'Nova', trackTitle: 'Glass Heart' };
  const fancam = planClip(
    post({ platform: 'tunetok', media: { kind: 'video', description: fill(VIDEO_DESCRIPTIONS.positive[0]) } }),
    ctx
  );
  assert.equal(fancam.duration, 14_000);
  assert.equal(fancam.sound.kind, 'track');
  assert.equal(fancam.shots.reduce((s, x) => s + x.dur, 0), fancam.duration);
  assert.ok(fancam.shots.every((s) => s.zoom[0] > 1 && s.zoom[1] > 1));
  const noSong = planClip(
    post({ platform: 'tunetok', media: { kind: 'video', description: fill(VIDEO_DESCRIPTIONS.positive[0]) } }),
    { playerName: 'Nova', trackTitle: null }
  );
  assert.equal(noSong.sound.kind, 'beat');
  const duet = planClip(post({ media: { kind: 'video', description: fill(VIDEO_DESCRIPTIONS.negative[3]) } }), ctx);
  assert.equal(duet.layout, 'duet');
  assert.equal(duet.side.length, 1);
  const thumb = planClip(post({ media: { kind: 'video', description: fill(VIDEO_DESCRIPTIONS.negative[0]) } }), ctx);
  assert.equal(thumb.overlay, 'thumbnail');
  const own = planClip(
    post({ id: 'me-tunetok-t9', media: { kind: 'video', description: '🎬 0:15 — snippet of "Glass Heart", straight from the studio' } }),
    ctx
  );
  assert.deepEqual(own.sound, { kind: 'own', trackId: 't9', rate: 1 });
  const words = planClip(post({ platform: 'tunetok' }), ctx);
  assert.equal(words.captions[0]?.text, post().content);
});
