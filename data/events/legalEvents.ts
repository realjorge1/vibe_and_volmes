import type { GameEvent } from '../../types/events';

/**
 * THE LAW, as story. The court date (pick a lawyer), life inside (only these
 * events reach the artist in jail: they carry `in_jail`), the run, and the
 * homecoming. The machinery is systems/legal; this is what it feels like.
 */

const LEGAL = ['legal'];

export const LEGAL_EVENTS: GameEvent[] = [
  // ─── The court date ─────────────────────────────────────────────────────────
  {
    id: 'legal-pick-lawyer',
    category: 'drama',
    title: 'Your Court Date Is Set',
    description:
      'The {charge} charge is real now. A court date, a docket number, a judge with a reputation. How you fight it decides the next year of your life.',
    weight: 20,
    priority: true,
    triggers: [{ type: 'case_pending' }],
    choices: [
      {
        id: 'elite',
        text: 'Hire the best lawyer money can buy.',
        consequences: { lawyer: 'elite', flavorText: 'You hired the lawyer who gets the famous people off. Their first invoice came before their first call.' },
      },
      {
        id: 'solid',
        text: 'Hire a good lawyer.',
        consequences: { lawyer: 'solid', flavorText: 'You hired a good lawyer. Not the TV kind. The kind who reads everything.' },
      },
      {
        id: 'public',
        text: 'Take the public defender.',
        consequences: { lawyer: 'public', flavorText: 'You took the public defender. She has forty cases. She remembered your name on the second try.' },
      },
      {
        id: 'plea',
        text: 'Take the plea deal.',
        consequences: {
          lawyer: 'plea',
          statChanges: [{ stat: 'authenticity', delta: 2 }],
          flavorText: 'You took the plea. Guilty, on the record, for less time. No surprises.',
        },
      },
    ],
    tags: LEGAL,
    cooldown: 0,
  },

  // ─── Inside ─────────────────────────────────────────────────────────────────
  {
    id: 'jail-first-night',
    category: 'personal',
    title: 'First Night Inside',
    description:
      'The door closes with a sound you will hear in your sleep for years. Your cellmate looks at you, then at your shoes, then back at you. "You’re that singer."',
    weight: 30,
    priority: true,
    triggers: [{ type: 'in_jail' }, { type: 'lacks_tag', tag: 'jail-settled' }],
    choices: [
      {
        id: 'humble',
        text: '"Just a person in here now."',
        consequences: {
          addTags: ['jail-settled'],
          statChanges: [{ stat: 'mentalHealth', delta: 2 }],
          flavorText: 'You kept your head down. Your cellmate nodded. That nod is worth more than it looks.',
        },
      },
      {
        id: 'sing',
        text: 'Sing something for the block.',
        consequences: {
          addTags: ['jail-settled'],
          statChanges: [{ stat: 'charisma', delta: 2 }],
          flavorText: 'You sang your quietest song through the bars. The block went quiet. Then someone asked for an encore.',
        },
      },
      {
        id: 'diva',
        text: '"I need to speak to whoever is in charge of the food."',
        requiresTrait: 'diva',
        consequences: {
          addTags: ['jail-settled'],
          statChanges: [{ stat: 'mentalHealth', delta: -4 }],
          flavorText: 'You asked to speak to a manager. In jail. It got around. People call you "Manager" now.',
        },
      },
    ],
    tags: [...LEGAL, 'jail'],
  },
  {
    id: 'jail-yard-tension',
    category: 'drama',
    title: 'Tension in the Yard',
    description: 'Some guys in the yard have decided you think you are better than them. They are walking over.',
    weight: 8,
    triggers: [{ type: 'in_jail' }],
    choices: [
      {
        id: 'talk',
        text: 'Talk them down.',
        consequences: {
          statChanges: [{ stat: 'charisma', delta: 2 }],
          flavorText: 'You talked. They listened. By the end, one of them wanted you to hear his raps.',
        },
      },
      {
        id: 'stand',
        text: 'Stand your ground.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -2 }, { stat: 'authenticity', delta: 3 }],
          legalCharge: 'inside-fight',
          flavorText: 'It turned into a fight. You held your own. The guards wrote it up anyway.',
        },
      },
      {
        id: 'walk',
        text: 'Walk away to the guards’ side.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -3 }],
          flavorText: 'You walked toward the guards. Safe. Everyone saw.',
        },
      },
    ],
    tags: [...LEGAL, 'jail'],
    cooldown: 4,
  },
  {
    id: 'jail-fan-mail',
    category: 'social',
    title: 'Bags of Letters',
    description: 'The guard drops two mail bags on your bunk. Letters from fans, in a dozen languages. Some have drawings. One has a lock of hair, which is a lot.',
    weight: 8,
    triggers: [{ type: 'in_jail' }, { type: 'fans_gte', value: 5_000 }],
    choices: [
      {
        id: 'answer',
        text: 'Answer as many as you can.',
        consequences: {
          statChanges: [{ stat: 'fanLoyalty', delta: 5 }, { stat: 'mentalHealth', delta: 5 }],
          flavorText: 'You answered two hundred letters by hand. Fans are posting your handwriting online like scripture.',
        },
      },
      {
        id: 'read',
        text: 'Just read them. All night.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 7 }],
          flavorText: 'You read every letter. You didn’t know this many people were waiting for you.',
        },
      },
    ],
    tags: [...LEGAL, 'jail'],
    cooldown: 4,
  },
  {
    id: 'jail-free-campaign',
    category: 'social',
    title: '#Free{playerName}',
    description:
      'Outside, fans have started a campaign. There are shirts. There is a mural. A senator’s nephew retweeted it. Your lawyer says public pressure might help an appeal.',
    weight: 10,
    triggers: [{ type: 'in_jail' }, { type: 'fans_gte', value: 50_000 }, { type: 'stat_gte', stat: 'fanLoyalty', value: 45 }],
    choices: [
      {
        id: 'statement',
        text: 'Send a statement through your lawyer.',
        consequences: {
          statChanges: [{ stat: 'fanLoyalty', delta: 6 }, { stat: 'reputation', delta: 3 }],
          fansDelta: 6_000,
          moment: { kind: 'best', headline: 'Free{playerName}: fans paint a mural while the artist sits in a cell', topic: 'the Free campaign', heat: 70, valence: 55, hashtag: 'Free{playerName}' },
          flavorText: 'You sent a statement: "Keep the music on. I’ll be home." The mural got a second wall.',
        },
      },
      {
        id: 'quiet',
        text: 'Ask them to stop. Do your time.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 4 }],
          flavorText: 'You asked fans to stop. Some respected it. Most made more shirts.',
        },
      },
    ],
    tags: [...LEGAL, 'jail'],
    unique: true,
  },
  {
    id: 'jail-visiting-day',
    category: 'personal',
    title: 'Visiting Day',
    description: '{ParentTitle} came. They sat on the other side of the glass and put their hand flat against it, the way they used to on the car window when you were small.',
    weight: 9,
    triggers: [{ type: 'in_jail' }, { type: 'has_person', role: 'parent' }],
    choices: [
      {
        id: 'promise',
        text: 'Promise you’ll come home different.',
        consequences: {
          personChanges: [{ role: 'parent', delta: 10 }],
          statChanges: [{ stat: 'mentalHealth', delta: 5 }],
          flavorText: 'You promised {parent} you’d come home different. They said they’d hold you to it.',
        },
      },
      {
        id: 'joke',
        text: 'Make them laugh.',
        consequences: {
          personChanges: [{ role: 'parent', delta: 6 }],
          statChanges: [{ stat: 'mentalHealth', delta: 4 }],
          flavorText: 'You did the voice of the guard behind you. {parent} laughed until the guard noticed.',
        },
      },
    ],
    tags: [...LEGAL, 'jail'],
    cooldown: 6,
  },
  {
    id: 'jail-partner-letter',
    category: 'personal',
    title: 'A Letter from {partner}',
    description: '{partner} wrote. Four pages. The first three are love. The fourth page is the hard part: they don’t know if they can wait.',
    weight: 7,
    triggers: [{ type: 'in_jail' }, { type: 'has_partner' }],
    choices: [
      {
        id: 'ask',
        text: 'Ask them to wait.',
        consequences: {
          personChanges: [{ role: 'partner', delta: 6 }],
          statChanges: [{ stat: 'mentalHealth', delta: -2 }],
          flavorText: 'You wrote back asking {partner} to wait. Their reply was one line: "I’m still here."',
        },
      },
      {
        id: 'free',
        text: 'Tell them to go live their life.',
        consequences: {
          personChanges: [{ role: 'partner', delta: -15 }],
          statChanges: [{ stat: 'mentalHealth', delta: -6 }],
          flavorText: 'You told {partner} to go. They didn’t write back. You don’t know which answer you wanted.',
        },
      },
    ],
    tags: [...LEGAL, 'jail'],
    unique: true,
  },
  {
    id: 'jail-documentary',
    category: 'opportunity',
    title: 'A Documentary Crew',
    description: 'A streaming service wants to film you inside. "Unfiltered. Your story, your words." There is a big check and a bigger risk.',
    weight: 6,
    triggers: [{ type: 'in_jail' }, { type: 'fans_gte', value: 20_000 }],
    choices: [
      {
        id: 'yes',
        text: 'Let them film.',
        consequences: {
          moneyDelta: 30_000,
          fansDelta: 8_000,
          statChanges: [{ stat: 'authenticity', delta: 5 }, { stat: 'mentalHealth', delta: -3 }],
          flavorText: 'You let the cameras in. You said things you’ve never said. The trailer has a million views already.',
        },
      },
      {
        id: 'no',
        text: 'Not like this.',
        consequences: { statChanges: [{ stat: 'mentalHealth', delta: 2 }], flavorText: 'You said no. Your story, later, on your terms.' },
      },
    ],
    tags: [...LEGAL, 'jail'],
    unique: true,
  },
  {
    id: 'jail-cellmate-bars',
    category: 'career',
    title: 'Your Cellmate Can Rap',
    description: 'Your cellmate has been rapping under his breath for a week. Tonight you finally hear a whole verse. It’s genuinely great. He has twenty notebooks.',
    weight: 6,
    triggers: [{ type: 'in_jail' }],
    choices: [
      {
        id: 'collab',
        text: 'Write a song together.',
        consequences: {
          statChanges: [{ stat: 'writing', delta: 3 }, { stat: 'creativity', delta: 3 }],
          flavorText: 'You and your cellmate wrote a whole song on the back of a commissary form. It might be the best thing you’ve written.',
          plantSeed: { kind: 'cellmate', after: [10, 26], who: 'none', note: 'You wrote a song with your cellmate behind bars.' },
        },
      },
      {
        id: 'listen',
        text: 'Just listen.',
        consequences: { statChanges: [{ stat: 'mentalHealth', delta: 3 }], flavorText: 'You listened to his notebooks for hours. He hadn’t had an audience in years.' },
      },
    ],
    tags: [...LEGAL, 'jail'],
    unique: true,
  },
  {
    id: 'callback-cellmate',
    category: 'career',
    title: 'Your Old Cellmate Got Out',
    description: 'A text from an unknown number: "it’s me. from the block. I got out. I still have our song." Attached: him, outside, squinting at the sun.',
    weight: 9,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'cellmate' }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'release',
        text: 'Put the song out together.',
        consequences: {
          fansDelta: 7_000,
          statChanges: [{ stat: 'authenticity', delta: 5 }, { stat: 'mentalHealth', delta: 5 }],
          moment: { kind: 'best', headline: '{playerName} releases a song written in a prison cell with their former cellmate', topic: 'the cellmate song', heat: 60, valence: 85 },
          flavorText: 'You put out the song from the cell. Your old cellmate cried at the listening party. So did you.',
        },
      },
      {
        id: 'help',
        text: 'Get him a job at your label.',
        consequences: {
          moneyDelta: -5_000,
          statChanges: [{ stat: 'reputation', delta: 4 }],
          flavorText: 'You got him a job. He shows up early every single day.',
        },
      },
    ],
    tags: ['callback', ...LEGAL],
    unique: true,
  },

  // ─── On the run ─────────────────────────────────────────────────────────────
  {
    id: 'fugitive-motel',
    category: 'drama',
    title: 'The Motel',
    description: 'A motel two states away. The TV in the corner is showing your face on the news. The woman at the front desk keeps looking at you a little too long.',
    weight: 20,
    priority: true,
    triggers: [{ type: 'has_tag', tag: 'fugitive' }],
    choices: [
      {
        id: 'leave',
        text: 'Leave tonight.',
        consequences: { statChanges: [{ stat: 'energy', delta: -15 }], flavorText: 'You left at 3 a.m. through the back. The road is very dark out here.' },
      },
      {
        id: 'charm',
        text: 'Sign an autograph and ask her to keep quiet.',
        requiresTrait: 'charmer',
        consequences: { statChanges: [{ stat: 'mentalHealth', delta: 2 }], flavorText: 'You signed her receipt book. She winked. You slept well, for once.' },
      },
      {
        id: 'surrender',
        text: 'Call your lawyer. Turn yourself in.',
        consequences: {
          removeTags: ['fugitive'],
          legalCharge: 'parole-violation',
          statChanges: [{ stat: 'reputation', delta: 2 }],
          flavorText: 'You called your lawyer from the motel phone. The police were polite about it. Mostly.',
        },
      },
    ],
    tags: [...LEGAL, 'fugitive'],
    cooldown: 2,
  },

  // ─── Home ───────────────────────────────────────────────────────────────────
  {
    id: 'homecoming-show',
    category: 'career',
    title: 'The Homecoming',
    description: 'You are out. Promoters are calling about a homecoming show: one night, one city, every camera in the country.',
    weight: 25,
    priority: true,
    triggers: [{ type: 'has_tag', tag: 'just-released' }, { type: 'lacks_tag', tag: 'homecoming-done' }],
    choices: [
      {
        id: 'big',
        text: 'Book the arena.',
        consequences: {
          addTags: ['homecoming-done'],
          moneyDelta: 40_000,
          fansDelta: 15_000,
          statChanges: [{ stat: 'energy', delta: -20 }, { stat: 'charisma', delta: 3 }],
          moment: { kind: 'best', headline: '{playerName}’s homecoming show was the event of the year', topic: 'the homecoming show', heat: 80, valence: 75, hashtag: 'WelcomeHome' },
          flavorText: 'The homecoming sold out in four minutes. When you walked on stage, the noise felt like weather.',
        },
      },
      {
        id: 'small',
        text: 'Play a tiny club, no announcement.',
        consequences: {
          addTags: ['homecoming-done'],
          statChanges: [{ stat: 'authenticity', delta: 5 }, { stat: 'mentalHealth', delta: 6 }],
          fansDelta: 2_000,
          flavorText: 'You played a 200-cap club unannounced. Two hundred people will tell this story forever.',
        },
      },
      {
        id: 'rest',
        text: 'Not yet. Go home and sleep.',
        consequences: {
          addTags: ['homecoming-done'],
          statChanges: [{ stat: 'mentalHealth', delta: 10 }],
          flavorText: 'You went home and slept for fourteen hours in a real bed. The show can wait.',
        },
      },
    ],
    tags: LEGAL,
  },
  {
    id: 'homecoming-interview',
    category: 'opportunity',
    title: 'The First Interview',
    description: 'The biggest interviewer in the country wants your first sit-down since you got out. Every question will be about inside.',
    weight: 12,
    triggers: [{ type: 'has_tag', tag: 'just-released' }],
    choices: [
      {
        id: 'honest',
        text: 'Tell the truth about all of it.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 6 }, { stat: 'reputation', delta: 3 }],
          fansDelta: 5_000,
          flavorText: 'You told the truth. All of it. The clip of you going quiet for nine seconds is everywhere.',
        },
      },
      {
        id: 'music',
        text: 'Only talk about the music.',
        consequences: {
          statChanges: [{ stat: 'industryRespect', delta: 3 }],
          flavorText: 'You steered every question back to the music. Smart, a little cold.',
        },
      },
    ],
    tags: LEGAL,
    unique: true,
  },
  {
    id: 'parole-temptation',
    category: 'drama',
    title: 'One Night Out',
    description: 'Your old crew is throwing a party in your honor. Your parole officer would have opinions about at least four of the people on the guest list.',
    weight: 7,
    triggers: [{ type: 'has_tag', tag: 'on-parole' }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'go',
        text: 'Go. It’s your party.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 3 }],
          legalCharge: 'parole-violation',
          flavorText: 'You went. Someone posted a story. Your parole officer follows that someone.',
        },
      },
      {
        id: 'stay',
        text: 'Stay in. Not worth it.',
        consequences: {
          statChanges: [{ stat: 'discipline', delta: 3 }],
          flavorText: 'You stayed home. The party got raided at 1 a.m. You watched it on your phone.',
        },
      },
    ],
    tags: LEGAL,
    cooldown: 8,
  },
];
