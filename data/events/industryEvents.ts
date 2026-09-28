import type { GameEvent } from '../../types/events';

/**
 * Phase 3 events. These are the data-driven hooks that let the Phase 1
 * event engine spawn Phase 3 system state (contract offers, interviews,
 * controversies, rivalry heat, mental pressure) via the extended
 * consequence fields. No system logic lives here — only content.
 */
export const INDUSTRY_EVENTS: GameEvent[] = [
  {
    id: 'p3-indie-offer',
    category: 'opportunity',
    title: 'An Indie Label Wants a Meeting',
    description:
      'A respected indie label has been watching your numbers climb. They want to talk a real deal — modest money, but creative freedom and a genuine push.',
    weight: 7,
    triggers: [
      { type: 'fans_gte', value: 5_000 },
      { type: 'lacks_contract' },
      { type: 'lacks_tag', tag: 'indie-for-life' },
    ],
    choices: [
      {
        id: 'hear-them-out',
        text: 'Hear them out.',
        consequences: {
          spawnContractOfferTier: 'indie',
          statChanges: [{ stat: 'industryRespect', delta: 4 }],
          flavorText: 'They put an offer on the table. It is sitting in your inbox.',
        },
      },
      {
        id: 'stay-indie',
        text: 'Stay fully independent.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 8 }],
          socialReaction: 'positive',
          flavorText: 'You pass. The underground respects the conviction.',
        },
      },
    ],
    tags: ['label', 'phase3'],
    cooldown: 8,
  },
  {
    id: 'p3-major-circling',
    category: 'opportunity',
    title: 'The Majors Are Circling',
    description:
      'A major label A&R flew out to see you. The money is life-changing. So is the fine print.',
    weight: 6,
    triggers: [
      { type: 'fans_gte', value: 200_000 },
      { type: 'stat_gte', stat: 'industryRespect', value: 35 },
    ],
    choices: [
      {
        id: 'take-meeting',
        text: 'Take the meeting.',
        consequences: {
          spawnContractOfferTier: 'major',
          flavorText: 'A major-label offer materializes. This decision will define your career.',
        },
      },
      {
        id: 'leverage-it',
        text: 'Leak the interest to create a bidding war.',
        consequences: {
          spawnContractOfferTier: 'major',
          statChanges: [{ stat: 'industryRespect', delta: -3 }],
          spawnControversyId: 'ctrl-industry-plant',
          flavorText: 'The leak works — and brands you as a operator. Offer still stands.',
        },
      },
    ],
    tags: ['label', 'phase3'],
    cooldown: 12,
  },
  {
    id: 'p3-podcast-invite',
    category: 'opportunity',
    title: 'A Big Podcast Wants You On',
    description:
      'A culture podcast with a huge, opinionated audience invited you on. Great reach. They also love a viral gotcha moment.',
    weight: 8,
    triggers: [{ type: 'fans_gte', value: 10_000 }],
    choices: [
      {
        id: 'do-it',
        text: 'Do the interview.',
        consequences: {
          bookInterviewKind: 'podcast',
          flavorText: 'You are booked. Time to decide how candid you want to be.',
        },
      },
      {
        id: 'decline',
        text: 'Decline — too risky right now.',
        consequences: {
          statChanges: [{ stat: 'charisma', delta: -1 }],
          flavorText: 'You pass. Safe, but the silence gets noticed.',
        },
      },
    ],
    tags: ['media', 'phase3'],
    cooldown: 5,
  },
  {
    id: 'p3-burnout-warning',
    category: 'personal',
    title: 'You Are Running on Empty',
    description:
      'You have not had a real day off in months. Your body is sending warnings you keep ignoring.',
    weight: 7,
    triggers: [
      { type: 'mental_gte', mentalAxis: 'burnout', value: 55 },
    ],
    choices: [
      {
        id: 'push-through',
        text: 'Push through. The schedule does not stop.',
        consequences: {
          mentalChanges: [
            { axis: 'burnout', delta: 10 },
            { axis: 'anxiety', delta: 8 },
          ],
          statChanges: [{ stat: 'energy', delta: -10 }],
          flavorText: 'You push. Something is going to give eventually.',
        },
      },
      {
        id: 'take-break',
        text: 'Cancel commitments and actually rest.',
        consequences: {
          mentalChanges: [
            { axis: 'burnout', delta: -22 },
            { axis: 'anxiety', delta: -10 },
          ],
          statChanges: [{ stat: 'energy', delta: 15 }],
          fansDelta: -2_000,
          historyRecord: {
            kind: 'statement',
            summary: 'stepped back from the spotlight to protect their health',
            severity: 30,
            tags: ['mental-health', 'hiatus'],
          },
          flavorText: 'You disappear for a bit. Some fans drift; the right ones understand.',
        },
      },
    ],
    tags: ['personal', 'mental-health', 'phase3'],
    cooldown: 6,
  },
  {
    id: 'p3-rival-provocation',
    category: 'rivalry',
    title: 'A Rival Took a Shot',
    description:
      'A rival name-dropped you dismissively in a viral interview. The internet is waiting for your response.',
    weight: 7,
    triggers: [
      { type: 'fans_gte', value: 50_000 },
      { type: 'rivalry_intensity_gte', value: 20 },
    ],
    choices: [
      {
        id: 'fire-back',
        text: 'Fire back publicly and hard.',
        consequences: {
          rivalryIntensityDelta: { delta: 20 },
          mentalChanges: [{ axis: 'paranoia', delta: 6 }],
          statChanges: [{ stat: 'reputation', delta: -2 }],
          socialReaction: 'mixed',
          historyRecord: {
            kind: 'feud',
            summary: 'escalated a public feud after being provoked',
            severity: 45,
            tags: ['rivalry', 'beef'],
          },
          flavorText: 'You do not let it slide. The war is officially on.',
        },
      },
      {
        id: 'ignore-it',
        text: 'Stay above it. No response.',
        consequences: {
          rivalryIntensityDelta: { delta: -8 },
          statChanges: [
            { stat: 'reputation', delta: 4 },
            { stat: 'industryRespect', delta: 3 },
          ],
          socialReaction: 'positive',
          flavorText: 'You say nothing. The maturity reads well.',
        },
      },
    ],
    tags: ['rivalry', 'phase3'],
    cooldown: 5,
  },
];
