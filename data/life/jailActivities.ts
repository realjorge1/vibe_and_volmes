import type { LifeActivity } from '../../types/life';

/**
 * Life inside. While the artist is locked up these are the only activities
 * there are (the engine locks every other category, and hides these outside).
 * The escape is a launcher: it opens the escape screen instead of rolling.
 */
export const JAIL_ACTIVITIES: LifeActivity[] = [
  {
    id: 'jail-write',
    category: 'jail',
    label: 'Write in your cell',
    blurb: 'A pencil stub, a notebook, a lot of time.',
    icon: 'create-outline',
    energyCost: 10,
    skill: 'writing',
    outcomes: [
      {
        id: 'pages',
        weight: 3,
        luck: 'good',
        consequences: {
          statChanges: [{ stat: 'writing', delta: 3 }, { stat: 'creativity', delta: 2 }],
          flavorText: 'You filled forty pages. Some of it is the truest thing you have ever written.',
        },
      },
      {
        id: 'blank',
        weight: 2,
        luck: 'bad',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -3 }],
          flavorText: 'You stared at a blank page until lights out.',
        },
      },
    ],
  },
  {
    id: 'jail-workout',
    category: 'jail',
    label: 'Yard workout',
    blurb: 'Pull-ups on the bars. Push-ups on the concrete.',
    icon: 'barbell-outline',
    energyCost: 10,
    skill: 'discipline',
    outcomes: [
      {
        id: 'strong',
        weight: 3,
        luck: 'good',
        consequences: {
          statChanges: [{ stat: 'discipline', delta: 3 }, { stat: 'mentalHealth', delta: 3 }],
          flavorText: 'You are in the best shape of your life. You did not expect to say that in here.',
        },
      },
      {
        id: 'beef',
        weight: 1,
        luck: 'bad',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -2 }],
          legalCharge: 'inside-fight',
          flavorText: 'Someone wanted your pull-up bar. It got physical. The guards wrote it up.',
        },
      },
    ],
  },
  {
    id: 'jail-tape',
    category: 'jail',
    label: 'Record a verse over the phone',
    blurb: 'Fifteen minutes, a collect call, a producer on the other end.',
    icon: 'call-outline',
    energyCost: 20,
    cooldownWeeks: 4,
    gates: { minFans: 1_000 },
    outcomes: [
      {
        id: 'tape',
        weight: 3,
        consequences: {
          releaseTrack: 'jail-tape',
          flavorText: 'You rapped a whole song into a prison phone. Your producer built a beat around the static.',
        },
      },
      {
        id: 'cut-off',
        weight: 1,
        consequences: {
          releaseTrack: 'jail-tape',
          statChanges: [{ stat: 'authenticity', delta: 2 }],
          flavorText: 'The call cut off mid-verse. Your producer released it anyway, the dial tone and all. It is somehow better.',
        },
      },
    ],
  },
  {
    id: 'jail-allies',
    category: 'jail',
    label: 'Make allies',
    blurb: 'Who you sit with matters more than anything out there.',
    icon: 'people-outline',
    energyCost: 10,
    skill: 'charisma',
    outcomes: [
      {
        id: 'respected',
        weight: 3,
        luck: 'good',
        consequences: {
          statChanges: [{ stat: 'charisma', delta: 2 }, { stat: 'mentalHealth', delta: 3 }],
          flavorText: 'The older guys on the block decided you are all right. Nobody bothers you now.',
        },
      },
      {
        id: 'wrong-table',
        weight: 2,
        luck: 'bad',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -4 }],
          mentalChanges: [{ axis: 'paranoia', delta: 6 }],
          flavorText: 'You sat at the wrong table. Now you sleep with one eye open.',
        },
      },
    ],
  },
  {
    id: 'jail-call-home',
    category: 'jail',
    label: 'Call home',
    blurb: 'A collect call, a long line, a familiar voice.',
    icon: 'home-outline',
    energyCost: 5,
    outcomes: [
      {
        id: 'warm',
        weight: 3,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 6 }],
          mentalChanges: [{ axis: 'isolation', delta: -8 }],
          flavorText: 'You called home. Everyone talked at once. You held the phone with both hands.',
        },
      },
      {
        id: 'nobody',
        weight: 1,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -4 }],
          flavorText: 'Nobody picked up. You let it ring until the guard tapped the glass.',
        },
      },
    ],
  },
  {
    id: 'jail-chaplain',
    category: 'jail',
    label: 'Talk to the counselor',
    blurb: 'An hour with someone whose job is listening.',
    icon: 'chatbubbles-outline',
    energyCost: 5,
    outcomes: [
      {
        id: 'lighter',
        weight: 3,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 7 }],
          mentalChanges: [{ axis: 'depression', delta: -8 }, { axis: 'anxiety', delta: -6 }],
          flavorText: 'You talked for an hour. You cried for ten minutes of it. You walked out lighter.',
        },
      },
      {
        id: 'quiet',
        weight: 1,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 3 }],
          flavorText: 'You sat across from the counselor and didn’t say much. They didn’t push. That helped too.',
        },
      },
    ],
  },
  {
    id: 'jail-escape',
    category: 'jail',
    label: 'Plan an escape',
    blurb: 'Three moves. Every one has to work.',
    icon: 'exit-outline',
    energyCost: 25,
    cooldownWeeks: 6,
    opens: '/escape-modal',
    outcomes: [],
  },
];
