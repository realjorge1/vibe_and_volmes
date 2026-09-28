import type { EventConsequence, SocialReactionType } from '../../types/events';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useCareerStore } from '../../store/careerStore';
import { useRelationshipStore } from '../../store/relationshipStore';
import { useRivalryStore } from '../../store/rivalryStore';
import { applyRelationshipChanges } from '../relationships/relationshipEngine';
import { generateOffer } from '../industry/labelEngine';
import { spawnControversy } from '../pr/prEngine';
import { createSession } from '../media/mediaEngine';
import { useLabelStore } from '../../store/labelStore';
import { uid } from '../../utils/id';
import { usePeopleStore } from '../../store/peopleStore';
import { activePeople, newPersonId } from '../life/peopleEngine';

export interface ConsequenceResult {
  socialReaction: SocialReactionType;
  triggeredEventId: string | null;
  flavorText: string;
}

/**
 * Mutates the game stores in response to a chosen consequence.
 * Returns the bits the week/social pipeline needs downstream.
 */
export function applyConsequence(
  consequence: EventConsequence,
  week: number
): ConsequenceResult {
  const player = usePlayerStore.getState();
  const game = useGameStore.getState();

  if (consequence.statChanges && consequence.statChanges.length > 0) {
    player.updateStats(consequence.statChanges);
  }

  if (consequence.fansDelta) {
    player.updateStats([{ stat: 'fans', delta: consequence.fansDelta }]);
  }

  if (consequence.moneyDelta) {
    player.addMoney(consequence.moneyDelta);
  }

  if (consequence.addTags) {
    for (const tag of consequence.addTags) game.addTag(tag);
  }

  if (consequence.removeTags) {
    for (const tag of consequence.removeTags) game.removeTag(tag);
  }

  if (consequence.relationshipChanges && consequence.relationshipChanges.length > 0) {
    applyRelationshipChanges(consequence.relationshipChanges, week);
  }

  // ─── Phase 3 consequence effects ───

  if (consequence.mentalChanges && consequence.mentalChanges.length > 0) {
    const deltas: Record<string, number> = {};
    for (const m of consequence.mentalChanges) {
      deltas[m.axis] = (deltas[m.axis] ?? 0) + m.delta;
    }
    useCareerStore.getState().adjustMental(deltas);
  }

  if (consequence.spawnContractOfferTier) {
    const offer = generateOffer(consequence.spawnContractOfferTier, week);
    if (offer) useLabelStore.getState().addOffer(offer);
  }

  if (consequence.spawnControversyId) {
    spawnControversy(consequence.spawnControversyId, week);
  }

  if (consequence.bookInterviewKind) {
    createSession(consequence.bookInterviewKind as never, week);
  }

  if (consequence.rivalryIntensityDelta) {
    const { artistId, delta } = consequence.rivalryIntensityDelta;
    const rivalry = useRivalryStore.getState();
    if (artistId) {
      rivalry.adjustIntensity(artistId, delta);
    } else {
      // Apply to the player's current hottest/known rival.
      const known = useRelationshipStore.getState().knownArtists;
      const hottest = rivalry
        .allRivals()
        .sort((a, b) => b.intensity - a.intensity)[0];
      const targetId = hottest?.artistId ?? known[0]?.id;
      if (targetId) rivalry.adjustIntensity(targetId, delta);
    }
  }

  if (consequence.historyRecord) {
    useCareerStore.getState().addHistory({
      id: uid('hist'),
      kind: consequence.historyRecord.kind as never,
      week,
      summary: consequence.historyRecord.summary,
      severity: consequence.historyRecord.severity,
      tags: consequence.historyRecord.tags,
      artistId: null,
      resurfacedCount: 0,
      buried: false,
    });
  }

  // ─── Life: people ───

  if (consequence.personChanges && consequence.personChanges.length > 0) {
    const people = usePeopleStore.getState();
    for (const pc of consequence.personChanges) {
      const target =
        (pc.personId && people.get(pc.personId)) ||
        activePeople(people.people).find((p) => p.role === pc.role);
      if (target) people.adjustAffinity(target.id, pc.delta);
    }
  }

  if (consequence.addPerson) {
    const np = consequence.addPerson;
    const people = usePeopleStore.getState();
    const alreadyThere = np.npcId && people.people.some((p) => p.npcId === np.npcId);
    if (!alreadyThere) {
      people.addPerson({
        id: newPersonId(),
        name: np.name ?? 'Someone new',
        role: np.role,
        title: np.title,
        affinity: np.affinity,
        traits: [],
        npcId: np.npcId,
        sinceWeek: week,
        lastSeenWeek: week,
        ...(np.role === 'partner' ? { bond: 'dating' as const } : {}),
      });
    }
  }

  return {
    socialReaction: consequence.socialReaction ?? 'none',
    triggeredEventId: consequence.triggerEventId ?? null,
    flavorText: consequence.flavorText,
  };
}
