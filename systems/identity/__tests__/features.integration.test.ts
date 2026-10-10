import { resetFakeDb } from '../../__testing__/nativeMocks';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { usePlayerStore } from '../../../store/playerStore';
import { useGameStore } from '../../../store/gameStore';
import { useLiveStore } from '../../../store/liveStore';
import { useIdentityStore } from '../../../store/identityStore';
import { useCalendarStore } from '../../../store/calendarStore';
import { useLegalStore } from '../../../store/legalStore';
import { useLabelStore } from '../../../store/labelStore';
import { useMusicStore } from '../../../store/musicStore';
import { useCareerStore } from '../../../store/careerStore';
import { useMogulStore } from '../../../store/mogulStore';
import { useMetaStore } from '../../../store/metaStore';
import { useWorldStore } from '../../../store/worldStore';
import { useShowStore } from '../../../store/showStore';
import { useProgressionStore } from '../../../store/progressionStore';
import { CAREER_LEVELS } from '../../../constants/progression';
import { buildEventContext, initializeFirstWeek, runWeekTransition } from '../../weekEngine';
import { retireCareer } from '../../legacy/retirement';
import { applyConsequence } from '../../events/consequenceApplicator';
import { getAvailableChoices, generateWeekEvents, isEventEligible } from '../../events/eventEngine';
import { personalizeEvent } from '../../events/personalize';
import { ALL_EVENTS, getEventById } from '../../../data/events';
import { consumeSeed, plantSeed, runIdentityWeek } from '../identityTick';
import { buildIdentitySnapshot } from '../snapshot';
import { hasTrait } from '../traits';
import { getTrait } from '../../../data/identity/traits';
import { chargeArtist, hireLawyer, runLegalWeek, IN_JAIL_TAG } from '../../legal/legalTick';
import { buildActivityContext } from '../../life/lifeContext';
import { activityAvailability } from '../../life/activityEngine';
import { getLifeActivity } from '../../../data/life/lifeActions';
import { releaseQuickTrack } from '../../music/quickRelease';
import { signDealNow } from '../../industry/dealActions';
import { rerecord } from '../../music/mastersActions';
import { refreshScouting, scoutedNpcs, signArtist, startLabel, startVenture } from '../../mogul/mogulActions';
import { legendNpcId } from '../../meta/legends';
import { applyScenario, finishScenario } from '../../meta/applyScenario';
import { bookGig, completeShow, showsTonight } from '../../show/showActions';
import { applyAwardResults, rollAwardNight, runCalendarWeek } from '../../calendar/calendarTick';
import { CALENDAR } from '../../calendar/calendar';
import { startEra } from '../eraActions';
import { announceComeback } from '../../career/comeback';
import type { GameEvent } from '../../../types/events';

const TOKEN = /\{[A-Za-z]+\}/;

function start(): void {
  resetFakeDb();
  if (usePlayerStore.getState().player) retireCareer();
  usePlayerStore.getState().createPlayer({
    artistName: 'Nova Kay',
    realName: 'Nova Kay',
    gender: 'female',
    genre: 'pop',
    city: 'atlanta',
    archetype: 'rich-kid',
    startAge: 24,
  });
  useGameStore.getState().startGame();
  initializeFirstWeek();
  rested();
}

function rested(money = 80_000): void {
  useLiveStore.getState().setEnergyUpdatedAt(Date.now());
  usePlayerStore.getState().setStatDirect('energy', 100);
  const p = usePlayerStore.getState().player!;
  usePlayerStore.setState({ player: { ...p, money } });
}

/** Every token in what the player reads was filled when the event was slated. */
function assertFilled(e: GameEvent): void {
  const texts = [e.title, e.description, ...e.choices.flatMap((c) => [c.text, c.consequences.flavorText, c.consequences.plantSeed?.note ?? ''])];
  for (const t of texts) assert.ok(!TOKEN.test(t), `${e.id} shows an unfilled token: "${t}"`);
}

/** Resolve the week's slate like the Deck does, picking choices at random. */
function resolveSlate(): number {
  let n = 0;
  for (;;) {
    const g = useGameStore.getState();
    const event = g.activeEvents[g.pendingEventIndex];
    if (!event) break;
    assertFilled(event);
    const choices = getAvailableChoices(event, g.playerTags);
    const choice = choices[Math.floor(Math.random() * choices.length)] ?? event.choices[0];
    const result = applyConsequence(choice.consequences, g.week);
    g.resolveCurrentEvent(choice.id, { eventId: event.id, choiceId: choice.id, week: g.week, flavorText: result.flavorText, category: event.category });
    if (event.seedId) consumeSeed(event.seedId);
    n += 1;
  }
  return n;
}

function nextWeek(): void {
  runWeekTransition([], []);
  rested(Math.max(usePlayerStore.getState().player!.money, 20_000));
}

beforeEach(() => start());

test('a new life starts wanting things, with a dream to pick and a year begun', () => {
  const identity = useIdentityStore.getState();
  assert.ok(identity.wants.length >= 1, 'wants rolled');
  assert.ok(identity.dreamOffer && identity.dreamOffer.options.length > 0, 'a dream to choose');
  assert.ok(useCalendarStore.getState().yearStart, 'the year began');
});

test('thirty weeks of a life: every system turns over and every slated event reads clean', () => {
  let resolved = 0;
  for (let i = 0; i < 30; i++) {
    resolved += resolveSlate();
    if (i % 4 === 1) releaseQuickTrack();
    nextWeek();
  }
  assert.ok(resolved > 10, `resolved ${resolved} decisions`);
  const cal = useCalendarStore.getState();
  assert.ok(cal.chart && cal.chart.rows.length > 0, 'the chart board exists');
  assert.ok(cal.festival, 'a festival lineup was announced');
  assert.ok(cal.awards, 'award season happened');
  assert.ok(cal.wrappedHistory.length >= 2, 'two years wrapped');
  const ledger = useCareerStore.getState().economy.ledger;
  assert.ok(ledger.some((l) => l.kind === 'streaming'), 'songs paid royalties');
  assert.ok(useIdentityStore.getState().wantLog.length > 0, 'wants settled');
});

test('the law: charged, a lawyer, a sentence, life inside, and home again', () => {
  releaseQuickTrack();
  chargeArtist('assault');
  assert.equal(useLegalStore.getState().activeCase?.stage, 'charged');
  const slate = generateWeekEvents(buildEventContext());
  assert.ok(slate.some((e) => e.id === 'legal-pick-lawyer'), 'the court date is slated first');
  assert.equal(hireLawyer('public').ok, true);
  const verdictWeek = useLegalStore.getState().activeCase!.verdictWeek!;
  runLegalWeek(verdictWeek, () => 0.01);
  const jailed = useLegalStore.getState().activeCase!;
  assert.equal(jailed.stage, 'jailed');
  assert.ok(useGameStore.getState().playerTags.includes(IN_JAIL_TAG));

  const ctx = buildActivityContext()!;
  assert.equal(activityAvailability(getLifeActivity('gym')!, ctx).ok, false, 'no gym from a cell');
  assert.equal(activityAvailability(getLifeActivity('jail-write')!, ctx).ok, true);
  for (const e of generateWeekEvents(buildEventContext())) {
    assert.ok(e.triggers.some((t) => t.type === 'in_jail'), `${e.id} reached a jail cell`);
  }

  runLegalWeek(jailed.releaseWeek!, () => 0.5);
  assert.equal(useLegalStore.getState().activeCase, null);
  assert.equal(useLegalStore.getState().record[0].outcome, 'served');
  assert.ok(!useGameStore.getState().playerTags.includes(IN_JAIL_TAG));
  runIdentityWeek();
  assert.ok(hasTrait('jailbird'), 'serving time leaves a mark');
});

test('masters: a predatory deal owns the songs, and "(Your Version)" takes one back', () => {
  assert.ok(signDealNow('predatory', useGameStore.getState().week));
  const r = releaseQuickTrack()!;
  const original = useMusicStore.getState().discography.find((t) => t.id === r.track.id)!;
  assert.equal(original.owner, 'label');
  assert.equal(original.royaltyShare, 0.15);
  assert.equal(useLabelStore.getState().contract!.releasesDelivered, 1, 'releases count toward the quota');
  assert.equal(rerecord(original.id).ok, false, 'not while signed to them');

  useLabelStore.getState().endContract('fulfilled');
  rested(200_000);
  const res = rerecord(original.id);
  assert.equal(res.ok, true);
  const disc = useMusicStore.getState().discography;
  const mine = disc.find((t) => t.rerecordOf === original.id)!;
  assert.equal(mine.owner, 'artist');
  assert.ok(mine.title.endsWith('(Your Version)'));
  assert.equal(disc.find((t) => t.id === original.id)!.rerecorded, true);
  assert.equal(buildIdentitySnapshot()!.labelOwnedTracks, 0, 'the re-record reclaims it');
});

test('callbacks: a seed comes back years later, naming the same person', () => {
  plantSeed({ kind: 'lent-money', after: [2, 2], who: 'npc', name: 'Dre', note: 'You lent Dre $500.' }, useGameStore.getState().week);
  const event = getEventById('callback-loan-again')!;
  assert.equal(isEventEligible(event, buildEventContext()), false, 'not ripe yet');
  nextWeek();
  nextWeek();
  const ctx = buildEventContext();
  assert.equal(isEventEligible(event, ctx), true, 'ripe');
  const told = personalizeEvent(event, ctx);
  assert.ok(told.title.includes('Dre'));
  assert.equal(told.callback?.note, 'You lent Dre $500.');
  assertFilled(told);
  consumeSeed(told.seedId!);
  assert.equal(useIdentityStore.getState().seeds.length, 0);
  assert.equal(useIdentityStore.getState().callbacksPaid, 1);
});

test('every callback payoff has a planter, and every referenced trait and charge exists', () => {
  const planted = new Set<string>();
  for (const e of ALL_EVENTS) for (const c of e.choices) if (c.consequences.plantSeed) planted.add(c.consequences.plantSeed.kind);
  // Activities and scenarios plant seeds too.
  for (const kind of ['lent-money', 'investment', 'club-fight', 'dissed-rival', 'wild-night', 'inspired-kid', 'scholarship-kid', 'old-show']) planted.add(kind);
  for (const e of ALL_EVENTS) {
    for (const t of e.triggers) {
      if (t.type === 'seed_ripe') assert.ok(planted.has(t.seed!), `${e.id} waits on seed "${t.seed}" that nothing plants`);
      if (t.type === 'has_trait' || t.type === 'lacks_trait') assert.ok(getTrait(t.trait!), `${e.id} names trait ${t.trait}`);
    }
    for (const c of e.choices) {
      if (c.requiresTrait) assert.ok(getTrait(c.requiresTrait), `${e.id}/${c.id} needs unknown trait ${c.requiresTrait}`);
      if (c.consequences.legalCharge) assert.ok(c.consequences.legalCharge.length > 0);
    }
  }
  assert.equal(new Set(ALL_EVENTS.map((e) => e.id)).size, ALL_EVENTS.length, 'event ids are unique');
});

test('the mogul: found a label, sign someone from the world, start a business', () => {
  usePlayerStore.getState().setStatDirect('fans', 400_000);
  // Level derives from XP, so grant the XP of level 15.
  useProgressionStore.setState({ xp: CAREER_LEVELS[14].xpToReach, level: 15 });
  rested(3_000_000);
  assert.equal(startLabel('Night Shift', '#FFCE5C').ok, true);
  refreshScouting(true);
  const scout = scoutedNpcs()[0];
  assert.ok(scout, 'someone worth signing');
  assert.equal(signArtist(scout.id).ok, true);
  assert.equal(useMogulStore.getState().activeRoster().length, 1);
  const venture = startVenture('podcast');
  assert.equal(venture.ok, true, venture.ok ? '' : venture.reason);
  nextWeek();
  const ledger = useCareerStore.getState().economy.ledger;
  assert.ok(ledger.some((l) => l.kind === 'venture'), 'the business reported its week');
});

test('a finished life lives on in the next world', () => {
  releaseQuickTrack();
  retireCareer();
  const life = useMetaStore.getState().pastLives[0];
  assert.ok(life, 'recorded as a past life');
  assert.equal(life.artistName, 'Nova Kay');
  start();
  assert.ok(useWorldStore.getState().world!.npcs[legendNpcId(life.id)], 'in the new world');
  const legends = buildEventContext().legends!;
  assert.ok(legends.alive.length + legends.dead.length >= 1);
});

test('a starting scenario: the one-hit wonder still has the hit, owned by the old label', () => {
  resetFakeDb();
  retireCareer();
  usePlayerStore.getState().createPlayer({
    artistName: 'June Vale',
    realName: 'June Vale',
    gender: 'female',
    genre: 'pop',
    city: 'atlanta',
    archetype: 'indie-dreamer',
    startAge: 34,
  });
  applyScenario('one-hit-wonder');
  useGameStore.getState().startGame();
  initializeFirstWeek();
  finishScenario();
  const hit = useMusicStore.getState().discography.find((t) => t.title === 'Summer Static')!;
  assert.equal(hit.owner, 'label');
  assert.ok(usePlayerStore.getState().player!.stats.fans >= 250_000);
  assert.ok(useGameStore.getState().lastWeekSummary.some((l) => l.flavorText.includes('Summer Static')));
});

test('a club gig: book it, play it, get paid', () => {
  releaseQuickTrack();
  rested(1_000);
  assert.equal(bookGig().ok, true);
  const venue = showsTonight().find((v) => v.kind === 'gig')!;
  assert.ok(venue);
  completeShow(venue, { score: 82, setlist: ['a'], highlights: [], moment: null });
  assert.ok(usePlayerStore.getState().player!.money > 1_000);
  assert.equal(useShowStore.getState().history[0].score, 82);
  assert.equal(showsTonight().length, 0, 'one night only');
});

test('award night: winners rolled once, then booked', () => {
  usePlayerStore.getState().setStatDirect('fans', 30_000_000);
  usePlayerStore.getState().setStatDirect('industryRespect', 95);
  releaseQuickTrack();
  runCalendarWeek(CALENDAR.nominations);
  const awards = useCalendarStore.getState().awards!;
  assert.ok(awards.nominations.length > 0);
  const first = rollAwardNight();
  assert.equal(rollAwardNight(), first, 'never re-rolls');
  applyAwardResults(true);
  assert.equal(useCalendarStore.getState().awards!.resolved, true);
  const mine = awards.nominations.filter((n) => n.nominees.some((x) => x.isPlayer)).length;
  assert.equal(useCalendarStore.getState().awardHistory.length, mine);
});

test('eras and the comeback change how the next song lands', () => {
  rested(500_000);
  assert.equal(startEra({ name: 'Velvet', color: '#8B6CFF', aesthetic: 'noir', persona: 'villain' }).ok, true);
  const r = releaseQuickTrack()!;
  const era = useIdentityStore.getState().currentEra()!;
  assert.ok(era.trackIds.includes(r.track.id));
  assert.equal(r.track.eraId, era.id);

  useCareerStore.getState().setArc({ phase: 'decline', peakFans: 500_000 });
  assert.equal(announceComeback(), true);
  assert.ok(useIdentityStore.getState().comeback);
  releaseQuickTrack();
  assert.equal(useIdentityStore.getState().comeback, null, 'the next release settles it');
});
