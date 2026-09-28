import type { ActivityCategory, LifeActivity } from '../../types/life';
import type { EventCategory } from '../../types/events';

/**
 * The Life tab's Activities menu, as data. Each activity costs energy (and
 * sometimes money), may be gated, and resolves to one weighted outcome that
 * goes through the event consequence pipeline and into the Deck. Outcomes
 * with a `social` beat also land in the feed. Adding an activity is adding a
 * row here — systems/life/activityEngine.ts needs no changes.
 *
 * Money earned is clamped to ACTIVITY_EARNINGS_CAP_PER_WEEK by the engine,
 * so outcomes can be written with honest numbers.
 */

export interface ActivityCategoryMeta {
  id: ActivityCategory;
  label: string;
  icon: string;
  /** Deck category the results are logged under (drives the dot color). */
  logAs: EventCategory;
}

export const ACTIVITY_CATEGORIES: readonly ActivityCategoryMeta[] = [
  { id: 'music', label: 'Music', icon: 'musical-notes-outline', logAs: 'career' },
  { id: 'mind-body', label: 'Mind & Body', icon: 'fitness-outline', logAs: 'personal' },
  { id: 'nightlife', label: 'Nightlife', icon: 'moon-outline', logAs: 'social' },
  { id: 'love', label: 'Love', icon: 'heart-outline', logAs: 'personal' },
  { id: 'money', label: 'Money', icon: 'cash-outline', logAs: 'opportunity' },
  { id: 'risky', label: 'Risky', icon: 'flame-outline', logAs: 'drama' },
];

export const LIFE_ACTIVITIES: LifeActivity[] = [
  // ─── Music ─────────────────────────────────────────────────────────────────
  {
    id: 'open-mic',
    category: 'music',
    label: 'Open mic',
    blurb: 'Five minutes, one mic, a room that owes you nothing.',
    icon: 'mic-outline',
    energyCost: 15,
    skill: 'charisma',
    outcomes: [
      {
        id: 'killed-it',
        weight: 3,
        luck: 'good',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 2 },
            { stat: 'talent', delta: 1 },
          ],
          fansDelta: 250,
          flavorText:
            'You played the open mic and the room went quiet in the good way. Three people asked where to find your music.',
        },
      },
      {
        id: 'solid',
        weight: 4,
        consequences: {
          statChanges: [{ stat: 'discipline', delta: 1 }],
          fansDelta: 80,
          flavorText:
            'A solid open-mic set. A few nods and one new follower who is definitely your cousin.',
        },
      },
      {
        id: 'bombed',
        weight: 2,
        luck: 'bad',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: -4 },
            { stat: 'charisma', delta: 1 },
          ],
          flavorText:
            'Your mic cut out mid-verse at the open mic. Someone laughed. You finished anyway.',
        },
      },
      {
        id: 'filmed',
        weight: 1,
        luck: 'good',
        consequences: {
          statChanges: [{ stat: 'charisma', delta: 3 }],
          fansDelta: 1200,
          socialReaction: 'viral',
          flavorText:
            'Someone filmed your open-mic set. By morning it had been shared ten thousand times.',
        },
        social: {
          sentiment: 'hype',
          from: 'fan',
          text: 'whoever {playerName} is, they just shut down an open mic in front of 30 people and I will not be normal about it',
        },
      },
    ],
  },
  {
    id: 'practice',
    category: 'music',
    label: 'Practice session',
    blurb: 'Scales, drills, the unglamorous part.',
    icon: 'repeat-outline',
    energyCost: 10,
    skill: 'discipline',
    outcomes: [
      {
        id: 'vocals',
        weight: 3,
        consequences: {
          statChanges: [{ stat: 'vocalSkill', delta: 2 }],
          flavorText: 'Two hours of vocal drills. Your range is creeping upward.',
        },
      },
      {
        id: 'pen',
        weight: 3,
        consequences: {
          statChanges: [{ stat: 'writing', delta: 2 }],
          flavorText: 'You filled a notebook with verses. Most are bad. Two are not.',
        },
      },
      {
        id: 'breakthrough',
        weight: 2,
        luck: 'good',
        consequences: {
          statChanges: [
            { stat: 'talent', delta: 2 },
            { stat: 'creativity', delta: 3 },
          ],
          flavorText: 'Something clicked in practice. You found a flow that sounds like nobody else.',
        },
      },
      {
        id: 'frustrated',
        weight: 2,
        luck: 'bad',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: -3 },
            { stat: 'talent', delta: 1 },
          ],
          flavorText: 'Nothing sounded right in practice today. You went home anyway, which counts.',
        },
      },
    ],
  },
  {
    id: 'producer-session',
    category: 'music',
    label: 'Studio time with a producer',
    blurb: 'Rent the room, bring the ideas, hope for chemistry.',
    icon: 'headset-outline',
    energyCost: 20,
    moneyCost: 400,
    skill: 'creativity',
    npc: 'world',
    outcomes: [
      {
        id: 'chemistry',
        weight: 3,
        luck: 'good',
        consequences: {
          statChanges: [
            { stat: 'creativity', delta: 3 },
            { stat: 'talent', delta: 2 },
            { stat: 'industryRespect', delta: 2 },
          ],
          flavorText:
            "The session with {npc} ran until sunrise. You left with three ideas that feel like singles, and {npc}'s number.",
        },
        meets: 'producer',
      },
      {
        id: 'workmanlike',
        weight: 4,
        consequences: {
          statChanges: [{ stat: 'talent', delta: 1 }],
          flavorText: 'A decent session with {npc}. Nothing magic, nothing wasted.',
        },
      },
      {
        id: 'clash',
        weight: 2,
        luck: 'bad',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: -3 },
            { stat: 'authenticity', delta: 1 },
          ],
          flavorText:
            '{npc} spent the session playing you their own songs. You paid for the room anyway.',
        },
      },
    ],
  },
  {
    id: 'busking',
    category: 'music',
    label: 'Busk downtown',
    blurb: 'An open guitar case and a busy corner.',
    icon: 'musical-note-outline',
    energyCost: 15,
    skill: 'vocalSkill',
    outcomes: [
      {
        id: 'good-crowd',
        weight: 3,
        luck: 'good',
        consequences: {
          statChanges: [{ stat: 'charisma', delta: 1 }],
          fansDelta: 60,
          moneyDelta: 180,
          flavorText: 'You drew a crowd downtown. The guitar case filled up faster than you expected.',
        },
      },
      {
        id: 'quiet',
        weight: 4,
        consequences: {
          moneyDelta: 45,
          flavorText: 'Three hours downtown, forty-five dollars and a half-eaten pretzel.',
        },
      },
      {
        id: 'moved-on',
        weight: 2,
        luck: 'bad',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -2 }],
          flavorText: 'A security guard moved you on before you finished your second song.',
        },
      },
      {
        id: 'viral-corner',
        weight: 1,
        luck: 'good',
        consequences: {
          fansDelta: 900,
          moneyDelta: 300,
          socialReaction: 'positive',
          flavorText:
            'A tourist filmed you busking and posted it. The comments are all asking who you are.',
        },
        social: {
          sentiment: 'positive',
          from: 'public',
          text: 'found {playerName} singing on a street corner today and honestly they sound better than half the radio',
        },
      },
    ],
  },
  {
    id: 'songwriting-camp',
    category: 'music',
    label: 'Songwriting camp',
    blurb: 'A week in a house full of writers. Bring your best.',
    icon: 'create-outline',
    energyCost: 25,
    moneyCost: 1_200,
    skill: 'writing',
    cooldownWeeks: 6,
    gates: { minStage: 'amateur' },
    outcomes: [
      {
        id: 'cut',
        weight: 3,
        luck: 'good',
        consequences: {
          statChanges: [
            { stat: 'writing', delta: 5 },
            { stat: 'creativity', delta: 3 },
            { stat: 'industryRespect', delta: 3 },
          ],
          flavorText:
            'At songwriting camp one of your hooks got passed around every room in the house.',
        },
      },
      {
        id: 'learned',
        weight: 4,
        consequences: {
          statChanges: [
            { stat: 'writing', delta: 3 },
            { stat: 'discipline', delta: 2 },
          ],
          flavorText: 'Songwriting camp was humbling and useful in roughly equal parts.',
        },
      },
      {
        id: 'outclassed',
        weight: 2,
        luck: 'bad',
        consequences: {
          statChanges: [
            { stat: 'writing', delta: 2 },
            { stat: 'mentalHealth', delta: -4 },
          ],
          flavorText: 'Everyone at songwriting camp was better than you. You wrote down everything they did.',
        },
      },
    ],
  },

  // ─── Mind & Body ───────────────────────────────────────────────────────────
  {
    id: 'gym',
    category: 'mind-body',
    label: 'Hit the gym',
    blurb: 'Stage stamina is built somewhere.',
    icon: 'barbell-outline',
    energyCost: 10,
    skill: 'discipline',
    outcomes: [
      {
        id: 'good-session',
        weight: 5,
        luck: 'good',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: 4 },
            { stat: 'discipline', delta: 2 },
          ],
          mentalChanges: [{ axis: 'anxiety', delta: -3 }],
          flavorText: 'A good gym session. Your head is clearer than it has been all week.',
        },
      },
      {
        id: 'glow-up',
        weight: 2,
        luck: 'good',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 2 },
            { stat: 'mentalHealth', delta: 3 },
          ],
          flavorText: 'Months of gym sessions are showing. Your stylist noticed first.',
        },
      },
      {
        id: 'pulled-something',
        weight: 1,
        luck: 'bad',
        consequences: {
          statChanges: [
            { stat: 'energy', delta: -10 },
            { stat: 'mentalHealth', delta: -2 },
          ],
          flavorText: 'You pulled something at the gym. Leg day wins again.',
        },
      },
    ],
  },
  {
    id: 'therapy',
    category: 'mind-body',
    label: 'Therapy session',
    blurb: 'An hour where you do not have to perform.',
    icon: 'chatbubbles-outline',
    energyCost: 5,
    moneyCost: 250,
    outcomes: [
      {
        id: 'steady',
        weight: 5,
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: 8 },
            { stat: 'authenticity', delta: 1 },
          ],
          mentalChanges: [
            { axis: 'anxiety', delta: -5 },
            { axis: 'depression', delta: -4 },
          ],
          flavorText: 'Therapy helped. You said something out loud you had never said before.',
        },
      },
      {
        id: 'breakthrough',
        weight: 2,
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: 12 },
            { stat: 'writing', delta: 2 },
          ],
          mentalChanges: [
            { axis: 'burnout', delta: -8 },
            { axis: 'isolation', delta: -6 },
          ],
          flavorText: 'A breakthrough in therapy. You wrote for three hours afterward.',
        },
      },
      {
        id: 'hard',
        weight: 2,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 3 }],
          mentalChanges: [{ axis: 'depression', delta: -3 }],
          flavorText: 'A hard session in therapy. Those are the ones that count.',
        },
      },
    ],
  },
  {
    id: 'doctor',
    category: 'mind-body',
    label: 'See a doctor',
    blurb: 'The checkup you keep moving.',
    icon: 'medkit-outline',
    energyCost: 5,
    moneyCost: 150,
    cooldownWeeks: 8,
    outcomes: [
      {
        id: 'all-clear',
        weight: 6,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 3 }],
          flavorText: 'A clean bill of health. The doctor still told you to sleep more.',
        },
      },
      {
        id: 'caught-early',
        weight: 2,
        consequences: {
          statChanges: [
            { stat: 'energy', delta: 5 },
            { stat: 'discipline', delta: 2 },
          ],
          removeTags: ['health-risk'],
          addTags: ['health-conscious'],
          flavorText: 'The doctor caught something early. A prescription, a stern look, and relief.',
        },
      },
    ],
  },
  {
    id: 'rehab',
    category: 'mind-body',
    label: 'Check into rehab',
    blurb: 'Thirty days. No phone. No afterparties.',
    icon: 'leaf-outline',
    energyCost: 30,
    moneyCost: 5_000,
    cooldownWeeks: 12,
    outcomes: [
      {
        id: 'recovery',
        weight: 4,
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: 15 },
            { stat: 'discipline', delta: 5 },
            { stat: 'authenticity', delta: 3 },
          ],
          mentalChanges: [
            { axis: 'addictionRisk', delta: -30 },
            { axis: 'burnout', delta: -10 },
          ],
          removeTags: ['party-reputation'],
          socialReaction: 'mixed',
          flavorText: 'You checked into rehab for thirty days. You came out quieter and clearer.',
          historyRecord: {
            kind: 'statement',
            summary: 'checked into rehab',
            severity: 45,
            tags: ['rehab', 'health'],
          },
        },
        social: {
          sentiment: 'news',
          from: 'gossip',
          text: '{playerName} has reportedly checked into a treatment facility. Wishing them the best. 🙏',
        },
      },
      {
        id: 'left-early',
        weight: 1,
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: 5 },
            { stat: 'reputation', delta: -3 },
          ],
          mentalChanges: [{ axis: 'addictionRisk', delta: -10 }],
          socialReaction: 'negative',
          flavorText: 'You left rehab after nine days. Everyone noticed.',
        },
        social: {
          sentiment: 'shade',
          from: 'gossip',
          text: 'sources say {playerName} walked out of rehab after a week 👀 not looking good',
        },
      },
    ],
  },

  // ─── Nightlife ─────────────────────────────────────────────────────────────
  {
    id: 'club-night',
    category: 'nightlife',
    label: 'Club night',
    blurb: 'See who is out. Be seen being out.',
    icon: 'sparkles-outline',
    energyCost: 15,
    moneyCost: 100,
    skill: 'charisma',
    npc: 'world',
    gates: { minAge: 21 },
    outcomes: [
      {
        id: 'met-someone',
        weight: 3,
        luck: 'good',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 2 },
            { stat: 'industryRespect', delta: 2 },
          ],
          flavorText: 'You ended up in a booth with {npc}. You swapped numbers before last call.',
        },
        meets: 'friend',
      },
      {
        id: 'good-night',
        weight: 4,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 4 }],
          flavorText: 'A great night out. You danced until your feet stopped counting.',
        },
      },
      {
        id: 'declined',
        weight: 2,
        luck: 'bad',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -3 }],
          moneyDelta: -150,
          flavorText: 'Your card was declined at the bar. Twice. In front of {npc}.',
        },
      },
      {
        id: 'dance-floor',
        weight: 1,
        luck: 'good',
        consequences: {
          fansDelta: 800,
          socialReaction: 'viral',
          flavorText: 'Somebody filmed you owning the dance floor. It is a meme now, in a good way.',
        },
        social: {
          sentiment: 'meme',
          from: 'public',
          text: '{playerName} on the dance floor at 2am is the energy I need for the rest of the year',
          trend: 'DanceFloorCeo',
        },
      },
    ],
  },
  {
    id: 'afterparty',
    category: 'nightlife',
    label: 'Afterparty',
    blurb: 'Where the real conversations happen. Supposedly.',
    icon: 'wine-outline',
    energyCost: 20,
    npc: 'world',
    gates: { minAge: 21, minStage: 'amateur' },
    outcomes: [
      {
        id: 'connection',
        weight: 3,
        consequences: {
          statChanges: [{ stat: 'industryRespect', delta: 4 }],
          flavorText: '{npc} pulled you into a studio at 4 a.m. The demo is actually good.',
        },
        meets: 'friend',
      },
      {
        id: 'crypto-kitchen',
        weight: 3,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -1 }],
          flavorText: 'You spent the afterparty in a kitchen being told about crypto.',
        },
      },
      {
        id: 'messy',
        weight: 2,
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -4 }],
          mentalChanges: [{ axis: 'addictionRisk', delta: 6 }],
          addTags: ['party-reputation'],
          socialReaction: 'negative',
          flavorText: 'The afterparty got messy. So did the photos.',
        },
        social: {
          sentiment: 'shade',
          from: 'gossip',
          text: 'blurry photos of {playerName} leaving an afterparty at 7am... babe it is a Tuesday',
        },
      },
    ],
  },
  {
    id: 'karaoke',
    category: 'nightlife',
    label: 'Karaoke night',
    blurb: 'Low stakes. Unless someone recognizes you.',
    icon: 'people-outline',
    energyCost: 10,
    skill: 'vocalSkill',
    outcomes: [
      {
        id: 'showstopper',
        weight: 3,
        luck: 'good',
        consequences: {
          statChanges: [{ stat: 'charisma', delta: 3 }],
          fansDelta: 150,
          flavorText: 'You stopped the karaoke bar cold. The DJ asked you to do another.',
        },
      },
      {
        id: 'fun',
        weight: 4,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 5 }],
          flavorText: 'Karaoke with friends. Nobody took it seriously and it was perfect.',
        },
      },
      {
        id: 'own-song',
        weight: 1,
        luck: 'good',
        consequences: {
          fansDelta: 500,
          socialReaction: 'positive',
          flavorText: 'Someone at karaoke picked one of YOUR songs, then saw you in the crowd.',
        },
        social: {
          sentiment: 'hype',
          from: 'fan',
          text: 'I was doing {playerName} at karaoke and {playerName} WAS THERE. I am never recovering',
        },
      },
    ],
  },

  // ─── Love ──────────────────────────────────────────────────────────────────
  {
    id: 'date',
    category: 'love',
    label: 'Go on a date',
    blurb: 'Dinner, a walk, whatever happens after.',
    icon: 'rose-outline',
    energyCost: 10,
    moneyCost: 80,
    skill: 'charisma',
    npc: 'world',
    gates: { single: true },
    outcomes: [
      {
        id: 'spark',
        weight: 3,
        luck: 'good',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 6 }],
          mentalChanges: [{ axis: 'isolation', delta: -6 }],
          flavorText:
            'Dinner with {npc} turned into a walk turned into sunrise. You are seeing each other now.',
        },
        meets: 'partner',
      },
      {
        id: 'fine',
        weight: 4,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 2 }],
          flavorText: 'A perfectly nice date with {npc}. You will probably not see each other again.',
        },
      },
      {
        id: 'awkward',
        weight: 2,
        luck: 'bad',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -2 }],
          flavorText: '{npc} talked about their ex for two hours, then asked you to split the bill.',
        },
      },
    ],
  },
  {
    id: 'dating-app',
    category: 'love',
    label: 'Dating app',
    blurb: 'Swipe until your thumb gives up.',
    icon: 'phone-portrait-outline',
    energyCost: 5,
    npc: 'world',
    gates: { single: true },
    outcomes: [
      {
        id: 'match',
        weight: 3,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 3 }],
          flavorText:
            'You matched with {npc} on the dating app. Three dates later, it is official.',
        },
        meets: 'partner',
      },
      {
        id: 'nothing',
        weight: 4,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -1 }],
          flavorText: 'An hour of swiping and one conversation that died at "haha".',
        },
      },
      {
        id: 'selfie-hunter',
        weight: 1,
        consequences: {
          fansDelta: 20,
          flavorText: 'Your dating-app match only wanted a selfie for their group chat.',
        },
      },
      {
        id: 'screenshotted',
        weight: 1,
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -1 }],
          fansDelta: 400,
          socialReaction: 'mixed',
          flavorText: 'Your dating profile got screenshotted and posted. Your bio is being quoted.',
        },
        social: {
          sentiment: 'meme',
          from: 'public',
          text: 'matched with {playerName} on a dating app and their bio is just their streaming numbers 💀',
        },
      },
    ],
  },
  {
    id: 'celebrity-date',
    category: 'love',
    label: 'Date someone famous',
    blurb: 'Dinner somewhere with photographers outside.',
    icon: 'star-outline',
    energyCost: 15,
    moneyCost: 500,
    skill: 'charisma',
    npc: 'celebrity',
    gates: { minStage: 'emerging', single: true },
    cooldownWeeks: 4,
    outcomes: [
      {
        id: 'paparazzi',
        weight: 3,
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 1 }],
          fansDelta: 3_000,
          socialReaction: 'viral',
          flavorText: 'You and {npc} got photographed at dinner. The internet has already named you. So, apparently, it is official.',
        },
        meets: 'partner',
        social: {
          sentiment: 'news',
          from: 'gossip',
          text: '👀 {playerName} and {npc} spotted leaving dinner together last night. Are we seeing this??',
          trend: 'NewCoupleAlert',
        },
      },
      {
        id: 'chemistry',
        weight: 3,
        luck: 'good',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 6 }],
          mentalChanges: [{ axis: 'isolation', delta: -5 }],
          flavorText: 'Dinner with {npc}. They are funnier in person, nobody took a photo, and you are seeing each other now.',
        },
        meets: 'partner',
      },
      {
        id: 'pr-stunt',
        weight: 2,
        luck: 'bad',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: -4 }],
          fansDelta: 1_000,
          flavorText: 'Halfway through dinner it became obvious {npc}\'s team set this up for the cameras.',
        },
      },
    ],
  },

  // ─── Money ─────────────────────────────────────────────────────────────────
  {
    id: 'invest',
    category: 'money',
    label: 'Invest $1,000',
    blurb: 'An index fund, a hot tip, or somewhere in between.',
    icon: 'trending-up-outline',
    energyCost: 5,
    moneyCost: 1_000,
    cooldownWeeks: 4,
    outcomes: [
      {
        id: 'up',
        weight: 4,
        consequences: {
          moneyDelta: 1_400,
          flavorText: 'Your investment is up forty percent. You feel like a finance podcast.',
        },
      },
      {
        id: 'flat',
        weight: 3,
        consequences: {
          moneyDelta: 1_000,
          flavorText: 'Your investment went nowhere. At least it did not go down.',
        },
      },
      {
        id: 'down',
        weight: 3,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -2 }],
          moneyDelta: 450,
          flavorText: 'Your investment lost half its value. You stopped checking the app.',
        },
      },
      {
        id: 'moon',
        weight: 1,
        consequences: {
          moneyDelta: 3_000,
          flavorText: 'Your investment tripled. Someone at a party will hear about this.',
        },
      },
    ],
  },
  {
    id: 'lend-friend',
    category: 'money',
    label: 'Lend a friend $500',
    blurb: 'They swear it is just until Friday.',
    icon: 'hand-left-outline',
    energyCost: 5,
    moneyCost: 500,
    cooldownWeeks: 6,
    outcomes: [
      {
        id: 'paid-back',
        weight: 4,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 2 }],
          moneyDelta: 550,
          flavorText: 'Your friend paid you back, plus fifty and a hug.',
        },
      },
      {
        id: 'ghosted',
        weight: 4,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -3 }],
          flavorText: 'The friend you lent money to now only replies to your texts with memes.',
        },
      },
      {
        id: 'food-truck',
        weight: 1,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 4 }],
          moneyDelta: 1_500,
          flavorText: 'Your friend\'s food truck took off. They insisted on paying you back triple.',
        },
      },
    ],
  },
  {
    id: 'merch-drop',
    category: 'money',
    label: 'Drop merch',
    blurb: 'Hoodies, a logo, and a countdown post.',
    icon: 'shirt-outline',
    energyCost: 15,
    moneyCost: 800,
    skill: 'charisma',
    cooldownWeeks: 8,
    gates: { minFans: 1_000 },
    outcomes: [
      {
        id: 'sold-out',
        weight: 3,
        luck: 'good',
        consequences: {
          statChanges: [{ stat: 'fanLoyalty', delta: 3 }],
          fansDelta: 500,
          moneyDelta: 2_400,
          socialReaction: 'positive',
          flavorText: 'Your merch sold out in an afternoon. Fans are posting fit pics.',
        },
        social: {
          sentiment: 'hype',
          from: 'stan',
          text: 'GOT MY {playerName} HOODIE BEFORE IT SOLD OUT. the tag says "day one" and I AM day one',
        },
      },
      {
        id: 'steady',
        weight: 4,
        consequences: {
          moneyDelta: 1_200,
          flavorText: 'Your merch sold steadily. You kept a box of hoodies for yourself.',
        },
      },
      {
        id: 'flop',
        weight: 2,
        luck: 'bad',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -3 }],
          moneyDelta: 300,
          flavorText: 'There are two hundred unsold hoodies in your closet. You are the hoodie person now.',
        },
      },
    ],
  },

  // ─── Risky ─────────────────────────────────────────────────────────────────
  {
    id: 'start-fight',
    category: 'risky',
    label: 'Start a fight',
    blurb: 'Someone said something. You heard it.',
    icon: 'hand-right-outline',
    energyCost: 15,
    outcomes: [
      {
        id: 'won',
        weight: 3,
        consequences: {
          statChanges: [
            { stat: 'reputation', delta: -3 },
            { stat: 'authenticity', delta: 2 },
          ],
          fansDelta: 1_500,
          socialReaction: 'viral',
          flavorText: 'You won the fight. Somebody filmed it. Your name is trending for the wrong reason.',
          historyRecord: {
            kind: 'scandal',
            summary: 'got into a filmed fight outside a club',
            severity: 40,
            tags: ['fight', 'violence'],
          },
        },
        social: {
          sentiment: 'shade',
          from: 'gossip',
          text: '{playerName} throwing hands outside a club last night?? 😭 the video is wild',
          trend: 'ThrowingHands',
        },
      },
      {
        id: 'lost',
        weight: 3,
        consequences: {
          statChanges: [
            { stat: 'energy', delta: -10 },
            { stat: 'mentalHealth', delta: -5 },
            { stat: 'reputation', delta: -4 },
          ],
          socialReaction: 'negative',
          flavorText: 'You lost the fight, badly, on camera.',
        },
        social: {
          sentiment: 'meme',
          from: 'public',
          text: 'not {playerName} starting a fight and getting folded in four seconds 💀',
        },
      },
      {
        id: 'arrested',
        weight: 1,
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -8 }],
          moneyDelta: -1_500,
          addTags: ['arrest-record'],
          socialReaction: 'cancel',
          flavorText: 'The fight ended in handcuffs. Your lawyer is not returning your calls quickly enough.',
          historyRecord: {
            kind: 'scandal',
            summary: 'was arrested after a fight',
            severity: 65,
            tags: ['arrest', 'violence'],
          },
        },
        social: {
          sentiment: 'news',
          from: 'news',
          text: 'BREAKING: {playerName} arrested after an altercation outside a nightclub. More to follow.',
          trend: 'Free{playerName}',
        },
      },
    ],
  },
  {
    id: 'public-diss',
    category: 'risky',
    label: 'Diss your rival',
    blurb: 'Sixteen bars, one target, no take-backs.',
    icon: 'flash-outline',
    energyCost: 10,
    skill: 'writing',
    npc: 'rival',
    cooldownWeeks: 3,
    gates: { requiresRival: true },
    outcomes: [
      {
        id: 'bodied',
        weight: 3,
        luck: 'good',
        consequences: {
          statChanges: [
            { stat: 'writing', delta: 2 },
            { stat: 'industryRespect', delta: -1 },
          ],
          fansDelta: 3_000,
          rivalryIntensityDelta: { delta: 15 },
          socialReaction: 'viral',
          flavorText: 'Your diss on {npc} landed. The whole internet picked a side, and most picked yours.',
          historyRecord: {
            kind: 'feud',
            summary: 'dropped a diss track aimed at {npc}',
            severity: 50,
            tags: ['diss', 'beef'],
          },
        },
        social: {
          sentiment: 'news',
          from: 'gossip',
          text: '{playerName} just dropped a diss aimed directly at {npc}. the third verse is personal 😳',
          trend: 'DissSeason',
        },
      },
      {
        id: 'flopped',
        weight: 2,
        luck: 'bad',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -5 }],
          fansDelta: -500,
          rivalryIntensityDelta: { delta: 10 },
          socialReaction: 'negative',
          flavorText: 'Your diss on {npc} fell flat. Their response is somehow funnier.',
        },
        social: {
          sentiment: 'shade',
          from: 'rival-fan',
          text: '{playerName} really thought they did something with that diss 😂 {npc} did not even need to respond',
        },
      },
    ],
  },
  {
    id: 'crash-party',
    category: 'risky',
    label: 'Sneak into an industry party',
    blurb: 'No invite. Plenty of confidence.',
    icon: 'key-outline',
    energyCost: 15,
    skill: 'charisma',
    npc: 'world',
    gates: { minAge: 21 },
    outcomes: [
      {
        id: 'inside',
        weight: 3,
        luck: 'good',
        consequences: {
          statChanges: [
            { stat: 'industryRespect', delta: 4 },
            { stat: 'charisma', delta: 2 },
          ],
          flavorText: 'You talked your way into the party. {npc} assumed you were somebody\'s plus-one.',
        },
      },
      {
        id: 'bounced',
        weight: 3,
        luck: 'bad',
        consequences: {
          statChanges: [
            { stat: 'reputation', delta: -3 },
            { stat: 'mentalHealth', delta: -2 },
          ],
          socialReaction: 'negative',
          flavorText: 'Security walked you out of the party. {npc} watched it happen.',
        },
        social: {
          sentiment: 'meme',
          from: 'public',
          text: 'security walking {playerName} out of the label party is my new lock screen',
        },
      },
      {
        id: 'met-exec',
        weight: 1,
        luck: 'good',
        consequences: {
          statChanges: [{ stat: 'industryRespect', delta: 6 }],
          spawnContractOfferTier: 'indie',
          flavorText: 'At the party you ended up pitching a label exec by the coat check. They want a meeting.',
        },
      },
    ],
  },
  {
    id: 'casino',
    category: 'risky',
    label: 'Casino night',
    blurb: 'Five hundred dollars and a feeling.',
    icon: 'dice-outline',
    energyCost: 10,
    moneyCost: 500,
    cooldownWeeks: 2,
    gates: { minAge: 21 },
    outcomes: [
      {
        id: 'won',
        weight: 3,
        consequences: {
          moneyDelta: 1_200,
          mentalChanges: [{ axis: 'addictionRisk', delta: 3 }],
          flavorText: 'You walked out of the casino up seven hundred. You walked out, which is the win.',
        },
      },
      {
        id: 'broke-even',
        weight: 3,
        consequences: {
          moneyDelta: 500,
          flavorText: 'You broke even at the casino. The free drinks were the real profit.',
        },
      },
      {
        id: 'lost',
        weight: 4,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -3 }],
          mentalChanges: [{ axis: 'addictionRisk', delta: 5 }],
          flavorText: 'You lost it all at the casino, then went to the ATM. Then lost that too.',
          moneyDelta: -300,
        },
      },
    ],
  },
];

export function getLifeActivity(id: string): LifeActivity | undefined {
  return LIFE_ACTIVITIES.find((a) => a.id === id);
}
