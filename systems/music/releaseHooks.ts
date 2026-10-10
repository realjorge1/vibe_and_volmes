import type { ReleaseResult, Track } from '../../types/music';
import { useLabelStore } from '../../store/labelStore';
import { useMogulStore } from '../../store/mogulStore';
import { useIdentityStore } from '../../store/identityStore';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { useCareerStore } from '../../store/careerStore';
import { traitEffects } from '../identity/traits';
import { checkIdentityNow } from '../identity/identityTick';
import { getPersona, ERA_NOVELTY_MULT, ERA_NOVELTY_WEEKS, ERA_STALE_MULT, ERA_STALE_WEEKS } from '../../data/eras/eraStyles';
import { INDIE_SHARE, OWN_LABEL_SHARE } from './royalties';
import { spawnMoment } from '../drama/publish';
import { awardXp } from '../progression/xpEngine';
import { pushNotification } from '../live/notify';
import { uid } from '../../utils/id';

/**
 * Every release, whichever door it comes through (the full studio session,
 * a quick drop, a holiday single, a song recorded in a cell), passes through
 * here: who the artist is right now shapes how it lands (`releaseBoost`),
 * who owns it is stamped on it (`stampTrack`), and what it means for the
 * story is settled after (`afterRelease`).
 */

export interface ReleaseBoost {
  streamsMult: number;
  criticsBonus: number;
}

/** Traits, the era (fresh or stale) and a comeback's hype, multiplied out. */
export function releaseBoost(): ReleaseBoost {
  const fx = traitEffects();
  let streamsMult = fx.streamsMult;
  let criticsBonus = fx.criticsBonus;
  const identity = useIdentityStore.getState();
  const week = useGameStore.getState().week;
  const era = identity.currentEra();
  if (era) {
    const persona = getPersona(era.persona);
    streamsMult *= persona.streamsMult;
    criticsBonus += persona.criticsBonus;
    const age = week - era.startedWeek;
    if (age <= ERA_NOVELTY_WEEKS) streamsMult *= ERA_NOVELTY_MULT;
    else if (age >= ERA_STALE_WEEKS) streamsMult *= ERA_STALE_MULT;
  }
  if (identity.comeback) streamsMult *= 1 + identity.comeback.hype / 100;
  return { streamsMult, criticsBonus };
}

/** Who owns the recording, what the artist keeps, and the story stamps. */
export function stampTrack(track: Track, extra: Partial<Track> = {}): Track {
  const contract = useLabelStore.getState().contract;
  const identity = useIdentityStore.getState();
  const ownership: Partial<Track> =
    contract && contract.status === 'active' && contract.kind === 'recording'
      ? {
          owner: contract.terms.ownsMasters ? 'artist' : 'label',
          ownerLabelId: contract.labelId,
          royaltyShare: contract.terms.royaltyPct / 100,
        }
      : useMogulStore.getState().label
        ? { owner: 'artist', royaltyShare: OWN_LABEL_SHARE }
        : { owner: 'artist', royaltyShare: INDIE_SHARE };
  return {
    ...track,
    ...ownership,
    eraId: identity.currentEraId ?? undefined,
    comeback: identity.comeback ? true : undefined,
    ...extra,
  };
}

/** The story after a release: the label's quota, the era, the comeback, goals. */
export function afterRelease(result: ReleaseResult): void {
  const week = useGameStore.getState().week;
  const label = useLabelStore.getState();
  if (label.contract && label.contract.status === 'active') {
    label.recordRelease();
    label.save();
  }

  const identity = useIdentityStore.getState();
  const era = identity.currentEra();
  if (era) {
    const peak =
      result.chartPosition !== null && (era.peak === null || result.chartPosition < era.peak)
        ? result.chartPosition
        : era.peak;
    identity.updateEra(era.id, { trackIds: [...era.trackIds, result.track.id], peak });
  }

  if (identity.comeback) resolveComeback(result, week);
  checkIdentityNow();
}

function resolveComeback(result: ReleaseResult, week: number): void {
  const identity = useIdentityStore.getState();
  const cb = identity.comeback;
  if (!cb) return;
  identity.setComeback(null);
  // Win or lose, the declaration is spent: a later fall can start another.
  useGameStore.getState().removeTag('comeback-declared');
  const player = usePlayerStore.getState().player;
  const career = useCareerStore.getState();
  if (!player) return;
  const landed =
    result.criticsScore >= 60 && result.reception !== 'flop' && result.reception !== 'mixed';

  if (landed) {
    const gap = Math.max(0, career.arc.peakFans - player.stats.fans);
    const regained = Math.round(gap * (0.15 + cb.hype / 400));
    usePlayerStore.getState().updateStats([
      { stat: 'fans', delta: regained },
      { stat: 'reputation', delta: 4 },
      { stat: 'industryRespect', delta: 5 },
    ]);
    useCareerStore.getState().adjustMental({ depression: -12, anxiety: -6 });
    career.setArc({
      phase: 'comeback',
      phaseStartedWeek: week,
      comebackCount: career.arc.comebackCount + 1,
      momentum: Math.max(career.arc.momentum, 35),
    });
    career.addHistory({
      id: uid('hist'),
      kind: 'triumph',
      week,
      summary: `came back with "${result.track.title}" when nobody thought they would`,
      severity: 85,
      tags: ['career-arc', 'comeback'],
      artistId: null,
      resurfacedCount: 0,
      buried: false,
    });
    spawnMoment({
      kind: 'best',
      headline: '{playerName} is back, and nobody is pretending otherwise',
      topic: 'the comeback',
      heat: 72,
      valence: 75,
      hashtag: '{playerName}IsBack',
      tags: ['comeback'],
    });
    awardXp('milestone', 300, 'The comeback landed');
    useGameStore
      .getState()
      .addStoryLine(
        `✦ The comeback landed. "${result.track.title}" brought back ${regained.toLocaleString('en-US')} fans who swore they had moved on.`,
        'opportunity',
        'comeback'
      );
    pushNotification({ kind: 'info', title: 'The comeback landed', body: `"${result.track.title}" did it.`, color: '#3BE8A6' });
  } else {
    usePlayerStore.getState().updateStats([
      { stat: 'reputation', delta: -3 },
      { stat: 'industryRespect', delta: -3 },
    ]);
    useCareerStore.getState().adjustMental({ depression: 10, anxiety: 6 });
    career.addHistory({
      id: uid('hist'),
      kind: 'flop',
      week,
      summary: `staged a comeback with "${result.track.title}" that nobody bought`,
      severity: 70,
      tags: ['career-arc', 'comeback'],
      artistId: null,
      resurfacedCount: 0,
      buried: false,
    });
    spawnMoment({
      kind: 'flop',
      headline: '{playerName}’s comeback record lands with a thud',
      topic: 'the comeback flop',
      heat: 55,
      valence: -55,
      hashtag: 'ComebackFlop',
      tags: ['comeback'],
    });
    useGameStore
      .getState()
      .addStoryLine(
        `The comeback didn't land. "${result.track.title}" came and went, and the think pieces wrote themselves.`,
        'drama',
        'comeback'
      );
  }
}
