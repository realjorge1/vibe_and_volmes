import type { PersonInteraction } from '../../types/people';

/**
 * What the artist can do with the people in their life, as data. Each
 * interaction resolves to one weighted outcome (tilted by affinity), changes
 * that person's affinity, goes through the event consequence pipeline, and
 * writes its line into the Deck. Big moments carry a `social` beat.
 *
 * Text tokens: {name}, {title} ("your mom"), {Title} ("Your mom"),
 * {playerName}. One interaction per person per week.
 */
export const INTERACTIONS: PersonInteraction[] = [
  {
    id: 'spend-time',
    label: 'Spend time',
    icon: 'cafe-outline',
    roles: ['parent', 'sibling', 'partner', 'child', 'friend', 'manager', 'producer'],
    energyCost: 5,
    outcomes: [
      {
        id: 'great',
        weight: 4,
        luck: 'good',
        affinity: 10,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 4 }],
          mentalChanges: [{ axis: 'isolation', delta: -5 }],
          flavorText: 'You spent the afternoon with {name}. You laughed more than you have in weeks.',
        },
      },
      {
        id: 'quiet',
        weight: 4,
        affinity: 6,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 2 }],
          mentalChanges: [{ axis: 'isolation', delta: -3 }],
          flavorText: 'A quiet day with {name}. Exactly what you needed.',
        },
      },
      {
        id: 'distracted',
        weight: 2,
        luck: 'bad',
        affinity: 1,
        consequences: {
          flavorText: 'You spent time with {name} but stayed on your phone the whole time. {Title} noticed.',
        },
      },
    ],
  },
  {
    id: 'ask-money',
    label: 'Ask for money',
    icon: 'cash-outline',
    roles: ['parent', 'sibling', 'partner'],
    energyCost: 5,
    requires: { minAffinity: 0 },
    outcomes: [
      {
        id: 'yes',
        weight: 3,
        luck: 'good',
        affinity: -3,
        consequences: {
          moneyDelta: 600,
          flavorText: '{name} sent you $600 with a text that just said "for the music".',
        },
      },
      {
        id: 'some',
        weight: 3,
        affinity: -5,
        consequences: {
          moneyDelta: 200,
          flavorText: '{name} could spare $200, and a speech about budgeting.',
        },
      },
      {
        id: 'no',
        weight: 3,
        luck: 'bad',
        affinity: -8,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -2 }],
          flavorText: '{name} said no. Then asked when you are getting a real job.',
        },
      },
    ],
  },
  {
    id: 'argue',
    label: 'Argue',
    icon: 'thunderstorm-outline',
    logAs: 'drama',
    roles: ['parent', 'sibling', 'partner', 'friend', 'manager', 'producer'],
    energyCost: 5,
    outcomes: [
      {
        id: 'blow-up',
        weight: 4,
        luck: 'bad',
        affinity: -15,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -4 }],
          flavorText: 'You and {name} had it out. Doors were slammed. Things were said.',
        },
      },
      {
        id: 'cleared-air',
        weight: 2,
        luck: 'good',
        affinity: 4,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 3 }],
          flavorText: 'You argued with {name}, and somehow it cleared the air.',
        },
      },
      {
        id: 'cold-war',
        weight: 3,
        affinity: -8,
        consequences: {
          flavorText: 'The argument with {name} ended in silence. Neither of you has texted since.',
        },
      },
    ],
  },
  {
    id: 'apologize',
    label: 'Apologize',
    icon: 'hand-left-outline',
    roles: ['parent', 'sibling', 'partner', 'ex', 'child', 'friend', 'manager', 'producer'],
    energyCost: 5,
    requires: { maxAffinity: 30 },
    outcomes: [
      {
        id: 'accepted',
        weight: 4,
        luck: 'good',
        affinity: 15,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 4 }],
          flavorText: 'You apologized to {name}. They hugged you before you finished.',
        },
      },
      {
        id: 'grudging',
        weight: 3,
        affinity: 6,
        consequences: {
          flavorText: '{name} accepted your apology. Mostly. It is a start.',
        },
      },
      {
        id: 'rejected',
        weight: 2,
        luck: 'bad',
        affinity: -2,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -3 }],
          flavorText: '{name} said "sorry" is not enough this time.',
        },
      },
    ],
  },
  {
    id: 'collab',
    label: 'Make a song together',
    icon: 'musical-notes-outline',
    logAs: 'career',
    roles: ['partner', 'ex', 'friend', 'producer'],
    energyCost: 15,
    requires: { npcLinked: true, minAffinity: 10 },
    outcomes: [
      {
        id: 'banger',
        weight: 3,
        luck: 'good',
        affinity: 8,
        consequences: {
          statChanges: [
            { stat: 'creativity', delta: 3 },
            { stat: 'industryRespect', delta: 3 },
          ],
          fansDelta: 4_000,
          socialReaction: 'positive',
          flavorText: 'You and {name} made something special. The snippet is everywhere.',
        },
        social: {
          sentiment: 'hype',
          from: 'stan',
          text: '{playerName} x {name} is the collab I did not know I needed. RUN IT BACK',
        },
      },
      {
        id: 'decent',
        weight: 4,
        affinity: 4,
        consequences: {
          statChanges: [{ stat: 'creativity', delta: 2 }],
          fansDelta: 800,
          flavorText: 'You and {name} cut a solid track. It will find its people.',
        },
      },
      {
        id: 'creative-differences',
        weight: 2,
        luck: 'bad',
        affinity: -10,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -3 }],
          flavorText: 'The session with {name} ended in "creative differences". The track is shelved.',
        },
      },
    ],
  },
  {
    id: 'hard-launch',
    label: 'Post them publicly',
    icon: 'camera-outline',
    logAs: 'social',
    roles: ['partner'],
    energyCost: 5,
    requires: { minAffinity: 20 },
    outcomes: [
      {
        id: 'adored',
        weight: 4,
        luck: 'good',
        affinity: 12,
        consequences: {
          statChanges: [{ stat: 'fanLoyalty', delta: 2 }],
          fansDelta: 1_500,
          socialReaction: 'positive',
          addTags: ['public-relationship'],
          flavorText: 'You hard-launched {name}. The comments are all heart-eyes.',
        },
        social: {
          sentiment: 'hype',
          from: 'fan',
          text: '{playerName} HARD LAUNCHED {name}?? we are so happy for them',
          trend: 'HardLaunch',
        },
      },
      {
        id: 'jealous-stans',
        weight: 2,
        luck: 'bad',
        affinity: 5,
        consequences: {
          statChanges: [{ stat: 'fanLoyalty', delta: -2 }],
          fansDelta: 300,
          socialReaction: 'mixed',
          addTags: ['public-relationship'],
          flavorText: 'You posted {name}. A corner of your fanbase did not take it well.',
        },
        social: {
          sentiment: 'hostile',
          from: 'stan',
          text: 'not {playerName} posting {name} like we were not right here',
        },
      },
    ],
  },
  {
    id: 'propose',
    label: 'Propose',
    icon: 'diamond-outline',
    roles: ['partner'],
    energyCost: 10,
    moneyCost: 2_000,
    minAge: 18,
    requires: { bond: ['dating'], minAffinity: 30 },
    outcomes: [
      {
        id: 'yes',
        weight: 5,
        luck: 'good',
        affinity: 20,
        effect: 'engage',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 10 }],
          fansDelta: 2_000,
          socialReaction: 'positive',
          flavorText: 'You proposed to {name}. They said yes before you got the ring out.',
          historyRecord: {
            kind: 'triumph',
            summary: 'got engaged to {name}',
            severity: 35,
            tags: ['engagement', 'love'],
          },
        },
        social: {
          sentiment: 'news',
          from: 'gossip',
          text: '💍 {playerName} and {name} are ENGAGED. The ring is enormous.',
          trend: 'Engaged',
        },
      },
      {
        id: 'not-yet',
        weight: 2,
        luck: 'bad',
        affinity: -10,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -8 }],
          flavorText: 'You proposed to {name}. They said they are "not ready yet". The ring went back in your pocket.',
        },
      },
    ],
  },
  {
    id: 'wedding',
    label: 'Plan the wedding',
    icon: 'sparkles-outline',
    roles: ['partner'],
    energyCost: 20,
    moneyCost: 8_000,
    requires: { bond: ['engaged'] },
    outcomes: [
      {
        id: 'married',
        weight: 1,
        affinity: 20,
        effect: 'marry',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 12 }],
          fansDelta: 3_000,
          socialReaction: 'positive',
          flavorText: 'You married {name} in front of everyone you love. You sang the first dance yourself.',
          historyRecord: {
            kind: 'triumph',
            summary: 'married {name}',
            severity: 45,
            tags: ['wedding', 'love'],
          },
        },
        social: {
          sentiment: 'hype',
          from: 'fan',
          text: 'the photos from {playerName} and {name}\'s wedding are unreal. I am crying at work',
          trend: 'WeddingOfTheYear',
        },
      },
    ],
  },
  {
    id: 'elope',
    label: 'Elope',
    icon: 'airplane-outline',
    roles: ['partner'],
    energyCost: 10,
    moneyCost: 300,
    requires: { bond: ['engaged'] },
    outcomes: [
      {
        id: 'eloped',
        weight: 1,
        affinity: 15,
        effect: 'marry',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 8 }],
          fansDelta: 1_000,
          socialReaction: 'mixed',
          flavorText: 'You and {name} eloped at a courthouse on a Tuesday. You told everyone afterward.',
          historyRecord: {
            kind: 'triumph',
            summary: 'eloped with {name}',
            severity: 35,
            tags: ['wedding', 'love'],
          },
        },
        social: {
          sentiment: 'news',
          from: 'gossip',
          text: 'WAIT. {playerName} and {name} secretly got MARRIED?? courthouse photos just surfaced',
        },
      },
    ],
  },
  {
    id: 'try-for-baby',
    label: 'Try for a baby',
    icon: 'heart-circle-outline',
    roles: ['partner'],
    energyCost: 10,
    minAge: 18,
    requires: { minAffinity: 40 },
    outcomes: [
      {
        id: 'expecting',
        weight: 3,
        luck: 'good',
        affinity: 10,
        effect: 'conceive',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 6 }],
          flavorText: 'You and {name} are expecting. You have already started writing a lullaby.',
        },
      },
      {
        id: 'not-yet',
        weight: 4,
        affinity: 3,
        consequences: {
          flavorText: 'You and {name} are trying for a baby. Not yet.',
        },
      },
    ],
  },
  {
    id: 'break-up',
    label: 'Break up',
    icon: 'heart-dislike-outline',
    roles: ['partner'],
    energyCost: 10,
    requires: { bond: ['dating', 'engaged'] },
    outcomes: [
      {
        id: 'clean',
        weight: 2,
        affinity: -20,
        effect: 'break-up',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -6 }],
          flavorText: 'You and {name} broke up. It was mutual, which somehow makes it worse.',
        },
      },
      {
        id: 'messy',
        weight: 2,
        affinity: -50,
        effect: 'break-up',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -10 }],
          socialReaction: 'negative',
          flavorText: 'You broke up with {name}. They posted a very long caption about it.',
          historyRecord: {
            kind: 'breakup',
            summary: 'went through a messy public breakup with {name}',
            severity: 45,
            tags: ['breakup', 'love'],
          },
        },
        social: {
          sentiment: 'shade',
          from: 'gossip',
          text: '{name} just unfollowed {playerName} and posted a sad song. it is OVER over 💔',
          trend: 'BreakupSzn',
        },
      },
    ],
  },
  {
    id: 'divorce',
    label: 'File for divorce',
    icon: 'document-text-outline',
    roles: ['partner'],
    energyCost: 15,
    moneyCost: 5_000,
    requires: { bond: ['married'] },
    outcomes: [
      {
        id: 'amicable',
        weight: 2,
        affinity: -25,
        effect: 'break-up',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -8 }],
          flavorText: 'You and {name} divorced quietly. The lawyers were the only winners.',
        },
      },
      {
        id: 'ugly',
        weight: 2,
        affinity: -60,
        effect: 'break-up',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: -14 },
            { stat: 'reputation', delta: -4 },
          ],
          moneyDelta: -5_000,
          socialReaction: 'negative',
          flavorText: 'The divorce from {name} got ugly, public, and expensive.',
          historyRecord: {
            kind: 'breakup',
            summary: 'went through an ugly public divorce from {name}',
            severity: 60,
            tags: ['divorce', 'love'],
          },
        },
        social: {
          sentiment: 'news',
          from: 'news',
          text: 'Court documents reveal new details in the {playerName} and {name} divorce.',
          trend: 'Divorce',
        },
      },
    ],
  },
  {
    id: 'diss',
    label: 'Diss them in a song',
    icon: 'flash-outline',
    logAs: 'drama',
    roles: ['ex', 'friend', 'sibling', 'manager', 'producer'],
    energyCost: 10,
    outcomes: [
      {
        id: 'landed',
        weight: 3,
        affinity: -45,
        consequences: {
          statChanges: [{ stat: 'writing', delta: 2 }],
          fansDelta: 2_500,
          socialReaction: 'viral',
          flavorText: 'You put {name} in a song. Everyone knows exactly who it is about.',
          historyRecord: {
            kind: 'feud',
            summary: 'wrote a diss song about {name}',
            severity: 45,
            tags: ['diss', 'personal'],
          },
        },
        social: {
          sentiment: 'shade',
          from: 'gossip',
          text: 'the third verse of the new {playerName} song is 100% about {name} and I have receipts',
          trend: 'WhoIsItAbout',
        },
      },
      {
        id: 'backfired',
        weight: 2,
        affinity: -30,
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -4 }],
          socialReaction: 'negative',
          flavorText: 'You dissed {name} in a song. The internet sided with them.',
        },
        social: {
          sentiment: 'hostile',
          from: 'public',
          text: '{playerName} dissing {name} after everything they did for them is actually so weird',
        },
      },
    ],
  },
  {
    id: 'teach-music',
    label: 'Teach them music',
    icon: 'school-outline',
    roles: ['child'],
    energyCost: 5,
    requires: { minChildAge: 4 },
    outcomes: [
      {
        id: 'natural',
        weight: 3,
        affinity: 10,
        addTrait: 'musical',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 5 }],
          flavorText: '{name} picked up the chords faster than you did at that age.',
        },
      },
      {
        id: 'fun',
        weight: 4,
        affinity: 8,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 4 }],
          flavorText: 'You taught {name} a song. They sang it all week, loudly, at 6 a.m.',
        },
      },
      {
        id: 'bored',
        weight: 2,
        affinity: 2,
        consequences: {
          flavorText: '{name} would rather play outside. Fair enough.',
        },
      },
    ],
  },
  {
    id: 'cut-off',
    label: 'Cut them off',
    icon: 'cut-outline',
    logAs: 'drama',
    roles: ['parent', 'sibling', 'friend', 'manager', 'producer', 'ex'],
    energyCost: 5,
    requires: { maxAffinity: 10 },
    outcomes: [
      {
        id: 'done',
        weight: 1,
        affinity: -100,
        effect: 'cut-off',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 2 }],
          flavorText: 'You cut {name} out of your life. The quiet is strange, and a little lighter.',
        },
      },
    ],
  },
];

export function getInteraction(id: string): PersonInteraction | undefined {
  return INTERACTIONS.find((i) => i.id === id);
}
