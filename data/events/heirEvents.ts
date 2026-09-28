import type { GameEvent } from '../../types/events';

/**
 * Heir events: living with a famous last name. Every child run starts with
 * the `famous-parent` tag (systems/meta/applyHeir.ts); these are the public's
 * expectations, the family's rivals and the parent's shadow. Pure content.
 */
export const HEIR_EVENTS: GameEvent[] = [
  {
    id: 'heir-nepo-baby',
    category: 'drama',
    title: '"Nepo Baby"',
    description:
      'A viral thread lists every door your last name opened. The replies are brutal, and some of them are right.',
    weight: 12,
    triggers: [{ type: 'has_tag', tag: 'famous-parent' }],
    choices: [
      {
        id: 'own-it',
        text: 'Own it: "Yes, I had a head start. Listen anyway."',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 6 },
            { stat: 'reputation', delta: 2 },
          ],
          fansDelta: 1_500,
          socialReaction: 'positive',
          flavorText: 'Honesty disarmed half of them. The other half started actually listening.',
        },
      },
      {
        id: 'clap-back',
        text: 'Clap back: nobody handed you the talent.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -4 }],
          fansDelta: 2_500,
          socialReaction: 'viral',
          flavorText: 'The clap-back went further than the thread. So did the nepo-baby memes.',
        },
      },
      {
        id: 'silence',
        text: 'Say nothing and put out better music.',
        consequences: {
          statChanges: [
            { stat: 'discipline', delta: 4 },
            { stat: 'mentalHealth', delta: -3 },
          ],
          flavorText: 'You stayed off your phone and in the studio. The work will have to answer.',
        },
      },
    ],
    tags: ['heir', 'legacy'],
    unique: true,
  },
  {
    id: 'heir-every-review',
    category: 'career',
    title: 'Every Review Mentions Your Parent',
    description:
      'Your single got good reviews. Every single one mentions your famous parent in the first sentence.',
    weight: 9,
    triggers: [
      { type: 'has_tag', tag: 'famous-parent' },
      { type: 'has_released_track' },
    ],
    choices: [
      {
        id: 'different-sound',
        text: 'Go somewhere they never would have gone.',
        consequences: {
          statChanges: [
            { stat: 'creativity', delta: 6 },
            { stat: 'authenticity', delta: 3 },
          ],
          fansDelta: -500,
          flavorText: 'The new material sounds like nobody in your family. Critics are confused. Good.',
        },
      },
      {
        id: 'tribute',
        text: 'Lean in: sample one of their classics.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: -4 }],
          fansDelta: 3_000,
          socialReaction: 'positive',
          flavorText: 'The sample made the older fans cry and the younger ones curious.',
        },
      },
    ],
    tags: ['heir', 'legacy'],
    cooldown: 20,
  },
  {
    id: 'heir-old-rival',
    category: 'rivalry',
    title: 'The Family Feud Continues',
    description:
      'The artist who feuded with your parent for years just said you are "the discount version" on a podcast.',
    weight: 10,
    triggers: [
      { type: 'has_tag', tag: 'famous-parent' },
      { type: 'rivalry_intensity_gte', value: 1 },
    ],
    choices: [
      {
        id: 'answer',
        text: 'Answer on a track. It is in your blood.',
        consequences: {
          statChanges: [{ stat: 'writing', delta: 3 }],
          fansDelta: 3_500,
          rivalryIntensityDelta: { delta: 20 },
          socialReaction: 'viral',
          flavorText: 'Second-generation beef. The internet has been waiting years for this.',
        },
      },
      {
        id: 'peace',
        text: 'Invite them to lunch and end it.',
        consequences: {
          statChanges: [
            { stat: 'industryRespect', delta: 5 },
            { stat: 'reputation', delta: 3 },
          ],
          rivalryIntensityDelta: { delta: -25 },
          flavorText: 'Lunch lasted four hours. They told you stories about your parent you had never heard.',
        },
      },
    ],
    tags: ['heir', 'rivalry'],
    cooldown: 16,
  },
  {
    id: 'heir-tribute-album',
    category: 'opportunity',
    title: 'The Tribute Album',
    description:
      'A label wants you to record an album of your parent\'s greatest songs. The advance is huge. The comparisons will be worse.',
    weight: 8,
    triggers: [{ type: 'has_tag', tag: 'famous-parent' }, { type: 'week_gte', value: 10 }],
    choices: [
      {
        id: 'record-it',
        text: 'Record it. Their songs deserve a new voice.',
        consequences: {
          moneyDelta: 12_000,
          statChanges: [
            { stat: 'vocalSkill', delta: 3 },
            { stat: 'authenticity', delta: -5 },
          ],
          fansDelta: 5_000,
          flavorText: 'The tribute album charted. Nobody has asked what your own music sounds like.',
        },
      },
      {
        id: 'decline',
        text: 'Decline. You are not a cover act.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 6 },
            { stat: 'industryRespect', delta: 2 },
          ],
          flavorText: 'You turned down the money. The label called you "difficult", which means serious.',
        },
      },
    ],
    tags: ['heir', 'legacy'],
    unique: true,
  },
  {
    id: 'heir-own-name',
    category: 'personal',
    title: 'A Headline With Only Your Name',
    description:
      'For the first time, a headline about you does not mention your family at all.',
    weight: 14,
    triggers: [
      { type: 'has_tag', tag: 'famous-parent' },
      { type: 'fans_gte', value: 100_000 },
    ],
    choices: [
      {
        id: 'frame-it',
        text: 'Screenshot it. Frame it.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 10 }],
          removeTags: ['famous-parent'],
          flavorText: 'You are not somebody\'s kid anymore. You are you.',
          historyRecord: {
            kind: 'triumph',
            summary: 'stepped out of a famous parent\'s shadow',
            severity: 50,
            tags: ['legacy', 'heir'],
          },
        },
      },
    ],
    tags: ['heir', 'legacy'],
    unique: true,
  },
];
