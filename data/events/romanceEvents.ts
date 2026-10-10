import type { GameEvent } from '../../types/events';

/**
 * ROMANCE IN PUBLIC: rumors, launches, the fans' opinions of who the artist
 * dates, and breakups the whole internet watches. The DMs (systems/drama)
 * start most romances; these events are what happens once people notice.
 */
export const ROMANCE_EVENTS: GameEvent[] = [
  {
    id: 'dating-rumor',
    category: 'personal',
    title: 'The Blogs Think You Are Dating Someone',
    description: 'A gossip page posted a blurry photo of you laughing with someone outside a restaurant. "WHO IS THAT??" is trending under your name.',
    weight: 5,
    triggers: [{ type: 'fans_gte', value: 10000 }, { type: 'lacks_person', role: 'partner' }, { type: 'random', value: 0.3 }],
    cooldown: 16,
    tags: ['romance', 'rumor'],
    choices: [
      {
        id: 'deny',
        text: '"We are just friends." Post it and move on.',
        consequences: {
          moment: { kind: 'romance', headline: '{playerName} Denies Dating Rumors: "Just Friends"', topic: 'the "just friends" photo', heat: 28, valence: 0, tags: ['rumor'] },
          flavorText: 'You said "just friends". Nobody believes anyone who says "just friends".',
        },
      },
      {
        id: 'coy',
        text: 'Post a blurry photo of two drinks. Say nothing else.',
        consequences: {
          fansDelta: 1500,
          statChanges: [{ stat: 'charisma', delta: 2 }],
          moment: { kind: 'romance', headline: '{playerName} Fuels Dating Rumors With Cryptic Post', topic: 'the two-drinks post', heat: 46, valence: 20, hashtag: 'WhoIsIt', tags: ['rumor'] },
          flavorText: 'You posted two drinks and no caption. The detectives have zoomed in on the reflection in the glass.',
        },
      },
      {
        id: 'ignore',
        text: 'Ignore it. Your love life is not content.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 1 }],
          flavorText: 'You ignored the rumor. It died in four days. You kept your peace.',
        },
      },
    ],
  },
  {
    id: 'soft-launch',
    category: 'personal',
    title: 'Launch {partner}?',
    description: '{partner} asked, half joking, when you are going to post them. It was not entirely a joke.',
    weight: 5,
    triggers: [{ type: 'has_partner' }, { type: 'fans_gte', value: 3000 }, { type: 'random', value: 0.35 }],
    cooldown: 24,
    tags: ['romance'],
    choices: [
      {
        id: 'soft',
        text: 'Soft launch: a hand on a steering wheel. That is all they get.',
        consequences: {
          personChanges: [{ role: 'partner', delta: 5 }],
          moment: { kind: 'romance', headline: "{playerName} Soft Launches a Mystery Partner — Fans Are Zooming In", topic: 'the soft launch', heat: 42, valence: 30, hashtag: '{playerName}SoftLaunch', tags: ['launch'] },
          flavorText: 'You posted a hand on a steering wheel. Fans identified the watch in nine minutes and {partner} in fourteen.',
        },
      },
      {
        id: 'hard',
        text: 'Hard launch. A real photo. Together.',
        consequences: {
          personChanges: [{ role: 'partner', delta: 10 }],
          fansDelta: 2000,
          moment: { kind: 'romance', headline: '{playerName} Goes Public With {partner}', topic: 'the {partner} hard launch', heat: 58, valence: 30, hashtag: '{playerName}And{partner}', tags: ['launch'] },
          flavorText: 'You posted you and {partner}. Shippers are planning the wedding. Some stans are planning a funeral.',
        },
      },
      {
        id: 'private',
        text: 'Keep it private. They are yours, not the timeline\'s.',
        consequences: {
          personChanges: [{ role: 'partner', delta: -2 }],
          statChanges: [{ stat: 'mentalHealth', delta: 2 }],
          flavorText: 'You kept {partner} off your page. They said they understood. They mostly did.',
        },
      },
    ],
  },
  {
    id: 'fans-attack-partner',
    category: 'drama',
    title: 'Your Fans Are Coming for {partner}',
    description: 'A corner of your fanbase decided {partner} is not good enough for you. Their comments are full of it. {partner} has not said anything, which is worse.',
    weight: 5,
    triggers: [{ type: 'has_partner' }, { type: 'fans_gte', value: 30000 }, { type: 'random', value: 0.25 }],
    cooldown: 20,
    tags: ['romance', 'fans'],
    choices: [
      {
        id: 'defend',
        text: 'Defend {partner} publicly. Name the behavior.',
        consequences: {
          personChanges: [{ role: 'partner', delta: 12 }],
          statChanges: [{ stat: 'fanLoyalty', delta: -2 }, { stat: 'reputation', delta: 2 }],
          moment: { kind: 'romance', headline: '{playerName} Shuts Down Fans Harassing {partner}', topic: 'defending {partner}', heat: 44, valence: 40, tags: ['fans'] },
          flavorText: 'You told your fans to leave {partner} alone, in plain words. Some unfollowed. {partner} hugged you for a long time.',
        },
      },
      {
        id: 'quiet',
        text: 'Stay out of it. Engaging makes it worse.',
        consequences: {
          personChanges: [{ role: 'partner', delta: -12 }],
          flavorText: 'You stayed quiet. The comments did not stop. {partner} noticed you said nothing.',
        },
      },
      {
        id: 'kindness',
        text: 'Ask the whole fanbase to be kinder online, without naming anyone.',
        consequences: {
          personChanges: [{ role: 'partner', delta: 4 }],
          statChanges: [{ stat: 'reputation', delta: 2 }],
          flavorText: 'You asked everyone to be kinder. It helped a little. {partner} said it was "a start".',
        },
      },
    ],
  },
  {
    id: 'dm-screenshots-partner',
    category: 'drama',
    title: 'Someone Sent {partner} Your DMs',
    description: 'Somebody you flirted with in the DMs sent the screenshots straight to {partner}. Then to a gossip page.',
    weight: 9,
    triggers: [{ type: 'has_partner' }, { type: 'has_tag', tag: 'flirting-in-dms' }],
    cooldown: 6,
    tags: ['romance', 'leak'],
    choices: [
      {
        id: 'own',
        text: 'Own it. Apologize to {partner} first, then everyone else.',
        consequences: {
          removeTags: ['flirting-in-dms'],
          personChanges: [{ role: 'partner', delta: -20 }],
          statChanges: [{ stat: 'authenticity', delta: 2 }],
          moment: { kind: 'scandal', headline: "{playerName}'s Flirty DMs Leak — and They Own It", topic: 'the leaked DMs', heat: 55, valence: -35, hashtag: '{playerName}DMs', tags: ['romance', 'leak'] },
          flavorText: 'You apologized to {partner} before anyone else. It did not fix it. It was the only right order.',
        },
      },
      {
        id: 'fake',
        text: 'Say the screenshots are fake.',
        consequences: {
          removeTags: ['flirting-in-dms'],
          personChanges: [{ role: 'partner', delta: -30 }],
          statChanges: [{ stat: 'reputation', delta: -6 }],
          spawnControversyId: 'ctrl-cheating',
          moment: { kind: 'scandal', headline: '{playerName} Claims Leaked DMs Are Fake — Sender Posts Screen Recording', topic: 'the leaked DMs', heat: 70, valence: -60, hashtag: '{playerName}Exposed', tags: ['romance', 'leak'] },
          flavorText: 'You said they were fake. The sender posted a screen recording. Now it is two scandals.',
        },
      },
    ],
  },
  {
    id: 'public-breakup',
    category: 'personal',
    title: 'The Breakup Went Public',
    description: 'You and {partner} unfollowed each other at the same minute. The internet noticed in less than one.',
    weight: 6,
    triggers: [{ type: 'has_partner' }, { type: 'person_affinity_lte', role: 'partner', value: -20 }, { type: 'fans_gte', value: 5000 }],
    cooldown: 20,
    tags: ['romance', 'breakup'],
    choices: [
      {
        id: 'song',
        text: 'Post a snippet of the saddest song you have ever written.',
        consequences: {
          statChanges: [{ stat: 'creativity', delta: 3 }],
          fansDelta: 3000,
          moment: { kind: 'romance', headline: '{playerName} Teases Breakup Song Hours After Unfollowing {partner}', topic: 'the breakup song snippet', heat: 58, valence: -5, hashtag: '{playerName}Heartbreak', tags: ['breakup'] },
          flavorText: 'You posted a snippet. It is devastating. The comments are 50% "are you okay" and 50% "drop it NOW".',
        },
      },
      {
        id: 'statement',
        text: 'A short, kind joint statement.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 2 }],
          moment: { kind: 'romance', headline: '{playerName} and {partner} Confirm Split in Joint Statement', topic: 'the split', heat: 44, valence: 0, tags: ['breakup'] },
          flavorText: 'You and {partner} posted a kind statement. The internet wanted blood and got grace.',
        },
      },
      {
        id: 'silent',
        text: 'Say nothing. Disappear for a week.',
        consequences: {
          mentalChanges: [{ axis: 'depression', delta: 5 }, { axis: 'isolation', delta: 6 }],
          flavorText: 'You went quiet for a week. The theories got wilder every day you were gone.',
        },
      },
    ],
  },
];
