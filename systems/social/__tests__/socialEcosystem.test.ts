import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Player } from '../../../types/player';
import type { NpcAccount, PostSentiment } from '../../../types/social';
import {
  deriveFanbase,
  segmentReaction,
  fanbaseSentimentWeights,
  accountToSegment,
  FAN_SEGMENTS,
} from '../fanbase';
import {
  accountAttention,
  byAttention,
  computeEngagement,
  controversyFromReactions,
  relevance,
  withFameTone,
} from '../platformAlgorithms';

// NOTE: this suite deliberately exercises only the *pure* social modules
// (fanbase + platformAlgorithms). The feed/trend generators transitively pull
// the culture engine → zustand stores → expo-sqlite, which the node test
// runner cannot transform; they are covered by the full `tsc` typecheck.

function makePlayer(over: Partial<Player['stats']> = {}): Player {
  return {
    id: 'p1',
    artistName: 'Test Artist',
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
      creativity: 55, discipline: 50, reputation: 55, fans: 500_000,
      fanLoyalty: 60, industryRespect: 40, mentalHealth: 70, energy: 80,
      ...over,
    },
  };
}

test('deriveFanbase: shares sum to ~1 and counts to total fans', () => {
  const comp = deriveFanbase(makePlayer());
  const shareSum = FAN_SEGMENTS.reduce((s, k) => s + comp.shares[k], 0);
  assert.ok(Math.abs(shareSum - 1) < 1e-9, `shares should sum to 1, got ${shareSum}`);
  const countSum = FAN_SEGMENTS.reduce((s, k) => s + comp.counts[k], 0);
  assert.ok(Math.abs(countSum - 500_000) <= FAN_SEGMENTS.length, 'counts ≈ total');
});

test('fanbase composition shifts with player state', () => {
  // Loyal + authentic ⇒ more hardcore. Low rep + huge ⇒ more toxic.
  const loyal = deriveFanbase(makePlayer({ fanLoyalty: 95, authenticity: 90, reputation: 70 }));
  const cancelled = deriveFanbase(makePlayer({ reputation: 10, fans: 20_000_000 }));
  assert.ok(loyal.shares.hardcore > cancelled.shares.hardcore, 'loyal ⇒ more hardcore');
  assert.ok(cancelled.shares.toxic > loyal.shares.toxic, 'cancelled ⇒ more toxic');
});

test('the same event lands differently across segments', () => {
  // A cancellation rallies stans (hype/shade) but bleeds casuals (loyalty↓).
  const stan = segmentReaction('stan', 'cancel');
  const casual = segmentReaction('casual', 'cancel');
  assert.ok((stan.weights.hype ?? 0) > 0, 'stans rally on cancel');
  assert.ok(casual.loyaltyShift < 0, 'casuals churn on cancel');
  assert.ok(stan.intensity > casual.intensity, 'stans are louder than casuals');

  const weights = fanbaseSentimentWeights(deriveFanbase(makePlayer()), ['cancel']);
  assert.ok((weights.hostile ?? 0) > 0, 'a cancellation produces hostile chatter');
});

test('accountToSegment only tags genuine fan archetypes', () => {
  const comp = deriveFanbase(makePlayer());
  assert.equal(accountToSegment('news', comp), undefined, 'news is media, not a fan');
  assert.equal(accountToSegment('industry', comp), undefined, 'industry is not a fan');
  assert.ok(FAN_SEGMENTS.includes(accountToSegment('stan', comp)!), 'a stan account is a fan');
});

test('platform algorithms produce distinct engagement profiles', () => {
  const base = {
    followers: 50_000,
    playerFans: 1_000_000,
    sentiment: 'hype' as PostSentiment,
    controversyLevel: 0,
    reputation: 55,
    trendAlignment: 1, // fully on-trend
  };
  const tunetok = computeEngagement({ ...base, platform: 'tunetok' });
  const flashpic = computeEngagement({ ...base, platform: 'flashpic' });

  // Short video is a discovery/virality machine: far more views.
  assert.ok(tunetok.views > flashpic.views * 2, 'TokTalk out-reaches VibeGram on trend');

  // Controversy turns Chirp into a comment-ratio machine.
  const calm = computeEngagement({ ...base, platform: 'chirper', sentiment: 'neutral', controversyLevel: 0 });
  const heated = computeEngagement({ ...base, platform: 'chirper', sentiment: 'hostile', controversyLevel: 1 });
  assert.ok(heated.comments > calm.comments, 'controversy amplifies discourse on Chirp');

  // The full five-metric model is always present.
  for (const m of [tunetok, flashpic, calm, heated]) {
    for (const k of ['likes', 'comments', 'reposts', 'shares', 'views'] as const) {
      assert.ok(m[k] >= 0 && Number.isFinite(m[k]), `${k} is a finite count`);
    }
  }
});

test('controversyFromReactions scales with negativity and weak reputation', () => {
  assert.equal(controversyFromReactions([], 80), 0);
  assert.ok(controversyFromReactions(['cancel'], 50) > 0.4, 'a cancel is high controversy');
  assert.ok(
    controversyFromReactions(['negative'], 10) > controversyFromReactions(['negative'], 90),
    'fragile reputation reads as more controversial'
  );
});

test('relevance: a big page posting about an unknown gets scrolled past', () => {
  assert.ok(relevance(0, 2_000_000) < 0.2, 'nobody cares yet');
  assert.ok(relevance(0, 300) > 0.8, "a friend's followers still see it");
  assert.ok(relevance(10_000_000, 2_000_000) > 0.99, 'a star travels everywhere');
  const unknown = computeEngagement({
    platform: 'chirper', followers: 2_000_000, playerFans: 0, sentiment: 'news',
    controversyLevel: 0, reputation: 50, trendAlignment: 0,
  });
  const star = computeEngagement({
    platform: 'chirper', followers: 2_000_000, playerFans: 5_000_000, sentiment: 'news',
    controversyLevel: 0, reputation: 50, trendAlignment: 0,
  });
  assert.ok(star.views > unknown.views * 5);
});

test("critics and listeners find an unknown first; the big pages come later", () => {
  assert.ok(accountAttention('critic', 0) > accountAttention('news', 0) * 20);
  assert.ok(accountAttention('critic', 0) > accountAttention('stan', 0) * 20);
  for (const type of ['stan', 'gossip', 'news', 'rival-fan', 'industry'] as const) {
    assert.ok(accountAttention(type, 5_000_000) > accountAttention(type, 0), `${type} grows with fame`);
  }

  const mk = (id: string, accountType: NpcAccount['accountType']): NpcAccount => ({
    id, username: id, handle: id, accountType, followers: 1_000, isVerified: false,
    preferredPlatforms: ['chirper'],
  });
  const pool = [mk('n1', 'news'), mk('g1', 'gossip'), mk('s1', 'stan'), mk('c1', 'critic')];
  let criticFirst = 0;
  let seed = 7;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 200; i++) {
    if (byAttention(pool, 0, rng)[0].accountType === 'critic') criticFirst++;
  }
  assert.ok(criticFirst > 160, `a critic usually leads an unknown's feed (${criticFirst}/200)`);
});

test('withFameTone: an unknown hears critique, a star barely changes', () => {
  const base = { hype: 10, positive: 10, neutral: 10, critical: 10, hostile: 2, meme: 10, news: 3, shade: 3 };
  const fresh = withFameTone(base, 0);
  assert.ok(fresh.critical > base.critical && fresh.hype < base.hype && fresh.meme < base.meme);
  const star = withFameTone(base, 10_000_000);
  assert.equal(star.critical, base.critical);
  assert.equal(star.hype, base.hype);
});
