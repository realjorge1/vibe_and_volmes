/**
 * Life stages by age. Pure content: events gate on these ids through the
 * `life_stage` trigger, and crossing into a new stage writes its `arrival`
 * line into the Deck. Ranges are inclusive and must tile 18+ with no gaps
 * (the life tests enforce that).
 */

import type { LifeStage, StartingAgeOption } from '../../types/life';

export const LIFE_STAGES: readonly LifeStage[] = [
  {
    id: 'young',
    label: 'Young & Hungry',
    minAge: 18,
    maxAge: 24,
    arrival: 'Nothing to lose and everything to prove.',
  },
  {
    id: 'prime',
    label: 'Prime Years',
    minAge: 25,
    maxAge: 34,
    arrival: 'Your mid-twenties. The window everyone says is the window.',
  },
  {
    id: 'established',
    label: 'Established',
    minAge: 35,
    maxAge: 44,
    arrival: 'Thirty-five. The new kids have started calling you "OG".',
  },
  {
    id: 'midlife',
    label: 'Midlife',
    minAge: 45,
    maxAge: 59,
    arrival: 'Forty-five. The industry wants the old hits; you want to matter now.',
  },
  {
    id: 'elder',
    label: 'Elder Statesman',
    minAge: 60,
    maxAge: Number.POSITIVE_INFINITY,
    arrival: 'Sixty. Every room you walk into, somebody grew up on you.',
  },
];

/** Starting ages offered at onboarding, each with its teen-years backstory. */
export const STARTING_AGES: readonly StartingAgeOption[] = [
  {
    age: 18,
    label: '18 · Fresh out of high school',
    backstory: 'You spent your teens making beats on a cracked laptop. Graduation was last week.',
  },
  {
    age: 21,
    label: '21 · Dropped out to do this',
    backstory: 'Two years of college, one viral freestyle, and a very long talk with your parents.',
  },
  {
    age: 24,
    label: '24 · Day job, night sessions',
    backstory: 'You clock out at five and clock into the booth at seven. Something has to give.',
  },
  {
    age: 28,
    label: '28 · Late bloomer',
    backstory: 'You wrote songs for years and never showed anyone. Not anymore.',
  },
  {
    age: 32,
    label: '32 · Last real shot',
    backstory: 'Everyone says the window closed. You are about to find out.',
  },
];
