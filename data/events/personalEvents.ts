import type { GameEvent } from '../../types/events';

export const PERSONAL_EVENTS: GameEvent[] = [
  {
    id: 'burnout-hits',
    category: 'personal',
    title: 'You\'re Running On Empty',
    description:
      'The schedule caught up with you. Every task feels impossible. The creative well is dry. Your body and mind are telling you to stop — but the industry doesn\'t care.',
    weight: 10,
    triggers: [
      { type: 'stat_lte', stat: 'energy', value: 25 },
      { type: 'stat_lte', stat: 'mentalHealth', value: 45 },
    ],
    choices: [
      {
        id: 'take-break',
        text: 'Take a real break. Announce a hiatus.',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: 25 },
            { stat: 'energy', delta: 30 },
            { stat: 'discipline', delta: 5 },
          ],
          addTags: ['on-hiatus'],
          socialReaction: 'mixed',
          flavorText:
            'The break is necessary. Fans are understanding. The rest heals something fundamental.',
        },
      },
      {
        id: 'push-through',
        text: 'Push through. The grind never stops.',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: -15 },
            { stat: 'talent', delta: -5 },
            { stat: 'creativity', delta: -8 },
            { stat: 'discipline', delta: 10 },
          ],
          flavorText:
            'You push on. The output suffers. Something in you is grinding down.',
        },
      },
      {
        id: 'therapy',
        text: 'Seek professional help quietly.',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: 20 },
            { stat: 'authenticity', delta: 8 },
            { stat: 'creativity', delta: 5 },
          ],
          moneyDelta: -1500,
          addTags: ['in-therapy'],
          flavorText:
            'The sessions are private. The growth is not. You start writing differently.',
        },
      },
    ],
    tags: ['personal', 'mental-health', 'burnout'],
    cooldown: 8,
  },
  {
    id: 'creative-block',
    category: 'personal',
    title: 'You Can\'t Write Anything',
    description:
      'Three sessions in a row. Nothing usable. The ideas that come feel derivative and small. For the first time in a long time, you question whether the gift is still there.',
    weight: 10,
    triggers: [
      { type: 'stat_lte', stat: 'creativity', value: 40 },
      { type: 'stat_lte', stat: 'mentalHealth', value: 60 },
    ],
    choices: [
      {
        id: 'live-life',
        text: 'Step away from the studio. Go live your life.',
        consequences: {
          statChanges: [
            { stat: 'creativity', delta: 15 },
            { stat: 'authenticity', delta: 8 },
            { stat: 'writing', delta: 5 },
          ],
          flavorText:
            'Three weeks later you sit down and everything pours out at once. Life is still the best source material.',
        },
      },
      {
        id: 'force-through',
        text: 'Force it. Quantity over quality until something clicks.',
        consequences: {
          statChanges: [
            { stat: 'discipline', delta: 10 },
            { stat: 'creativity', delta: 5 },
            { stat: 'mentalHealth', delta: -8 },
          ],
          flavorText:
            'The discipline builds. A few of the forced sessions produce something real.',
        },
      },
      {
        id: 'collab-break',
        text: 'Write with someone else. New energy.',
        consequences: {
          statChanges: [
            { stat: 'creativity', delta: 12 },
            { stat: 'writing', delta: 8 },
            { stat: 'charisma', delta: 3 },
          ],
          addTags: ['collab-history'],
          flavorText:
            'The outside perspective breaks the block. The session produces something unexpected.',
        },
      },
    ],
    tags: ['personal', 'creativity', 'block'],
    cooldown: 6,
  },
  {
    id: 'breakup-inspiration',
    category: 'personal',
    title: 'A Breakup Just Happened',
    description:
      'It ended. Whatever it was — a relationship, a friendship, a partnership. The pain is fresh. But you\'ve always written best from raw wounds.',
    weight: 8,
    triggers: [
      { type: 'stat_lte', stat: 'mentalHealth', value: 65 },
      { type: 'random', value: 0.4 },
    ],
    choices: [
      {
        id: 'write-pain',
        text: 'Write about it. Channel everything.',
        consequences: {
          statChanges: [
            { stat: 'writing', delta: 15 },
            { stat: 'authenticity', delta: 12 },
            { stat: 'mentalHealth', delta: -5 },
          ],
          addTags: ['heartbreak-era'],
          flavorText:
            'The songs you write this week are the most honest work of your career. Pain has a frequency.',
        },
      },
      {
        id: 'process-privately',
        text: 'Keep it private. Don\'t let it affect the work.',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: 5 },
            { stat: 'discipline', delta: 8 },
          ],
          flavorText:
            'The separation of personal and professional is hard. But it\'s held.',
        },
      },
    ],
    tags: ['personal', 'relationship', 'emotion'],
    cooldown: 12,
  },
  {
    id: 'family-conflict',
    category: 'personal',
    title: 'Family Drama Is Affecting Everything',
    description:
      'Something at home is wrong. The details stay private, but the weight of it is in every room you walk into. The music is suffering.',
    weight: 7,
    triggers: [
      { type: 'stat_lte', stat: 'mentalHealth', value: 55 },
      { type: 'week_gte', value: 5 },
    ],
    choices: [
      {
        id: 'handle-family',
        text: 'Step back and handle family first.',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: 15 },
            { stat: 'authenticity', delta: 8 },
          ],
          flavorText:
            'The priorities are straight. The music waits. The peace is worth it.',
        },
      },
      {
        id: 'music-escape',
        text: 'Use the studio as an escape from it all.',
        consequences: {
          statChanges: [
            { stat: 'creativity', delta: 10 },
            { stat: 'mentalHealth', delta: -5 },
            { stat: 'writing', delta: 8 },
          ],
          flavorText:
            'The music becomes therapy. The family situation festers. It\'s a trade-off.',
        },
      },
    ],
    tags: ['personal', 'family', 'stress'],
    cooldown: 10,
  },
  {
    id: 'spiritual-moment',
    category: 'personal',
    title: 'Something Shifted In You',
    description:
      'A moment — a conversation, a book, a loss, a ceremony — changed how you see everything. The music that comes after this will sound different.',
    weight: 5,
    triggers: [
      { type: 'week_gte', value: 20 },
      { type: 'random', value: 0.3 },
    ],
    choices: [
      {
        id: 'share-transformation',
        text: 'Share it publicly. Let your fans in.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 15 },
            { stat: 'creativity', delta: 10 },
            { stat: 'fanLoyalty', delta: 12 },
          ],
          socialReaction: 'positive',
          addTags: ['spiritual-era'],
          flavorText:
            'The openness creates one of your most talked-about interviews.',
        },
      },
      {
        id: 'keep-private',
        text: 'Keep it private. Let it live in the music.',
        consequences: {
          statChanges: [
            { stat: 'creativity', delta: 15 },
            { stat: 'authenticity', delta: 8 },
            { stat: 'writing', delta: 10 },
          ],
          flavorText:
            'The change comes through in the art without explanation. The deep listeners feel it immediately.',
        },
      },
    ],
    tags: ['personal', 'growth', 'spiritual'],
    cooldown: 30,
    unique: true,
  },
  {
    id: 'therapy-breakthrough',
    category: 'personal',
    title: 'Therapy Is Working',
    description:
      'You\'ve been going consistently. Something shifted in a recent session. The therapist said something that reorganized how you see your past. You feel lighter.',
    weight: 6,
    triggers: [
      { type: 'has_tag', tag: 'in-therapy' },
      { type: 'stat_gte', stat: 'mentalHealth', value: 50 },
    ],
    choices: [
      {
        id: 'publicly-advocate',
        text: 'Speak publicly about therapy. Normalize it.',
        consequences: {
          statChanges: [
            { stat: 'reputation', delta: 12 },
            { stat: 'authenticity', delta: 10 },
            { stat: 'fanLoyalty', delta: 15 },
          ],
          fansDelta: 20000,
          socialReaction: 'positive',
          flavorText:
            'The advocacy is well received. Fans share their own mental health journeys in the replies.',
        },
      },
      {
        id: 'let-work-speak',
        text: 'Let the growth show in the music, not in statements.',
        consequences: {
          statChanges: [
            { stat: 'creativity', delta: 12 },
            { stat: 'writing', delta: 10 },
            { stat: 'mentalHealth', delta: 10 },
          ],
          flavorText:
            'The new music has a different energy. People notice without knowing why.',
        },
      },
    ],
    tags: ['personal', 'mental-health', 'growth'],
    cooldown: 15,
  },
  {
    id: 'financial-struggle',
    category: 'personal',
    title: 'Money Is Getting Tight',
    description:
      'The expenses piled up. The revenue is inconsistent. You\'re looking at numbers that don\'t add up. The pressure of financial stress is showing in your daily life.',
    weight: 8,
    triggers: [
      { type: 'fans_lte', value: 50000 },
      { type: 'random', value: 0.4 },
    ],
    choices: [
      {
        id: 'take-side-gig',
        text: 'Take a side gig temporarily. Pride can wait.',
        consequences: {
          statChanges: [
            { stat: 'discipline', delta: 8 },
            { stat: 'authenticity', delta: -5 },
          ],
          moneyDelta: 3000,
          flavorText:
            'The job keeps the lights on. Nobody needs to know. The music continues.',
        },
      },
      {
        id: 'release-quick',
        text: 'Rush-release content to generate income.',
        consequences: {
          statChanges: [
            { stat: 'creativity', delta: -8 },
            { stat: 'reputation', delta: -5 },
          ],
          moneyDelta: 1500,
          flavorText:
            'The quick release brings quick income. The quality shows. Fans notice.',
        },
      },
      {
        id: 'grind-harder',
        text: 'Double down. Work harder and monetize the fanbase.',
        consequences: {
          statChanges: [
            { stat: 'discipline', delta: 12 },
            { stat: 'energy', delta: -15 },
            { stat: 'mentalHealth', delta: -8 },
          ],
          moneyDelta: 4000,
          flavorText:
            'The hustle is unsustainable but it works short-term.',
        },
      },
    ],
    tags: ['personal', 'money', 'stress'],
    cooldown: 8,
  },
];
