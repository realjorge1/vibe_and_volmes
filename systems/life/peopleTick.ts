import type { Person } from '../../types/people';
import type { Npc, WorldEvent } from '../../types/world';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { usePeopleStore } from '../../store/peopleStore';
import { useCareerStore } from '../../store/careerStore';
import { FAMILIES } from '../../data/life/families';
import { CHILD_NAMES } from '../../data/life/names';
import { MAX_FRIENDS } from '../../constants/gameConfig';
import {
  activePeople,
  applyInteractionEffect,
  capitalize,
  generateFamily,
  newPersonId,
  partnerOf,
  weeklyAllowance,
  weeklyDrift,
} from './peopleEngine';
import { publishStoryBeat } from '../social/storyPost';
import { pick } from '../../utils/random';
import { uid } from '../../utils/id';

/**
 * The store-touching side of People: giving a new career its family,
 * bringing people met out in the world into the artist's life, and the
 * weekly pass (drift, allowances, births, partners leaving, and headlines
 * about the people the artist knows).
 */

/** A partner who falls this far leaves on their own. */
const PARTNER_LEAVES_AT = -50;

/** Give the career its family, once. Writes the family's intro to the Deck. */
export function ensureFamily(): void {
  const player = usePlayerStore.getState().player;
  const people = usePeopleStore.getState();
  if (!player || people.people.length > 0) return;
  const week = useGameStore.getState().week;
  const { people: family, intro } = generateFamily(FAMILIES[player.archetype], week);
  people.setPeople(family);
  useGameStore.getState().addWeekSummaryNotes([intro], 'personal');
}

/**
 * Someone the artist met through an activity joins their people. Returns the
 * new person, or null when they don't fit (already taken, too many friends).
 */
export function meetPerson(
  role: 'partner' | 'friend' | 'producer',
  npc: Npc,
  week: number
): Person | null {
  const store = usePeopleStore.getState();
  const people = store.people;
  if (people.some((p) => p.npcId === npc.id)) return null;
  if (role === 'partner' && partnerOf(people)) return null;
  if (role === 'friend' && people.filter((p) => p.role === 'friend').length >= MAX_FRIENDS) {
    return null;
  }
  const person: Person = {
    id: newPersonId(),
    name: npc.name,
    role,
    title: role === 'partner' ? 'your partner' : role === 'friend' ? 'your friend' : 'your producer',
    affinity: role === 'partner' ? 30 : 20,
    traits: [],
    npcId: npc.id,
    sinceWeek: week,
    lastSeenWeek: week,
  };
  if (role === 'partner') person.bond = 'dating';
  store.addPerson(person);
  return person;
}

function birth(week: number, lines: string[]): void {
  const store = usePeopleStore.getState();
  const due = store.pendingBirth;
  if (!due || week < due.dueWeek) return;
  const taken = new Set(store.people.map((p) => p.name));
  const free = CHILD_NAMES.filter((n) => !taken.has(n));
  const name = pick(free.length > 0 ? free : [...CHILD_NAMES]);
  const child: Person = {
    id: newPersonId(),
    name,
    role: 'child',
    title: Math.random() < 0.5 ? 'your daughter' : 'your son',
    affinity: 70,
    traits: [],
    sinceWeek: week,
    lastSeenWeek: week,
    bornWeek: week,
  };
  store.addPerson(child);
  store.setPendingBirth(null);
  usePlayerStore.getState().updateStats([
    { stat: 'mentalHealth', delta: 10 },
    { stat: 'fans', delta: 2_000 },
  ]);
  useCareerStore.getState().addHistory({
    id: uid('hist'),
    kind: 'triumph',
    week,
    summary: `welcomed a child, ${name}`,
    severity: 50,
    tags: ['birth', 'family'],
    artistId: null,
    resurfacedCount: 0,
    buried: false,
  });
  lines.push(`${name} was born. ${capitalize(child.title)} has your eyes and, already, your volume.`);
  const player = usePlayerStore.getState().player;
  if (player) {
    publishStoryBeat(
      {
        sentiment: 'hype',
        from: 'gossip',
        text: `${player.artistName} is a parent! Welcome to the world, ${name} 🍼`,
        trend: 'WelcomeBaby',
      },
      'people:birth'
    );
  }
}

/** A pending birth still arrives if the other parent leaves. */
function partnerLeaves(lines: string[]): void {
  const store = usePeopleStore.getState();
  const partner = partnerOf(activePeople(store.people));
  if (!partner || partner.affinity > PARTNER_LEAVES_AT) return;
  store.setPeople(applyInteractionEffect(store.people, partner.id, 'break-up'));
  usePlayerStore.getState().updateStats([{ stat: 'mentalHealth', delta: -8 }]);
  lines.push(`${partner.name} left you. The note on the counter was one line long.`);
  const player = usePlayerStore.getState().player;
  if (player && partner.npcId) {
    publishStoryBeat(
      {
        sentiment: 'shade',
        from: 'gossip',
        text: `${partner.name} has reportedly moved out of ${player.artistName}'s place. It is over 💔`,
        trend: 'BreakupSzn',
      },
      'people:partner-left'
    );
  }
}

/** Headlines about people the artist knows, and what they stir up. */
function worldNews(worldEvents: WorldEvent[], lines: string[]): void {
  const people = activePeople(usePeopleStore.getState().people);
  const byNpc = new Map(people.filter((p) => p.npcId).map((p) => [p.npcId!, p]));
  let told = 0;
  for (const e of worldEvents) {
    if (told >= 2) break;
    const person = byNpc.get(e.primaryId) ?? (e.secondaryId ? byNpc.get(e.secondaryId) : undefined);
    if (!person) continue;
    if (person.role === 'partner' && e.type === 'romance-started') {
      useGameStore.getState().addTag('partner-cheating-rumor');
      lines.push(`Photos of ${person.name} with someone else are all over the blogs.`);
    } else {
      lines.push(`${capitalize(person.title)} ${person.name} made headlines: ${e.headline}`);
    }
    told += 1;
  }
}

/**
 * One week of the artist's personal life. Runs in the week transition after
 * the world moves (so headlines are this week's) and before the next slate
 * is drawn (so what happens here can trigger events).
 */
export function runPeopleWeek(week: number, worldEvents: WorldEvent[]): void {
  const store = usePeopleStore.getState();
  const player = usePlayerStore.getState().player;
  if (!player || store.people.length === 0) return;
  const lines: string[] = [];

  store.setPeople(weeklyDrift(store.people, week));

  const allowance = weeklyAllowance(
    usePeopleStore.getState().people,
    player.money,
    store.giftedIn(week)
  );
  if (allowance.amount > 0) {
    usePlayerStore.getState().addMoney(allowance.amount);
    store.recordGift(week, allowance.amount);
  }

  // A parent who disapproves of all this weighs on you while it lasts.
  const disapproving = activePeople(usePeopleStore.getState().people).some(
    (p) => p.traits.includes('disapproving') && p.affinity < 0
  );
  if (disapproving) usePlayerStore.getState().updateStats([{ stat: 'mentalHealth', delta: -1 }]);

  birth(week, lines);
  partnerLeaves(lines);
  worldNews(worldEvents, lines);

  useGameStore.getState().addWeekSummaryNotes(lines, 'personal');
}
