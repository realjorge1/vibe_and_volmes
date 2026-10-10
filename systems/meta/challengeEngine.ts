import type { ChallengeDef, ChallengeRun, IdentitySnapshot } from '../../types/identity';
import { CHALLENGES } from '../../data/meta/challenges';

/**
 * Challenges. Pure: which one is featured this week, and how a run advances
 * against a snapshot.
 */

/** The ISO-ish week number of a real date, so the featured one rotates weekly. */
export function realWeekIndex(now: number): number {
  return Math.floor(now / (7 * 24 * 3600 * 1000));
}

/** This real week's featured challenge. */
export function featuredChallenge(now: number = Date.now(), pool: ChallengeDef[] = CHALLENGES): ChallengeDef {
  return pool[realWeekIndex(now) % pool.length];
}

export function startRun(def: ChallengeDef, week: number): ChallengeRun {
  return { id: def.id, acceptedWeek: week, done: def.steps.map(() => false), completedWeek: null };
}

/**
 * Steps done so far (done stays done). Returns the new run and the indexes
 * of steps finished just now.
 */
export function advanceRun(
  run: ChallengeRun,
  def: ChallengeDef,
  s: IdentitySnapshot
): { run: ChallengeRun; newlyDone: number[]; completed: boolean } {
  if (run.completedWeek !== null) return { run, newlyDone: [], completed: false };
  const newlyDone: number[] = [];
  const done = def.steps.map((step, i) => {
    if (run.done[i]) return true;
    if (step.test(s)) {
      newlyDone.push(i);
      return true;
    }
    return false;
  });
  const completed = done.every(Boolean);
  return {
    run: { ...run, done, completedWeek: completed ? s.week : null },
    newlyDone,
    completed,
  };
}
