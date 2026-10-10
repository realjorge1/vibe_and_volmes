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
import { useStatusStore } from '../../store/statusStore';
import { settleHome } from '../life/assetTick';
import { spawnMoment, hottestRival } from '../drama/publish';
import { useDramaStore } from '../../store/dramaStore';
import { newWar, swing } from '../drama/rivalWar';
import { gainTrait, plantSeed } from '../identity/identityTick';
import { removeTrait, traitEffects } from '../identity/traits';
import { chargeArtist, hireLawyer } from '../legal/legalTick';
import { buyBackMasters, mastersSold } from '../music/mastersActions';
import { buybackPrice } from '../music/royalties';
import { useMusicStore } from '../../store/musicStore';
import { signDealNow } from '../industry/dealActions';
import { holidayTitle, jailTitle, releaseQuickTrack } from '../music/quickRelease';
import { applySigneeAction } from '../mogul/mogulActions';
import { useMetaStore } from '../../store/metaStore';
import { publishStoryBeat } from '../social/storyPost';
import { announceComeback, COMEBACK_TAG } from '../career/comeback';

/** A song put out from a story beat (no studio session). */
function releaseFromStory(kind: 'holiday' | 'jail-tape' | 'tribute'): void {
  if (kind === 'holiday') {
    const r = releaseQuickTrack({ title: holidayTitle(), streamsMult: 1.3, extra: { seasonal: 'holiday' } });
    if (r) {
      useGameStore
        .getState()
        .addStoryLine(`"${r.track.title}" is out. It will come back every December, whether you like it or not.`, 'career', 'release:holiday');
    }
    return;
  }
  if (kind === 'jail-tape') {
    const r = releaseQuickTrack({ title: jailTitle(), streamsMult: 1.4, buzz: 70, extra: { jailTape: true }, respect: 2 });
    if (r) {
      usePlayerStore.getState().updateStats([
        { stat: 'authenticity', delta: 4 },
        { stat: 'fanLoyalty', delta: 3 },
      ]);
      const name = usePlayerStore.getState().player?.artistName ?? 'them';
      publishStoryBeat(
        {
          sentiment: 'hype',
          from: 'fan',
          text: `${name} recorded "${r.track.title}" over a prison phone and it still goes harder than anything out this week. FREE THEM`,
          trend: `Free${name.replace(/[^A-Za-z0-9]/g, '')}`,
        },
        'release:jail-tape'
      );
    }
    return;
  }
  const legend = useMetaStore.getState().pastLives[0];
  const hit = legend?.hits[0]?.title;
  const r = releaseQuickTrack({
    streamsMult: 1.25,
    buzz: 40,
    extra: hit ? { sampleOf: hit } : {},
  });
  if (r && legend && hit) {
    useGameStore
      .getState()
      .addStoryLine(`"${r.track.title}" samples ${legend.artistName}'s "${hit}". The old heads noticed first.`, 'career', 'release:tribute');
  }
}

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
    // Declaring a comeback in a story starts the comeback for real.
    if (consequence.addTags.includes(COMEBACK_TAG)) announceComeback(true);
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
        ...(np.role === 'child' ? { bornWeek: week - (np.bornWeeksAgo ?? 0) } : {}),
      });
    }
  }

  // ─── Life: assets ───

  if (consequence.asset?.itemId) {
    const lost = useStatusStore.getState().removeOwned(consequence.asset.itemId);
    if (lost && consequence.asset.action === 'sell') {
      player.addMoney(Math.round(lost.boughtAtCost / 2));
    }
    // Losing the deed means losing the home that came with it.
    settleHome();
  }

  // ─── Drama layer ───

  if (consequence.warSwing) {
    const rival = hottestRival();
    if (rival) {
      const drama = useDramaStore.getState();
      const war = drama.wars[rival.id] ?? newWar(rival.id, week);
      // A Petty or Hotheaded artist's wins land harder.
      const bonus = consequence.warSwing > 0 ? traitEffects().warBonus : 0;
      drama.setWar(swing(war, consequence.warSwing + bonus, week, consequence.flavorText.slice(0, 80)));
    }
  }

  if (consequence.moment) {
    spawnMoment(consequence.moment);
  }

  // ─── Identity ───

  if (consequence.plantSeed) {
    plantSeed(consequence.plantSeed, week);
  }
  for (const t of consequence.addTraits ?? []) gainTrait(t);
  for (const t of consequence.removeTraits ?? []) removeTrait(t);

  // ─── The law ───

  if (consequence.legalCharge) {
    chargeArtist(consequence.legalCharge);
  }
  if (consequence.lawyer) {
    hireLawyer(consequence.lawyer);
  }

  // ─── Business ───

  if (consequence.masters?.action === 'sold') {
    mastersSold();
  } else if (consequence.masters?.action === 'buy-back') {
    const price = buybackPrice(useMusicStore.getState().discography);
    if (!buyBackMasters()) {
      game.addStoryLine(
        `You couldn't raise the $${price.toLocaleString('en-US')}. The masters stay where they are, for now.`,
        'career',
        'masters'
      );
    }
  }
  if (consequence.signDeal) {
    signDealNow(consequence.signDeal, week);
  }
  if (consequence.signee) {
    applySigneeAction(consequence.signee.action, consequence.signee.npcId);
  }
  if (consequence.releaseTrack) {
    releaseFromStory(consequence.releaseTrack);
  }

  return {
    socialReaction: consequence.socialReaction ?? 'none',
    triggeredEventId: consequence.triggerEventId ?? null,
    flavorText: consequence.flavorText,
  };
}
