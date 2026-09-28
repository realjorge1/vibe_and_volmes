import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LUXURY_CATALOG, getLuxuryItem } from '../../../data/luxury/catalog';
import { HOMES, getHome, startingHome } from '../../../data/life/homes';
import { ASSET_EVENTS } from '../../../data/events/assetEvents';
import {
  homeAfterLosing,
  homeAvailability,
  weeklyUpkeep,
} from '../assetEngine';
import { bindAsset, canCast, personalizeEvent, type AssetView } from '../../events/personalize';
import { lifestyleBurn } from '../../simulation/lifestyle';

const view = (id: string): AssetView => {
  const i = getLuxuryItem(id)!;
  return { itemId: i.id, name: i.name, category: i.category, cost: i.cost };
};

test('every luxury item has upkeep; one-off experiences cost nothing after', () => {
  for (const item of LUXURY_CATALOG) {
    assert.ok(Number.isFinite(item.upkeep) && item.upkeep >= 0, item.id);
  }
  for (const item of LUXURY_CATALOG.filter((i) => i.category === 'party')) {
    assert.equal(item.upkeep, 0, item.id);
  }
  const owned = ['penthouse', 'first-whip'].map((itemId) => ({
    itemId,
    boughtAtWeek: 1,
    boughtAtCost: 0,
  }));
  assert.equal(weeklyUpkeep(owned), getLuxuryItem('penthouse')!.upkeep + getLuxuryItem('first-whip')!.upkeep);
});

test('the home ladder climbs, and its top rungs are real properties', () => {
  for (let i = 1; i < HOMES.length; i++) {
    assert.ok(HOMES[i].lifestyleTier > HOMES[i - 1].lifestyleTier, HOMES[i].id);
  }
  for (const h of HOMES) {
    for (const id of h.requiresItem ?? []) {
      assert.equal(getLuxuryItem(id)?.category, 'property', `${h.id} needs ${id}`);
    }
  }
  assert.equal(startingHome(18), 'childhood-bedroom');
  assert.equal(startingHome(24), 'shared-apartment');
});

test('moving up costs a deposit, moving down is free, deeds gate the top', () => {
  const burn = 500;
  const own = getHome('own-place');
  const up = homeAvailability(own, 'shared-apartment', new Set(), 100_000, burn);
  assert.deepEqual(up, { ok: true, cost: 2 * lifestyleBurn(burn, own.lifestyleTier) });

  const down = homeAvailability(getHome('childhood-bedroom'), 'own-place', new Set(), 0, burn);
  assert.deepEqual(down, { ok: true, cost: 0 });

  const penthouse = getHome('penthouse');
  assert.equal(homeAvailability(penthouse, 'own-place', new Set(), 1e9, burn).ok, false);
  assert.equal(homeAvailability(penthouse, 'own-place', new Set(['penthouse']), 1e9, burn).ok, true);

  assert.equal(homeAvailability(own, 'shared-apartment', new Set(), 10, burn).ok, false);
  assert.equal(homeAvailability(own, 'own-place', new Set(), 1e9, burn).ok, false);
});

test('losing the deed moves you out of the penthouse, not out of a rental', () => {
  assert.equal(homeAfterLosing('penthouse', new Set()), 'own-place');
  assert.equal(homeAfterLosing('penthouse', new Set(['penthouse'])), 'penthouse');
  assert.equal(homeAfterLosing('shared-apartment', new Set()), 'shared-apartment');
});

// ─── Asset events ───────────────────────────────────────────────────────────

const byId = (id: string) => ASSET_EVENTS.find((e) => e.id === id)!;

test('a burglar takes the priciest thing in reach, by category', () => {
  const burglary = byId('asset-burglary'); // jewelry
  const owned = [view('iced-chain'), view('one-of-one-piece'), view('supercar')];
  assert.equal(bindAsset(burglary, owned)?.itemId, 'one-of-one-piece');
  assert.equal(canCast(burglary, { people: [], assets: [view('supercar')] }), false);

  const filled = personalizeEvent(burglary, {
    people: [],
    assets: owned,
    homeTitle: 'your penthouse',
  });
  assert.equal(filled.title, 'Someone Was in your penthouse');
  assert.match(filled.description, /The One-of-One Jeweler Piece is gone/);
  for (const c of filled.choices) {
    assert.equal(c.consequences.asset?.itemId, 'one-of-one-piece');
  }
  assert.ok(!/\{(asset|home|Home)\}/.test(JSON.stringify(filled)));
});

test('the repo man comes for the priciest thing you own', () => {
  const repo = byId('asset-repo-man');
  const owned = [view('first-whip'), view('penthouse')];
  const filled = personalizeEvent(repo, { people: [], assets: owned, homeTitle: 'your apartment' });
  assert.match(filled.description, /here for the City Penthouse/);
  assert.equal(filled.choices[0].consequences.asset?.action, 'lose');
});

test('the Crib\'s chance cards live on as day-job events', () => {
  const dayJob = ASSET_EVENTS.filter((e) =>
    e.triggers.some((t) => t.type === 'has_tag' && t.tag === 'day-job')
  );
  assert.ok(dayJob.length >= 4);
  const quit = byId('dayjob-quit');
  assert.ok(quit.choices.some((c) => c.consequences.removeTags?.includes('day-job')));
});
