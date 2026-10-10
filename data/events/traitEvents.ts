import type { GameEvent } from '../../types/events';

/**
 * PERSONALITY. Ordinary moments where who the artist is changes what they can
 * do: choices marked `requiresTrait` only appear for that personality (and
 * are labelled with it). The last few read the era's persona instead.
 */

const TRAIT = ['trait'];

export const TRAIT_EVENTS: GameEvent[] = [
  {
    id: 'trait-overrated-comment',
    category: 'social',
    title: '"Overrated."',
    description: 'A comment under your latest post just says "overrated." It has forty thousand likes. The account has no profile picture.',
    weight: 6,
    triggers: [{ type: 'fans_gte', value: 3_000 }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'ignore',
        text: 'Ignore it.',
        consequences: { statChanges: [{ stat: 'discipline', delta: 1 }], flavorText: 'You ignored it. It stayed with you until dinner, then mostly left.' },
      },
      {
        id: 'joke',
        text: 'Reply with a joke.',
        consequences: { fansDelta: 600, statChanges: [{ stat: 'charisma', delta: 1 }], flavorText: 'You replied "rated by who though." It has more likes than the original now.' },
      },
      {
        id: 'petty',
        text: 'Find out who they are.',
        requiresTrait: 'petty',
        consequences: {
          fansDelta: 1_500,
          statChanges: [{ stat: 'reputation', delta: -3 }],
          mentalChanges: [{ axis: 'paranoia', delta: 4 }],
          flavorText: 'You spent four hours finding the account’s owner: a guy named Doug in Ohio. You posted his old playlist. Doug has deleted everything.',
        },
      },
      {
        id: 'humble',
        text: '"Some days, yeah."',
        requiresTrait: 'humble',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 4 }, { stat: 'authenticity', delta: 2 }],
          flavorText: 'You replied "some days, yeah." The internet decided you’re the most likeable person alive this week.',
        },
      },
      {
        id: 'hothead',
        text: 'Go off.',
        requiresTrait: 'hothead',
        consequences: {
          fansDelta: 2_000,
          statChanges: [{ stat: 'reputation', delta: -6 }],
          moment: { kind: 'ugly', headline: '{playerName} wrote 14 paragraphs to a commenter who called them overrated', topic: 'the meltdown', heat: 55, valence: -40, hashtag: 'Overrated' },
          flavorText: 'You went off. Fourteen paragraphs. The commenter replied "proved my point."',
        },
      },
    ],
    tags: TRAIT,
    cooldown: 12,
  },
  {
    id: 'trait-is-it-done',
    category: 'career',
    title: 'Is It Done?',
    description: 'The new song is mixed and mastered. Your team loves it. Something in the second chorus is bothering you and you can’t name it.',
    weight: 6,
    triggers: [{ type: 'has_released_track' }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'ship',
        text: 'It’s done. Ship it.',
        consequences: { statChanges: [{ stat: 'discipline', delta: 1 }], flavorText: 'You let it go. Nobody else will ever hear what you heard.' },
      },
      {
        id: 'redo',
        text: 'Tear it down and rebuild the chorus.',
        requiresTrait: 'perfectionist',
        consequences: {
          statChanges: [{ stat: 'creativity', delta: 4 }, { stat: 'talent', delta: 2 }],
          mentalChanges: [{ axis: 'burnout', delta: 8 }, { axis: 'anxiety', delta: 4 }],
          flavorText: 'You rebuilt the chorus from nothing over three nights. It is better. Your engineer has stopped speaking to you.',
        },
      },
      {
        id: 'ask',
        text: 'Ask the engineer what they hear.',
        consequences: { statChanges: [{ stat: 'industryRespect', delta: 1 }], flavorText: 'Your engineer heard it too: a flat note on the second chorus. Fixed in four minutes.' },
      },
    ],
    tags: TRAIT,
    cooldown: 14,
  },
  {
    id: 'trait-yacht-party',
    category: 'social',
    title: 'The Yacht',
    description: 'You’re invited to a yacht party. Famous people, open bar, "phones in the basket."',
    weight: 5,
    triggers: [{ type: 'fans_gte', value: 20_000 }, { type: 'age_gte', value: 21 }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'go',
        text: 'Go for a few hours.',
        consequences: { statChanges: [{ stat: 'industryRespect', delta: 3 }, { stat: 'charisma', delta: 1 }], flavorText: 'You went, made two useful friends, and left before anything happened that would be on a podcast.' },
      },
      {
        id: 'three-days',
        text: 'Go. Stay three days.',
        requiresTrait: 'party-animal',
        consequences: {
          fansDelta: 3_000,
          statChanges: [{ stat: 'charisma', delta: 3 }, { stat: 'energy', delta: -25 }],
          mentalChanges: [{ axis: 'addictionRisk', delta: 10 }],
          flavorText: 'You stayed three days. Nobody knows exactly what country you ended up in. The photos are legendary.',
          plantSeed: { kind: 'wild-night', after: [10, 24], who: 'none', note: 'You disappeared on a yacht for three days.' },
        },
      },
      {
        id: 'sober',
        text: 'Go, and stay sober.',
        requiresTrait: 'sober',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 3 }, { stat: 'mentalHealth', delta: 3 }],
          flavorText: 'You stayed sober on a yacht full of people who weren’t. You remember everything. That’s powerful, and a little funny.',
        },
      },
      {
        id: 'skip',
        text: 'Skip it.',
        consequences: { statChanges: [{ stat: 'mentalHealth', delta: 2 }], flavorText: 'You stayed home and watched the yacht on everyone else’s stories.' },
      },
    ],
    tags: TRAIT,
    cooldown: 16,
  },
  {
    id: 'trait-bodega-eyes',
    category: 'personal',
    title: 'At the Bodega',
    description: 'You lock eyes with someone over the bodega cat. They laugh at exactly the same moment you do.',
    weight: 5,
    triggers: [{ type: 'lacks_person', role: 'partner' }, { type: 'age_gte', value: 18 }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'number',
        text: 'Ask for their number.',
        consequences: {
          addPerson: { role: 'partner', title: 'your partner', affinity: 25 },
          statChanges: [{ stat: 'mentalHealth', delta: 4 }],
          flavorText: 'You asked for their number. Their name is {new}. They have a dog, a band, and opinions.',
        },
      },
      {
        id: 'song',
        text: 'Write them a song on the spot.',
        requiresTrait: 'hopeless-romantic',
        consequences: {
          addPerson: { role: 'partner', title: 'your partner', affinity: 40 },
          statChanges: [{ stat: 'writing', delta: 2 }, { stat: 'mentalHealth', delta: 5 }],
          flavorText: 'You wrote {new} a song on a receipt, by the cat. They framed the receipt. You’re dating.',
        },
      },
      {
        id: 'walk',
        text: 'Smile and walk on.',
        consequences: { flavorText: 'You smiled and walked on. Some songs are about the person you didn’t talk to.' },
      },
    ],
    tags: TRAIT,
    cooldown: 20,
  },
  {
    id: 'trait-friend-crisis',
    category: 'personal',
    title: '{Friend} Needs You',
    description: '{friend} calls at 6 a.m., crying. Something happened. You have a session with a famous producer at noon that took six months to book.',
    weight: 6,
    triggers: [{ type: 'has_person', role: 'friend' }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'session',
        text: 'Go to the session. Call them after.',
        consequences: {
          personChanges: [{ role: 'friend', delta: -10 }],
          statChanges: [{ stat: 'talent', delta: 2 }],
          flavorText: 'You made the session. It was great. {friend} said "it’s fine" in the voice that means it isn’t.',
        },
      },
      {
        id: 'friend',
        text: 'Go to {friend}.',
        consequences: {
          personChanges: [{ role: 'friend', delta: 12 }],
          statChanges: [{ stat: 'industryRespect', delta: -2 }],
          flavorText: 'You went to {friend}. The producer rescheduled for "sometime next year."',
        },
      },
      {
        id: 'loyal',
        text: 'Cancel everything this week. They come first.',
        requiresTrait: 'loyal',
        consequences: {
          personChanges: [{ role: 'friend', delta: 25 }],
          statChanges: [{ stat: 'mentalHealth', delta: 4 }],
          flavorText: 'You cancelled the whole week and moved onto {friend}’s couch. They’ll tell this story at your funeral.',
        },
      },
    ],
    tags: TRAIT,
    cooldown: 16,
  },
  {
    id: 'trait-empty-stadium',
    category: 'career',
    title: 'Soundcheck, Sixty Thousand Empty Seats',
    description: 'Soundcheck at a stadium. The seats go up so high they disappear. Tonight every one of them will be full.',
    weight: 6,
    triggers: [{ type: 'on_tour' }, { type: 'fans_gte', value: 500_000 }],
    choices: [
      {
        id: 'walk',
        text: 'Walk the whole stage, alone.',
        consequences: { statChanges: [{ stat: 'charisma', delta: 3 }, { stat: 'mentalHealth', delta: 3 }], flavorText: 'You walked every inch of the stage alone. By the end it felt like your living room.' },
      },
      {
        id: 'introvert',
        text: 'Hide in the dressing room until showtime.',
        requiresTrait: 'introvert',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 4 }],
          mentalChanges: [{ axis: 'anxiety', delta: -6 }],
          flavorText: 'You sat in the dark dressing room with headphones on until they called your name. It works. It always works.',
        },
      },
      {
        id: 'diva',
        text: 'Demand the stage be raised two feet.',
        requiresTrait: 'diva',
        consequences: {
          moneyDelta: -20_000,
          statChanges: [{ stat: 'charisma', delta: 4 }, { stat: 'industryRespect', delta: -2 }],
          flavorText: 'You had them raise the stage two feet. It cost twenty thousand dollars. You looked like a god up there.',
        },
      },
    ],
    tags: TRAIT,
    cooldown: 12,
  },
  {
    id: 'trait-shady-accountant',
    category: 'opportunity',
    title: 'The Accountant Has Ideas',
    description: 'Your new accountant has "a structure" that could cut your taxes by half. It involves an island, a holding company and the phrase "technically legal."',
    weight: 5,
    triggers: [{ type: 'fans_gte', value: 50_000 }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'do-it',
        text: 'Do it. Everyone does it.',
        consequences: {
          moneyDelta: 30_000,
          flavorText: 'You signed the papers. Your tax bill dropped by thirty thousand dollars this year. The island has a nice name.',
          plantSeed: { kind: 'shady-taxes', after: [16, 36], who: 'none', note: 'You signed off on your accountant’s "technically legal" tax structure.' },
        },
      },
      {
        id: 'no',
        text: 'Fire the accountant.',
        consequences: { statChanges: [{ stat: 'discipline', delta: 2 }], flavorText: 'You fired the accountant. Your next one wears a cardigan and says "no" a lot. Good.' },
      },
      {
        id: 'audit',
        text: 'Audit the books yourself first.',
        requiresTrait: 'trust-issues',
        consequences: {
          moneyDelta: 15_000,
          statChanges: [{ stat: 'discipline', delta: 3 }],
          flavorText: 'You audited everything. You found $15,000 the accountant had been "saving" for himself. He’s gone. The money isn’t.',
        },
      },
    ],
    tags: TRAIT,
    unique: true,
  },
  {
    id: 'callback-shady-taxes',
    category: 'drama',
    title: 'A Letter from the Tax Authority',
    description: 'The "technically legal" structure from {ago}? The tax authority has a different word for it. They have a lot of words, actually, in a very thick envelope.',
    weight: 11,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'shady-taxes' }],
    choices: [
      {
        id: 'pay',
        text: 'Pay it all back, plus penalties.',
        consequences: { moneyDelta: -90_000, statChanges: [{ stat: 'reputation', delta: -2 }], flavorText: 'You paid everything back with penalties. Ninety thousand dollars to make an envelope go away.' },
      },
      {
        id: 'fight',
        text: 'Fight it. It was technically legal.',
        consequences: {
          legalCharge: 'tax-evasion',
          statChanges: [{ stat: 'reputation', delta: -4 }],
          flavorText: 'You fought it. It turns out "technically legal" is not a legal term. You’ve been indicted.',
        },
      },
    ],
    tags: ['callback', ...TRAIT],
    unique: true,
  },
  {
    id: 'trait-genre-collision',
    category: 'career',
    title: 'Two Genres That Shouldn’t Meet',
    description: 'You have an idea for a song that mashes your sound with something nobody would put next to it. It is either genius or a meme.',
    weight: 5,
    triggers: [{ type: 'has_released_track' }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'demo',
        text: 'Make a demo, keep it private.',
        consequences: { statChanges: [{ stat: 'creativity', delta: 3 }], flavorText: 'You made the demo. It lives in a folder called "later." You listen to it a lot.' },
      },
      {
        id: 'all-in',
        text: 'Build the whole next era around it.',
        requiresTrait: 'visionary',
        consequences: {
          statChanges: [{ stat: 'creativity', delta: 6 }, { stat: 'industryRespect', delta: 3 }],
          fansDelta: 2_500,
          flavorText: 'You built everything around the idea. People said it was a mistake for two weeks. Then they said they always knew.',
        },
      },
      {
        id: 'drop',
        text: 'Drop it. Stay in your lane.',
        consequences: { statChanges: [{ stat: 'discipline', delta: 1 }], flavorText: 'You dropped it. Somebody else will make that song in three years.' },
      },
    ],
    tags: TRAIT,
    cooldown: 20,
  },
  {
    id: 'trait-workaholic-wall',
    category: 'personal',
    title: 'Your Body Is Talking',
    description: 'Your hands shake when you hold a coffee. You fell asleep standing up in the vocal booth. Your body is sending a message, and it is in all caps.',
    weight: 9,
    triggers: [{ type: 'has_trait', trait: 'workaholic' }, { type: 'mental_gte', mentalAxis: 'burnout', value: 55 }],
    choices: [
      {
        id: 'push',
        text: 'Push through. Sleep when it’s done.',
        consequences: {
          statChanges: [{ stat: 'creativity', delta: 3 }, { stat: 'mentalHealth', delta: -6 }],
          mentalChanges: [{ axis: 'burnout', delta: 10 }],
          flavorText: 'You pushed through. The work is good. You’re not.',
        },
      },
      {
        id: 'rest',
        text: 'Take a real week off.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 8 }, { stat: 'energy', delta: 30 }],
          mentalChanges: [{ axis: 'burnout', delta: -20 }],
          flavorText: 'You took a week off. Day three you started to remember who you are when you’re not working.',
        },
      },
    ],
    tags: TRAIT,
    cooldown: 10,
  },
  {
    id: 'trait-silent-retreat',
    category: 'personal',
    title: 'A Silent Retreat',
    description: 'A friend invites you to a ten-day silent retreat. No phone, no talking, no music. Just you and whatever you have been avoiding.',
    weight: 4,
    triggers: [{ type: 'age_gte', value: 21 }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'go',
        text: 'Go.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 8 }, { stat: 'creativity', delta: 2 }],
          mentalChanges: [{ axis: 'anxiety', delta: -10 }],
          flavorText: 'Ten days of silence. On day seven you heard a melody in your head so clearly you almost broke the rule.',
        },
      },
      {
        id: 'deeper',
        text: 'Stay a month.',
        requiresTrait: 'zen',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 14 }, { stat: 'creativity', delta: 5 }, { stat: 'energy', delta: -10 }],
          mentalChanges: [{ axis: 'anxiety', delta: -20 }, { axis: 'depression', delta: -10 }],
          flavorText: 'You stayed a month. You came back speaking slower and writing better. People keep asking what happened to you.',
        },
      },
      {
        id: 'no',
        text: 'No way. Silence is your nightmare.',
        consequences: { flavorText: 'You declined. Silence is for people who don’t need to hear themselves.' },
      },
    ],
    tags: TRAIT,
    unique: true,
  },
  {
    id: 'trait-money-room',
    category: 'opportunity',
    title: 'The Brand Meeting',
    description: 'A beverage brand wants a partnership. The first offer is insulting. The second offer is insulting in a nicer font.',
    weight: 5,
    triggers: [{ type: 'fans_gte', value: 30_000 }, { type: 'not_in_jail' }],
    choices: [
      {
        id: 'take',
        text: 'Take the second offer.',
        consequences: { moneyDelta: 15_000, statChanges: [{ stat: 'authenticity', delta: -2 }], flavorText: 'You took the deal. Your face is on a can. It’s a weird face on the can.' },
      },
      {
        id: 'hustle',
        text: 'Walk out, then wait for the call.',
        requiresTrait: 'hustler',
        consequences: {
          moneyDelta: 45_000,
          statChanges: [{ stat: 'industryRespect', delta: 2 }],
          flavorText: 'You walked out mid-pitch. They called before you reached the elevator. Triple the money and equity.',
        },
      },
      {
        id: 'charm',
        text: 'Charm the room until they forget the budget.',
        requiresTrait: 'charmer',
        consequences: {
          moneyDelta: 30_000,
          statChanges: [{ stat: 'charisma', delta: 1 }],
          flavorText: 'You told three stories and did an impression of their CEO. They doubled the offer, laughing.',
        },
      },
      {
        id: 'pass',
        text: 'Pass.',
        consequences: { statChanges: [{ stat: 'authenticity', delta: 2 }], flavorText: 'You passed. Your face stays off cans. For now.' },
      },
    ],
    tags: TRAIT,
    cooldown: 18,
  },

  // ─── The era's persona ──────────────────────────────────────────────────────
  {
    id: 'era-villain-working',
    category: 'drama',
    title: 'The Villain Era Is Working',
    description: 'Your villain era is the most talked-about thing in music. Your streams are up. Your mom texted "are you ok?" with three question marks.',
    weight: 7,
    triggers: [{ type: 'era_persona', persona: 'villain' }],
    choices: [
      {
        id: 'lean',
        text: 'Lean in. Villains don’t apologize.',
        consequences: {
          fansDelta: 5_000,
          statChanges: [{ stat: 'reputation', delta: -4 }, { stat: 'charisma', delta: 2 }],
          moment: { kind: 'meme', headline: '{playerName}’s villain era refuses to end', topic: 'the villain era', heat: 60, valence: -10, hashtag: 'VillainEra' },
          flavorText: 'You leaned all the way in. You wore black to a children’s charity gala. It trended for two days.',
        },
      },
      {
        id: 'wink',
        text: 'Let everyone in on the joke.',
        consequences: { statChanges: [{ stat: 'reputation', delta: 3 }, { stat: 'charisma', delta: 2 }], flavorText: 'You posted a blooper reel of yourself practicing evil laughs. Everyone loves a villain who’s in on it.' },
      },
    ],
    tags: ['era'],
    cooldown: 12,
  },
  {
    id: 'era-mysterious-silence',
    category: 'social',
    title: 'The Silence',
    description: 'You haven’t posted in weeks. Fans have built three conspiracy theories and a spreadsheet. One of the theories is correct.',
    weight: 7,
    triggers: [{ type: 'era_persona', persona: 'mysterious' }],
    choices: [
      {
        id: 'cryptic',
        text: 'Post one cryptic photo. No caption.',
        consequences: {
          fansDelta: 4_000,
          statChanges: [{ stat: 'fanLoyalty', delta: 3 }],
          flavorText: 'You posted a blurry photo of a door. Nine hundred thousand people analyzed the doorknob.',
        },
      },
      {
        id: 'stay',
        text: 'Stay silent.',
        consequences: { statChanges: [{ stat: 'authenticity', delta: 2 }], flavorText: 'You stayed silent. The spreadsheet has a second tab now.' },
      },
    ],
    tags: ['era'],
    cooldown: 12,
  },
  {
    id: 'era-conscious-quote',
    category: 'social',
    title: 'A Politician Quoted You',
    description: 'A politician quoted your lyric in a speech. Badly. Out of context. With a lot of confidence.',
    weight: 6,
    triggers: [{ type: 'era_persona', persona: 'conscious' }],
    choices: [
      {
        id: 'correct',
        text: 'Correct them publicly.',
        consequences: { statChanges: [{ stat: 'authenticity', delta: 4 }, { stat: 'industryRespect', delta: 2 }], fansDelta: 2_000, flavorText: 'You posted the full verse and what it actually means. The politician deleted the clip.' },
      },
      {
        id: 'ignore',
        text: 'Let the song speak for itself.',
        consequences: { statChanges: [{ stat: 'discipline', delta: 1 }], flavorText: 'You let the song speak for itself. It speaks pretty loudly.' },
      },
    ],
    tags: ['era'],
    unique: true,
  },
  {
    id: 'era-heartbroken-reply',
    category: 'personal',
    title: 'They Heard the Album',
    description: 'Your ex heard the heartbreak era. They just posted a song of their own. It’s a reply. It’s… not bad.',
    weight: 6,
    triggers: [{ type: 'era_persona', persona: 'heartbroken' }, { type: 'has_person', role: 'ex' }],
    choices: [
      {
        id: 'reply',
        text: 'Write a reply to the reply.',
        consequences: {
          fansDelta: 6_000,
          statChanges: [{ stat: 'writing', delta: 3 }, { stat: 'mentalHealth', delta: -4 }],
          moment: { kind: 'romance', headline: '{playerName} and their ex are answering each other in songs', topic: 'the breakup songs', heat: 70, valence: 0, hashtag: 'BreakupSongs' },
          flavorText: 'You wrote a reply to {ex}’s reply. The internet is treating it like a sporting event.',
        },
      },
      {
        id: 'peace',
        text: 'Text them "it’s good." Leave it there.',
        consequences: {
          personChanges: [{ role: 'ex', delta: 15 }],
          statChanges: [{ stat: 'mentalHealth', delta: 5 }],
          flavorText: 'You texted {ex}: "it’s good." They wrote back "yours too." That was the end of it, finally.',
        },
      },
    ],
    tags: ['era'],
    unique: true,
  },
];
