import { resetFakeDb } from '../../__testing__/nativeMocks';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { usePlayerStore } from '../../../store/playerStore';
import { useGameStore } from '../../../store/gameStore';
import { useWorldStore } from '../../../store/worldStore';
import { initializeFirstWeek, runWeekTransition } from '../../weekEngine';
import { retireCareer } from '../retirement';
import type { CreatePlayerData } from '../../../types/player';

const ARTIST: CreatePlayerData = {
  artistName: 'Test Tone',
  realName: 'Tess Tone',
  gender: 'female',
  genre: 'pop',
  city: 'atlanta',
  archetype: 'indie-dreamer',
};

function startCareer(createdAt: number): void {
  usePlayerStore.getState().createPlayer(ARTIST);
  // createPlayer stamps Date.now(); pin it so each career seeds its own world.
  const p = usePlayerStore.getState().player!;
  usePlayerStore.setState({ player: { ...p, createdAt } });
  useGameStore.getState().startGame();
  initializeFirstWeek();
}

test('retiring then starting a new career gives a fresh world', () => {
  resetFakeDb();

  startCareer(1_000);
  const firstWorld = useWorldStore.getState().world!;
  assert.equal(firstWorld.seed, 1_000);
  const warmWeek = firstWorld.week;

  for (let i = 0; i < 3; i++) runWeekTransition([], []);
  assert.equal(useWorldStore.getState().world!.week, warmWeek + 3);
  assert.equal(useGameStore.getState().week, 4);

  retireCareer();
  assert.equal(useWorldStore.getState().world, null, 'world cleared on retire');
  assert.equal(usePlayerStore.getState().player, null);

  startCareer(2_000);
  const secondWorld = useWorldStore.getState().world!;
  assert.equal(secondWorld.seed, 2_000, 'new career seeds its own world');
  assert.equal(secondWorld.week, warmWeek, 'new world starts at warm-up, not week 3');
  assert.equal(useGameStore.getState().week, 1);
});
