import type { CareerCapsule } from '../../types/ai';
import { usePlayerStore } from '../../store/playerStore';
import { useCareerStore } from '../../store/careerStore';
import { useRivalryStore } from '../../store/rivalryStore';
import { usePressStore } from '../../store/pressStore';
import { useMusicStore } from '../../store/musicStore';
import { useGameStore } from '../../store/gameStore';
import { useRelationshipStore } from '../../store/relationshipStore';
import { getFameLevel, getReputationTier } from '../../utils/statHelpers';
import { getGenre } from '../../data/genres';

/**
 * Distil the live stores into a tiny, token-bounded capsule. This is the
 * ONLY thing any provider ever sees of the player's history — raw
 * careerStore.history / social log / ledgers never leave the device-side
 * sim. Keeping this small is the single biggest cost lever in Phase 4.
 */

function fanBand(fans: number): string {
  if (fans < 1_000) return '<1K';
  if (fans < 10_000) return '1K–10K';
  if (fans < 50_000) return '10K–50K';
  if (fans < 200_000) return '50K–200K';
  if (fans < 1_000_000) return '200K–1M';
  if (fans < 10_000_000) return '1M–10M';
  return '10M+';
}

export function buildContextCapsule(): CareerCapsule | null {
  const player = usePlayerStore.getState().player;
  if (!player) return null;

  const career = useCareerStore.getState();
  const rivalry = useRivalryStore.getState();
  const press = usePressStore.getState();
  const music = useMusicStore.getState();
  const game = useGameStore.getState();
  const rel = useRelationshipStore.getState();

  // Top memorable beats: highest-severity, un-buried, recent-ish.
  const memorableBeats = career.history
    .filter((h) => !h.buried && h.severity >= 45)
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 4)
    .map((h) => ({
      summary: h.summary.slice(0, 90),
      kind: h.kind,
      severity: h.severity,
    }));

  // Hottest live rivalry, resolved to a human name.
  let topRival: CareerCapsule['topRival'] = null;
  const rivals = rivalry.allRivals();
  if (rivals.length) {
    const hottest = rivals.reduce((a, b) =>
      b.intensity > a.intensity ? b : a
    );
    if (hottest.intensity >= 20) {
      const artist = rel.knownArtists.find((a) => a.id === hottest.artistId);
      topRival = {
        name: artist?.name ?? 'a rival',
        intensity: Math.round(hottest.intensity),
        legendary: hottest.legendary,
      };
    }
  }

  const active = press.activeControversies();
  const hottestCtrl = active.length
    ? active.reduce((a, b) => (b.heat > a.heat ? b : a))
    : null;

  const latest = music.getLatestTrack();

  return {
    artistName: player.artistName,
    genre: getGenre(player.genre).label,
    fameTier: getFameLevel(player.stats.fans).label,
    fanBand: fanBand(player.stats.fans),
    reputationTier: getReputationTier(player.stats.reputation).label,
    arcPhase: career.arc.phase,
    momentum: Math.round(career.arc.momentum),
    latestTrack: latest?.title ?? null,
    memorableBeats,
    topRival,
    activeControversy: hottestCtrl
      ? { kind: hottestCtrl.kind, heat: Math.round(hottestCtrl.heat) }
      : null,
    moodTags: game.playerTags.slice(0, 6),
  };
}

/**
 * Cheap, stable signature of a capsule. Two weeks with the same dramatic
 * state produce the same hash → cache hit → $0. This is what stops the feed
 * from re-billing every quiet week.
 */
export function capsuleSignature(c: CareerCapsule): string {
  return [
    c.reputationTier,
    c.arcPhase,
    c.activeControversy
      ? `c:${c.activeControversy.kind}:${Math.round(c.activeControversy.heat / 15)}`
      : 'c0',
    c.topRival
      ? `r:${c.topRival.name}:${Math.round(c.topRival.intensity / 15)}`
      : 'r0',
    c.memorableBeats.map((b) => b.kind).join('+') || 'm0',
    c.latestTrack ? 't1' : 't0',
  ].join('|');
}
