import { useIdentityStore } from '../../store/identityStore';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { useCareerStore } from '../../store/careerStore';
import { useLegalStore } from '../../store/legalStore';
import { spawnMoment } from '../drama/publish';

/**
 * The comeback, declared. Once announced, hype builds every week (see
 * identityTick) and the next release IS the comeback record: it lands with
 * everything the hype built, or it flops in front of everyone
 * (systems/music/releaseHooks resolves it).
 */

export const COMEBACK_TAG = 'comeback-declared';

export type ComebackCheck = { ok: true } | { ok: false; reason: string };

/** A comeback needs a fall: a real peak, and being well below it now. */
export function canAnnounceComeback(): ComebackCheck {
  const player = usePlayerStore.getState().player;
  if (!player) return { ok: false, reason: 'No career in progress' };
  if (useIdentityStore.getState().comeback) return { ok: false, reason: 'Already announced' };
  if (useLegalStore.getState().activeCase?.stage === 'jailed') return { ok: false, reason: 'Not from in here' };
  const arc = useCareerStore.getState().arc;
  const fell =
    arc.phase === 'decline' ||
    arc.phase === 'plateau' ||
    arc.phase === 'legacy' ||
    (arc.peakFans >= 20_000 && player.stats.fans < arc.peakFans * 0.6);
  if (!fell) return { ok: false, reason: 'You have to fall before you can come back' };
  return { ok: true };
}

/** Say it out loud. From the studio it makes noise; from an event it already did. */
export function announceComeback(fromEvent = false): boolean {
  if (!fromEvent && !canAnnounceComeback().ok) return false;
  const identity = useIdentityStore.getState();
  if (identity.comeback) return false;
  const week = useGameStore.getState().week;
  identity.setComeback({ announcedWeek: week, hype: 20 });
  useGameStore.getState().addTag(COMEBACK_TAG);
  if (!fromEvent) {
    spawnMoment({
      kind: 'best',
      headline: '{playerName} says the next record is the comeback',
      topic: 'the comeback announcement',
      heat: 55,
      valence: 20,
      hashtag: '{playerName}Returns',
      tags: ['comeback'],
    });
    useGameStore
      .getState()
      .addStoryLine(
        'You announced the comeback. The next song you release is the one. Every week you wait, the hype builds — and so does the pressure.',
        'career',
        'comeback'
      );
  }
  return true;
}
