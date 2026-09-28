import type { Activity, ActivityId } from '../../types/passive';
import { COLORS } from '../../constants/theme';

/**
 * The daily-plan activity catalog. Data-driven and level-gated, mirroring
 * data/luxury/catalog.ts. Effect profiles are deliberately SMALL — they are
 * per-slot ranges that the plan engine rolls and then clamps in aggregate.
 * The point is steady momentum + curiosity, never a shortcut past active play.
 */
export const ACTIVITIES: Activity[] = [
  {
    id: 'studio',
    label: 'Studio Work',
    icon: 'mic-outline',
    blurb: 'Lock in and sharpen the craft.',
    effectHint: 'Slowly raises writing & vocal skill. High chance of studio moments.',
    unlockLevel: 1,
    color: COLORS.primary,
    effect: {
      stats: { writing: [0.2, 0.6], vocalSkill: [0.2, 0.5] },
      energy: [-2, -1],
      xp: { source: 'engagement', amount: [4, 9] },
      curiosityWeight: 3,
    },
  },
  {
    id: 'songwriting',
    label: 'Songwriting',
    icon: 'create-outline',
    blurb: 'Fill notebooks. Chase the idea.',
    effectHint: 'Builds writing & creativity. Quietly productive.',
    unlockLevel: 1,
    color: COLORS.secondary,
    effect: {
      stats: { writing: [0.3, 0.7], creativity: [0.2, 0.5] },
      energy: [-1, 0],
      xp: { source: 'engagement', amount: [4, 8] },
      curiosityWeight: 2,
    },
  },
  {
    id: 'promotion',
    label: 'Promotion',
    icon: 'megaphone-outline',
    blurb: 'Push the music everywhere.',
    effectHint: 'Earns a little money and lifts passive fan growth.',
    unlockLevel: 2,
    color: COLORS.warning,
    effect: {
      earn: [120, 420],
      fanDriftMult: 1.5,
      stats: { charisma: [0.1, 0.3] },
      energy: [-2, -1],
      xp: { source: 'engagement', amount: [3, 7] },
      curiosityWeight: 4,
    },
  },
  {
    id: 'social',
    label: 'Be Online',
    icon: 'chatbubbles-outline',
    blurb: 'Live in the timeline. Stay relevant.',
    effectHint: 'Boosts passive fans & charisma. Most likely to spark drama or buzz.',
    unlockLevel: 1,
    color: COLORS.tunetok,
    effect: {
      fanDriftMult: 1.7,
      stats: { charisma: [0.1, 0.4] },
      energy: [-1, 0],
      xp: { source: 'engagement', amount: [3, 6] },
      curiosityWeight: 6,
    },
  },
  {
    id: 'networking',
    label: 'Networking',
    icon: 'people-outline',
    blurb: 'Work the rooms. Shake the hands.',
    effectHint: 'Builds industry respect and warms up relationships.',
    unlockLevel: 3,
    color: COLORS.flashpic,
    effect: {
      stats: { industryRespect: [0.2, 0.5] },
      affinity: [1, 3],
      energy: [-2, -1],
      xp: { source: 'event', amount: [3, 7] },
      curiosityWeight: 4,
    },
  },
  {
    id: 'press',
    label: 'Press & Media',
    icon: 'newspaper-outline',
    blurb: 'Interviews, features, the circuit.',
    effectHint: 'Earns money, builds reputation & charisma. Unlocks later.',
    unlockLevel: 5,
    color: COLORS.gold,
    effect: {
      earn: [200, 600],
      stats: { reputation: [0.1, 0.4], charisma: [0.1, 0.3] },
      energy: [-2, -1],
      xp: { source: 'event', amount: [4, 8] },
      curiosityWeight: 3,
    },
  },
  {
    id: 'fitness',
    label: 'Fitness',
    icon: 'barbell-outline',
    blurb: 'Train. Discipline the body.',
    effectHint: 'Restores energy, builds discipline & mental health.',
    unlockLevel: 1,
    color: COLORS.positive,
    effect: {
      stats: { discipline: [0.2, 0.5], mentalHealth: [0.2, 0.5] },
      energy: [1, 3],
      xp: { source: 'engagement', amount: [2, 5] },
      curiosityWeight: 1,
    },
  },
  {
    id: 'rest',
    label: 'Rest & Recover',
    icon: 'bed-outline',
    blurb: 'Sleep, recharge, protect your peace.',
    effectHint: 'Restores the most energy and mental health. No grind.',
    unlockLevel: 1,
    color: COLORS.neutral,
    effect: {
      stats: { mentalHealth: [0.3, 0.7] },
      energy: [3, 6],
      curiosityWeight: 0,
    },
  },
];

const BY_ID: Record<string, Activity> = Object.fromEntries(
  ACTIVITIES.map((a) => [a.id, a])
);

export function getActivity(id: ActivityId | null): Activity | null {
  if (!id) return null;
  return BY_ID[id] ?? null;
}
