import type { PRStrategyId, VenueScale } from '../../types/industry';
import { useGameStore } from '../../store/gameStore';
import { useLabelStore } from '../../store/labelStore';
import { useTourStore } from '../../store/tourStore';
import { usePressStore } from '../../store/pressStore';
import { useCareerStore } from '../../store/careerStore';
import { applyPRStrategy } from '../pr/prEngine';
import { resolveSession } from '../media/mediaEngine';
import { planTour, confirmTour } from '../tour/tourEngine';
import { signOffer } from '../industry/labelEngine';
import { emptyBundle } from './influenceGraph';
import { applyBundle } from './applyBundle';
import { useActivityStore } from '../../store/activityStore';
import { getLifeActivity, ACTIVITY_CATEGORIES } from '../../data/life/lifeActions';
import { activityAvailability, resolveActivity, type ActivityResult } from '../life/activityEngine';
import { buildActivityContext, currentAge, currentRival, randomWorldNpc } from '../life/lifeContext';
import { applyConsequence } from '../events/consequenceApplicator';
import { spendEnergy } from '../live/energySystem';
import { publishStoryBeat } from '../social/storyPost';
import { saveProgress } from '../persistence';
import { usePlayerStore } from '../../store/playerStore';
import { usePeopleStore } from '../../store/peopleStore';
import { getInteraction } from '../../data/life/interactions';
import { FIRST_NAMES } from '../../data/life/names';
import { PREGNANCY_WEEKS } from '../../constants/gameConfig';
import {
  applyInteractionEffect,
  interactionAvailability,
  newPersonId,
  resolveInteraction,
  type InteractionResult,
} from '../life/peopleEngine';
import { meetPerson } from '../life/peopleTick';
import type { Person } from '../../types/people';
import type { HomeId } from '../../types/status';
import { useStatusStore } from '../../store/statusStore';
import { getHome } from '../../data/life/homes';
import { homeAvailability } from '../life/assetEngine';
import { moveHome } from '../life/assetTick';
import { pick } from '../../utils/random';
import { useDramaStore } from '../../store/dramaStore';
import { replyDm, fillDm } from '../drama/dmEngine';
import { dmContext } from '../drama/dramaTick';
import { spawnMoment } from '../drama/publish';
import { fillText } from '../drama/discourse';
import { checkIdentityNow } from '../identity/identityTick';

/**
 * Thin action layer for player-initiated Phase 3 decisions made outside
 * the weekly tick (from the Industry UI). Each builds a one-shot influence
 * bundle, runs the relevant engine, applies it once, and persists.
 */

function persist(): void {
  useLabelStore.getState().save();
  useTourStore.getState().save();
  usePressStore.getState().save();
  useCareerStore.getState().save();
}

export function playerRespondToControversy(
  instanceId: string,
  strategyId: PRStrategyId
): string {
  const week = useGameStore.getState().week;
  const bundle = emptyBundle();
  const result = applyPRStrategy(instanceId, strategyId, week, bundle);
  applyBundle(bundle, week);
  persist();
  return result.message;
}

export function playerResolveInterview(): string | null {
  const week = useGameStore.getState().week;
  const bundle = emptyBundle();
  const res = resolveSession(bundle, week);
  applyBundle(bundle, week);
  persist();
  return res?.headline ?? null;
}

export function playerSignOffer(offerId: string): boolean {
  const week = useGameStore.getState().week;
  const ok = signOffer(offerId, week);
  persist();
  return ok;
}

export function playerDeclineOffer(offerId: string): void {
  useLabelStore.getState().removeOffer(offerId);
  persist();
}

export function playerStartTour(scale: VenueScale): boolean {
  const week = useGameStore.getState().week;
  const tour = planTour(scale, week);
  if (!tour) return false;
  confirmTour(tour);
  persist();
  return true;
}

// ─── Life: activities ──────────────────────────────────────────────────────

export type DoActivityResult =
  | { ok: true; result: ActivityResult; posted: boolean; met: Person | null }
  | { ok: false; reason: string };

/**
 * Do one activity from the Life tab. Resolves through the pure activity
 * engine, applies the outcome through the same consequence pipeline as event
 * choices, writes the story line into the Deck, and posts dramatic outcomes
 * to the feed. Energy is spent with `spendEnergy`, so the wall-clock regen is
 * reconciled first.
 */
export function playerDoActivity(activityId: string): DoActivityResult {
  const activity = getLifeActivity(activityId);
  if (!activity) return { ok: false, reason: 'Unknown activity' };
  // Launchers (the escape) are played on their own screen, not rolled.
  if (activity.opens || activity.outcomes.length === 0) return { ok: false, reason: 'Open it to play it' };
  const ctx = buildActivityContext();
  const player = usePlayerStore.getState().player;
  if (!ctx || !player) return { ok: false, reason: 'No career in progress' };

  const availability = activityAvailability(activity, ctx);
  if (!availability.ok) return { ok: false, reason: availability.reason };
  if (!spendEnergy(activity.energyCost)) return { ok: false, reason: 'Too tired' };

  const rival = activity.npc === 'rival' ? currentRival() : null;
  // Someone you might meet: single when the outcome could make them your
  // partner, famous for a celebrity date, and never someone already in your
  // life.
  const meetsPartner = activity.outcomes.some((o) => o.meets === 'partner');
  const npc =
    activity.npc === 'world' || activity.npc === 'celebrity'
      ? randomWorldNpc({
          roles: meetsPartner ? ['artist', 'producer', 'influencer'] : ['artist', 'producer'],
          unlinked: true,
          single: meetsPartner,
          famous: activity.npc === 'celebrity',
        })
      : null;
  const npcName = rival?.name ?? npc?.name ?? pick([...FIRST_NAMES]);

  // Re-read stats after the energy spend so the tilt sees the live values.
  const live = buildActivityContext() ?? ctx;
  const result = resolveActivity(activity, live, {
    playerName: player.artistName,
    npc: npcName,
  });
  const withRival =
    rival && result.consequences.rivalryIntensityDelta
      ? {
          ...result.consequences,
          rivalryIntensityDelta: {
            ...result.consequences.rivalryIntensityDelta,
            artistId: rival.id,
          },
        }
      : result.consequences;
  // A choice that comes back later knows exactly who it was about. Someone
  // new (the kid at the hospital) gets a name here.
  const plant = withRival.plantSeed;
  const newName = plant?.who === 'new' ? pick([...FIRST_NAMES]) : undefined;
  const consequences = plant
    ? {
        ...withRival,
        plantSeed: {
          ...plant,
          name: newName ?? plant.name,
          note: newName ? plant.note.split('{seed}').join(newName) : plant.note,
          npcId: plant.who === 'npc' ? npc?.id : plant.npcId,
          rivalId: plant.who === 'rival' ? rival?.id : plant.rivalId,
        },
      }
    : withRival;

  const week = useGameStore.getState().week;
  const applied = applyConsequence(consequences, week);

  const logAs =
    ACTIVITY_CATEGORIES.find((c) => c.id === activity.category)?.logAs ?? 'personal';
  const storyId = `activity:${activity.id}`;
  useGameStore.getState().addStoryLine(result.line, logAs, storyId);
  const posted = result.social ? publishStoryBeat(result.social, storyId) !== null : false;

  // The person met here joins the artist's life (a stranger without a world
  // career when the world has nobody free).
  let met: Person | null = null;
  const meets = result.outcome.meets;
  if (meets) {
    met = npc
      ? meetPerson(meets, npc, week)
      : meetStranger(meets, npcName, week);
  }

  useActivityStore.getState().record({
    activityId: activity.id,
    week,
    earned: result.earned,
    reaction: applied.socialReaction,
  });
  checkIdentityNow();
  saveProgress();
  return { ok: true, result: { ...result, consequences }, posted, met };
}

function meetStranger(
  role: 'partner' | 'friend' | 'producer',
  name: string,
  week: number
): Person | null {
  const store = usePeopleStore.getState();
  if (role === 'partner' && store.people.some((p) => p.role === 'partner')) return null;
  const person: Person = {
    id: newPersonId(),
    name,
    role,
    title: role === 'partner' ? 'your partner' : role === 'friend' ? 'your friend' : 'your producer',
    affinity: role === 'partner' ? 30 : 20,
    traits: [],
    sinceWeek: week,
    lastSeenWeek: week,
    ...(role === 'partner' ? { bond: 'dating' as const } : {}),
  };
  store.addPerson(person);
  return person;
}

// ─── Life: people ──────────────────────────────────────────────────────────

export type InteractResult =
  | { ok: true; result: InteractionResult; person: Person | null; posted: boolean }
  | { ok: false; reason: string };

/**
 * Do something with someone in the artist's life. Same shape as an
 * activity: resolve (pure), apply through the consequence pipeline, write the
 * Deck line, post big moments. Then the relationship itself changes:
 * affinity, and for proposals, weddings, breakups and babies, its structure.
 */
export function playerInteract(personId: string, interactionId: string): InteractResult {
  const interaction = getInteraction(interactionId);
  const people = usePeopleStore.getState();
  const person = people.get(personId);
  const player = usePlayerStore.getState().player;
  const age = currentAge();
  if (!interaction || !person || !player || age === null) {
    return { ok: false, reason: 'Nothing to do' };
  }

  const week = useGameStore.getState().week;
  const ctx = {
    week,
    age,
    energy: player.stats.energy,
    money: player.money,
    giftedThisWeek: people.giftedIn(week),
    expecting: people.pendingBirth !== null,
  };
  const availability = interactionAvailability(interaction, person, ctx);
  if (!availability.ok) return availability;
  if (!spendEnergy(interaction.energyCost)) return { ok: false, reason: 'Too tired' };

  const result = resolveInteraction(interaction, person, ctx, player.artistName);
  applyConsequence(result.consequences, week);

  const store = usePeopleStore.getState();
  store.adjustAffinity(person.id, result.affinityDelta);
  store.markSeen(person.id, week);
  if (result.gifted > 0) store.recordGift(week, result.gifted);
  if (result.addTrait) {
    const trait = result.addTrait;
    store.setPeople(
      usePeopleStore.getState().people.map((p) =>
        p.id === person.id && !p.traits.includes(trait)
          ? { ...p, traits: [...p.traits, trait] }
          : p
      )
    );
  }
  if (result.effect === 'conceive') {
    store.setPendingBirth({ dueWeek: week + PREGNANCY_WEEKS, otherParentId: person.id });
  } else if (result.effect) {
    store.setPeople(applyInteractionEffect(usePeopleStore.getState().people, person.id, result.effect));
  }

  const storyId = `person:${interaction.id}`;
  useGameStore.getState().addStoryLine(result.line, interaction.logAs ?? 'personal', storyId);
  const posted = result.social ? publishStoryBeat(result.social, storyId) !== null : false;
  useActivityStore.getState().queueReaction(result.consequences.socialReaction ?? 'none', storyId);

  checkIdentityNow();
  saveProgress();
  return {
    ok: true,
    result,
    person: usePeopleStore.getState().get(person.id) ?? null,
    posted,
  };
}

// ─── Life: home ────────────────────────────────────────────────────────────

/** Move house. Moving up costs a deposit; the new home sets the burn. */
export function playerMoveHome(homeId: HomeId): { ok: true } | { ok: false; reason: string } {
  const player = usePlayerStore.getState().player;
  const status = useStatusStore.getState();
  if (!player || !status.homeId) return { ok: false, reason: 'Nowhere to move from' };
  const availability = homeAvailability(
    getHome(homeId),
    status.homeId,
    new Set(status.owned.map((o) => o.itemId)),
    player.money,
    useCareerStore.getState().economy.weeklyBurn
  );
  if (!availability.ok) return availability;
  moveHome(homeId, availability.cost);
  checkIdentityNow();
  saveProgress();
  return { ok: true };
}

// ─── Drama: DMs ────────────────────────────────────────────────────────────

export type DmReplyResult = { ok: true; line: string | null } | { ok: false; reason: string };

/**
 * Answer a DM with one of its quick replies. The arc plays forward (their
 * answer arrives a few seconds later), and the outcome goes through the same
 * consequence pipeline as events: stats, money, people, a Deck line, and a
 * public moment when it gets out.
 */
export function playerReplyDm(threadId: string, replyId: string): DmReplyResult {
  const drama = useDramaStore.getState();
  const thread = drama.getDm(threadId);
  const player = usePlayerStore.getState().player;
  const ctx = dmContext();
  if (!thread || !player || !ctx) return { ok: false, reason: 'Conversation not found' };
  const res = replyDm(thread, replyId, ctx, Math.random);
  if (!res) return { ok: false, reason: 'Nothing to reply to' };
  drama.upsertDm(res.thread);

  const week = ctx.week;
  const firstName = thread.person.name.replace(/\s*[|].*$/, '').replace(/[^\p{L}\p{N} .'-]/gu, '').trim().split(/\s+/)[0] || thread.person.handle;
  const fill = (text: string) =>
    fillText(fillDm(text, thread, ctx), { playerName: player.artistName, gender: player.gender, genre: '', city: player.city, trackTitle: ctx.trackTitle });
  const out = res.outcome;
  let line: string | null = null;

  // Flirting while taken leaves screenshots somewhere.
  if (ctx.partnerName && (thread.kind === 'admirer' || thread.kind === 'celeb-crush' || thread.kind === 'ex') && ['flirt', 'slide', 'reply'].includes(replyId)) {
    useGameStore.getState().addTag('flirting-in-dms');
    drama.bumpFlirt();
  }

  if (out?.consequences) {
    const c = out.consequences;
    line = c.flavorText ? fill(c.flavorText) : null;
    applyConsequence({ ...c, flavorText: line ?? '' }, week);
  }
  if (out?.moment) {
    spawnMoment(out.moment, { name: firstName, partnerName: ctx.partnerName ?? undefined });
  }
  if (out?.social) {
    publishStoryBeat({ ...out.social, text: fill(out.social.text) }, `dm:${thread.arc}`);
  }
  if (out?.effect === 'date' || out?.effect === 'friend' || out?.effect === 'producer') {
    const people = usePeopleStore.getState();
    const role = out.effect === 'date' ? 'partner' : out.effect;
    const taken = role === 'partner' && people.people.some((p) => p.role === 'partner');
    if (!taken && !people.people.some((p) => p.face === thread.person.id)) {
      people.addPerson({
        id: newPersonId(),
        name: firstName,
        role,
        title: role === 'partner' ? 'your partner' : role === 'friend' ? 'your friend' : 'your producer',
        affinity: role === 'partner' ? 35 : 25,
        traits: role === 'partner' ? ['met-in-dms'] : [],
        npcId: thread.person.npcId,
        sinceWeek: week,
        lastSeenWeek: week,
        face: thread.person.id,
        ...(role === 'partner' ? { bond: 'dating' as const } : {}),
      });
    }
  }

  if (line) {
    const logAs = thread.kind === 'rival' ? 'rivalry' : thread.kind === 'admirer' || thread.kind === 'celeb-crush' || thread.kind === 'ex' ? 'personal' : 'social';
    useGameStore.getState().addStoryLine(line, logAs, `dm:${thread.arc}`);
  }
  useDramaStore.getState().save();
  saveProgress();
  return { ok: true, line };
}

/** Opening a conversation marks it read. */
export function playerReadDm(threadId: string): void {
  useDramaStore.getState().markDmRead(threadId);
  useDramaStore.getState().save();
}
