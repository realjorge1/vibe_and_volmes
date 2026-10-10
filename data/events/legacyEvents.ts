import type { GameEvent } from '../../types/events';

/**
 * ONE UNIVERSE. Past lives live on in this world: `{legend}` is one of the
 * artists the player was before, `{legendHit}` their biggest song. The alive
 * ones still tour; the dead ones have estates, murals and posthumous albums.
 */

const LEGACY = ['legacy'];

export const LEGACY_EVENTS: GameEvent[] = [
  {
    id: 'legend-radio',
    category: 'social',
    title: 'On the Radio',
    description:
      'In a taxi, "{legendHit}" by {legend} comes on. The driver turns it up and starts singing. "They don’t make them like this anymore."',
    weight: 5,
    triggers: [{ type: 'has_legend', legend: 'any' }],
    choices: [
      {
        id: 'sing',
        text: 'Sing along with the driver.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 3 }],
          flavorText: 'You and the driver sang "{legendHit}" all the way across town. You knew every word. You always do.',
        },
      },
      {
        id: 'study',
        text: 'Listen closely. Steal something.',
        consequences: {
          statChanges: [{ stat: 'writing', delta: 2 }, { stat: 'creativity', delta: 1 }],
          flavorText: 'You listened to how {legend} built that chorus and wrote it down on the back of the receipt.',
        },
      },
    ],
    tags: LEGACY,
    cooldown: 20,
  },
  {
    id: 'legend-comparison',
    category: 'social',
    title: '"The Next {legend}"',
    description: 'A big critic called you "the next {legend}." Half the internet agrees. The other half is furious about it.',
    weight: 5,
    triggers: [{ type: 'has_legend', legend: 'any' }, { type: 'fans_gte', value: 25_000 }],
    choices: [
      {
        id: 'honored',
        text: '"An honor. Nobody is the next {legend}."',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 3 }, { stat: 'industryRespect', delta: 2 }],
          flavorText: 'You called it an honor and said nobody could be the next {legend}. Both halves of the internet liked that.',
        },
      },
      {
        id: 'own-lane',
        text: '"I’m the first me."',
        consequences: { statChanges: [{ stat: 'authenticity', delta: 3 }], fansDelta: 1_500, flavorText: 'You said you’re the first you. It became a t-shirt.' },
      },
    ],
    tags: LEGACY,
    unique: true,
  },
  {
    id: 'legend-sample',
    category: 'career',
    title: 'Sample "{legendHit}"?',
    description:
      'Your producer looped four bars of {legend}’s "{legendHit}" and you have not been able to stop listening. Clearing it will cost, and fans of the original will be watching.',
    weight: 6,
    triggers: [{ type: 'has_legend', legend: 'any' }, { type: 'has_released_track' }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'clear',
        text: 'Clear it and put it out.',
        consequences: {
          moneyDelta: -8_000,
          releaseTrack: 'tribute',
          flavorText: 'You cleared the sample and put the song out. The first comment: "{legend} would approve."',
        },
      },
      {
        id: 'interpolate',
        text: 'Rewrite it so you don’t have to pay.',
        consequences: {
          statChanges: [{ stat: 'writing', delta: 2 }],
          flavorText: 'You rewrote the melody just enough. Your lawyer says it’s fine. Your gut says it isn’t.',
        },
      },
      {
        id: 'leave',
        text: 'Leave it alone. Some songs are finished.',
        consequences: { statChanges: [{ stat: 'authenticity', delta: 2 }], flavorText: 'You deleted the loop. "{legendHit}" doesn’t need you.' },
      },
    ],
    tags: LEGACY,
    cooldown: 30,
  },
  {
    id: 'legend-alive-feature',
    category: 'opportunity',
    title: '{legend} Wants to Work With You',
    description: '{legend}, still touring and still loud, sent a message: "I like what you’re doing. Studio next week?"',
    weight: 5,
    triggers: [{ type: 'has_legend', legend: 'alive' }, { type: 'fans_gte', value: 10_000 }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'yes',
        text: 'Obviously yes.',
        consequences: {
          fansDelta: 12_000,
          statChanges: [{ stat: 'industryRespect', delta: 6 }, { stat: 'talent', delta: 2 }],
          moment: { kind: 'best', headline: 'Legend {legend} and {playerName} in the studio together', topic: 'the legend session', heat: 60, valence: 80 },
          flavorText: 'You spent three days in the studio with {legend}. They taught you a breathing trick you will use forever.',
        },
      },
      {
        id: 'nervous',
        text: 'Too nervous. Politely decline.',
        consequences: { statChanges: [{ stat: 'mentalHealth', delta: -3 }], flavorText: 'You declined. You will think about it at 3 a.m. for the rest of your life.' },
      },
    ],
    tags: LEGACY,
    unique: true,
  },
  {
    id: 'legend-estate-album',
    category: 'opportunity',
    title: 'The Posthumous Album',
    description: 'The estate of {legend} is finishing an album from unreleased demos. They want one living artist on it. They chose you.',
    weight: 6,
    triggers: [{ type: 'has_legend', legend: 'dead' }, { type: 'fans_gte', value: 5_000 }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'honor',
        text: 'Do it, and do it right.',
        consequences: {
          fansDelta: 10_000,
          statChanges: [{ stat: 'authenticity', delta: 4 }, { stat: 'industryRespect', delta: 5 }],
          moment: { kind: 'best', headline: '{playerName} appears on {legend}’s posthumous album', topic: 'the posthumous album', heat: 55, valence: 70 },
          flavorText: 'You sang over {legend}’s demo. Their voice in one ear, yours in the other. One take, and you couldn’t explain why.',
        },
      },
      {
        id: 'decline',
        text: 'Decline. They wouldn’t have wanted it finished.',
        consequences: { statChanges: [{ stat: 'authenticity', delta: 3 }], flavorText: 'You declined respectfully. The estate found someone else. You never listened to it.' },
      },
    ],
    tags: LEGACY,
    unique: true,
  },
  {
    id: 'legend-mural',
    category: 'social',
    title: 'The Mural',
    description: 'There’s a mural of {legend} downtown, twenty feet high. Fans leave flowers under it every week. Someone chalked your name next to theirs.',
    weight: 4,
    triggers: [{ type: 'has_legend', legend: 'dead' }],
    choices: [
      {
        id: 'visit',
        text: 'Visit it at night, alone.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 4 }, { stat: 'creativity', delta: 2 }],
          flavorText: 'You stood under {legend}’s mural at midnight for a long time. It felt like being recognized by someone you never met.',
        },
      },
    ],
    tags: LEGACY,
    unique: true,
  },
];
