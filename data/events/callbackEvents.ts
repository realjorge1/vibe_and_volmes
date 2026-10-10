import type { GameEvent } from '../../types/events';

/**
 * CALLBACKS: choices that come back.
 *
 * The first half are planters: ordinary-looking decisions whose outcomes plant
 * a seed (`plantSeed`). The second half are payoffs: events that can only
 * happen once a seed of their kind has ripened (`seed_ripe`), years later,
 * naming the same person (`{seed}`) and when it happened (`{ago}`). Payoffs
 * are `priority`, so when the past comes back it doesn't wait in line.
 *
 * Activities plant seeds too (lending money, a filmed fight, a diss, an
 * afterparty, an investment, a hospital visit, a scholarship): see
 * data/life/lifeActions.ts and dramaActivities.ts.
 */

const CALLBACK = ['callback'];

// ─── Planters ─────────────────────────────────────────────────────────────────

const PLANTERS: GameEvent[] = [
  {
    id: 'plant-unknown-feature',
    category: 'opportunity',
    title: 'A Nobody Wants a Verse',
    description:
      '{new} has eleven hundred followers and a song they swear is going to change their life. They want you on it. They can pay you in gratitude and a cheeseburger.',
    weight: 5,
    triggers: [{ type: 'fans_gte', value: 3_000 }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'ghost',
        text: 'Leave it on read.',
        consequences: {
          flavorText: 'You left {new} on read. You had bigger things going on.',
          plantSeed: { kind: 'ghosted-artist', after: [16, 40], who: 'new', note: 'You left {new} on read when they asked for a verse.' },
        },
      },
      {
        id: 'verse',
        text: 'Do the verse for free.',
        consequences: {
          statChanges: [{ stat: 'energy', delta: -10 }, { stat: 'authenticity', delta: 2 }],
          fansDelta: 150,
          flavorText: 'You recorded sixteen bars for {new} in one take. They cried on the phone.',
          plantSeed: { kind: 'helped-artist', after: [16, 40], who: 'new', note: 'You did a free verse for {new} when nobody knew their name.' },
        },
      },
      {
        id: 'charge',
        text: 'Quote them your rate.',
        consequences: {
          moneyDelta: 1_500,
          flavorText: '{new} scraped together $1,500 for your verse. Business is business.',
          plantSeed: { kind: 'charged-artist', after: [16, 40], who: 'new', note: '{new} paid you $1,500 for a verse they couldn’t afford.' },
        },
      },
      {
        id: 'petty-roast',
        text: 'Screenshot the DM and roast them.',
        requiresTrait: 'petty',
        consequences: {
          fansDelta: 400,
          statChanges: [{ stat: 'reputation', delta: -3 }],
          flavorText: 'You posted their DM with a crying-laughing emoji. Fifty thousand likes. {new} saw every one of them.',
          plantSeed: { kind: 'ghosted-artist', after: [16, 40], who: 'new', note: 'You publicly roasted {new} for asking you for a verse.' },
        },
      },
    ],
    tags: ['callback', 'planter'],
    cooldown: 16,
  },
  {
    id: 'plant-intern',
    category: 'opportunity',
    title: 'The Quiet Kid at the Session',
    description:
      'A kid named {new} has been sitting in the corner of every studio session this month. They clean the cables, fix the coffee, and once fixed your vocal chain without asking. They want to intern for you.',
    weight: 4,
    triggers: [{ type: 'has_released_track' }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'take',
        text: 'Take them under your wing.',
        consequences: {
          statChanges: [{ stat: 'industryRespect', delta: 1 }],
          moneyDelta: -500,
          flavorText: 'You let {new} sit next to the board. They learn faster than anyone you have met.',
          plantSeed: { kind: 'mentored-intern', after: [20, 44], who: 'new', note: 'You took {new} on as your intern when they were nobody.' },
        },
      },
      {
        id: 'pass',
        text: 'Tell them there’s no room.',
        consequences: {
          flavorText: 'You told {new} there was no room. They thanked you anyway and left.',
          plantSeed: { kind: 'passed-intern', after: [20, 44], who: 'new', note: 'You turned {new} away when they asked to intern.' },
        },
      },
    ],
    tags: ['callback', 'planter'],
    cooldown: 24,
    unique: true,
  },
  {
    id: 'plant-hometown-promise',
    category: 'personal',
    title: 'Your Old High School Calls',
    description:
      'The music teacher who let you practice in the band room at lunch is retiring. The school wants to know: would you come back one day and play for the kids?',
    weight: 4,
    triggers: [{ type: 'fans_gte', value: 2_000 }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'promise',
        text: 'Promise you’ll come back when you make it.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 3 }],
          flavorText: 'You promised the school you would come back when you made it. The teacher cried a little.',
          plantSeed: { kind: 'hometown-promise', after: [18, 40], who: 'none', note: 'You promised your old high school you’d come back and play when you made it.' },
        },
      },
      {
        id: 'send-gift',
        text: 'Send money for new instruments.',
        consequences: {
          moneyDelta: -2_000,
          statChanges: [{ stat: 'reputation', delta: 2 }],
          flavorText: 'You sent $2,000 for instruments. The band room has a drum kit with all its pieces now.',
        },
      },
      {
        id: 'decline',
        text: 'Too busy. Wish them well.',
        consequences: { flavorText: 'You sent a nice email and moved on.' },
      },
    ],
    tags: ['callback', 'planter'],
    unique: true,
  },
  {
    id: 'plant-stolen-hook',
    category: 'drama',
    title: 'That Hook Sounds Familiar',
    description:
      'Your producer plays you a hook. It is the best thing you have heard all year. Then you remember where you heard it: a demo {new} played you at a party, months ago. They never released it.',
    weight: 3,
    triggers: [{ type: 'has_released_track' }, { type: 'fans_gte', value: 5_000 }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'use-it',
        text: 'Use it. Nobody will know.',
        consequences: {
          statChanges: [{ stat: 'creativity', delta: 2 }, { stat: 'authenticity', delta: -3 }],
          fansDelta: 2_000,
          flavorText: 'You built a song around the hook. It is the catchiest thing you have ever put out.',
          plantSeed: { kind: 'stolen-hook', after: [10, 30], who: 'new', note: 'You used a hook from {new}’s unreleased demo.' },
        },
      },
      {
        id: 'credit',
        text: 'Call {new} and offer a writing credit.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 3 }, { stat: 'industryRespect', delta: 2 }],
          flavorText: 'You called {new} and offered a credit. They said yes before you finished the sentence.',
          plantSeed: { kind: 'credited-writer', after: [16, 40], who: 'new', note: 'You gave {new} a writing credit you could have kept.' },
        },
      },
      {
        id: 'pass',
        text: 'Pass on it.',
        consequences: { flavorText: 'You passed. Some songs aren’t yours to make.' },
      },
    ],
    tags: ['callback', 'planter'],
    cooldown: 30,
  },
  {
    id: 'plant-bot-streams',
    category: 'opportunity',
    title: 'A Million Streams for $2,000',
    description:
      'A guy in a promo group chat says he can put a million streams on your latest song by Friday. "Real devices, totally undetectable." He has a lot of fire emojis in his bio.',
    weight: 4,
    triggers: [{ type: 'has_released_track' }, { type: 'fans_lte', value: 200_000 }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'buy',
        text: 'Pay him.',
        consequences: {
          moneyDelta: -2_000,
          fansDelta: 3_000,
          statChanges: [{ stat: 'industryRespect', delta: 2 }],
          flavorText: 'The streams came in overnight. A playlist curator noticed. It worked. For now.',
          plantSeed: { kind: 'botted-streams', after: [12, 36], who: 'none', note: 'You paid for a million fake streams on one of your songs.' },
        },
      },
      {
        id: 'pass',
        text: 'Block him.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 1 }],
          flavorText: 'You blocked him. Your numbers are small, but they are yours.',
        },
      },
    ],
    tags: ['callback', 'planter'],
    unique: true,
  },
  {
    id: 'plant-crypto-coin',
    category: 'opportunity',
    title: 'Promote a Coin?',
    description:
      'Some founders in matching vests want you to post about $VIBE, their new coin, to your fans. They are offering $40,000 for one post. "It’s basically a community."',
    weight: 4,
    triggers: [{ type: 'fans_gte', value: 50_000 }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'post',
        text: 'Take the $40,000.',
        consequences: {
          moneyDelta: 40_000,
          statChanges: [{ stat: 'authenticity', delta: -4 }],
          flavorText: 'You posted about $VIBE. Your fans bought in. The founders sent you a gift basket.',
          plantSeed: { kind: 'crypto-coin', after: [8, 24], who: 'none', note: 'You took $40,000 to push a crypto coin to your fans.' },
        },
      },
      {
        id: 'pass',
        text: 'Pass. Your fans aren’t a market.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 2 }, { stat: 'fanLoyalty', delta: 2 }],
          flavorText: 'You passed. Two other artists took the deal.',
        },
      },
      {
        id: 'hustle-equity',
        text: 'Ask for equity instead of cash.',
        requiresTrait: 'hustler',
        consequences: {
          flavorText: 'You asked for a slice of the company instead of a fee. They blinked first.',
          plantSeed: { kind: 'investment', after: [10, 30], who: 'none', note: 'You took equity in a crypto startup instead of cash.' },
        },
      },
    ],
    tags: ['callback', 'planter'],
    unique: true,
  },
  {
    id: 'plant-missed-birthday',
    category: 'personal',
    title: 'Birthday or Show?',
    description:
      '{ParentTitle}’s 60th birthday dinner is the same night as the biggest show you have been offered. The family group chat is very quiet. Too quiet.',
    weight: 4,
    triggers: [{ type: 'has_person', role: 'parent' }, { type: 'fans_gte', value: 5_000 }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'show',
        text: 'Play the show.',
        consequences: {
          fansDelta: 2_500,
          moneyDelta: 3_000,
          personChanges: [{ role: 'parent', delta: -12 }],
          flavorText: 'You played the show. It was great. {Parent} said it was fine. It wasn’t fine.',
          plantSeed: { kind: 'missed-birthday', after: [10, 28], who: 'parent', note: 'You skipped {parent}’s 60th birthday for a show.' },
        },
      },
      {
        id: 'dinner',
        text: 'Go to the dinner.',
        consequences: {
          personChanges: [{ role: 'parent', delta: 12 }],
          statChanges: [{ stat: 'mentalHealth', delta: 4 }],
          flavorText: 'You went to the dinner. {Parent} told everyone at the table about you, twice.',
          plantSeed: { kind: 'kept-birthday', after: [16, 40], who: 'parent', note: 'You turned down a big show to be at {parent}’s 60th.' },
        },
      },
    ],
    tags: ['callback', 'planter'],
    unique: true,
  },
  {
    id: 'plant-rival-hospital',
    category: 'rivalry',
    title: '{rival} Is in the Hospital',
    description:
      'Your rival {rival} collapsed backstage. Exhaustion, the statement says. The internet is waiting to see if you’ll say something.',
    weight: 3,
    triggers: [{ type: 'rivalry_intensity_gte', value: 25 }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'flowers',
        text: 'Send flowers. No cameras.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 2 }],
          flavorText: 'You sent flowers with a card that just said "get up." Nobody knows but them.',
          plantSeed: { kind: 'kindness-rival', after: [12, 32], who: 'rival', note: 'You sent {rival} flowers when they collapsed, and told no one.' },
        },
      },
      {
        id: 'public',
        text: 'Post a get-well message.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 3 }],
          warSwing: 4,
          flavorText: 'You posted a get-well message. Half the replies call it classy. Half call it PR.',
        },
      },
      {
        id: 'joke',
        text: 'Make a joke about it.',
        requiresTrait: 'petty',
        consequences: {
          fansDelta: 1_500,
          statChanges: [{ stat: 'reputation', delta: -6 }],
          warSwing: -5,
          flavorText: 'You joked that {rival} finally heard your album. It did numbers. It also did damage.',
          plantSeed: { kind: 'dissed-rival', after: [16, 40], who: 'rival', note: 'You joked about {rival} collapsing backstage.' },
        },
      },
    ],
    tags: ['callback', 'planter'],
    cooldown: 30,
  },
  {
    id: 'plant-passed-beat',
    category: 'career',
    title: 'A Beat You Don’t Love',
    description:
      'A producer named {new} sends you a beat. It is fine. Something about it is off to you, though you can’t say what. They want an answer today.',
    weight: 4,
    triggers: [{ type: 'has_released_track' }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'pass',
        text: 'Pass on it.',
        consequences: {
          flavorText: 'You passed on {new}’s beat. They said no worries. They sounded like there were worries.',
          plantSeed: { kind: 'passed-beat', after: [8, 24], who: 'new', note: 'You passed on a beat from {new}.' },
        },
      },
      {
        id: 'take',
        text: 'Take it and figure it out.',
        consequences: {
          statChanges: [{ stat: 'creativity', delta: 2 }],
          moneyDelta: -1_000,
          flavorText: 'You bought {new}’s beat for $1,000. It is sitting in a folder called "maybe."',
        },
      },
    ],
    tags: ['callback', 'planter'],
    cooldown: 30,
  },
  {
    id: 'plant-young-fan-letter',
    category: 'social',
    title: 'A Letter from a Kid',
    description:
      'A letter arrives through your label, in crayon and pencil. A kid named {new} says your song got them through a year of hospital stays. They want to be a singer. They spelled your name wrong, beautifully.',
    weight: 3,
    triggers: [{ type: 'fans_gte', value: 10_000 }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'visit',
        text: 'Go see them.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 6 }, { stat: 'reputation', delta: 2 }],
          flavorText: 'You went to see {new}. You sang together. They sang better than you, and you told them so.',
          plantSeed: { kind: 'inspired-kid', after: [24, 48], who: 'new', note: 'You visited {new} in the hospital and sang with them.' },
        },
      },
      {
        id: 'merch',
        text: 'Send a signed box of merch.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 2 }],
          flavorText: 'You sent {new} a signed hoodie and a handwritten note.',
        },
      },
    ],
    tags: ['callback', 'planter'],
    cooldown: 40,
  },
  {
    id: 'plant-walkout',
    category: 'career',
    title: 'The Meeting Goes Sideways',
    description:
      'An exec named {new} spends twenty minutes explaining your own music to you. Then they suggest you "go more TikTok." Everyone in the room is waiting to see what you do.',
    weight: 3,
    triggers: [{ type: 'fans_gte', value: 8_000 }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'walk',
        text: 'Walk out.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 4 }, { stat: 'industryRespect', delta: -3 }],
          flavorText: 'You stood up mid-sentence and walked out. The door was heavier than you expected. Worth it.',
          plantSeed: { kind: 'burned-exec', after: [16, 36], who: 'new', note: 'You walked out on {new} in a label meeting.' },
        },
      },
      {
        id: 'nod',
        text: 'Nod along and take notes.',
        consequences: {
          statChanges: [{ stat: 'industryRespect', delta: 3 }, { stat: 'authenticity', delta: -2 }],
          flavorText: 'You nodded and took notes. {new} said you were "very coachable."',
        },
      },
      {
        id: 'hothead',
        text: 'Tell them exactly what you think.',
        requiresTrait: 'hothead',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 5 }, { stat: 'industryRespect', delta: -6 }],
          fansDelta: 800,
          flavorText: 'You told {new} what they could do with TikTok. Someone recorded the audio. It became a sound.',
          plantSeed: { kind: 'burned-exec', after: [16, 36], who: 'new', note: 'You cussed out {new} in a label meeting.' },
        },
      },
    ],
    tags: ['callback', 'planter'],
    cooldown: 40,
  },
];

// ─── Payoffs ──────────────────────────────────────────────────────────────────

const PAYOFFS: GameEvent[] = [
  // The friend you lent $500.
  {
    id: 'callback-loan-made-it',
    category: 'social',
    title: 'Remember That $500?',
    description:
      '{seed} pulls up in a car worth more than your first advance. "Remember that $500 you lent me {ago}? I never forgot." They hand you an envelope.',
    weight: 10,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'lent-money', npcStages: ['established', 'star', 'legend'] }],
    choices: [
      {
        id: 'take',
        text: 'Take the envelope.',
        consequences: {
          moneyDelta: 10_000,
          statChanges: [{ stat: 'mentalHealth', delta: 4 }],
          flavorText: 'Ten thousand dollars, and a hug that went on a beat too long. Twenty times your money.',
        },
      },
      {
        id: 'feature',
        text: 'Keep the money. Ask for a feature.',
        consequences: {
          fansDelta: 8_000,
          statChanges: [{ stat: 'industryRespect', delta: 3 }],
          moment: { kind: 'best', headline: '{playerName} and {seed} reunite on a song years after one $500 loan', topic: 'the $500 loan', heat: 50, valence: 70 },
          flavorText: '{seed} got on your next song for free and told the $500 story in every interview.',
        },
      },
    ],
    tags: CALLBACK,
    cooldown: 4,
  },
  {
    id: 'callback-loan-again',
    category: 'social',
    title: '{seed} Is Back',
    description:
      '{seed} is at your door. Same jacket as {ago}, when you lent them $500. "I know, I know. But this time it’s real. I just need $1,500."',
    weight: 8,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'lent-money' }],
    choices: [
      {
        id: 'lend',
        text: 'Lend it. They’re family, sort of.',
        consequences: {
          moneyDelta: -1_500,
          flavorText: 'You lent {seed} another $1,500. They promised again. You believed them again, mostly.',
          plantSeed: { kind: 'lent-money', after: [10, 30], who: 'seed', note: 'You lent {seed} money twice.' },
        },
      },
      {
        id: 'remind',
        text: 'Remind them about the first $500.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 2 }],
          flavorText: 'You brought up the $500. {seed} looked at the floor and left. You feel bad and right at the same time.',
        },
      },
      {
        id: 'loyal-give',
        text: 'Give it to them. Don’t call it a loan.',
        requiresTrait: 'loyal',
        consequences: {
          moneyDelta: -1_500,
          statChanges: [{ stat: 'mentalHealth', delta: 5 }],
          flavorText: 'You gave {seed} the money and told them never to pay it back. They hugged you like a kid.',
        },
      },
    ],
    tags: CALLBACK,
    cooldown: 4,
  },
  // The artist who asked for a verse.
  {
    id: 'callback-ghosted-star',
    category: 'rivalry',
    title: 'They Remember',
    description:
      '{seed} is top 5 this week. On a podcast today they were asked about their early days: "I DM’d {playerName} for a verse {ago}. Left me on read. That’s all I needed."',
    weight: 12,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'ghosted-artist', npcStages: ['established', 'star', 'legend'] }],
    choices: [
      {
        id: 'apologize',
        text: 'Apologize publicly.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 3 }, { stat: 'industryRespect', delta: 1 }],
          flavorText: 'You posted an apology to {seed}. They replied with a single handshake emoji. The internet decided it was big of you.',
        },
      },
      {
        id: 'clap-back',
        text: '"I don’t remember you."',
        consequences: {
          fansDelta: 2_000,
          statChanges: [{ stat: 'reputation', delta: -4 }],
          moment: { kind: 'beef', headline: '{playerName} says they don’t remember {seed}. {seed}’s fans remember for them', topic: 'the left-on-read story', heat: 60, valence: -20, hashtag: 'LeftOnRead' },
          flavorText: 'You said you didn’t remember them. {seed} posted the screenshot of your read receipt from {ago}.',
        },
      },
      {
        id: 'ask-now',
        text: 'Ask them for a verse now.',
        consequences: {
          fansDelta: 1_000,
          statChanges: [{ stat: 'reputation', delta: -2 }],
          flavorText: 'You asked {seed} for a verse. They screenshotted it and captioned it "full circle." No verse.',
        },
      },
    ],
    tags: CALLBACK,
    cooldown: 4,
  },
  {
    id: 'callback-helped-star',
    category: 'social',
    title: '"The Only One Who Answered"',
    description:
      '{seed} sells out an arena tonight. Halfway through, they stop the music and bring you onstage: "{ago}, I was nobody. This person was the only one who answered my DM."',
    weight: 12,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'helped-artist', npcStages: ['established', 'star', 'legend'] }],
    choices: [
      {
        id: 'perform',
        text: 'Perform your old verse with them.',
        consequences: {
          fansDelta: 15_000,
          statChanges: [{ stat: 'reputation', delta: 5 }, { stat: 'mentalHealth', delta: 6 }],
          moment: { kind: 'best', headline: '{seed} brings out {playerName}: "the only one who answered my DM"', topic: 'the full-circle moment', heat: 70, valence: 90, hashtag: 'FullCircle' },
          flavorText: 'Twenty thousand people heard the verse you did for free {ago}. {seed} knew every word of it.',
        },
      },
      {
        id: 'hug',
        text: 'Just hug them and walk off.',
        consequences: {
          fansDelta: 6_000,
          statChanges: [{ stat: 'mentalHealth', delta: 5 }],
          flavorText: 'You hugged {seed} on stage and let them have their night. The clip did the rest.',
        },
      },
    ],
    tags: CALLBACK,
    cooldown: 4,
  },
  {
    id: 'callback-helped-grinding',
    category: 'social',
    title: 'A Voice Note from {seed}',
    description:
      '{seed}, the kid you did a free verse for {ago}, is still grinding. They send a voice note: "Still can’t believe you did that. I’m not giving up." Attached: a new demo. It’s good.',
    weight: 7,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'helped-artist', npcStages: ['undiscovered', 'rising'] }],
    choices: [
      {
        id: 'feedback',
        text: 'Send real feedback.',
        consequences: {
          statChanges: [{ stat: 'industryRespect', delta: 1 }, { stat: 'mentalHealth', delta: 2 }],
          flavorText: 'You sent {seed} four minutes of honest notes. They wrote back "THANK YOU" in all caps.',
          plantSeed: { kind: 'helped-artist', after: [12, 30], who: 'seed', note: 'You kept mentoring {seed} long after the free verse.' },
        },
      },
      {
        id: 'share',
        text: 'Share the demo with your fans.',
        consequences: {
          statChanges: [{ stat: 'fanLoyalty', delta: 2 }],
          fansDelta: 300,
          flavorText: 'You posted {seed}’s demo. Their followers tripled overnight.',
          plantSeed: { kind: 'helped-artist', after: [12, 30], who: 'seed', note: 'You shared {seed}’s demo when nobody knew them.' },
        },
      },
      {
        id: 'ignore',
        text: 'Heart it and move on.',
        consequences: { flavorText: 'You hearted the voice note. That was all you had in you this week.' },
      },
    ],
    tags: CALLBACK,
    cooldown: 4,
  },
  {
    id: 'callback-charged-artist',
    category: 'career',
    title: 'The $1,500 Verse',
    description:
      '{seed} made it. In their documentary there’s a scene about the $1,500 verse they bought from you {ago}: "I ate rice for a month. It was worth it. I think."',
    weight: 9,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'charged-artist', npcStages: ['established', 'star', 'legend'] }],
    choices: [
      {
        id: 'refund',
        text: 'Send them $15,000. Ten times back.',
        consequences: {
          moneyDelta: -15_000,
          statChanges: [{ stat: 'reputation', delta: 5 }],
          moment: { kind: 'best', headline: '{playerName} pays {seed} back ten times for an old verse', topic: 'the $1,500 verse', heat: 45, valence: 80 },
          flavorText: 'You sent {seed} fifteen thousand dollars and a note: "for the rice." They posted it. Everyone loved it.',
        },
      },
      {
        id: 'own-it',
        text: '"Business was business."',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -2 }, { stat: 'industryRespect', delta: 1 }],
          flavorText: 'You told an interviewer business was business. Half the comments agreed. The other half made rice memes.',
        },
      },
    ],
    tags: CALLBACK,
    cooldown: 4,
  },
  // The rival you dissed.
  {
    id: 'callback-diss-exec',
    category: 'rivalry',
    title: 'Look Who’s an Executive',
    description:
      '{seed}, who you dissed on a record {ago}, just became head of A&R at a major label. Your name came up in their first meeting. Someone in the room texted you about it.',
    weight: 10,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'dissed-rival' }],
    choices: [
      {
        id: 'peace',
        text: 'Call them. Make peace.',
        consequences: {
          statChanges: [{ stat: 'industryRespect', delta: 4 }, { stat: 'mentalHealth', delta: 3 }],
          warSwing: 6,
          flavorText: 'You called {seed}. It was awkward for four minutes and fine for forty. Old songs, new jobs.',
        },
      },
      {
        id: 'double-down',
        text: 'Diss them again. Executive edition.',
        consequences: {
          fansDelta: 3_000,
          statChanges: [{ stat: 'industryRespect', delta: -6 }],
          warSwing: 5,
          moment: { kind: 'beef', headline: '{playerName} disses {seed} again, this time about their new job', topic: 'the exec diss', heat: 60, valence: 10, hashtag: 'SuitAndTie' },
          flavorText: 'You dissed {seed} again, this time about their tie. The streets loved it. The industry took notes.',
        },
      },
      {
        id: 'petty-gift',
        text: 'Send a congratulations gift: your diss record, on vinyl.',
        requiresTrait: 'petty',
        consequences: {
          fansDelta: 2_500,
          statChanges: [{ stat: 'reputation', delta: -2 }],
          flavorText: 'You sent {seed} a signed vinyl of the diss record, framed. They hung it in their new office. Somehow that’s worse.',
        },
      },
    ],
    tags: CALLBACK,
    cooldown: 6,
  },
  {
    id: 'callback-rival-kindness',
    category: 'rivalry',
    title: 'The Flowers',
    description:
      '{seed} is doing their comeback interview. Asked who reached out when they collapsed {ago}, they pause: "My mom. And, weirdly, {playerName}. Flowers, no cameras. I never forgot that."',
    weight: 10,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'kindness-rival' }],
    choices: [
      {
        id: 'truce',
        text: 'Call a truce.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 6 }, { stat: 'mentalHealth', delta: 4 }],
          warSwing: 15,
          moment: { kind: 'best', headline: '{seed} reveals {playerName} secretly sent flowers during their hospital stay', topic: 'the flowers', heat: 60, valence: 90, hashtag: 'TheFlowers' },
          flavorText: 'You and {seed} posted the same picture of the same flowers. The war is over. The internet needed a minute.',
        },
      },
      {
        id: 'stay-quiet',
        text: 'Don’t comment. It was never for them to tell.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 4 }],
          warSwing: 8,
          flavorText: 'You didn’t comment. That made the story even better.',
        },
      },
    ],
    tags: CALLBACK,
    cooldown: 6,
  },
  // The fight outside the club.
  {
    id: 'callback-fight-lawsuit',
    category: 'drama',
    title: 'The Guy from the Fight',
    description:
      'Remember the fight outside the club {ago}? The guy remembers. His lawyer sent a letter, the video attached, and a number with a lot of zeros.',
    weight: 9,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'club-fight' }],
    choices: [
      {
        id: 'settle',
        text: 'Settle quietly.',
        consequences: {
          moneyDelta: -25_000,
          flavorText: 'You paid $25,000 and signed an NDA. He bought a boat. You think about that a lot.',
        },
      },
      {
        id: 'fight',
        text: 'Fight it in court.',
        consequences: {
          moneyDelta: -8_000,
          statChanges: [{ stat: 'reputation', delta: -3 }],
          legalCharge: 'assault',
          flavorText: 'You refused to settle. The DA got interested in the video. Now it’s a criminal case.',
        },
      },
      {
        id: 'hire',
        text: 'Hire him as security.',
        requiresTrait: 'charmer',
        consequences: {
          moneyDelta: -3_000,
          statChanges: [{ stat: 'reputation', delta: 3 }],
          flavorText: 'You hired the guy as your security. He’s great at it. The fight is a funny story now.',
        },
      },
    ],
    tags: CALLBACK,
    cooldown: 4,
  },
  // The night at the afterparty.
  {
    id: 'callback-secret-child',
    category: 'personal',
    title: 'A Knock at the Door',
    description:
      '{seed} is at your door with a toddler on their hip. "You remember the afterparty, {ago}?" The kid has your eyes. And your exact frown.',
    weight: 9,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'wild-night' }, { type: 'age_lte', value: 55 }],
    choices: [
      {
        id: 'step-up',
        text: 'Step up. Be in their life.',
        consequences: {
          moneyDelta: -5_000,
          statChanges: [{ stat: 'mentalHealth', delta: -2 }],
          addPerson: { role: 'child', title: 'your kid', affinity: 30, bornWeeksAgo: 20 },
          moment: { kind: 'romance', headline: '{playerName} has a secret child, and is stepping up', topic: 'the secret child', heat: 70, valence: 30 },
          flavorText: 'You have a kid named {new}. You did not have a kid this morning. You bought a car seat by noon.',
        },
      },
      {
        id: 'test',
        text: 'DNA test first.',
        consequences: {
          moneyDelta: -2_000,
          addPerson: { role: 'child', title: 'your kid', affinity: 10, bornWeeksAgo: 20 },
          flavorText: 'The test came back: 99.98%. {new} is yours. {seed} did not appreciate being doubted.',
        },
      },
      {
        id: 'deny',
        text: 'Deny everything.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -8 }],
          moment: { kind: 'scandal', headline: '{playerName} denies paternity. The internet runs its own DNA test', topic: 'the paternity denial', heat: 80, valence: -70, hashtag: '{playerName}Pay' },
          flavorText: 'You denied it. {seed} posted a side-by-side photo. The internet has decided.',
        },
      },
    ],
    tags: CALLBACK,
    unique: true,
  },
  // The startup.
  {
    id: 'callback-investment-boom',
    category: 'opportunity',
    title: 'The Startup',
    description:
      'That startup you put money into {ago}, the one a stranger at a party swore by? It just went public. Your accountant called you three times in a row.',
    weight: 6,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'investment' }],
    choices: [
      {
        id: 'cash-out',
        text: 'Cash out.',
        consequences: {
          moneyDelta: 60_000,
          statChanges: [{ stat: 'mentalHealth', delta: 6 }],
          flavorText: 'You cashed out sixty thousand dollars. You went back to the party where you met the guy. He wasn’t there.',
        },
      },
      {
        id: 'hold',
        text: 'Hold. It’s going higher.',
        consequences: {
          moneyDelta: 25_000,
          flavorText: 'You held. It dipped. You sold half at $25,000 and told everyone you planned it that way.',
        },
      },
    ],
    tags: CALLBACK,
    cooldown: 4,
  },
  {
    id: 'callback-investment-bust',
    category: 'opportunity',
    title: 'The Startup, Part Two',
    description:
      'The startup you put money into {ago} has an update: the founder is in Bali, the office is a nail salon, and the investors have a group chat called "lol."',
    weight: 5,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'investment' }],
    choices: [
      {
        id: 'laugh',
        text: 'Laugh it off.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 1 }],
          flavorText: 'You joined the "lol" chat. Honestly the memes are worth it.',
        },
      },
      {
        id: 'song',
        text: 'Write a song about it.',
        consequences: {
          statChanges: [{ stat: 'creativity', delta: 3 }, { stat: 'writing', delta: 2 }],
          flavorText: 'You wrote a song called "Bali" about the founder. It’s the funniest thing you’ve made.',
        },
      },
    ],
    tags: CALLBACK,
    cooldown: 4,
  },
  // The intern.
  {
    id: 'callback-intern-producer',
    category: 'career',
    title: 'Your Old Intern',
    description:
      '{seed}, the kid who cleaned your cables {ago}, just produced the number one song in the country. They sent you a beat before anyone else heard it. The subject line: "first dibs, always."',
    weight: 10,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'mentored-intern' }],
    choices: [
      {
        id: 'take',
        text: 'Take the beat.',
        consequences: {
          statChanges: [{ stat: 'creativity', delta: 4 }, { stat: 'talent', delta: 2 }, { stat: 'industryRespect', delta: 4 }],
          moment: { kind: 'best', headline: 'Hit producer {seed} gives first beat to the artist who gave them their start', topic: 'the old intern', heat: 50, valence: 80 },
          flavorText: 'You took the beat. It is the best thing anyone has ever made for you. {seed} refused to send an invoice.',
        },
      },
      {
        id: 'pass-it-on',
        text: 'Tell them to give it to someone who needs it.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 4 }, { stat: 'mentalHealth', delta: 4 }],
          flavorText: 'You told {seed} to give the beat to an unknown. They did. That kid is going to be fine.',
        },
      },
    ],
    tags: CALLBACK,
    cooldown: 6,
  },
  {
    id: 'callback-intern-passed',
    category: 'career',
    title: 'The One You Turned Away',
    description:
      '{seed} produced half the songs on the radio this year. In an interview: "I asked {playerName} to let me intern {ago}. They said there was no room. There’s room now."',
    weight: 8,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'passed-intern' }],
    choices: [
      {
        id: 'own-it',
        text: 'Congratulate them publicly.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 2 }, { stat: 'mentalHealth', delta: -2 }],
          flavorText: 'You congratulated {seed}. They liked the post. That’s it. That’s the whole relationship.',
        },
      },
      {
        id: 'ask',
        text: 'Ask to work with them.',
        consequences: {
          moneyDelta: -20_000,
          statChanges: [{ stat: 'creativity', delta: 3 }],
          flavorText: '{seed} said yes, at full rate: $20,000. "No room for discounts," they said, smiling.',
        },
      },
    ],
    tags: CALLBACK,
    cooldown: 6,
  },
  // The hometown promise.
  {
    id: 'callback-hometown-promise',
    category: 'personal',
    title: 'They Remember Your Promise',
    description:
      'Your old high school posted the video from {ago}: you, promising to come back and play when you made it. 200,000 views. Everyone is tagging you.',
    weight: 9,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'hometown-promise' }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'show-up',
        text: 'Show up and play the gym.',
        consequences: {
          statChanges: [{ stat: 'energy', delta: -15 }, { stat: 'reputation', delta: 6 }, { stat: 'mentalHealth', delta: 6 }],
          fansDelta: 5_000,
          moment: { kind: 'best', headline: '{playerName} kept a promise to their old high school', topic: 'the promise', heat: 55, valence: 90, hashtag: 'KeptThePromise' },
          flavorText: 'You played the gym. The bleachers shook. Your old teacher sat in the front row and didn’t stop crying.',
        },
      },
      {
        id: 'later',
        text: '"Soon. I promise. Again."',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -4 }],
          flavorText: 'You promised again. The school deleted the video. That said more than any comment.',
        },
      },
    ],
    tags: CALLBACK,
    unique: true,
  },
  // The stolen hook.
  {
    id: 'callback-stolen-hook',
    category: 'drama',
    title: 'The Demo Surfaces',
    description:
      '{seed} just posted their demo from {ago}, side by side with your song. It is not close. It is the same hook. Music Twitter is doing forensic analysis.',
    weight: 11,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'stolen-hook' }],
    choices: [
      {
        id: 'settle',
        text: 'Settle and credit them.',
        consequences: {
          moneyDelta: -30_000,
          statChanges: [{ stat: 'reputation', delta: -3 }, { stat: 'authenticity', delta: -2 }],
          flavorText: 'You settled with {seed} for $30,000 and a writing credit. The comments are still not kind.',
        },
      },
      {
        id: 'deny',
        text: 'Deny it.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -9 }, { stat: 'authenticity', delta: -6 }],
          moment: { kind: 'scandal', headline: '{playerName} accused of stealing a hook from an unknown artist', topic: 'the stolen hook', heat: 80, valence: -70, hashtag: 'HookThief' },
          flavorText: 'You denied it. {seed} posted the timestamped voice memo. The internet does not forgive timestamps.',
        },
      },
      {
        id: 'confess',
        text: 'Admit it and split everything.',
        consequences: {
          moneyDelta: -15_000,
          statChanges: [{ stat: 'reputation', delta: 2 }, { stat: 'authenticity', delta: 4 }],
          flavorText: 'You admitted it and gave {seed} half the song. A rare honest moment. People noticed.',
        },
      },
    ],
    tags: CALLBACK,
    unique: true,
  },
  {
    id: 'callback-credited-writer',
    category: 'career',
    title: 'The Credit You Gave',
    description:
      '{seed} just won a songwriting award. Their speech: "{ago}, {playerName} could have stolen my hook. They called me instead. That credit paid my rent for a year."',
    weight: 9,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'credited-writer' }],
    choices: [
      {
        id: 'celebrate',
        text: 'Celebrate them.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 6 }, { stat: 'industryRespect', delta: 5 }],
          moment: { kind: 'best', headline: '{seed} thanks {playerName} for the writing credit that changed their life', topic: 'the credit', heat: 50, valence: 85 },
          flavorText: 'You reposted the speech. Songwriters everywhere quote-tweeted it with "this is how it should be."',
        },
      },
    ],
    tags: CALLBACK,
    unique: true,
  },
  // Fake streams.
  {
    id: 'callback-bot-scandal',
    category: 'drama',
    title: 'The Data Journalist',
    description:
      'A data journalist just published a thread: a million streams on your song from {ago}, all from the same few thousand devices in a warehouse. It has charts. Good charts.',
    weight: 10,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'botted-streams' }],
    choices: [
      {
        id: 'admit',
        text: 'Own it. You were broke and desperate.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -3 }, { stat: 'authenticity', delta: 3 }],
          flavorText: 'You admitted it. "I was broke and nobody was listening." Weirdly, a lot of people respected that.',
        },
      },
      {
        id: 'blame',
        text: 'Blame a rogue marketing guy.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -7 }, { stat: 'industryRespect', delta: -5 }],
          moment: { kind: 'scandal', headline: '{playerName}’s streams were fake, says new analysis', topic: 'the fake streams', heat: 70, valence: -60, hashtag: 'BotStreams' },
          flavorText: 'You blamed a marketing guy. The marketing guy posted the receipt with your name on it.',
        },
      },
    ],
    tags: CALLBACK,
    unique: true,
  },
  // The crypto coin.
  {
    id: 'callback-crypto-collapse',
    category: 'drama',
    title: '$VIBE Went to Zero',
    description:
      'The coin you promoted {ago} is worth nothing. The founders are unreachable. Your fans lost real money, and they’re in your comments with screenshots of your old post. Prosecutors are asking questions.',
    weight: 12,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'crypto-coin' }],
    choices: [
      {
        id: 'refund',
        text: 'Pay back the fans who lost money.',
        consequences: {
          moneyDelta: -120_000,
          statChanges: [{ stat: 'reputation', delta: 6 }, { stat: 'fanLoyalty', delta: 8 }],
          moment: { kind: 'charity', headline: '{playerName} personally refunds fans burned by the $VIBE collapse', topic: 'the refunds', heat: 60, valence: 80 },
          flavorText: 'You paid $120,000 out of your own pocket to refund fans. It hurt. It was right.',
        },
      },
      {
        id: 'silence',
        text: 'Stay silent and let the lawyers handle it.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -10 }, { stat: 'fanLoyalty', delta: -8 }],
          legalCharge: 'fraud',
          flavorText: 'You stayed silent. The prosecutors didn’t. You’ve been charged with fraud alongside the founders.',
        },
      },
      {
        id: 'blame-founders',
        text: 'Blame the founders loudly.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -5 }],
          flavorText: 'You blamed the founders in a long notes-app post. Nobody read past paragraph two.',
        },
      },
    ],
    tags: CALLBACK,
    unique: true,
  },
  // Family.
  {
    id: 'callback-missed-birthday',
    category: 'personal',
    title: 'It Comes Up at Dinner',
    description:
      'Family dinner. Everyone is laughing. Then {seed} says, very calmly, "Remember my 60th? {ago}? No, you don’t, because you weren’t there."',
    weight: 8,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'missed-birthday' }, { type: 'has_person', role: 'parent' }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'apologize',
        text: 'Apologize, properly this time.',
        consequences: {
          personChanges: [{ role: 'parent', delta: 15 }],
          statChanges: [{ stat: 'mentalHealth', delta: 4 }],
          flavorText: 'You apologized properly, finally. {seed} squeezed your hand under the table.',
        },
      },
      {
        id: 'defend',
        text: '"It was the biggest show of my life!"',
        consequences: {
          personChanges: [{ role: 'parent', delta: -10 }],
          statChanges: [{ stat: 'mentalHealth', delta: -4 }],
          flavorText: 'You defended it. The rest of dinner was the sound of forks.',
        },
      },
    ],
    tags: CALLBACK,
    cooldown: 6,
  },
  {
    id: 'callback-kept-birthday',
    category: 'personal',
    title: 'The Photo on the Fridge',
    description:
      'You visit home. On the fridge, in the center, is a photo of you at {seed}’s 60th, {ago}. The night you turned down the big show. It’s the only photo on the fridge.',
    weight: 7,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'kept-birthday' }, { type: 'has_person', role: 'parent' }],
    choices: [
      {
        id: 'stay',
        text: 'Stay for the weekend.',
        consequences: {
          personChanges: [{ role: 'parent', delta: 10 }],
          statChanges: [{ stat: 'mentalHealth', delta: 8 }],
          flavorText: 'You stayed the weekend. You slept in your old room. You slept great.',
        },
      },
    ],
    tags: CALLBACK,
    unique: true,
  },
  // The kids.
  {
    id: 'callback-inspired-kid',
    category: 'social',
    title: 'The Kid from the Hospital',
    description:
      '{seed} is eighteen now. Their cover of your song just went viral, and the caption says: "{ago}, this person sang with me in the hospital. I sang this for them."',
    weight: 10,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'inspired-kid' }],
    choices: [
      {
        id: 'feature',
        text: 'Put them on your next song.',
        consequences: {
          fansDelta: 12_000,
          statChanges: [{ stat: 'reputation', delta: 6 }, { stat: 'mentalHealth', delta: 8 }],
          moment: { kind: 'best', headline: '{playerName} features the kid they once sang with in a children’s hospital', topic: 'the hospital kid', heat: 70, valence: 95, hashtag: 'TheHospitalKid' },
          flavorText: 'You flew {seed} out and recorded a duet. You had to stop twice. Nobody minded.',
        },
      },
      {
        id: 'share',
        text: 'Share it with a message.',
        consequences: {
          fansDelta: 4_000,
          statChanges: [{ stat: 'reputation', delta: 3 }, { stat: 'mentalHealth', delta: 5 }],
          flavorText: 'You shared {seed}’s cover: "You always sang it better." The comments are all crying emojis.',
        },
      },
    ],
    tags: CALLBACK,
    unique: true,
  },
  {
    id: 'callback-scholarship-kid',
    category: 'career',
    title: 'Your First Scholar',
    description:
      '{seed}, the first kid your scholarship ever paid for {ago}, just signed a record deal. Their first post: a photo of the acceptance letter with your name on it.',
    weight: 9,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'scholarship-kid' }],
    choices: [
      {
        id: 'mentor',
        text: 'Call and offer to mentor them.',
        consequences: {
          statChanges: [{ stat: 'industryRespect', delta: 5 }, { stat: 'mentalHealth', delta: 5 }],
          moment: { kind: 'charity', headline: 'The first {playerName} scholar just signed a record deal', topic: 'the first scholar', heat: 45, valence: 90 },
          flavorText: 'You called {seed}. They answered on the first ring. "I was hoping you’d call."',
        },
      },
      {
        id: 'fund-more',
        text: 'Fund ten more scholarships.',
        consequences: {
          moneyDelta: -25_000,
          statChanges: [{ stat: 'reputation', delta: 7 }],
          flavorText: 'You funded ten more scholarships in {seed}’s name. They called you, crying, at 2 a.m.',
        },
      },
    ],
    tags: CALLBACK,
    unique: true,
  },
  // The beat.
  {
    id: 'callback-passed-beat',
    category: 'career',
    title: 'The Beat You Passed On',
    description:
      'The number one song in the country is built on the beat {seed} sent you {ago}. The one you passed on. Someone else sang it. It is very, very good.',
    weight: 8,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'passed-beat' }],
    choices: [
      {
        id: 'congrats',
        text: 'Congratulate {seed}.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -2 }, { stat: 'industryRespect', delta: 2 }],
          flavorText: 'You congratulated {seed}. They wrote back: "you had first dibs lol." You are still thinking about it.',
        },
      },
      {
        id: 'claim',
        text: 'Hint that you "passed it along."',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -5 }],
          moment: { kind: 'meme', headline: '{playerName} claims credit for a hit they turned down', topic: 'the beat claim', heat: 50, valence: -40, hashtag: 'PassedItAlong' },
          flavorText: 'You hinted you passed the beat along on purpose. {seed} posted your "eh, not for me" text.',
        },
      },
    ],
    tags: CALLBACK,
    unique: true,
  },
  // The exec you walked out on.
  {
    id: 'callback-burned-exec',
    category: 'career',
    title: 'The Exec Remembers',
    description:
      '{seed}, the exec you walked out on {ago}, now runs the biggest festival in the country. Your booking agent says your request "got lost." Twice.',
    weight: 8,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'burned-exec' }],
    choices: [
      {
        id: 'apologize',
        text: 'Swallow your pride and call them.',
        consequences: {
          statChanges: [{ stat: 'industryRespect', delta: 5 }, { stat: 'authenticity', delta: -2 }],
          flavorText: 'You called {seed}. They let you apologize for a long time before saying "we’ll see."',
        },
      },
      {
        id: 'own-fest',
        text: 'Throw your own show the same weekend.',
        consequences: {
          moneyDelta: -15_000,
          fansDelta: 6_000,
          statChanges: [{ stat: 'authenticity', delta: 4 }],
          moment: { kind: 'beef', headline: '{playerName} books a rival show against the festival that snubbed them', topic: 'the counter-show', heat: 55, valence: 30 },
          flavorText: 'You threw your own show the same weekend. It sold out. {seed} unfollowed you, which you framed.',
        },
      },
    ],
    tags: CALLBACK,
    unique: true,
  },
];

/** Seeds a starting scenario plants on day one. */
const SCENARIO_PAYOFFS: GameEvent[] = [
  {
    id: 'callback-old-show-reunion',
    category: 'opportunity',
    title: 'The Reunion Special',
    description:
      'The network wants the whole cast of your old kids’ show back for a reunion special. Your old castmates are in a group chat called "never again" that is, suddenly, very active.',
    weight: 12,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'old-show' }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'do-it',
        text: 'Do the reunion. Sing the theme song.',
        consequences: {
          moneyDelta: 50_000,
          fansDelta: 60_000,
          statChanges: [{ stat: 'authenticity', delta: -4 }, { stat: 'mentalHealth', delta: -3 }],
          moment: { kind: 'best', headline: 'The cast is back: {playerName} sings the old theme song at the reunion', topic: 'the reunion', heat: 75, valence: 70, hashtag: 'TheReunion' },
          flavorText: 'You sang the theme song. Thirty-year-olds everywhere sobbed. Your new music got a lot of first-time listeners.',
        },
      },
      {
        id: 'own-song',
        text: 'Only if you can perform your new song too.',
        consequences: {
          moneyDelta: 30_000,
          fansDelta: 35_000,
          statChanges: [{ stat: 'authenticity', delta: 3 }],
          flavorText: 'You negotiated a slot for your new song. Half the audience didn’t know you made music now. They do now.',
        },
      },
      {
        id: 'refuse',
        text: 'Refuse. That kid is gone.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 5 }, { stat: 'mentalHealth', delta: 4 }],
          flavorText: 'You refused. They did the reunion without you and put an empty chair with your name on it. Brutal. Effective.',
        },
      },
    ],
    tags: CALLBACK,
    unique: true,
  },
];

export const CALLBACK_EVENTS: GameEvent[] = [...PLANTERS, ...PAYOFFS, ...SCENARIO_PAYOFFS];
