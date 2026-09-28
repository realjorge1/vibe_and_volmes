import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Player } from '../../../types/player';
import type { PostSentiment } from '../../../types/social';
import {
  deriveFanbase,
  segmentReaction,
  fanbaseSentimentWeights,
  accountToSegment,
  FAN_SEGMENTS,
} from '../fanbase';
import {
  computeEngagement,
  controversyFromReactions,
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
  assert.ok(tunetok.views > flashpic.views * 2, 'HypeFeed out-reaches VibeSnap on trend');

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
