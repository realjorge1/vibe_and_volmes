import type { Track } from '../../types/music';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useMusicStore } from '../../store/musicStore';
import { useLabelStore } from '../../store/labelStore';
import { useMogulStore } from '../../store/mogulStore';
import { useCareerStore } from '../../store/careerStore';
import { getLabel } from '../../data/industry/labels';
import { buybackPrice, heldMasters, INDIE_SHARE, OWN_LABEL_SHARE } from './royalties';
import { releaseQuickTrack } from './quickRelease';
import { spendEnergy } from '../live/energySystem';
import { spawnMoment } from '../drama/publish';
import { saveProgress } from '../persistence';
import { uid } from '../../utils/id';

/**
 * Masters: who owns the recordings. A label deal that doesn't let the artist
 * keep them means the label owns those songs forever, and keeps most of what
 * they earn. They can be sold over the artist's head, bought back at a
 * price, or made worthless by re-recording them as "(Your Version)".
 */

export const RERECORD_ENERGY = 20;

/** What re-recording costs in studio money: grows with fame, capped. */
export function rerecordCost(fans: number): number {
  return Math.round(Math.min(60_000, 1_500 + fans * 0.01) / 100) * 100;
}

export type RerecordCheck = { ok: true; cost: number } | { ok: false; reason: string };

/** Can this song be re-recorded right now? */
export function canRerecord(track: Track): RerecordCheck {
  const player = usePlayerStore.getState().player;
  if (!player) return { ok: false, reason: 'No career in progress' };
  if (track.owner !== 'label' && track.owner !== 'vault') return { ok: false, reason: 'You already own it' };
  if (track.rerecorded) return { ok: false, reason: 'Already re-recorded' };
  const contract = useLabelStore.getState().contract;
  if (contract && contract.status === 'active' && contract.labelId === track.ownerLabelId) {
    return { ok: false, reason: 'Not while you are still signed to them' };
  }
  const cost = rerecordCost(player.stats.fans);
  if (player.money < cost) return { ok: false, reason: `Needs $${cost.toLocaleString('en-US')}` };
  if (player.stats.energy < RERECORD_ENERGY) return { ok: false, reason: 'Too tired' };
  return { ok: true, cost };
}

/**
 * Record it again, own it this time. The fans who care switch to the new
 * version: the old one loses that share of its streams for good.
 */
export function rerecord(trackId: string): { ok: true; title: string } | { ok: false; reason: string } {
  const music = useMusicStore.getState();
  const original = music.discography.find((t) => t.id === trackId);
  if (!original) return { ok: false, reason: 'Song not found' };
  const check = canRerecord(original);
  if (!check.ok) return check;
  if (!spendEnergy(RERECORD_ENERGY)) return { ok: false, reason: 'Too tired' };
  usePlayerStore.getState().addMoney(-check.cost);

  const player = usePlayerStore.getState().player!;
  const loyalty = player.stats.fanLoyalty / 100;
  // How much of the old song's audience follows the artist to the new one.
  const switchers = Math.min(0.85, 0.35 + loyalty * 0.5);
  const peak = original.peakChartPosition;
  const fame = peak !== null && peak <= 10 ? 1.6 : peak !== null && peak <= 40 ? 1.3 : 1.1;

  const result = releaseQuickTrack({
    title: `${original.title} (Your Version)`,
    streamsMult: fame * (1 + switchers),
    qualityFloor: original.quality + 2,
    buzz: 45,
    // Whoever the artist is signed to now, this one is theirs.
    extra: {
      rerecordOf: original.id,
      owner: 'artist',
      ownerLabelId: undefined,
      royaltyShare: useMogulStore.getState().label ? OWN_LABEL_SHARE : INDIE_SHARE,
    },
    respect: 4,
  });
  if (!result) return { ok: false, reason: 'Could not release' };

  useMusicStore.getState().updateTrack(original.id, {
    rerecorded: true,
    weeklyStreams: Math.round(original.weeklyStreams * (1 - switchers)),
  });
  usePlayerStore.getState().updateStats([{ stat: 'authenticity', delta: 3 }, { stat: 'fanLoyalty', delta: 2 }]);

  const week = useGameStore.getState().week;
  useCareerStore.getState().recordLedger({
    week,
    amount: -check.cost,
    kind: 'masters',
    note: `Re-recorded "${original.title}"`,
  });
  spawnMoment({
    kind: 'best',
    headline: '{playerName} is re-recording their old songs, and the fans are switching over',
    topic: 'the re-records',
    heat: 60,
    valence: 65,
    hashtag: 'YourVersion',
    tags: ['masters'],
  });
  useGameStore
    .getState()
    .addStoryLine(
      `You re-recorded "${original.title}". This one is yours. ${Math.round(switchers * 100)}% of its listeners came with you.`,
      'career',
      'masters'
    );
  saveProgress();
  return { ok: true, title: result.track.title };
}

/** The label sells the artist's masters to a buyer, over their head. */
export function mastersSold(): string | null {
  const music = useMusicStore.getState();
  const held = music.discography.filter((t) => t.owner === 'label' && !t.rerecorded);
  if (held.length === 0) return null;
  for (const t of held) music.updateTrack(t.id, { owner: 'vault' });
  const labelName = getLabel(held[0].ownerLabelId ?? '')?.name ?? 'Your old label';
  useCareerStore.getState().addHistory({
    id: uid('hist'),
    kind: 'betrayal',
    week: useGameStore.getState().week,
    summary: `${labelName} sold their masters to Vault Capital without asking`,
    severity: 70,
    tags: ['masters', 'label', 'betrayal'],
    artistId: null,
    resurfacedCount: 0,
    buried: false,
  });
  return labelName;
}

/** Pay to own them all again. Returns false when the money isn't there. */
export function buyBackMasters(): boolean {
  const music = useMusicStore.getState();
  const price = buybackPrice(music.discography);
  const player = usePlayerStore.getState().player;
  if (!player || price <= 0 || player.money < price) return false;
  usePlayerStore.getState().addMoney(-price);
  const share = useMogulStore.getState().label ? OWN_LABEL_SHARE : INDIE_SHARE;
  for (const t of heldMasters(music.discography)) {
    music.updateTrack(t.id, { owner: 'artist', royaltyShare: share, ownerLabelId: undefined });
  }
  const week = useGameStore.getState().week;
  useCareerStore.getState().recordLedger({ week, amount: -price, kind: 'masters', note: 'Bought back the masters' });
  useCareerStore.getState().addHistory({
    id: uid('hist'),
    kind: 'triumph',
    week,
    summary: 'bought back every one of their masters',
    severity: 75,
    tags: ['masters'],
    artistId: null,
    resurfacedCount: 0,
    buried: false,
  });
  return true;
}
