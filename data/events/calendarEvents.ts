import type { GameEvent } from '../../types/events';

/**
 * THE MUSIC YEAR, as story. The tentpoles themselves (lineup, festival,
 * nominations, award night, Wrapped) run in systems/calendar; these are the
 * choices around them: the holiday single, the new year, award season nerves.
 */

const YEAR = ['calendar'];

export const CALENDAR_EVENTS: GameEvent[] = [
  {
    id: 'cal-holiday-single',
    category: 'career',
    title: 'Holiday Song?',
    description:
      'It’s holiday season and every artist is releasing a holiday song. A good one plays every December for the rest of your life. A bad one also plays every December for the rest of your life.',
    weight: 14,
    priority: true,
    triggers: [{ type: 'year_week', value: 10 }, { type: 'has_released_track' }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'record',
        text: 'Record a holiday song.',
        consequences: {
          releaseTrack: 'holiday',
          statChanges: [{ stat: 'energy', delta: -15 }],
          flavorText: 'You recorded a holiday song in a heatwave, wearing a scarf for the vibe.',
        },
      },
      {
        id: 'sad',
        text: 'Write a sad one. The lonely-at-Christmas kind.',
        requiresTrait: 'hopeless-romantic',
        consequences: {
          releaseTrack: 'holiday',
          statChanges: [{ stat: 'writing', delta: 2 }, { stat: 'energy', delta: -15 }],
          flavorText: 'You wrote a holiday song about spending the holidays without them. Grown adults are crying in malls.',
        },
      },
      {
        id: 'pass',
        text: 'Pass. You’re not a jingle bells person.',
        consequences: { flavorText: 'You passed on the holiday song. December will be quiet. That’s fine.' },
      },
    ],
    tags: YEAR,
    cooldown: 10,
  },
  {
    id: 'cal-new-year',
    category: 'personal',
    title: 'New Year',
    description: 'A new year. Last year is in the Wrapped. This one is a blank page. What’s the resolution?',
    weight: 14,
    priority: true,
    triggers: [{ type: 'year_week', value: 1 }, { type: 'career_year_gte', value: 2 }],
    choices: [
      {
        id: 'write',
        text: 'Write every day.',
        consequences: {
          statChanges: [{ stat: 'discipline', delta: 4 }, { stat: 'writing', delta: 2 }],
          flavorText: 'You set an alarm called "write." You hit snooze on it only twice so far.',
        },
      },
      {
        id: 'health',
        text: 'Sleep, water, therapy.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 6 }],
          mentalChanges: [{ axis: 'burnout', delta: -8 }],
          flavorText: 'You bought a big water bottle with time markings on it. It is helping, annoyingly.',
        },
      },
      {
        id: 'yes',
        text: 'Say yes to everything.',
        consequences: {
          statChanges: [{ stat: 'charisma', delta: 4 }],
          mentalChanges: [{ axis: 'burnout', delta: 6 }],
          flavorText: 'You decided to say yes to everything this year. Your calendar is a crime scene.',
        },
      },
      {
        id: 'people',
        text: 'Call your people more.',
        consequences: {
          mentalChanges: [{ axis: 'isolation', delta: -10 }],
          statChanges: [{ stat: 'mentalHealth', delta: 3 }],
          flavorText: 'You made a list of people to call every Sunday. Your mom is first. She’s thrilled.',
        },
      },
    ],
    tags: YEAR,
    cooldown: 10,
  },
  {
    id: 'cal-award-nerves',
    category: 'personal',
    title: 'Award Season Nerves',
    description: 'Nominations are out and your name is on the list. Everyone keeps asking what you’ll wear, what you’ll say, whether you think you’ll win.',
    weight: 10,
    triggers: [{ type: 'year_week', value: 8 }, { type: 'has_tag', tag: 'nominated-this-year' }],
    choices: [
      {
        id: 'speech',
        text: 'Write a speech, just in case.',
        consequences: { statChanges: [{ stat: 'charisma', delta: 2 }], flavorText: 'You wrote a speech on your phone. You rewrote it nine times. It’s good now.' },
      },
      {
        id: 'jinx',
        text: 'Refuse to think about it. Jinx.',
        consequences: { statChanges: [{ stat: 'mentalHealth', delta: 2 }], flavorText: 'You refuse to say the word "win" out loud this week. It’s working, probably.' },
      },
    ],
    tags: YEAR,
    cooldown: 10,
  },
];
