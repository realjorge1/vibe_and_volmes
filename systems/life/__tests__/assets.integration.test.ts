import { resetFakeDb } from '../../__testing__/nativeMocks';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { usePlayerStore } from '../../../store/playerStore';
import { useGameStore } from '../../../store/gameStore';
import { useStatusStore } from '../../../store/statusStore';
import { useCareerStore } from '../../../store/careerStore';
import { useProgressionStore } from '../../../store/progressionStore';
import { buildEventContext, initializeFirstWeek, runWeekTransition } from '../../weekEngine';
import { retireCareer } from '../../legacy/retirement';
import { runAssetWeek, BEHIND_TAG } from '../assetTick';
import { playerMoveHome } from '../../simulation/playerActions';
import { purchaseLuxury } from '../../status/statusEngine';
import { applyConsequence } from '../../events/consequenceApplicator';
import { isEventEligible } from '../../events/eventEngine';
import { personalizeEvent } from '../../events/personalize';
import { ASSET_EVENTS } from '../../../data/events/assetEvents';
import { getHome } from '../../../data/life/homes';
import { getLuxuryItem } from '../../../data/luxury/catalog';

function start(startAge = 24): void {
  resetFakeDb();
  if (usePlayerStore.getState().player) retireCareer();
  usePlayerStore.getState().createPlayer({
    artistName: 'Nova Kay',
    realName: 'Nova Kay',
    gender: 'female',
    genre: 'pop',
    city: 'atlanta',
    archetype: 'indie-dreamer',
    startAge,
  });
  useGameStore.getState().startGame();
  initializeFirstWeek();
}

function setMoney(money: number): void {
  const p = usePlayerStore.getState().player!;
  usePlayerStore.setState({ player: { ...p, money } });
}

function give(itemId: string): void {
  useStatusStore.getState().addOwned({ itemId, boughtAtWeek: 1, boughtAtCost: getLuxuryItem(itemId)!.cost });
}

beforeEach(() => start());

test('a new career starts somewhere that fits its age', () => {
  assert.equal(useStatusStore.getState().homeId, 'shared-apartment');
  assert.equal(useCareerStore.getState().economy.lifestyleTier, getHome('shared-apartment').lifestyleTier);
  start(18);
  assert.equal(useStatusStore.getState().homeId, 'childhood-bedroom');
  assert.equal(useCareerStore.getState().economy.lifestyleTier, 0);
});

test('owning things charges upkeep every week, on the ledger', () => {
  give('first-whip');
  setMoney(50_000);
  runAssetWeek(2);
  const upkeep = getLuxuryItem('first-whip')!.upkeep;
  assert.equal(usePlayerStore.getState().player!.money, 50_000 - upkeep);
  const entry = useCareerStore.getState().economy.ledger[0];
  assert.equal(entry.kind, 'upkeep');
  assert.equal(entry.amount, -upkeep);
});

test('falling behind brings the repo man, who takes the asset', () => {
  give('supercar');
  setMoney(100);
  runAssetWeek(2);
  assert.equal(usePlayerStore.getState().player!.money, 0);
  assert.ok(useGameStore.getState().hasTag(BEHIND_TAG));
  assert.ok(
    useGameStore.getState().lastWeekSummary.some((e) => e.flavorText.includes('repo man has your address'))
  );

  const repo = ASSET_EVENTS.find((e) => e.id === 'asset-repo-man')!;
  const ctx = buildEventContext();
  assert.equal(isEventEligible(repo, ctx), true);
  const filled = personalizeEvent(repo, ctx);
  applyConsequence(filled.choices[0].consequences, 2);
  assert.equal(useStatusStore.getState().ownsItem('supercar'), false);
  assert.equal(useGameStore.getState().hasTag(BEHIND_TAG), false);
  assert.equal(isEventEligible(repo, buildEventContext()), false, 'nothing left to take');
});

test('where you live moves mood and energy every week', () => {
  const set = (mental: number, energy: number) => {
    usePlayerStore.getState().setStatDirect('mentalHealth', mental);
    usePlayerStore.getState().setStatDirect('energy', energy);
  };
  for (const id of ['childhood-bedroom', 'own-place', 'mansion'] as const) {
    useStatusStore.getState().setHome(id);
    set(50, 50);
    runAssetWeek(3);
    const s = usePlayerStore.getState().player!.stats;
    const w = getHome(id).weekly;
    assert.equal(s.mentalHealth, 50 + w.mentalHealth, `${id} mental`);
    assert.equal(s.energy, 50 + w.energy, `${id} energy`);
  }
});

test('moving up pays a deposit, resets the burn, and lands in the Deck', () => {
  setMoney(100_000);
  const res = playerMoveHome('own-place');
  assert.deepEqual(res, { ok: true });
  assert.equal(useStatusStore.getState().homeId, 'own-place');
  assert.equal(useCareerStore.getState().economy.lifestyleTier, getHome('own-place').lifestyleTier);
  assert.ok(usePlayerStore.getState().player!.money < 100_000);
  const last = useGameStore.getState().lastWeekSummary.at(-1)!;
  assert.equal(last.flavorText, getHome('own-place').moveInLine);
  assert.deepEqual(playerMoveHome('penthouse'), { ok: false, reason: 'Buy the City Penthouse first' });
});

test('buying writes the Deck; losing the deed moves you out', () => {
  useProgressionStore.setState({ level: 30 });
  setMoney(5_000_000);
  const bought = purchaseLuxury('penthouse');
  assert.equal(bought.ok, true);
  assert.ok(
    useGameStore.getState().lastWeekSummary.at(-1)!.flavorText.startsWith('You bought the City Penthouse.')
  );

  assert.deepEqual(playerMoveHome('penthouse'), { ok: true });
  applyConsequence({ asset: { action: 'sell', itemId: 'penthouse' }, flavorText: 'sold' }, 2);
  assert.equal(useStatusStore.getState().homeId, 'own-place');
  assert.equal(useCareerStore.getState().economy.lifestyleTier, getHome('own-place').lifestyleTier);
});

test('upkeep runs inside the real week transition', () => {
  give('iced-chain');
  setMoney(50_000);
  runWeekTransition([], []);
  const ledger = useCareerStore.getState().economy.ledger;
  assert.ok(ledger.some((e) => e.kind === 'upkeep' && e.amount === -getLuxuryItem('iced-chain')!.upkeep));
});
