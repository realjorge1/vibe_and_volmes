import { WEEKS_PER_YEAR } from '../../constants/gameConfig';
import { LIFE_STAGES } from '../../data/life/lifeStages';
import type { LifeStage } from '../../types/life';

/**
 * Age math. Pure: age is a function of the start age and the game week, so
 * it can never drift from the clock and needs no save migration when
 * WEEKS_PER_YEAR is retuned.
 *
 * Week 1 is the artist's first week at `startAge`; they turn a year older on
 * weeks 1 + WEEKS_PER_YEAR, 1 + 2·WEEKS_PER_YEAR, …
 */

export function ageAtWeek(
  startAge: number,
  week: number,
  weeksPerYear: number = WEEKS_PER_YEAR
): number {
  return startAge + Math.floor(Math.max(0, week - 1) / weeksPerYear);
}

/** True on the week the artist turns a year older (never week 1). */
export function isBirthdayWeek(
  week: number,
  weeksPerYear: number = WEEKS_PER_YEAR
): boolean {
  return week > 1 && (week - 1) % weeksPerYear === 0;
}

export function lifeStageForAge(age: number): LifeStage {
  return (
    LIFE_STAGES.find((s) => age >= s.minAge && age <= s.maxAge) ??
    // Below the youngest stage can't happen via onboarding; clamp anyway.
    LIFE_STAGES[age < LIFE_STAGES[0].minAge ? 0 : LIFE_STAGES.length - 1]
  );
}

export interface BirthdayBeat {
  age: number;
  /** Set when this birthday crosses into a new life stage. */
  newStage: LifeStage | null;
}

/**
 * What the week transition should write for `week`: null on ordinary weeks,
 * otherwise the new age and, if it crosses a stage boundary, the new stage.
 */
export function birthdayBeat(
  startAge: number,
  week: number,
  weeksPerYear: number = WEEKS_PER_YEAR
): BirthdayBeat | null {
  if (!isBirthdayWeek(week, weeksPerYear)) return null;
  const age = ageAtWeek(startAge, week, weeksPerYear);
  const before = lifeStageForAge(age - 1);
  const now = lifeStageForAge(age);
  return { age, newStage: before.id === now.id ? null : now };
}

/** Deck lines for a birthday beat, oldest first. */
export function birthdayLines(beat: BirthdayBeat): string[] {
  const lines = [`You turned ${beat.age}.`];
  if (beat.newStage) lines.push(beat.newStage.arrival);
  return lines;
}
