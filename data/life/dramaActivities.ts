import type { LifeActivity } from '../../types/life';

/**
 * Activities for the drama layer: moves in the rival war ("Beef") and ways
 * to give back ("Give back"). Outcomes carry moments, so the internet reacts
 * the moment the artist does something, and `warSwing` moves public opinion
 * in the hottest rivalry. `{npc}` is the rival in Deck lines; moment text
 * uses `{rival}` (filled by the drama layer).
 */
export const DRAMA_ACTIVITIES: LifeActivity[] = [
  // ─── Beef ──────────────────────────────────────────────────────────────────
  {
    id: 'beef-diss-track',
    category: 'beef',
    label: 'Drop a diss track',
    blurb: 'A full song. Their name in the hook.',
    icon: 'musical-note-outline',
    energyCost: 30,
    skill: 'writing',
    npc: 'rival',
    cooldownWeeks: 3,
    gates: { requiresRival: true, minFans: 2_000 },
    outcomes: [
      {
        id: 'bodied',
        weight: 3,
        luck: 'good',
        consequences: {
          statChanges: [{ stat: 'writing', delta: 3 }, { stat: 'fanLoyalty', delta: 3 }],
          fansDelta: 5_000,
          rivalryIntensityDelta: { delta: 20 },
          warSwing: 18,
          socialReaction: 'viral',
          moment: { kind: 'beef', headline: '{playerName} Just Bodied {rival} on a Full Diss Track', topic: "{playerName}'s diss track", heat: 75, valence: 35, hashtag: '{playerName}Diss', tags: ['diss'] },
          flavorText: 'Your diss track on {npc} is the only thing anyone is talking about. The third verse is being quoted like scripture.',
        },
      },
      {
        id: 'solid',
        weight: 3,
        consequences: {
          statChanges: [{ stat: 'writing', delta: 2 }],
          fansDelta: 1_500,
          rivalryIntensityDelta: { delta: 15 },
          warSwing: 7,
          moment: { kind: 'beef', headline: '{playerName} Drops Diss Track Aimed at {rival}', topic: "{playerName}'s diss track", heat: 55, valence: 15, tags: ['diss'] },
          flavorText: 'Your diss on {npc} was solid. Not a knockout, but the bars are getting screenshotted.',
        },
      },
      {
        id: 'mid',
        weight: 2,
        luck: 'bad',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -3 }],
          rivalryIntensityDelta: { delta: 12 },
          warSwing: -8,
          moment: { kind: 'meme', headline: "Fans Say {playerName}'s Diss on {rival} Was 'Mid'", topic: 'the mid diss track', heat: 50, valence: -25, hashtag: 'MidDiss', tags: ['diss'] },
          flavorText: 'Your diss on {npc} landed soft. The rhymes are a meme now, and not the good kind.',
        },
      },
      {
        id: 'backfired',
        weight: 1,
        luck: 'bad',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -5 }],
          mentalChanges: [{ axis: 'anxiety', delta: 8 }],
          rivalryIntensityDelta: { delta: 18 },
          warSwing: -14,
          moment: { kind: 'beef', headline: '{rival} Responds to {playerName} Within Hours — and It\'s Brutal', topic: "{rival}'s response", heat: 70, valence: -40, hashtag: '{rival}Responds', tags: ['diss'] },
          flavorText: '{npc} answered your diss in four hours. Their response is better. Everyone knows it.',
        },
      },
    ],
  },
  {
    id: 'beef-subtweet',
    category: 'beef',
    label: 'Subtweet your rival',
    blurb: "Don't say the name. Everyone will know.",
    icon: 'chatbubble-ellipses-outline',
    energyCost: 5,
    skill: 'charisma',
    npc: 'rival',
    cooldownWeeks: 1,
    gates: { requiresRival: true },
    outcomes: [
      {
        id: 'landed',
        weight: 3,
        luck: 'good',
        consequences: {
          rivalryIntensityDelta: { delta: 6 },
          warSwing: 4,
          moment: { kind: 'beef', headline: '{playerName} Subtweets {rival}? Fans Think So', topic: "{playerName}'s subtweet", heat: 32, valence: 10, tags: [] },
          flavorText: 'You posted one line. Everyone knew it was about {npc}. Their fans are already in the replies.',
        },
      },
      {
        id: 'ratio',
        weight: 2,
        luck: 'bad',
        consequences: {
          warSwing: -5,
          moment: { kind: 'meme', headline: "{playerName}'s Subtweet Gets Ratioed by {rival}'s Fans", topic: 'the ratioed subtweet', heat: 35, valence: -20, tags: [] },
          flavorText: "Your subtweet got ratioed. The top reply is a picture of {npc}'s plaque.",
        },
      },
      {
        id: 'ignored',
        weight: 2,
        consequences: {
          flavorText: 'You subtweeted {npc}. Nobody noticed. You deleted it after an hour.',
        },
      },
    ],
  },
  {
    id: 'beef-go-live',
    category: 'beef',
    label: 'Go live about the beef',
    blurb: 'Camera on. No script. Say your piece.',
    icon: 'videocam-outline',
    energyCost: 15,
    skill: 'charisma',
    npc: 'rival',
    cooldownWeeks: 2,
    gates: { requiresRival: true, minFans: 5_000 },
    outcomes: [
      {
        id: 'iconic',
        weight: 3,
        luck: 'good',
        consequences: {
          statChanges: [{ stat: 'charisma', delta: 3 }],
          fansDelta: 2_500,
          warSwing: 10,
          moment: { kind: 'beef', headline: "{playerName}'s Live About {rival} Is Being Called Iconic", topic: "{playerName}'s live stream", heat: 58, valence: 35, hashtag: 'ThatLive', tags: [] },
          flavorText: 'You went live for forty minutes. Calm, funny, specific. Clips of it are winning you the war.',
        },
      },
      {
        id: 'rambling',
        weight: 2,
        luck: 'bad',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -3 }],
          warSwing: -6,
          moment: { kind: 'ugly', headline: '{playerName} Rants for an Hour About {rival} on Live', topic: 'the rambling live', heat: 48, valence: -30, tags: [] },
          flavorText: 'You went live and rambled. The best clip is you saying "and another thing" for the ninth time.',
        },
      },
      {
        id: 'emotional',
        weight: 1,
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 3 }],
          warSwing: 4,
          mentalChanges: [{ axis: 'anxiety', delta: -4 }],
          moment: { kind: 'beef', headline: '{playerName} Gets Emotional Talking About {rival} Feud', topic: 'the emotional live', heat: 44, valence: 20, tags: [] },
          flavorText: 'You got emotional on live talking about {npc}. People felt it. Even some of their fans did.',
        },
      },
    ],
  },
  {
    id: 'beef-receipts',
    category: 'beef',
    label: 'Leak their receipts',
    blurb: 'Old texts. Old contracts. Dangerous.',
    icon: 'document-text-outline',
    energyCost: 15,
    npc: 'rival',
    cooldownWeeks: 5,
    gates: { requiresRival: true, minFans: 10_000 },
    outcomes: [
      {
        id: 'devastating',
        weight: 2,
        consequences: {
          rivalryIntensityDelta: { delta: 25 },
          warSwing: 16,
          statChanges: [{ stat: 'industryRespect', delta: -3 }],
          moment: { kind: 'beef', headline: '{playerName} Leaks {rival} Receipts and the Internet Is Melting Down', topic: "{rival}'s leaked receipts", heat: 78, valence: 10, hashtag: '{rival}Receipts', tags: ['leak'] },
          flavorText: 'You posted the receipts. {npc} has not posted in two days. Labels are calling you for the wrong reasons.',
        },
      },
      {
        id: 'fake',
        weight: 1,
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -8 }],
          spawnControversyId: 'ctrl-fake-rumor',
          rivalryIntensityDelta: { delta: 20 },
          warSwing: -18,
          moment: { kind: 'scandal', headline: "{playerName}'s 'Receipts' on {rival} Turn Out to Be Fake", topic: 'the fake receipts', heat: 72, valence: -55, hashtag: 'FakeReceipts', tags: ['leak'] },
          flavorText: 'The receipts you leaked on {npc} were edited. Not by you. Doesn\'t matter. You posted them.',
        },
      },
    ],
  },
  {
    id: 'beef-pull-up',
    category: 'beef',
    label: "Pull up to your rival's show",
    blurb: 'Front row. Arms crossed. Cameras everywhere.',
    icon: 'walk-outline',
    energyCost: 25,
    npc: 'rival',
    cooldownWeeks: 6,
    gates: { requiresRival: true, minFans: 20_000 },
    outcomes: [
      {
        id: 'legend',
        weight: 2,
        consequences: {
          statChanges: [{ stat: 'charisma', delta: 4 }],
          fansDelta: 6_000,
          warSwing: 12,
          rivalryIntensityDelta: { delta: 10 },
          moment: { kind: 'beef', headline: "{playerName} Showed Up Front Row at {rival}'s Show and Stole the Night", topic: "pulling up to {rival}'s show", heat: 70, valence: 30, hashtag: 'PullUp', tags: [] },
          flavorText: "You stood front row at {npc}'s show with your arms crossed. Half the crowd filmed you instead of the stage.",
        },
      },
      {
        id: 'kicked-out',
        weight: 2,
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -3 }],
          warSwing: -6,
          moment: { kind: 'ugly', headline: "{playerName} Escorted Out of {rival}'s Show", topic: 'getting escorted out', heat: 55, valence: -30, tags: [] },
          flavorText: "Security walked you out of {npc}'s show in front of everyone. They played your song as you left. As a joke.",
        },
      },
      {
        id: 'fight',
        weight: 1,
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -10 }],
          spawnControversyId: 'ctrl-violent-incident',
          rivalryIntensityDelta: { delta: 25 },
          warSwing: -10,
          moment: { kind: 'scandal', headline: "Brawl Breaks Out After {playerName} Confronts {rival}'s Crew", topic: 'the brawl', heat: 85, valence: -70, hashtag: '{playerName}Brawl', tags: ['violence'] },
          flavorText: "It turned physical outside {npc}'s show. Nobody badly hurt. Everybody on camera.",
        },
      },
    ],
  },
  {
    id: 'beef-squash',
    category: 'beef',
    label: 'Squash the beef',
    blurb: 'Reach out. Mean it.',
    icon: 'hand-left-outline',
    energyCost: 10,
    skill: 'charisma',
    npc: 'rival',
    cooldownWeeks: 4,
    gates: { requiresRival: true },
    outcomes: [
      {
        id: 'truce',
        weight: 3,
        luck: 'good',
        consequences: {
          rivalryIntensityDelta: { delta: -35 },
          statChanges: [{ stat: 'reputation', delta: 3 }, { stat: 'industryRespect', delta: 3 }],
          mentalChanges: [{ axis: 'paranoia', delta: -6 }],
          moment: { kind: 'best', headline: '{playerName} and {rival} Squash the Beef', topic: 'the truce with {rival}', heat: 50, valence: 55, hashtag: 'BeefOver', tags: ['peace'] },
          flavorText: 'You and {npc} talked it out. You posted a photo together. The internet does not know what to do with itself.',
        },
      },
      {
        id: 'collab',
        weight: 1,
        luck: 'good',
        consequences: {
          rivalryIntensityDelta: { delta: -50 },
          fansDelta: 8_000,
          statChanges: [{ stat: 'industryRespect', delta: 5 }],
          moment: { kind: 'best', headline: '{playerName} and {rival} Announce a Song Together', topic: 'the {rival} collab', heat: 68, valence: 65, hashtag: 'TheCollab', tags: ['peace', 'music'] },
          flavorText: 'You called {npc} to make peace and hung up with a song idea. The announcement broke the internet.',
        },
      },
      {
        id: 'rejected',
        weight: 2,
        luck: 'bad',
        consequences: {
          rivalryIntensityDelta: { delta: 8 },
          warSwing: -6,
          moment: { kind: 'beef', headline: '{rival} Publicly Rejects {playerName}\'s Truce: "lol no"', topic: 'the rejected truce', heat: 50, valence: -25, hashtag: 'LolNo', tags: [] },
          flavorText: '{npc} screenshotted your message and captioned it "lol no".',
        },
      },
    ],
  },

  // ─── Give back ─────────────────────────────────────────────────────────────
  {
    id: 'give-donate',
    category: 'charity',
    label: 'Donate to a cause',
    blurb: '$2,000 to something that matters to you.',
    icon: 'heart-outline',
    energyCost: 5,
    moneyCost: 2_000,
    cooldownWeeks: 3,
    outcomes: [
      {
        id: 'quiet',
        weight: 4,
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 2 }, { stat: 'mentalHealth', delta: 3 }],
          flavorText: 'You donated quietly. Nobody posted about it. You felt good anyway.',
        },
      },
      {
        id: 'noticed',
        weight: 2,
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 3 }],
          moment: { kind: 'charity', headline: "{playerName}'s Quiet Donation Spotted by Fans", topic: 'the quiet donation', heat: 34, valence: 65, tags: ['charity'] },
          flavorText: 'The charity thanked you by name. Fans found it. Now it is a whole thing, in a good way.',
        },
      },
      {
        id: 'pr',
        weight: 1,
        consequences: {
          moment: { kind: 'charity', headline: "Fans Debate Whether {playerName}'s Donation Was PR", topic: 'the donation', heat: 30, valence: 5, tags: ['charity'] },
          flavorText: 'Your donation went public the same week as your single. People called it PR. The cause still got the money.',
        },
      },
    ],
  },
  {
    id: 'give-hospital',
    category: 'charity',
    label: "Visit a children's hospital",
    blurb: 'A guitar, an afternoon, no cameras.',
    icon: 'medkit-outline',
    energyCost: 20,
    cooldownWeeks: 6,
    gates: { minFans: 5_000 },
    outcomes: [
      {
        id: 'moving',
        weight: 3,
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 4 }, { stat: 'mentalHealth', delta: 5 }],
          fansDelta: 1_000,
          moment: { kind: 'charity', headline: "{playerName} Spends a Day Singing at a Children's Hospital", topic: 'the hospital visit', heat: 50, valence: 85, hashtag: '{playerName}Heart', tags: ['charity'] },
          flavorText: "You spent the afternoon singing with kids at the hospital. A nurse filmed one song. You didn't know until it went everywhere.",
          plantSeed: {
            kind: 'inspired-kid',
            after: [24, 48],
            who: 'new',
            note: "You sang with a kid named {seed} at the children's hospital. They knew every word.",
          },
        },
      },
      {
        id: 'private',
        weight: 2,
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 6 }, { stat: 'authenticity', delta: 2 }],
          flavorText: 'You visited the hospital and nobody filmed it. One kid made you a drawing. It is on your fridge.',
        },
      },
    ],
  },
  {
    id: 'give-hometown-show',
    category: 'charity',
    label: 'Free show in your hometown',
    blurb: 'Park stage. Free entry. Bring the block.',
    icon: 'home-outline',
    energyCost: 30,
    moneyCost: 1_500,
    cooldownWeeks: 8,
    gates: { minFans: 2_000 },
    outcomes: [
      {
        id: 'legendary',
        weight: 3,
        consequences: {
          statChanges: [{ stat: 'fanLoyalty', delta: 5 }, { stat: 'reputation', delta: 3 }],
          fansDelta: 3_500,
          moment: { kind: 'best', headline: '{playerName} Shuts Down {city} With a Free Hometown Show', topic: 'the free hometown show', heat: 58, valence: 85, hashtag: '{city}Loves{playerName}', tags: ['charity', 'hometown'] },
          flavorText: 'The whole neighborhood came out. Your old teachers. Your first fans. Kids on their parents\' shoulders. Best night of your life.',
        },
      },
      {
        id: 'rained-out',
        weight: 1,
        consequences: {
          statChanges: [{ stat: 'fanLoyalty', delta: 3 }],
          moment: { kind: 'best', headline: '{playerName} Kept Singing Through a Downpour at Free Hometown Show', topic: 'the rain show', heat: 46, valence: 70, tags: ['charity', 'hometown'] },
          flavorText: 'It poured. You kept playing. So did the crowd. Nobody left.',
        },
      },
    ],
  },
  {
    id: 'give-feed-the-block',
    category: 'charity',
    label: 'Feed the block',
    blurb: 'Food trucks on your old street. On you.',
    icon: 'fast-food-outline',
    energyCost: 15,
    moneyCost: 800,
    cooldownWeeks: 4,
    outcomes: [
      {
        id: 'love',
        weight: 3,
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 2 }, { stat: 'authenticity', delta: 2 }],
          moment: { kind: 'charity', headline: '{playerName} Feeds Their Old Neighborhood for Free', topic: 'feeding the block', heat: 36, valence: 75, tags: ['charity', 'hometown'] },
          flavorText: 'You parked three food trucks on your old street. You served plates yourself for four hours.',
        },
      },
      {
        id: 'skeptics',
        weight: 1,
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 1 }],
          moment: { kind: 'charity', headline: '{playerName} Feeds the Block — Some Call It a Photo Op', topic: 'feeding the block', heat: 32, valence: 25, tags: ['charity'] },
          flavorText: 'You fed the block. Someone online called it a photo op. Your aunt told them off in the comments.',
        },
      },
    ],
  },
  {
    id: 'give-scholarship',
    category: 'charity',
    label: 'Fund a music scholarship',
    blurb: 'Four kids, four years, $10,000.',
    icon: 'school-outline',
    energyCost: 10,
    moneyCost: 10_000,
    cooldownWeeks: 24,
    gates: { minFans: 50_000 },
    outcomes: [
      {
        id: 'legacy',
        weight: 1,
        consequences: {
          statChanges: [{ stat: 'industryRespect', delta: 5 }, { stat: 'reputation', delta: 5 }],
          moment: { kind: 'charity', headline: '{playerName} Launches Music Scholarship for Young Artists', topic: 'the scholarship', heat: 48, valence: 85, hashtag: '{playerName}Scholars', tags: ['charity', 'legacy'] },
          flavorText: 'You funded four scholarships. The first recipient sent you a voice memo of her new song. It is good. Really good.',
          plantSeed: {
            kind: 'scholarship-kid',
            after: [20, 40],
            who: 'new',
            note: "You paid for {seed}'s music scholarship.",
          },
        },
      },
      {
        id: 'anonymous',
        weight: 1,
        consequences: {
          statChanges: [{ stat: 'industryRespect', delta: 3 }, { stat: 'mentalHealth', delta: 4 }],
          flavorText: 'You funded the scholarship anonymously. Four kids get to study music. Nobody knows it was you, and you like it that way.',
        },
      },
    ],
  },
];
