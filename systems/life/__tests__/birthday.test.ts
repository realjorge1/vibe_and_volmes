import { resetFakeDb } from '../../__testing__/nativeMocks';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { usePlayerStore } from '../../../store/playerStore';
import { useGameStore } from '../../../store/gameStore';
import { saveData } from '../../../database/gameRepository';
import { initializeFirstWeek, runWeekTransition } from '../../weekEngine';
import { DEFAULT_START_AGE, WEEKS_PER_YEAR } from '../../../constants/gameConfig';

test('the artist ages in the Deck: a birthday line on the right week', () => {
  resetFakeDb();
  useGameStore.getState().reset();
  usePlayerStore.getState().createPlayer({
    artistName: 'Birthday',
    realName: 'B. Day',
    gender: 'male',
    genre: 'r&b',
    city: 'atlanta',
    archetype: 'church-singer',
    startAge: 24,
  });
  useGameStore.getState().startGame();
  initializeFirstWeek();

  const birthdayLinesSoFar = () =>
    useGameStore
      .getState()
      .historyLog.filter((e) => e.flavorText.startsWith('You turned'));

  for (let i = 0; i < WEEKS_PER_YEAR - 1; i++) runWeekTransition([], []);
  assert.equal(useGameStore.getState().week, WEEKS_PER_YEAR);
  assert.equal(birthdayLinesSoFar().length, 0, 'no birthday before a year passes');

  runWeekTransition([], []);
  const lines = birthdayLinesSoFar();
  assert.equal(lines.length, 1);
  assert.equal(lines[0].flavorText, 'You turned 25.');
  assert.equal(lines[0].week, WEEKS_PER_YEAR + 1);
  assert.equal(lines[0].category, 'personal');
  // 24 → 25 crosses into the prime years, which gets its own line.
  const summary = useGameStore.getState().lastWeekSummary.map((e) => e.flavorText);
  assert.equal(summary[0], 'You turned 25.');
  assert.match(summary[1], /mid-twenties/);
});

test('saves from before age existed load with the default start age', () => {
  resetFakeDb();
  usePlayerStore.getState().reset();
  saveData('player', {
    id: 'old',
    artistName: 'Old Save',
    realName: 'O',
    gender: 'female',
    genre: 'pop',
    city: 'atlanta',
    archetype: 'rich-kid',
    stats: {},
    money: 0,
    week: 1,
    createdAt: 1,
  });
  usePlayerStore.getState().loadPlayer();
  assert.equal(usePlayerStore.getState().player?.startAge, DEFAULT_START_AGE);
});
