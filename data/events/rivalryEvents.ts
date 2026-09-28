import type { GameEvent } from '../../types/events';

export const RIVALRY_EVENTS: GameEvent[] = [
  {
    id: 'sneak-diss',
    category: 'rivalry',
    title: 'You Just Got Sneakily Dissed',
    description:
      'A major artist dropped a track with a line that is definitely about you — but they never said your name. The internet is connecting the dots and your mentions are flooding.',
    weight: 8,
    triggers: [
      { type: 'fans_gte', value: 10000 },
      { type: 'random', value: 0.4 },
    ],
    choices: [
      {
        id: 'respond-directly',
        text: 'Address it directly. Name the person.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 10 },
            { stat: 'reputation', delta: -5 },
            { stat: 'fanLoyalty', delta: 10 },
          ],
          addTags: ['beef-active'],
          socialReaction: 'mixed',
          flavorText:
            'You name them. The beef is officially public. The internet picks sides.',
        },
      },
      {
        id: 'vague-response',
        text: 'Post something vague that only listeners will understand.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 5 },
            { stat: 'creativity', delta: 5 },
          ],
          addTags: ['beef-brewing'],
          socialReaction: 'positive',
          flavorText:
            'The subtlety earns respect. Your listeners decode it. The tension builds.',
        },
      },
      {
        id: 'ignore-diss',
        text: 'Ignore it completely. Don\'t give it oxygen.',
        consequences: {
          statChanges: [
            { stat: 'discipline', delta: 5 },
            { stat: 'mentalHealth', delta: 3 },
          ],
          flavorText:
            'The lack of response frustrates them. Some say you\'re above it. Some say you\'re scared.',
        },
      },
      {
        id: 'diss-track-response',
        text: 'Drop a diss track. No vagueness. Put them on the track.',
        consequences: {
          statChanges: [
            { stat: 'writing', delta: 8 },
            { stat: 'charisma', delta: 12 },
            { stat: 'fanLoyalty', delta: 20 },
            { stat: 'reputation', delta: -10 },
          ],
          fansDelta: 50000,
          addTags: ['diss-track-dropped', 'beef-active'],
          socialReaction: 'viral',
          flavorText:
            'The diss track shakes the internet. Streams go insane. The rivalry is fully on.',
        },
      },
    ],
    tags: ['rivalry', 'diss', 'beef'],
    cooldown: 8,
  },
  {
    id: 'direct-callout',
    category: 'rivalry',
    title: 'They Called You Out By Name',
    description:
      'No subtlety this time. A rival artist used your full artist name in an interview and said you were overrated, fake, and haven\'t earned your position. The clip is viral.',
    weight: 6,
    triggers: [
      { type: 'fans_gte', value: 30000 },
      { type: 'has_tag', tag: 'beef-brewing' },
    ],
    choices: [
      {
        id: 'go-to-war',
        text: 'Go to war. Release a diss track within 48 hours.',
        consequences: {
          statChanges: [
            { stat: 'fanLoyalty', delta: 25 },
            { stat: 'reputation', delta: -15 },
            { stat: 'writing', delta: 10 },
            { stat: 'charisma', delta: 8 },
          ],
          fansDelta: 100000,
          addTags: ['beef-active', 'diss-track-dropped'],
          socialReaction: 'viral',
          flavorText:
            'The diss track breaks the internet. The beef is a cultural moment.',
        },
      },
      {
        id: 'press-conference',
        text: 'Call a press conference and address it professionally.',
        consequences: {
          statChanges: [
            { stat: 'industryRespect', delta: 15 },
            { stat: 'charisma', delta: 10 },
            { stat: 'reputation', delta: 5 },
          ],
          fansDelta: 20000,
          socialReaction: 'positive',
          flavorText:
            'The maturity stuns everyone. You make them look childish without saying a word against them.',
        },
      },
      {
        id: 'ignore-callout',
        text: 'Post music. Don\'t respond to the noise.',
        consequences: {
          statChanges: [
            { stat: 'discipline', delta: 8 },
            { stat: 'authenticity', delta: 8 },
          ],
          socialReaction: 'mixed',
          flavorText:
            'The silence is strategic. The music you post gets compared favorably. You let the work respond.',
        },
      },
    ],
    tags: ['rivalry', 'beef', 'major'],
    cooldown: 15,
  },
  {
    id: 'stolen-collab',
    category: 'rivalry',
    title: 'They Took Your Collab',
    description:
      'A rival artist swooped in and took a collab with a producer you\'ve been building with for months. You were supposed to be next. The track drops this Friday. With their name on it.',
    weight: 7,
    triggers: [
      { type: 'fans_gte', value: 5000 },
      { type: 'has_tag', tag: 'producer-collab' },
    ],
    choices: [
      {
        id: 'call-out-theft',
        text: 'Call it out publicly. The fans need to know.',
        consequences: {
          statChanges: [
            { stat: 'reputation', delta: -8 },
            { stat: 'fanLoyalty', delta: 12 },
          ],
          addTags: ['beef-brewing'],
          socialReaction: 'mixed',
          flavorText:
            'The post gets attention. Some believe you. Some say you\'re being salty.',
        },
      },
      {
        id: 'move-different',
        text: 'Say nothing. Find a better producer and make a better record.',
        consequences: {
          statChanges: [
            { stat: 'discipline', delta: 10 },
            { stat: 'creativity', delta: 8 },
          ],
          addTags: ['motivated-by-betrayal'],
          flavorText:
            'Anger becomes fuel. You find a better situation and the product proves it.',
        },
      },
      {
        id: 'confront-producer',
        text: 'Confront the producer privately. Salvage the relationship.',
        consequences: {
          statChanges: [
            { stat: 'industryRespect', delta: 5 },
            { stat: 'charisma', delta: 5 },
          ],
          flavorText:
            'The conversation is tense. The relationship is not fully repaired but the door stays open.',
        },
      },
    ],
    tags: ['rivalry', 'betrayal', 'producer'],
    cooldown: 15,
  },
  {
    id: 'award-rivalry',
    category: 'rivalry',
    title: 'You\'re Both Up for the Same Award',
    description:
      'The category is announced. You and your main rival are both nominated. The industry is framing it as the defining showdown of the year. The fan voting starts now.',
    weight: 5,
    triggers: [
      { type: 'fans_gte', value: 50000 },
      { type: 'stat_gte', stat: 'industryRespect', value: 50 },
    ],
    choices: [
      {
        id: 'campaign-hard',
        text: 'Campaign for votes. Make it a public thing.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 8 },
            { stat: 'fanLoyalty', delta: 15 },
          ],
          fansDelta: 25000,
          socialReaction: 'positive',
          flavorText:
            'The campaign unites your fanbase. Whether you win or lose, the solidarity was real.',
        },
      },
      {
        id: 'act-above',
        text: 'Act above the politics. Let the music speak.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 10 },
            { stat: 'industryRespect', delta: 8 },
          ],
          socialReaction: 'positive',
          flavorText:
            'The humility is noted by critics. The industry watches how you carry yourself.',
        },
      },
      {
        id: 'shade-rival',
        text: 'Drop a subtle dig at the rival in interviews.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 5 },
            { stat: 'reputation', delta: -8 },
          ],
          addTags: ['beef-brewing'],
          socialReaction: 'mixed',
          flavorText:
            'The digs go viral. The award show becomes appointment television.',
        },
      },
    ],
    tags: ['rivalry', 'awards', 'competition'],
    cooldown: 20,
  },
  {
    id: 'peace-offering',
    category: 'rivalry',
    title: 'The Rival Reached Out for Peace',
    description:
      'Out of nowhere, your rival\'s team sent a message. They want to squash it. No specific reason given. Could be strategic. Could be genuine.',
    weight: 5,
    triggers: [
      { type: 'has_tag', tag: 'beef-active' },
      { type: 'week_gte', value: 3 },
    ],
    choices: [
      {
        id: 'accept-peace',
        text: 'Accept it. Life is too short for lasting beef.',
        consequences: {
          statChanges: [
            { stat: 'reputation', delta: 12 },
            { stat: 'industryRespect', delta: 10 },
          ],
          addTags: ['former-rival'],
          removeTags: ['beef-active'],
          socialReaction: 'positive',
          flavorText:
            'The reconciliation is posted. The internet is shocked. Both fanbases are relieved.',
        },
      },
      {
        id: 'reject-peace',
        text: 'Reject it publicly. The damage was done.',
        consequences: {
          statChanges: [
            { stat: 'fanLoyalty', delta: 10 },
            { stat: 'reputation', delta: -8 },
          ],
          socialReaction: 'mixed',
          flavorText:
            'The rejection hardens your brand. Your fans think you\'re locked in. The industry thinks you\'re stubborn.',
        },
      },
      {
        id: 'collab-from-beef',
        text: 'Propose turning the beef into a collab. Money over drama.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 15 },
            { stat: 'creativity', delta: 8 },
            { stat: 'industryRespect', delta: 15 },
          ],
          fansDelta: 80000,
          removeTags: ['beef-active'],
          addTags: ['former-rival', 'collab-history'],
          socialReaction: 'viral',
          flavorText:
            'The collab announcement breaks the internet. Former enemies making music together is the story of the year.',
        },
      },
    ],
    tags: ['rivalry', 'resolution', 'beef'],
    cooldown: 5,
  },
  {
    id: 'chart-competition',
    category: 'rivalry',
    title: 'You\'re Releasing the Same Week as Your Rival',
    description:
      'The schedules clash. You both announced Friday drops. The fans are picking sides. The label wants you to move your date. You refuse. It\'s war at the chart.',
    weight: 7,
    triggers: [
      { type: 'has_released_track' },
      { type: 'fans_gte', value: 20000 },
    ],
    choices: [
      {
        id: 'hold-release',
        text: 'Hold the release date. You were here first.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 8 },
            { stat: 'fanLoyalty', delta: 10 },
          ],
          socialReaction: 'positive',
          addTags: ['chart-battle'],
          flavorText:
            'The chart battle begins. Fans stream war is declared. The numbers will decide everything.',
        },
      },
      {
        id: 'move-date',
        text: 'Move your date strategically. Pick a clearer week.',
        consequences: {
          statChanges: [
            { stat: 'discipline', delta: 5 },
            { stat: 'industryRespect', delta: 5 },
          ],
          flavorText:
            'You move. Some see it as smart chess. Others think you blinked.',
        },
      },
    ],
    tags: ['rivalry', 'charts', 'competition'],
    cooldown: 10,
  },
  {
    id: 'mutual-fan-war',
    category: 'rivalry',
    title: 'The Fan War Is Getting Dangerous',
    description:
      'What started as chart competition escalated to your fans and their fans sharing addresses, hacking accounts, and coordinating harassment campaigns. Both artists are being held responsible.',
    weight: 4,
    triggers: [
      { type: 'has_tag', tag: 'chart-battle' },
      { type: 'has_tag', tag: 'enabled-fanbase' },
    ],
    choices: [
      {
        id: 'mutual-call-truce',
        text: 'Reach out to the rival. Joint post calling it off.',
        consequences: {
          statChanges: [
            { stat: 'reputation', delta: 15 },
            { stat: 'industryRespect', delta: 12 },
          ],
          removeTags: ['chart-battle', 'beef-active'],
          socialReaction: 'positive',
          flavorText:
            'The joint post goes viral. Both artists look mature. The press runs positive coverage for days.',
        },
      },
      {
        id: 'blame-them',
        text: 'Publicly blame their fanbase. Your fans are just defending themselves.',
        consequences: {
          statChanges: [
            { stat: 'fanLoyalty', delta: 15 },
            { stat: 'reputation', delta: -20 },
            { stat: 'industryRespect', delta: -15 },
          ],
          socialReaction: 'negative',
          flavorText:
            'The blame war escalates. Industry insiders start distancing themselves from both camps.',
        },
      },
    ],
    tags: ['rivalry', 'fans', 'danger'],
    cooldown: 20,
    unique: false,
  },
];
