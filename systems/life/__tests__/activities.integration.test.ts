import { resetFakeDb } from '../../__testing__/nativeMocks';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { usePlayerStore } from '../../../store/playerStore';
import { useGameStore, STORY_PREFIX } from '../../../store/gameStore';
import { useSocialStore } from '../../../store/socialStore';
import { useActivityStore } from '../../../store/activityStore';
import { useLiveStore } from '../../../store/liveStore';
import { initializeFirstWeek, runWeekTransition } from '../../weekEngine';
import { playerDoActivity } from '../../simulation/playerActions';
import { buildCareerFeed } from '../../../hooks/useCareerFeed';
import { ACTIVITIES_PER_WEEK } from '../../../constants/gameConfig';
import { retireCareer } from '../../legacy/retirement';

function withRandom<T>(value: number, fn: () => T): T {
  const original = Math.random;
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

beforeEach(() => {
  resetFakeDb();
  if (usePlayerStore.getState().player) retireCareer();
  usePlayerStore.getState().createPlayer({
    artistName: 'Nova Kay',
    realName: 'N. Kay',
    gender: 'female',
    genre: 'pop',
    city: 'atlanta',
    archetype: 'rich-kid',
    startAge: 24,
  });
  useGameStore.getState().startGame();
  initializeFirstWeek();
  // Keep the wall-clock regen out of the energy math.
  useLiveStore.getState().setEnergyUpdatedAt(Date.now());
  usePlayerStore.getState().setStatDirect('energy', 100);
});

test('an activity spends energy and writes its result into the Deck', () => {
  const res = playerDoActivity('practice');
  assert.equal(res.ok, true);
  if (!res.ok) return;

  assert.equal(usePlayerStore.getState().player!.stats.energy, 90);
  const summary = useGameStore.getState().lastWeekSummary;
  const line = summary[summary.length - 1];
  assert.equal(line.eventId, `${STORY_PREFIX}activity:practice`);
  assert.equal(line.flavorText, res.result.line);
  assert.equal(useGameStore.getState().historyLog[0].flavorText, res.result.line);
  assert.equal(useActivityStore.getState().weekTally(1).done, 1);
});

test('dramatic outcomes reach the feed and the trending board', () => {
  // start-fight has no skill tilt; a roll of 0 lands its first outcome,
  // the filmed fight, which carries a social beat and a hashtag.
  const res = withRandom(0, () => playerDoActivity('start-fight'));
  assert.equal(res.ok && res.result.outcome.id, 'won');
  assert.equal(res.ok && res.posted, true);

  const top = useSocialStore.getState().feed[0];
  assert.equal(top.relatedEventId, 'activity:start-fight');
  assert.match(top.content, /Nova Kay throwing hands/);
  assert.equal(useSocialStore.getState().trending[0].hashtag, '#ThrowingHands');
  // It also enters the Chronicle's raw material.
  assert.ok(useSocialStore.getState().postHistory.some((p) => p.id === top.id));
});

test('the weekly cap holds, and the next week resets it', () => {
  for (let i = 0; i < ACTIVITIES_PER_WEEK; i++) {
    assert.equal(playerDoActivity('practice').ok, true, `activity ${i + 1}`);
  }
  const blocked = playerDoActivity('practice');
  assert.deepEqual(blocked, { ok: false, reason: 'No time left this week' });

  runWeekTransition([], []);
  useLiveStore.getState().setEnergyUpdatedAt(Date.now());
  usePlayerStore.getState().setStatDirect('energy', 100);
  assert.equal(playerDoActivity('practice').ok, true);
});

test('activity reactions feed the next week transition, once', () => {
  withRandom(0, () => playerDoActivity('start-fight')); // 'viral'
  assert.deepEqual(useActivityStore.getState().pendingReactions, ['viral']);
  runWeekTransition([], []);
  assert.deepEqual(useActivityStore.getState().pendingReactions, []);
});

test('the Deck column interleaves activity lines with decisions in order', () => {
  const game = useGameStore.getState();
  const slate = game.activeEvents;
  assert.ok(slate.length >= 1, 'week one has a decision');
  const event = slate[0];

  playerDoActivity('practice');
  game.resolveCurrentEvent(event.choices[0].id, {
    eventId: event.id,
    choiceId: event.choices[0].id,
    week: 1,
    flavorText: 'decided',
    category: event.category,
  });
  playerDoActivity('gym');

  const s = useGameStore.getState();
  const feed = buildCareerFeed({
    week: s.week,
    historyLog: s.historyLog,
    lastWeekSummary: s.lastWeekSummary,
    activeEvents: s.activeEvents,
    pendingIndex: s.pendingEventIndex,
  });
  const thisWeek = feed.items.slice(feed.items.findIndex((i) => i.kind === 'week' && i.isCurrent) + 1);
  // Roll-over notes (the family's intro on week one) lead; ignore them here.
  const kinds = thisWeek
    .filter((i) => i.kind === 'resolved' || (i.kind === 'note' && i.entry.eventId.startsWith(STORY_PREFIX)))
    .map((i) => (i.kind === 'note' ? i.entry.eventId : i.kind));
  assert.deepEqual(kinds, [
    `${STORY_PREFIX}activity:practice`,
    'resolved',
    `${STORY_PREFIX}activity:gym`,
  ]);
  const resolved = thisWeek.find((i) => i.kind === 'resolved');
  assert.equal(resolved?.kind === 'resolved' && resolved.event.id, event.id);
});

test('a relaunch mid-week resumes the slate and this week\'s lines', () => {
  const before = useGameStore.getState();
  const slateIds = before.activeEvents.map((e) => e.id);
  playerDoActivity('practice'); // saves progress

  useGameStore.getState().reset();
  useGameStore.getState().loadGameState();
  const after = useGameStore.getState();
  assert.deepEqual(after.activeEvents.map((e) => e.id), slateIds);
  assert.equal(after.pendingEventIndex, 0);
  assert.equal(
    after.lastWeekSummary.at(-1)?.eventId,
    `${STORY_PREFIX}activity:practice`
  );
});
