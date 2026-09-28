import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COSMETIC_CATALOG, CURRENT_SEASON } from '../../../data/premium/catalog';
import { PREMIUM_BEATS } from '../../../data/premium/premiumBeats';

// Pure data invariants — the structural anti-pay-to-win guarantee. These import
// only plain data modules, so they're safe under the node test runner.

const BANNED_FIELDS = [
  'stat',
  'stats',
  'fans',
  'money',
  'quality',
  'xp',
  'boost',
  'power',
  'energy',
  'multiplier',
];

test('no cosmetic carries a mechanical (pay-to-win) field', () => {
  for (const item of COSMETIC_CATALOG) {
    for (const key of Object.keys(item)) {
      assert.ok(
        !BANNED_FIELDS.includes(key),
        `${item.id} exposes mechanical field "${key}"`
      );
    }
    assert.ok(item.price > 0, `${item.id} must have a positive price`);
  }
});

test('premium beat packs match the free quality band (variety, not power)', () => {
  // The free catalog spans roughly 68–90 quality; premium packs must stay
  // inside a comparable band so owning one is never an edge.
  for (const b of PREMIUM_BEATS) {
    assert.ok(b.premium === true, `${b.id} must be flagged premium`);
    assert.ok(b.quality >= 60 && b.quality <= 95, `${b.id} quality ${b.quality} out of band`);
    assert.ok(
      b.producerReputation >= 40 && b.producerReputation <= 95,
      `${b.id} producerReputation ${b.producerReputation} out of band`
    );
  }
});

test('season rewards only ever grant cosmetics or soft currency', () => {
  for (const tier of CURRENT_SEASON.tiers) {
    for (const reward of [tier.free, tier.premium]) {
      assert.ok(
        ['currency', 'cosmetic', 'vanity', 'none'].includes(reward.kind),
        `tier ${tier.tier} reward kind "${reward.kind}" is not cosmetic/currency`
      );
    }
  }
});
