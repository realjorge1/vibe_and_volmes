import type { GameEvent } from '../../types/events';

/**
 * RISE, FALL, COMEBACK. The career arc already knows when the artist is in
 * decline; these are the offers and moments that come with it: the reality
 * show, the nostalgia tour, the "where are they now" piece, and the moment
 * the artist decides to come back. Announcing a comeback is in the Studio;
 * these events can start one too.
 */

const ARC = ['career-arc'];

export const ARC_EVENTS: GameEvent[] = [
  {
    id: 'arc-where-are-they-now',
    category: 'career',
    title: '"Where Are They Now?"',
    description:
      'A big publication wants you for their "Where Are They Now?" issue. Your publicist says it is either a career obituary or the first chapter of a comeback, depending on what you say.',
    weight: 8,
    triggers: [{ type: 'career_phase', phase: 'decline' }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'tease',
        text: 'Tell them you’re working on something.',
        consequences: {
          statChanges: [{ stat: 'industryRespect', delta: 2 }],
          addTags: ['comeback-teased'],
          flavorText: 'You told them you are working on something. The headline: "Don’t Call It a Comeback (Yet)." People are curious.',
        },
      },
      {
        id: 'honest',
        text: 'Be honest about falling off.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 6 }, { stat: 'mentalHealth', delta: 3 }],
          fansDelta: 2_000,
          flavorText: 'You talked about the fall honestly. The piece went viral for the right reasons.',
        },
      },
      {
        id: 'decline',
        text: 'Decline. You’re not a "where are they now."',
        consequences: { statChanges: [{ stat: 'mentalHealth', delta: -2 }], flavorText: 'You declined. They ran it anyway, with a photo from your worst era.' },
      },
    ],
    tags: ARC,
    cooldown: 20,
  },
  {
    id: 'arc-reality-show',
    category: 'opportunity',
    title: 'The Reality Show Offer',
    description:
      'A network wants you for a celebrity reality show. Twelve episodes, a house with cameras in the ceiling, and a check that would fix everything. Your name would never be the same again.',
    weight: 7,
    triggers: [{ type: 'career_phase', phase: 'decline' }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'sign',
        text: 'Sign. Money is money.',
        consequences: {
          moneyDelta: 150_000,
          fansDelta: 40_000,
          statChanges: [{ stat: 'authenticity', delta: -10 }, { stat: 'industryRespect', delta: -6 }, { stat: 'charisma', delta: 3 }],
          moment: { kind: 'meme', headline: '{playerName} is on a reality show now and the internet cannot look away', topic: 'the reality show', heat: 70, valence: -10, hashtag: '{playerName}TV' },
          flavorText: 'You did the show. You cried in a hot tub on episode six. America watched. Musicians winced.',
        },
      },
      {
        id: 'pass',
        text: 'Pass. You’re a musician.',
        consequences: { statChanges: [{ stat: 'authenticity', delta: 3 }], flavorText: 'You passed. A rival took the slot and is now famous for crying in a hot tub.' },
      },
    ],
    tags: ARC,
    unique: true,
  },
  {
    id: 'arc-nostalgia-tour',
    category: 'opportunity',
    title: 'The Nostalgia Tour',
    description:
      'A promoter is putting together a "throwback" tour: six acts from your era, twenty minutes each, the hits only. It pays very well and nobody wants to hear the new stuff.',
    weight: 7,
    triggers: [{ type: 'career_phase', phase: 'decline' }, { type: 'has_released_track' }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'take',
        text: 'Take it. Play the hits.',
        consequences: {
          moneyDelta: 80_000,
          fansDelta: 10_000,
          statChanges: [{ stat: 'fanLoyalty', delta: 5 }, { stat: 'creativity', delta: -3 }],
          flavorText: 'Twenty minutes a night, the hits only. People sang every word. You started to miss the new stuff.',
        },
      },
      {
        id: 'new-only',
        text: 'Only if you can play one new song.',
        consequences: {
          moneyDelta: 50_000,
          statChanges: [{ stat: 'authenticity', delta: 3 }],
          addTags: ['comeback-teased'],
          flavorText: 'You negotiated one new song a night. Every night, it got a bigger reaction than the night before.',
        },
      },
      {
        id: 'pass',
        text: 'Pass. You’re not a throwback.',
        consequences: { statChanges: [{ stat: 'authenticity', delta: 2 }], flavorText: 'You passed. Your old rival headlined it. They seemed happy. That annoys you.' },
      },
    ],
    tags: ARC,
    unique: true,
  },
  {
    id: 'arc-young-cover',
    category: 'social',
    title: 'A Kid Covered Your Old Song',
    description: 'A nineteen-year-old covered your biggest old song and it is blowing up. Half the comments are "wait, this is a COVER?"',
    weight: 6,
    triggers: [{ type: 'career_phase', phase: 'decline' }, { type: 'has_released_track' }],
    choices: [
      {
        id: 'duet',
        text: 'Duet with them.',
        consequences: {
          fansDelta: 8_000,
          statChanges: [{ stat: 'charisma', delta: 2 }],
          addTags: ['comeback-teased'],
          moment: { kind: 'best', headline: '{playerName} duets with the teen whose cover of their old hit went viral', topic: 'the cover duet', heat: 60, valence: 80 },
          flavorText: 'You duetted the kid. A whole generation just found out who you are.',
        },
      },
      {
        id: 'ignore',
        text: 'Let them have it.',
        consequences: { fansDelta: 1_500, flavorText: 'You let the kid have the moment. Your old song is in the charts again, quietly.' },
      },
    ],
    tags: ARC,
    cooldown: 20,
  },
  {
    id: 'arc-comeback-moment',
    category: 'career',
    title: 'The Moment',
    description:
      'Something shifted this week. The doubters are louder than ever and so is the hunger. You can feel a record in you that would make everyone eat their words.',
    weight: 9,
    priority: true,
    triggers: [{ type: 'has_tag', tag: 'comeback-teased' }, { type: 'lacks_tag', tag: 'comeback-declared' }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'announce',
        text: 'Announce the comeback. Next record is the one.',
        consequences: {
          addTags: ['comeback-declared'],
          removeTags: ['comeback-teased'],
          statChanges: [{ stat: 'discipline', delta: 4 }],
          moment: { kind: 'best', headline: '{playerName} says their next record is the comeback. The internet has thoughts', topic: 'the comeback announcement', heat: 60, valence: 20, hashtag: '{playerName}Returns' },
          flavorText: 'You announced it: the next record is the comeback. Now everyone is waiting. Hype builds every week until you drop it.',
        },
      },
      {
        id: 'quiet',
        text: 'Work in silence.',
        consequences: {
          removeTags: ['comeback-teased'],
          statChanges: [{ stat: 'creativity', delta: 4 }, { stat: 'mentalHealth', delta: 2 }],
          flavorText: 'You worked in silence. No promises, no pressure. Just the work.',
        },
      },
    ],
    tags: ARC,
    cooldown: 30,
  },
  {
    id: 'arc-peak-pressure',
    category: 'personal',
    title: 'The View from the Top',
    description: 'You are on top. Every room goes quiet when you walk in. You haven’t written a real song in months, and you’re starting to notice.',
    weight: 6,
    triggers: [{ type: 'career_phase', phase: 'peak' }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'retreat',
        text: 'Disappear to a cabin and write.',
        consequences: {
          statChanges: [{ stat: 'creativity', delta: 6 }, { stat: 'mentalHealth', delta: 5 }, { stat: 'charisma', delta: -2 }],
          flavorText: 'You disappeared for a month with a guitar and no phone. You came back with twelve songs and a beard of some kind.',
        },
      },
      {
        id: 'ride',
        text: 'Ride the wave.',
        consequences: {
          fansDelta: 20_000,
          mentalChanges: [{ axis: 'burnout', delta: 8 }],
          flavorText: 'You rode it: every show, every party, every interview. The numbers climbed. You didn’t sleep.',
        },
      },
    ],
    tags: ARC,
    cooldown: 24,
  },
];
