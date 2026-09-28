import { resetFakeDb } from '../../__testing__/nativeMocks';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { usePlayerStore } from '../../../store/playerStore';
import { useGameStore } from '../../../store/gameStore';
import { usePeopleStore } from '../../../store/peopleStore';
import { useSocialStore } from '../../../store/socialStore';
import { useLiveStore } from '../../../store/liveStore';
import { buildEventContext, initializeFirstWeek, runWeekTransition } from '../../weekEngine';
import type { GameEvent } from '../../../types/events';
import { playerDoActivity, playerInteract } from '../../simulation/playerActions';
import { retireCareer } from '../../legacy/retirement';
import { generateWeekEvents, type EventContext } from '../../events/eventEngine';
import { PEOPLE_EVENTS } from '../../../data/events/peopleEvents';
import { personalizeEvent } from '../../events/personalize';
import { FAMILIES } from '../../../data/life/families';
import { PREGNANCY_WEEKS } from '../../../constants/gameConfig';
import type { PlayerArchetype } from '../../../types/player';

function withRandom<T>(value: number, fn: () => T): T {
  const original = Math.random;
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

function start(archetype: PlayerArchetype = 'rich-kid'): void {
  resetFakeDb();
  if (usePlayerStore.getState().player) retireCareer();
  usePlayerStore.getState().createPlayer({
    artistName: 'Nova Kay',
    realName: 'Nova Kay',
    gender: 'female',
    genre: 'pop',
    city: 'atlanta',
    archetype,
    startAge: 24,
  });
  useGameStore.getState().startGame();
  initializeFirstWeek();
  rested();
}

/** Full energy, lots of cash, and no wall-clock regen in the way. */
function rested(): void {
  useLiveStore.getState().setEnergyUpdatedAt(Date.now());
  usePlayerStore.getState().setStatDirect('energy', 100);
  const p = usePlayerStore.getState().player!;
  usePlayerStore.setState({ player: { ...p, money: 50_000 - 1 } });
}

function nextWeek(): void {
  runWeekTransition([], []);
  rested();
}

const partner = () => usePeopleStore.getState().people.find((p) => p.role === 'partner');

beforeEach(() => start());

test('a family exists from the first week, and the Deck says who they are', () => {
  const family = usePeopleStore.getState().people;
  assert.equal(family.length, FAMILIES['rich-kid'].members.length);
  const intro = useGameStore.getState().lastWeekSummary[0].flavorText;
  for (const p of family) assert.ok(intro.includes(p.name));
});

test('the Rich Kid\'s parents pay an allowance', () => {
  runWeekTransition([], []);
  const week = useGameStore.getState().week;
  const expected = FAMILIES['rich-kid'].members.reduce((s, m) => s + (m.allowance ?? 0), 0);
  assert.equal(usePeopleStore.getState().giftedIn(week), expected);
});

test('date, propose, marry, and have a child', () => {
  // A roll of 0 picks each list's first outcome: the spark, the yes, the
  // wedding, the pregnancy.
  const date = withRandom(0, () => playerDoActivity('date'));
  assert.equal(date.ok && date.result.outcome.id, 'spark');
  const p0 = partner();
  assert.ok(p0, 'the date became a partner');
  assert.equal(p0!.bond, 'dating');
  assert.ok(p0!.npcId, 'partners come from the living world');
  assert.equal(date.ok && date.met?.id, p0!.id);
  assert.equal(playerDoActivity('date').ok, false, 'dating is for single people');

  nextWeek();
  const proposal = withRandom(0, () => playerInteract(p0!.id, 'propose'));
  assert.equal(proposal.ok, true);
  assert.equal(partner()!.bond, 'engaged');
  assert.ok(useSocialStore.getState().feed[0].content.includes('ENGAGED'));

  nextWeek();
  const wedding = withRandom(0, () => playerInteract(p0!.id, 'wedding'));
  assert.equal(wedding.ok, true);
  assert.equal(partner()!.bond, 'married');
  assert.equal(partner()!.title, 'your spouse');

  nextWeek();
  const baby = withRandom(0, () => playerInteract(p0!.id, 'try-for-baby'));
  assert.equal(baby.ok, true);
  const due = usePeopleStore.getState().pendingBirth!.dueWeek;
  assert.equal(due, useGameStore.getState().week + PREGNANCY_WEEKS);

  while (useGameStore.getState().week < due) nextWeek();
  const child = usePeopleStore.getState().people.find((p) => p.role === 'child');
  assert.ok(child, 'the baby arrived');
  assert.equal(child!.bornWeek, due);
  assert.equal(usePeopleStore.getState().pendingBirth, null);
  const log = useGameStore.getState().historyLog.map((e) => e.flavorText);
  assert.ok(log.some((l) => l.startsWith(`${child!.name} was born.`)));
});

test('eight different interactions work, each writing to the Deck', () => {
  const worked = new Set<string>();
  const tryIt = (personId: string, id: string) => {
    const r = withRandom(0, () => playerInteract(personId, id));
    if (r.ok) {
      worked.add(id);
      const last = useGameStore.getState().lastWeekSummary.at(-1)!;
      assert.equal(last.eventId, `story:person:${id}`);
      assert.equal(last.flavorText, r.result.line);
    }
    return r;
  };

  withRandom(0, () => playerDoActivity('date'));
  const [dad, mom] = usePeopleStore.getState().people;
  const love = partner()!;

  tryIt(dad.id, 'spend-time');
  tryIt(mom.id, 'ask-money');
  tryIt(love.id, 'hard-launch');
  nextWeek();
  tryIt(dad.id, 'argue');
  tryIt(love.id, 'collab');
  nextWeek();
  usePeopleStore.getState().adjustAffinity(mom.id, -60);
  tryIt(mom.id, 'apologize');
  tryIt(love.id, 'propose');
  nextWeek();
  tryIt(love.id, 'elope');
  nextWeek();
  tryIt(love.id, 'divorce');
  nextWeek();
  tryIt(love.id, 'diss'); // now an ex
  usePeopleStore.getState().adjustAffinity(dad.id, -100);
  tryIt(dad.id, 'cut-off');

  assert.ok(worked.size >= 8, `only ${[...worked].join(', ')}`);
  assert.equal(partner(), undefined);
  assert.ok(
    usePeopleStore.getState().people.find((p) => p.id === dad.id)!.traits.includes('estranged')
  );
});

test('events mention the artist\'s people by name', () => {
  const people = usePeopleStore.getState().people;
  const event = PEOPLE_EVENTS.find((e) => e.id === 'people-parent-saw-messages')!;
  const filled = personalizeEvent(event, people);
  const named = people.find((p) => filled.title.includes(p.name));
  assert.ok(named, 'the title names a parent');
  assert.ok(filled.description.includes(named!.title), 'and says who they are to you');

  // And through the real slate: with only people events in play, whatever
  // is slated names somebody real.
  const ctx: EventContext = { ...buildEventContext(), controversyActive: true, hasReleasedTrack: true };
  const slate: GameEvent[] = [];
  for (let i = 0; i < 40; i++) {
    slate.push(...generateWeekEvents(ctx).filter((e) => e.id.startsWith('people-')));
  }
  assert.ok(slate.length > 0, 'people events get slated');
  for (const e of slate) {
    const text = JSON.stringify(e);
    assert.ok(people.some((p) => text.includes(p.name)) || /manager|friend/.test(e.id), e.id);
    assert.ok(!/\{(parent|sibling|partner|child|friend|ex|manager)(Title)?\}/i.test(text), e.id);
  }
});

test('retiring clears the circle; the next career has its own family', () => {
  const first = usePeopleStore.getState().people.map((p) => p.id);
  start('church-singer');
  const second = usePeopleStore.getState().people;
  assert.equal(second.length, FAMILIES['church-singer'].members.length);
  assert.ok(second.every((p) => !first.includes(p.id)));
});
