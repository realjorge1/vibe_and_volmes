import type { GameEvent } from '../../types/events';

/**
 * Phase 5 culture events. Pure content — they react to the era / genre
 * climate the cultureEngine maintains, via the new `era_is`,
 * `genre_saturated` and `genre_ascendant` triggers. This is how the world
 * aging becomes something the PLAYER feels and decides about, not just a
 * background number. Adding more is appending entries here.
 */
export const CULTURE_EVENTS: GameEvent[] = [
  {
    id: 'p5-sound-played-out',
    category: 'career',
    title: 'Your Sound Is Played Out',
    description:
      'Critics are calling your genre tired. The blogs that built you are chasing something newer. You can feel the room cooling.',
    weight: 8,
    triggers: [
      { type: 'genre_saturated' },
      { type: 'has_released_track' },
      { type: 'lacks_tag', tag: 'reinvented-recently' },
    ],
    choices: [
      {
        id: 'reinvent',
        text: 'Reinvent your sound. Chase the new wave.',
        consequences: {
          statChanges: [
            { stat: 'creativity', delta: 6 },
            { stat: 'authenticity', delta: -6 },
          ],
          addTags: ['reinvented-recently'],
          socialReaction: 'mixed',
          flavorText:
            'You pivot hard. Some fans feel abandoned; the press is intrigued.',
          historyRecord: {
            kind: 'statement',
            summary: 'reinvented your entire sound to survive a culture shift',
            severity: 45,
            tags: ['reinvention', 'culture'],
          },
        },
      },
      {
        id: 'double-down',
        text: 'Double down. Stay true to who you are.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 10 },
            { stat: 'fanLoyalty', delta: 6 },
          ],
          fansDelta: -1500,
          socialReaction: 'positive',
          flavorText:
            'You refuse to chase trends. The core fanbase loves you harder for it — even as the numbers dip.',
          historyRecord: {
            kind: 'statement',
            summary: 'refused to chase trends when your sound fell out of fashion',
            severity: 40,
            tags: ['integrity', 'culture'],
          },
        },
      },
    ],
    tags: ['culture', 'phase5'],
    cooldown: 14,
  },
  {
    id: 'p5-riding-the-wave',
    category: 'opportunity',
    title: 'Riding The Wave',
    description:
      'Your genre is THE sound right now. Every playlist, every feed. The window is open — but windows close.',
    weight: 8,
    triggers: [
      { type: 'genre_ascendant' },
      { type: 'has_released_track' },
    ],
    choices: [
      {
        id: 'flood-the-market',
        text: 'Flood the market. Drop everything you have.',
        consequences: {
          statChanges: [{ stat: 'discipline', delta: -4 }],
          fansDelta: 9000,
          socialReaction: 'viral',
          flavorText:
            'You ride it for everything it is worth. Huge numbers — and a faint smell of overexposure.',
          historyRecord: {
            kind: 'triumph',
            summary: 'caught a culture wave perfectly and rode it to a new peak',
            severity: 55,
            tags: ['peak', 'culture'],
          },
        },
      },
      {
        id: 'stay-measured',
        text: 'Stay measured. One perfect release.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 5 },
            { stat: 'industryRespect', delta: 5 },
          ],
          fansDelta: 4000,
          socialReaction: 'positive',
          flavorText:
            'You take the moment with discipline. Smaller spike, longer shadow.',
        },
      },
    ],
    tags: ['culture', 'phase5'],
    cooldown: 12,
  },
  {
    id: 'p5-ai-flood-realness',
    category: 'opportunity',
    title: 'The Realness Premium',
    description:
      'Synthetic artists are everywhere. Audiences are starving for something undeniably human — and they know your story is real.',
    weight: 7,
    triggers: [
      { type: 'era_is', era: 'ai-flood' },
      { type: 'stat_gte', stat: 'authenticity', value: 55 },
    ],
    choices: [
      {
        id: 'lean-in',
        text: 'Make it your whole brand. The last real one.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 8 },
            { stat: 'reputation', delta: 6 },
          ],
          fansDelta: 7000,
          socialReaction: 'viral',
          flavorText:
            '"The last real one" trends for a week. It sticks.',
          historyRecord: {
            kind: 'triumph',
            summary:
              'became a symbol of human authenticity during the AI flood',
            severity: 60,
            tags: ['identity', 'culture', 'authenticity'],
          },
        },
      },
      {
        id: 'ignore',
        text: 'Ignore the discourse. Just make music.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 3 }],
          flavorText: 'You let the work speak. Quietly respected.',
        },
      },
    ],
    tags: ['culture', 'phase5', 'ai-flood'],
    cooldown: 20,
  },
  {
    id: 'p5-post-authenticity-spectacle',
    category: 'drama',
    title: 'Nothing Is Sacred Anymore',
    description:
      'The culture has gone fully post-authentic. Sincerity reads as weakness; only spectacle moves the needle. Your team wants you to lean into the chaos.',
    weight: 6,
    triggers: [
      { type: 'era_is', era: 'post-authenticity' },
      { type: 'has_released_track' },
    ],
    choices: [
      {
        id: 'become-spectacle',
        text: 'Become the spectacle. Give them a show.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 7 },
            { stat: 'authenticity', delta: -10 },
          ],
          fansDelta: 8000,
          socialReaction: 'mixed',
          flavorText:
            'You become unmissable and unbelievable in the same breath.',
          historyRecord: {
            kind: 'statement',
            summary:
              'embraced pure spectacle when the culture stopped caring what was real',
            severity: 50,
            tags: ['spectacle', 'culture', 'identity'],
          },
        },
      },
      {
        id: 'hold-the-line',
        text: 'Hold the line. Be the one who still means it.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 12 },
            { stat: 'fanLoyalty', delta: 8 },
          ],
          socialReaction: 'positive',
          flavorText:
            'In an unreal era you stay real. A small, ferociously loyal church forms around you.',
          historyRecord: {
            kind: 'statement',
            summary:
              'stayed sincere in the post-authenticity era and became a cult touchstone',
            severity: 55,
            tags: ['integrity', 'culture', 'cult'],
          },
        },
      },
    ],
    tags: ['culture', 'phase5', 'post-authenticity'],
    cooldown: 18,
  },
];
