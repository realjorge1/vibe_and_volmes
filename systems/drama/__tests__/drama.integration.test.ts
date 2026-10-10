import { resetFakeDb } from '../../__testing__/nativeMocks';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { usePlayerStore } from '../../../store/playerStore';
import { useGameStore } from '../../../store/gameStore';
import { useSocialStore } from '../../../store/socialStore';
import { useLiveStore } from '../../../store/liveStore';
import { useDramaStore } from '../../../store/dramaStore';
import { usePeopleStore } from '../../../store/peopleStore';
import { useCareerStore } from '../../../store/careerStore';
import { initializeFirstWeek, runWeekTransition } from '../../weekEngine';
import { playerDoActivity, playerReplyDm } from '../../simulation/playerActions';
import { retireCareer } from '../../legacy/retirement';
import { hottestRival, spawnMoment } from '../publish';
import { startThread } from '../dmEngine';
import { dmContext } from '../dramaTick';
import { getArc } from '../../../data/drama/dmArcs';
import { useRelationshipStore } from '../../../store/relationshipStore';
import { useRivalryStore } from '../../../store/rivalryStore';
import { seeded } from '../crowd';

beforeEach(() => {
  resetFakeDb();
  if (usePlayerStore.getState().player) retireCareer();
  usePlayerStore.getState().createPlayer({
    artistName: 'Nova Kay',
    realName: 'N. Kay',
    gender: 'male',
    genre: 'hip-hop',
    city: 'Atlanta',
    archetype: 'street-hustler',
    startAge: 24,
  });
  useGameStore.getState().startGame();
  initializeFirstWeek();
  useLiveStore.getState().setEnergyUpdatedAt(Date.now());
  usePlayerStore.getState().setStatDirect('energy', 100);
  usePlayerStore.getState().setStatDirect('fans', 250_000);
});

test('a moment hits every app at once: headline, reactions, a news article, the Chronicle', () => {
  const before = useSocialStore.getState().feed.length;
  const m = spawnMoment({ kind: 'scandal', headline: '{playerName} Caught Lip-Syncing', topic: 'the lip-sync clip', heat: 70, valence: -60, hashtag: '{playerName}LipSync' })!;
  assert.ok(m);
  assert.equal(m.headline, 'Nova Kay Caught Lip-Syncing');
  const feed = useSocialStore.getState().feed;
  assert.ok(feed.length >= before + 3, 'headline + reactions landed');
  assert.ok(feed.some((p) => p.platform === 'vibestream' && p.momentId === m.id), 'VibeNews wrote it up');
  assert.ok(useSocialStore.getState().trending.some((t) => t.hashtag === '#NovaKayLipSync'));
  assert.ok(useCareerStore.getState().history.some((h) => h.summary === m.headline), 'the Chronicle remembers');
  assert.equal(useDramaStore.getState().moments[0].id, m.id);
});

test('a week of drama: moments cool, the feed argues about them, the inbox fills', () => {
  spawnMoment({ kind: 'scandal', headline: 'H', topic: 'the leaked DMs', heat: 60, valence: -50 }, { quiet: true });
  for (let i = 0; i < 4; i++) runWeekTransition([], []);
  const feed = useSocialStore.getState().feed;
  assert.ok(feed.some((p) => p.take !== undefined), 'the week feed carries drama posts');
  const takes = new Set(feed.map((p) => p.take).filter(Boolean));
  assert.ok(takes.size >= 3, `a mix of takes, got ${[...takes].join(',')}`);
  assert.ok(useDramaStore.getState().dms.length > 0, 'DMs arrived');
  const m = useDramaStore.getState().moments.find((x) => x.topic === 'the leaked DMs');
  assert.ok(!m || m.heat < 60, 'it cooled');
});

test('answering an admirer can turn into a date that joins the People tab', () => {
  const ctx = dmContext()!;
  const arc = getArc('admirer-shot')!;
  const t = startThread(arc, ctx, seeded('it-admirer'))!;
  useDramaStore.getState().upsertDm(t);
  assert.ok(playerReplyDm(t.id, 'flirt').ok);
  const after = useDramaStore.getState().getDm(t.id)!;
  assert.equal(after.stage, 'flirting');
  const original = Math.random;
  Math.random = () => 0.01; // the roll that gets photographed
  try {
    assert.ok(playerReplyDm(t.id, 'date').ok);
  } finally {
    Math.random = original;
  }
  const partner = usePeopleStore.getState().people.find((p) => p.role === 'partner');
  assert.ok(partner, 'they are dating now');
  assert.equal(partner!.face, t.person.id, 'with their face');
  assert.ok(useDramaStore.getState().moments.some((m) => m.kind === 'romance'), 'and the blogs noticed');
});

test('beef activities move the rival war and the rival shows up in the feed', () => {
  useRelationshipStore.getState().introduceArtist('blaze-omen');
  useRivalryStore.getState().ensureRival('blaze-omen', 850_000, 4);
  useRivalryStore.getState().adjustIntensity('blaze-omen', 70);
  assert.equal(hottestRival()?.name, 'Blaze Omen');

  const original = Math.random;
  Math.random = () => 0.01; // the subtweet lands
  try {
    const res = playerDoActivity('beef-subtweet');
    assert.ok(res.ok, res.ok ? '' : res.reason);
  } finally {
    Math.random = original;
  }
  const war = useDramaStore.getState().wars['blaze-omen'];
  assert.ok(war && war.score > 50, 'public opinion moved our way');

  runWeekTransition([], []);
  const feed = useSocialStore.getState().feed;
  assert.ok(feed.some((p) => p.topic === 'beef' || p.take === 'subtweet' || p.take === 'stanwar'), 'the internet is talking about the beef');
});
