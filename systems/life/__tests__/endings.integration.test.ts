import { resetFakeDb } from '../../__testing__/nativeMocks';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { usePlayerStore } from '../../../store/playerStore';
import { useGameStore } from '../../../store/gameStore';
import { usePeopleStore } from '../../../store/peopleStore';
import { useCareerStore } from '../../../store/careerStore';
import { useMetaStore } from '../../../store/metaStore';
import { useRelationshipStore } from '../../../store/relationshipStore';
import { checkForEnding, initializeFirstWeek } from '../../weekEngine';
import { endCareer } from '../../legacy/endCareer';
import { toStoryCard } from '../../legacy/storyCard';
import { applyHeir, FAMOUS_PARENT_TAG } from '../../meta/applyHeir';
import { applyPendingInheritance } from '../../meta/applyInheritance';
import { newPersonId } from '../peopleEngine';
import { getBloodline } from '../../../data/meta/bloodlines';
import { getPerk } from '../../../data/meta/perks';
import { RIVAL_ARTISTS } from '../../../data/artists/rivalArtists';
import { WEEKS_PER_YEAR } from '../../../constants/gameConfig';
import type { CreatePlayerData } from '../../../types/player';

const ARTIST: CreatePlayerData = {
  artistName: 'Nova Kay',
  realName: 'Nova Okafor',
  gender: 'female',
  genre: 'r&b',
  city: 'atlanta',
  archetype: 'church-singer',
  startAge: 24,
};

function start(data: CreatePlayerData = ARTIST): void {
  usePlayerStore.getState().createPlayer(data);
  useGameStore.getState().startGame();
  initializeFirstWeek();
}

function freshMeta(): void {
  useMetaStore.setState({
    retiredCareers: [],
    identitiesEarned: {},
    pendingHeir: null,
    pendingBloodlineId: null,
    pendingPerkIds: [],
    totalCareers: 0,
    lifetimeLegacy: 0,
    unlockedBloodlineIds: [],
    unlockedPerkIds: [],
  });
}

beforeEach(() => {
  resetFakeDb();
  freshMeta();
  if (usePlayerStore.getState().player) endCareer();
  freshMeta();
  start();
});

test('four endings fire from the week check and write the last line', () => {
  const setups: [string, () => void][] = [
    ['burnout', () => {
      usePlayerStore.getState().setStatDirect('mentalHealth', 5);
      useCareerStore.getState().adjustMental({ burnout: 100 });
    }],
    ['cancelled', () => {
      usePlayerStore.getState().setStatDirect('reputation', 2);
      usePlayerStore.getState().setStatDirect('industryRespect', 2);
    }],
    ['died-reckless', () => useCareerStore.getState().adjustMental({ addictionRisk: 100 })],
    ['died-of-age', () => {
      const p = usePlayerStore.getState().player!;
      usePlayerStore.setState({ player: { ...p, startAge: 85 } });
    }],
  ];
  for (const [id, setup] of setups) {
    resetFakeDb();
    endCareer();
    start();
    useGameStore.getState().setWeek(20);
    setup();
    assert.equal(checkForEnding(20, () => 0), true, id);
    const ending = useGameStore.getState().ending!;
    assert.equal(ending.id, id);
    const last = useGameStore.getState().lastWeekSummary.at(-1)!.flavorText;
    assert.ok(last.includes('Nova Kay') && last.includes(String(ending.age)), last);
    assert.equal(checkForEnding(21, () => 0), false, 'an ended career stays ended');
  }
});

test('every ending goes through the dossier, and the ribbon is collected', () => {
  useGameStore.getState().setEnding({ id: 'burnout', week: 30, age: 26 });
  const r = endCareer();
  assert.equal(r.dossier.ending?.id, 'burnout');
  assert.equal(r.dossier.ending?.age, 26);
  assert.equal(r.heir, null);
  const meta = useMetaStore.getState();
  assert.equal(meta.retiredCareers[0].ending, 'burnout');
  assert.equal(meta.identitiesEarned[r.dossier.identity.label], 1);
  assert.equal(usePlayerStore.getState().player, null, 'the save is wiped');
  assert.equal(useGameStore.getState().ending, null);

  const card = toStoryCard(r.dossier);
  assert.equal(card.statLines[0], 'Burned Out at 26');
  assert.ok(card.shareText.includes(r.dossier.ending!.finalLine));
});

test('retiring from the Chronicle is an ending too', () => {
  useGameStore.getState().setEnding({ id: 'retirement', week: 1, age: 24 });
  const r = endCareer();
  assert.equal(r.dossier.ending?.kind, 'retired');
});

test('continue as your child, end to end', () => {
  // A family worth inheriting: money, a rival, a spouse, two kids.
  const p = usePlayerStore.getState().player!;
  usePlayerStore.setState({ player: { ...p, money: 100_000 } });
  const rival = RIVAL_ARTISTS[0];
  useRelationshipStore.getState().introduceArtist(rival.id);
  useRelationshipStore.getState().setRelationshipType(rival.id, 'rival');
  const week = 20 * WEEKS_PER_YEAR;
  useGameStore.getState().setWeek(week);
  const spouse = { id: newPersonId(), name: 'Kai', role: 'partner' as const, title: 'your spouse', bond: 'married' as const, affinity: 60, traits: [], sinceWeek: 5, lastSeenWeek: week };
  const luna = { id: newPersonId(), name: 'Luna', role: 'child' as const, title: 'your daughter', affinity: 80, traits: [], sinceWeek: 50, lastSeenWeek: week, bornWeek: 50, otherParentId: spouse.id };
  const milo = { id: newPersonId(), name: 'Milo', role: 'child' as const, title: 'your son', affinity: 40, traits: [], sinceWeek: 70, lastSeenWeek: week, bornWeek: 70, otherParentId: spouse.id };
  usePeopleStore.getState().setPeople([...usePeopleStore.getState().people, spouse, luna, milo]);
  useCareerStore.getState().adjustMental({ addictionRisk: 100 });
  assert.equal(checkForEnding(week, () => 0), true);

  // The heir is saved to the meta profile before the wipe…
  const r = endCareer(luna.id);
  assert.ok(r.heir);
  assert.equal(usePlayerStore.getState().player, null);
  const heir = useMetaStore.getState().pendingHeir!;
  assert.equal(heir.childName, 'Luna');
  assert.equal(heir.surname, 'Okafor');
  assert.equal(heir.money, 40_000);
  assert.ok(heir.rivalIds.includes(rival.id));
  assert.equal(heir.parent.ending, 'died-reckless');

  // …and onboarding, pre-filled from it, starts the child's career in the
  // same order app/onboarding.tsx runs.
  usePlayerStore.getState().createPlayer({
    artistName: 'Luna O',
    realName: `${heir.childName} ${heir.surname}`,
    gender: heir.gender,
    genre: heir.genre,
    city: heir.city,
    archetype: 'rich-kid',
    startAge: heir.startAge,
  });
  const moneyBefore = usePlayerStore.getState().player!.money;
  applyHeir(useMetaStore.getState().consumeHeir()!);
  applyPendingInheritance();
  useGameStore.getState().startGame();
  initializeFirstWeek();

  const child = usePlayerStore.getState().player!;
  assert.equal(child.generation, 2);
  assert.ok(child.money >= moneyBefore + heir.money);
  assert.ok(useGameStore.getState().hasTag(FAMOUS_PARENT_TAG));
  assert.equal(useMetaStore.getState().pendingHeir, null, 'consumed once');

  const rel = useRelationshipStore.getState().getRelationship(rival.id);
  assert.equal(rel?.type, 'rival', 'the family rival remembers');

  const family = usePeopleStore.getState().people;
  assert.deepEqual(
    family.map((m) => `${m.title}:${m.name}`).sort(),
    ['your brother:Milo', 'your parent:Kai'],
    'the other parent and sibling, not an archetype family; Nova died'
  );

  // The bloodline from how Nova is remembered came with its perk.
  if (heir.bloodlineId) {
    const perk = getPerk(getBloodline(heir.bloodlineId)!.perkId)!;
    for (const tag of perk.startingTags) assert.ok(useGameStore.getState().hasTag(tag), tag);
  }
  const intro = useGameStore.getState().lastWeekSummary.map((e) => e.flavorText).join(' ');
  assert.match(intro, /Nova Kay/);
});
