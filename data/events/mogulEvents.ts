import type { GameEvent } from '../../types/events';

/**
 * THE MOGUL'S LIFE: the artists on {myLabel}, and the businesses. `{signee}`
 * is bound to one of the artist's signees when the event is slated; the
 * `signee` consequence acts on that same person.
 */

const MOGUL = ['mogul'];

export const MOGUL_EVENTS: GameEvent[] = [
  {
    id: 'mogul-signee-wants-more',
    category: 'career',
    title: '{signee} Wants a Better Deal',
    description:
      '{signee} is blowing up, and their new manager says the deal they signed with {myLabel} is "from a different time." They want a bigger cut, or they want out.',
    weight: 8,
    triggers: [{ type: 'has_signee' }],
    choices: [
      {
        id: 'renegotiate',
        text: 'Give them a better split.',
        consequences: {
          signee: { action: 'renegotiate' },
          statChanges: [{ stat: 'industryRespect', delta: 3 }],
          flavorText: 'You redid {signee}’s deal. Less money for {myLabel}, a lot more loyalty.',
        },
      },
      {
        id: 'hold',
        text: 'A deal is a deal.',
        consequences: {
          statChanges: [{ stat: 'industryRespect', delta: -1 }],
          flavorText: 'You held them to the contract. {signee} went quiet. Quiet is not good.',
        },
      },
      {
        id: 'let-go',
        text: 'Let them go, with your blessing.',
        consequences: {
          signee: { action: 'leave' },
          statChanges: [{ stat: 'reputation', delta: 4 }],
          flavorText: 'You let {signee} walk with your blessing. They thanked you in their next three interviews.',
        },
      },
    ],
    tags: MOGUL,
    cooldown: 10,
  },
  {
    id: 'mogul-signee-beef',
    category: 'rivalry',
    title: '{signee} Started Something',
    description: '{signee} dissed {rival} on a new song. {rival}’s camp assumes you approved it. Did you?',
    weight: 6,
    triggers: [{ type: 'has_signee' }, { type: 'rivalry_intensity_gte', value: 15 }],
    choices: [
      {
        id: 'back',
        text: 'Back your artist.',
        consequences: {
          signee: { action: 'loyal' },
          warSwing: 6,
          fansDelta: 3_000,
          flavorText: 'You reposted {signee}’s diss. {myLabel} is a crew now, and crews have enemies.',
        },
      },
      {
        id: 'distance',
        text: 'Distance the label from it.',
        consequences: {
          statChanges: [{ stat: 'industryRespect', delta: 2 }],
          flavorText: 'You said the song speaks for {signee}, not {myLabel}. {signee} noticed.',
        },
      },
    ],
    tags: MOGUL,
    cooldown: 12,
  },
  {
    id: 'mogul-signee-thanks',
    category: 'social',
    title: '{signee} Thanks You',
    description: '{signee} just had the best week of their career. Their caption: "None of this happens without {playerName}."',
    weight: 6,
    triggers: [{ type: 'has_signee' }],
    choices: [
      {
        id: 'celebrate',
        text: 'Celebrate them loudly.',
        consequences: {
          signee: { action: 'loyal' },
          statChanges: [{ stat: 'reputation', delta: 3 }, { stat: 'mentalHealth', delta: 4 }],
          flavorText: 'You threw {signee} a party at the label. Someone cried during the toast. It was you.',
        },
      },
    ],
    tags: MOGUL,
    cooldown: 12,
  },
  {
    id: 'mogul-poach',
    category: 'career',
    title: 'A Major Wants {signee}',
    description: 'A major label offered {signee} five times what {myLabel} pays. They called you before answering. That means something.',
    weight: 5,
    triggers: [{ type: 'has_signee' }, { type: 'week_gte', value: 20 }],
    choices: [
      {
        id: 'match',
        text: 'Match it. Whatever it takes.',
        consequences: {
          moneyDelta: -60_000,
          signee: { action: 'loyal' },
          flavorText: 'You matched the major’s offer. {myLabel} is thinner this year. {signee} is staying.',
        },
      },
      {
        id: 'bless',
        text: 'Tell them to take it.',
        consequences: {
          signee: { action: 'leave' },
          moneyDelta: 30_000,
          statChanges: [{ stat: 'reputation', delta: 3 }],
          flavorText: 'You told {signee} to take it, and negotiated a $30,000 buyout on the way out. Business with a heart.',
        },
      },
    ],
    tags: MOGUL,
    cooldown: 16,
  },
  {
    id: 'mogul-label-anniversary',
    category: 'career',
    title: '{myLabel} Turns One',
    description: 'A year of {myLabel}. The staff ordered a cake shaped like your logo. It is mostly frosting.',
    weight: 5,
    triggers: [{ type: 'owns_label' }, { type: 'week_gte', value: 12 }],
    choices: [
      {
        id: 'party',
        text: 'Throw a label party.',
        consequences: {
          moneyDelta: -10_000,
          statChanges: [{ stat: 'industryRespect', delta: 4 }],
          flavorText: 'You threw a party for {myLabel}. Half the industry showed up. Two of them want to sign with you.',
        },
      },
      {
        id: 'work',
        text: 'Skip it. Back to work.',
        consequences: { statChanges: [{ stat: 'discipline', delta: 2 }], flavorText: 'You ate a slice of logo cake at your desk and kept working.' },
      },
    ],
    tags: MOGUL,
    unique: true,
  },
];
