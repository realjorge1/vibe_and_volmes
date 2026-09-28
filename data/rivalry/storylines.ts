import type { RivalryStoryline } from '../../types/relationships';

/**
 * Recurring rivalry narratives. The rivalry engine attaches a storyline
 * when intensity crosses a threshold and walks its stages over weeks,
 * emitting beats to social/history. Crossing the final stage marks the
 * feud "legendary" — it is remembered for the rest of the playthrough.
 */
export const RIVALRY_STORYLINES: RivalryStoryline[] = [
  {
    id: 'sl-cold-war',
    name: 'The Cold War',
    stages: [
      {
        stage: 0,
        trigger: 'intensity_gte',
        value: 25,
        beat: 'Whispers of tension between you and {rival} start circulating.',
        rivalActionId: 'ra-subtweet',
      },
      {
        stage: 1,
        trigger: 'intensity_gte',
        value: 45,
        beat: 'The {rival} situation is now an open industry storyline.',
        rivalActionId: 'ra-trend-domination',
      },
      {
        stage: 2,
        trigger: 'intensity_gte',
        value: 65,
        beat: 'Fan armies have picked sides. This is a war now.',
        rivalActionId: 'ra-spread-rumor',
      },
      {
        stage: 3,
        trigger: 'intensity_gte',
        value: 85,
        beat: 'You vs {rival} is THE defining rivalry of this era.',
        rivalActionId: 'ra-diss-track',
      },
    ],
  },
  {
    id: 'sl-frenemies',
    name: 'Frenemies',
    stages: [
      {
        stage: 0,
        trigger: 'intensity_gte',
        value: 20,
        beat: 'You and {rival} keep getting compared, and it is getting weird.',
        rivalActionId: 'ra-subtweet',
      },
      {
        stage: 1,
        trigger: 'weeks_since_start',
        value: 6,
        beat: '{rival} extended a public olive branch — is it genuine?',
        rivalActionId: 'ra-olive-branch',
      },
      {
        stage: 2,
        trigger: 'intensity_gte',
        value: 55,
        beat: 'The "friendship" with {rival} curdled back into rivalry.',
        rivalActionId: 'ra-sabotage-collab',
      },
      {
        stage: 3,
        trigger: 'intensity_gte',
        value: 80,
        beat: 'The {rival} betrayal arc is legendary fan lore now.',
        rivalActionId: 'ra-diss-track',
      },
    ],
  },
  {
    id: 'sl-throne',
    name: 'For the Throne',
    stages: [
      {
        stage: 0,
        trigger: 'intensity_gte',
        value: 30,
        beat: 'You are now a genuine threat to {rival}’s position.',
        rivalActionId: 'ra-trend-domination',
      },
      {
        stage: 1,
        trigger: 'intensity_gte',
        value: 55,
        beat: '{rival} is using every lever to keep you down.',
        rivalActionId: 'ra-award-snipe',
      },
      {
        stage: 2,
        trigger: 'intensity_gte',
        value: 78,
        beat: 'The succession war with {rival} is all anyone discusses.',
        rivalActionId: 'ra-sabotage-collab',
      },
      {
        stage: 3,
        trigger: 'intensity_gte',
        value: 92,
        beat: 'History will remember who took the throne from {rival}.',
        rivalActionId: 'ra-diss-track',
      },
    ],
  },
];

export function getStoryline(id: string): RivalryStoryline | undefined {
  return RIVALRY_STORYLINES.find((s) => s.id === id);
}
