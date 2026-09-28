import { CAREER_STAGES, type CareerStage } from '../../constants/careerStages';
import { usePlayerStore } from '../../store/playerStore';
import { useProgressionStore } from '../../store/progressionStore';

/**
 * Derives the brief's 6-stage career standing from the existing systems.
 * Pure read: it owns no state. A stage is the highest one whose BOTH bars
 * (XP-ladder level AND fan count) are cleared, so progression and audience
 * size have to move together to unlock the next tier.
 */

/** The highest stage cleared by the given level + fans. */
export function stageForProgress(level: number, fans: number): CareerStage {
  let stage = CAREER_STAGES[0];
  for (const s of CAREER_STAGES) {
    if (level >= s.minLevel && fans >= s.minFans) stage = s;
  }
  return stage;
}

/** Current stage from live stores. */
export function getCareerStage(): CareerStage {
  const fans = usePlayerStore.getState().player?.stats.fans ?? 0;
  const level = useProgressionStore.getState().level;
  return stageForProgress(level, fans);
}

/** The stage after this one, or null at the top. */
export function nextStage(stage: CareerStage): CareerStage | null {
  const idx = CAREER_STAGES.findIndex((s) => s.id === stage.id);
  return idx >= 0 && idx < CAREER_STAGES.length - 1
    ? CAREER_STAGES[idx + 1]
    : null;
}

/** Fan ceiling of collaborators willing to feature at this stage. */
export function maxCollabFansFor(stage: CareerStage): number {
  return stage.unlocks.maxCollabFans;
}

/**
 * Progress (0-1) toward the next stage, blending the level gap and the fan
 * gap so the bar always reflects whichever requirement is lagging.
 */
export function stageProgress(level: number, fans: number): number {
  const stage = stageForProgress(level, fans);
  const next = nextStage(stage);
  if (!next) return 1;
  const levelGap = (level - stage.minLevel) / Math.max(1, next.minLevel - stage.minLevel);
  const fanGap = (fans - stage.minFans) / Math.max(1, next.minFans - stage.minFans);
  // The lagging requirement governs — both must be met to advance.
  return Math.max(0, Math.min(1, Math.min(levelGap, fanGap)));
}
