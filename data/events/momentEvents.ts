import type { GameEvent } from '../../types/events';

/**
 * MOMENTS: the scandals, ugly moments, good deeds and best nights that the
 * whole internet ends up talking about. Every choice can become a moment
 * (systems/drama): a headline, a trend, posts on every app, comments that
 * follow the artist around, and, if it's big, a line in the Chronicle.
 */
export const MOMENT_EVENTS: GameEvent[] = [
  // ─── Ugly moments ──────────────────────────────────────────────────────────
  {
    id: 'stage-fall',
    category: 'drama',
    title: 'You Fell on Stage',
    description: 'Mid-song, your foot found a cable. You went down hard in front of everyone. Every phone in the room was already up.',
    weight: 5,
    triggers: [{ type: 'fans_gte', value: 2000 }, { type: 'random', value: 0.3 }],
    cooldown: 20,
    tags: ['ugly', 'performance'],
    choices: [
      {
        id: 'laugh',
        text: 'Laugh it off and finish the song from the floor.',
        consequences: {
          statChanges: [{ stat: 'charisma', delta: 3 }, { stat: 'reputation', delta: 2 }],
          socialReaction: 'viral',
          moment: { kind: 'ugly', headline: '{playerName} Fell on Stage and Finished the Song From the Floor', topic: 'the stage fall', heat: 48, valence: 25, hashtag: '{playerName}Fall', tags: ['performance'] },
          flavorText: 'You fell, laughed, and finished the song lying on your back. The clip is everywhere. Somehow people like you more.',
        },
      },
      {
        id: 'storm-off',
        text: 'Storm off stage. You are not doing this.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -6 }],
          mentalChanges: [{ axis: 'anxiety', delta: 6 }],
          socialReaction: 'negative',
          moment: { kind: 'ugly', headline: '{playerName} Storms Off Stage After Embarrassing Fall', topic: 'the stage fall walk-off', heat: 55, valence: -40, hashtag: '{playerName}WalkOff', tags: ['performance'] },
          flavorText: 'You walked off after the fall. The crowd booed the empty stage. The walk-off is the clip now, not the fall.',
        },
      },
      {
        id: 'bit',
        text: 'Make it a bit. Fall on purpose at every show from now on.',
        consequences: {
          statChanges: [{ stat: 'charisma', delta: 5 }, { stat: 'creativity', delta: 2 }],
          fansDelta: 1500,
          socialReaction: 'viral',
          moment: { kind: 'meme', headline: '{playerName} Turns Their Stage Fall Into a Signature Move', topic: 'the signature fall', heat: 52, valence: 45, hashtag: 'DoTheFall', tags: ['meme'] },
          flavorText: 'Next show, you fell again. On purpose. The crowd went insane. "The Fall" is a dance now.',
        },
      },
    ],
  },
  {
    id: 'forgot-lyrics',
    category: 'drama',
    title: 'You Forgot the Words to Your Own Song',
    description: 'Second verse, your mind went blank. Thousands of people watched you open your mouth and say nothing.',
    weight: 5,
    triggers: [{ type: 'fans_gte', value: 1000 }, { type: 'has_released_track' }, { type: 'random', value: 0.3 }],
    cooldown: 18,
    tags: ['ugly', 'performance'],
    choices: [
      {
        id: 'crowd',
        text: 'Point the mic at the crowd and let them sing it.',
        consequences: {
          statChanges: [{ stat: 'fanLoyalty', delta: 4 }, { stat: 'charisma', delta: 2 }],
          socialReaction: 'positive',
          moment: { kind: 'best', headline: '{playerName} Blanked on a Verse and the Crowd Sang It for Them', topic: 'the crowd singing the verse', heat: 40, valence: 55, tags: ['performance', 'fans'] },
          flavorText: 'You blanked and held the mic out. Ten thousand people sang your verse back to you, word for word.',
        },
      },
      {
        id: 'mumble',
        text: 'Mumble through it and hope nobody noticed.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -3 }],
          socialReaction: 'negative',
          moment: { kind: 'ugly', headline: 'Watch {playerName} Mumble Through Their Own Lyrics', topic: 'the mumbled verse', heat: 42, valence: -25, tags: ['performance'] },
          flavorText: 'You mumbled through the verse. Everybody noticed. Someone captioned it "live footage of me in a job interview".',
        },
      },
      {
        id: 'in-ears',
        text: 'Blame the in-ear monitors on the mic.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: -3 }],
          moment: { kind: 'ugly', headline: '{playerName} Blames Tech After Forgetting Lyrics — Fans Aren\'t Buying It', topic: 'the "it was the in-ears" excuse', heat: 36, valence: -20, tags: ['performance'] },
          flavorText: 'You blamed the in-ears. The sound engineer posted the monitor mix. It was fine.',
        },
      },
    ],
  },
  {
    id: 'snapped-at-fan',
    category: 'drama',
    title: 'You Snapped at a Fan on Camera',
    description: 'A fan grabbed your arm for a selfie after a long day and you snapped. It took four seconds. The video is forty seconds and edited.',
    weight: 5,
    triggers: [{ type: 'fans_gte', value: 10000 }, { type: 'random', value: 0.25 }],
    cooldown: 20,
    tags: ['ugly', 'fans'],
    choices: [
      {
        id: 'apologize',
        text: 'Post a real apology. No notes app.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -1 }, { stat: 'authenticity', delta: 2 }],
          moment: { kind: 'ugly', headline: '{playerName} Apologizes After Snapping at a Fan', topic: 'the fan video', heat: 38, valence: -15, tags: ['fans'] },
          flavorText: 'You filmed an apology, unscripted. Some called it sincere, some called it PR. The fan accepted it.',
        },
      },
      {
        id: 'call',
        text: 'Find the fan and call them yourself.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 2 }, { stat: 'fanLoyalty', delta: 2 }],
          socialReaction: 'positive',
          moment: { kind: 'best', headline: '{playerName} Called the Fan They Snapped At — and They Posted the Call', topic: 'the apology call', heat: 40, valence: 50, tags: ['fans'] },
          flavorText: 'You found the fan and called them. They posted the call. Now the story is how you made it right.',
        },
      },
      {
        id: 'double-down',
        text: 'Double down. They grabbed you first.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -7 }],
          socialReaction: 'cancel',
          spawnControversyId: 'ctrl-fan-harassment',
          moment: { kind: 'scandal', headline: '{playerName} Defends Snapping at Fan: "They Grabbed Me First"', topic: 'the fan video', heat: 60, valence: -50, hashtag: '{playerName}IsOverParty', tags: ['fans'] },
          flavorText: 'You said they grabbed you first. Technically true. Nobody cares about technically.',
        },
      },
    ],
  },
  {
    id: 'lip-sync',
    category: 'drama',
    title: 'Caught Lip-Syncing',
    description: 'The track kept playing when your mic dropped. Your voice was on the speakers. Your mouth was not moving.',
    weight: 4,
    triggers: [{ type: 'fans_gte', value: 20000 }, { type: 'random', value: 0.2 }],
    cooldown: 25,
    tags: ['ugly', 'performance'],
    choices: [
      {
        id: 'own',
        text: 'Own it: your voice was shot and you would not cancel on them.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 2 }, { stat: 'reputation', delta: -1 }],
          moment: { kind: 'ugly', headline: '{playerName} Admits Lip-Syncing: "My Voice Was Gone"', topic: 'the lip-sync clip', heat: 42, valence: -5, tags: ['performance'] },
          flavorText: 'You told the truth: no voice, no cancel. Half the internet respected it. The other half made memes anyway.',
        },
      },
      {
        id: 'deny',
        text: 'Deny it. It was a backing track for the harmonies.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: -5 }, { stat: 'reputation', delta: -4 }],
          socialReaction: 'negative',
          moment: { kind: 'scandal', headline: 'Fans Slow Down the Footage: {playerName} Was Lip-Syncing', topic: 'the lip-sync denial', heat: 58, valence: -45, hashtag: 'LipSyncGate', tags: ['performance'] },
          flavorText: 'You denied it. Fans slowed the footage to 0.25x. It is very clear. It is very, very clear.',
        },
      },
      {
        id: 'acapella',
        text: 'Prove it: sing the next show a cappella.',
        consequences: {
          statChanges: [{ stat: 'vocalSkill', delta: 3 }, { stat: 'charisma', delta: 3 }],
          fansDelta: 2500,
          socialReaction: 'viral',
          moment: { kind: 'best', headline: '{playerName} Answers Lip-Sync Claims With a Stunning A Cappella Set', topic: 'the a cappella set', heat: 52, valence: 65, tags: ['performance'] },
          flavorText: 'Next show, no backing track. Just you. The silence between songs was the loudest thing you have ever heard.',
        },
      },
    ],
  },
  {
    id: 'drunk-interview',
    category: 'drama',
    title: 'Your Drunk Interview Went Viral',
    description: 'You did a red carpet interview three drinks deep. You said some things. Some of them were about other artists.',
    weight: 4,
    triggers: [{ type: 'fans_gte', value: 15000 }, { type: 'random', value: 0.25 }],
    cooldown: 20,
    tags: ['ugly', 'interview'],
    choices: [
      {
        id: 'lean-in',
        text: 'Lean in. It is called being honest.',
        consequences: {
          statChanges: [{ stat: 'charisma', delta: 3 }, { stat: 'industryRespect', delta: -4 }],
          fansDelta: 2000,
          socialReaction: 'viral',
          moment: { kind: 'meme', headline: "{playerName}'s Unfiltered Red Carpet Interview Is the Internet's New Favorite Thing", topic: 'the drunk interview', heat: 55, valence: 15, hashtag: 'DrunkHonesty', tags: ['interview'] },
          flavorText: 'You leaned in. "Drunk honesty" is a format now. Two artists you mentioned have unfollowed you.',
        },
      },
      {
        id: 'apologize',
        text: 'Apologize to everyone you mentioned.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -1 }, { stat: 'industryRespect', delta: 2 }],
          moment: { kind: 'ugly', headline: '{playerName} Apologizes for Chaotic Red Carpet Interview', topic: 'the drunk interview', heat: 36, valence: -15, tags: ['interview'] },
          flavorText: 'You apologized to everyone you mentioned. Most accepted. One posted your apology with a clown emoji.',
        },
      },
      {
        id: 'blame-host',
        text: 'Blame the host for the questions.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -5 }],
          socialReaction: 'negative',
          moment: { kind: 'ugly', headline: '{playerName} Blames Host for Their Own Drunk Interview', topic: 'blaming the host', heat: 46, valence: -35, tags: ['interview'] },
          flavorText: 'You blamed the host. The host posted the full unedited tape. You do not look better.',
        },
      },
    ],
  },
  {
    id: 'booed',
    category: 'drama',
    title: 'Booed at a Festival',
    description: 'You came on after a crowd favorite. Half the field wanted them back. The booing started on your second song.',
    weight: 4,
    triggers: [{ type: 'fans_gte', value: 5000 }, { type: 'random', value: 0.25 }],
    cooldown: 20,
    tags: ['ugly', 'performance'],
    choices: [
      {
        id: 'win',
        text: 'Win them over. Play the hardest song you have.',
        consequences: {
          statChanges: [{ stat: 'charisma', delta: 4 }, { stat: 'discipline', delta: 2 }],
          fansDelta: 3000,
          moment: { kind: 'best', headline: 'Booed at the Start, {playerName} Had the Whole Festival Singing by the End', topic: 'the festival comeback', heat: 50, valence: 60, tags: ['performance'] },
          flavorText: 'You played harder. By the last song, the people who booed were filming. Clips of the turnaround are everywhere.',
        },
      },
      {
        id: 'walk-off',
        text: 'Walk off. You do not need this.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -4 }],
          mentalChanges: [{ axis: 'depression', delta: 6 }],
          moment: { kind: 'ugly', headline: '{playerName} Walks Off Festival Stage After Booing', topic: 'the festival walk-off', heat: 50, valence: -35, tags: ['performance'] },
          flavorText: 'You walked off after three songs. The festival posted "technical difficulties". Nobody believed it.',
        },
      },
      {
        id: 'clap-back',
        text: 'Clap back at the crowd on the mic.',
        consequences: {
          statChanges: [{ stat: 'charisma', delta: 2 }, { stat: 'reputation', delta: -2 }],
          socialReaction: 'mixed',
          moment: { kind: 'meme', headline: '{playerName} Roasts Booing Festival Crowd Mid-Set', topic: 'the festival roast', heat: 55, valence: -5, hashtag: '{playerName}Roast', tags: ['performance'] },
          flavorText: 'You roasted the crowd. It was mean. It was also funny. The clip has more views than your set.',
        },
      },
    ],
  },

  // ─── Scandals ──────────────────────────────────────────────────────────────
  {
    id: 'fake-streams',
    category: 'drama',
    title: 'A Report Says Your Streams Are Fake',
    description: 'A data blog claims a chunk of your streams come from bot farms. They have charts. Charts look convincing.',
    weight: 4,
    triggers: [{ type: 'fans_gte', value: 50000 }, { type: 'has_released_track' }, { type: 'random', value: 0.2 }],
    cooldown: 30,
    tags: ['scandal'],
    choices: [
      {
        id: 'analytics',
        text: 'Publish your real analytics.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 3 }],
          moment: { kind: 'scandal', headline: '{playerName} Posts Streaming Data to Fight Bot Accusations', topic: 'the fake streams report', heat: 40, valence: -10, tags: ['streams'] },
          flavorText: 'You posted the receipts. The blog issued a "clarification". Most people only saw the accusation.',
        },
      },
      {
        id: 'fire-team',
        text: 'Fire the marketing company that ran your campaign.',
        consequences: {
          moneyDelta: -3000,
          statChanges: [{ stat: 'reputation', delta: 1 }, { stat: 'industryRespect', delta: -2 }],
          moment: { kind: 'scandal', headline: '{playerName} Cuts Ties With Marketing Firm Amid Bot Claims', topic: 'the fake streams report', heat: 45, valence: -20, tags: ['streams'] },
          flavorText: 'You fired the marketing firm. It looks like an admission. It might have been one.',
        },
      },
      {
        id: 'silence',
        text: 'Say nothing. It will blow over.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -5 }],
          spawnControversyId: 'ctrl-industry-plant',
          moment: { kind: 'scandal', headline: 'Silence From {playerName} as Fake Streams Allegations Spread', topic: 'the fake streams report', heat: 62, valence: -45, hashtag: '{playerName}BotFarm', tags: ['streams'] },
          flavorText: 'You said nothing. "Bot farm" is now your nickname on three apps.',
        },
      },
    ],
  },
  {
    id: 'crypto-crash',
    category: 'drama',
    title: 'The Coin You Promoted Just Crashed',
    description: 'Six weeks ago you posted about a "community token" for a fee. Today it is worth nothing, and fans who bought it are in your comments.',
    weight: 3,
    triggers: [{ type: 'fans_gte', value: 30000 }, { type: 'random', value: 0.15 }],
    unique: true,
    tags: ['scandal', 'money'],
    choices: [
      {
        id: 'refund',
        text: 'Refund every fan who bought in, out of your own pocket.',
        consequences: {
          moneyDelta: -12000,
          statChanges: [{ stat: 'reputation', delta: 5 }, { stat: 'fanLoyalty', delta: 4 }],
          moment: { kind: 'charity', headline: '{playerName} Refunds Fans Out of Pocket After Crypto Crash', topic: 'the crypto refunds', heat: 50, valence: 55, tags: ['money'] },
          flavorText: 'You refunded every fan who bought in. It cost you a lot. It bought you something money usually cannot.',
        },
      },
      {
        id: 'apologize',
        text: 'Apologize and promise to do better.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -4 }],
          moment: { kind: 'scandal', headline: '{playerName} Apologizes for Promoting Crashed Crypto Coin', topic: 'the crypto promo', heat: 50, valence: -35, tags: ['money'] },
          flavorText: 'You apologized. The fans who lost money did not find it comforting.',
        },
      },
      {
        id: 'not-my-fault',
        text: 'It is not your fault. People should do their own research.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -9 }, { stat: 'fanLoyalty', delta: -5 }],
          socialReaction: 'cancel',
          spawnControversyId: 'ctrl-tone-deaf',
          moment: { kind: 'scandal', headline: '{playerName} to Fans Who Lost Money: "Do Your Own Research"', topic: 'the crypto promo', heat: 70, valence: -65, hashtag: '{playerName}Scammed', tags: ['money'] },
          flavorText: '"Do your own research." Those four words are going to follow you for a long time.',
        },
      },
    ],
  },
  {
    id: 'security-shoved-fan',
    category: 'drama',
    title: 'Your Security Shoved a Fan',
    description: 'Outside the venue, one of your security team shoved a fan to the ground. It is on video. Your name is in every headline, not his.',
    weight: 4,
    triggers: [{ type: 'fans_gte', value: 40000 }, { type: 'random', value: 0.2 }],
    cooldown: 30,
    tags: ['scandal', 'fans'],
    choices: [
      {
        id: 'fire-call',
        text: 'Fire the guard and call the fan yourself.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 3 }],
          moment: { kind: 'ugly', headline: '{playerName} Fires Security Guard, Calls Shoved Fan Personally', topic: 'the security video', heat: 40, valence: 20, tags: ['fans'] },
          flavorText: 'You fired him the same night and called the fan. The fan posted that you were "actually really kind".',
        },
      },
      {
        id: 'defend',
        text: 'Defend your team. The crowd was out of control.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -6 }],
          socialReaction: 'negative',
          moment: { kind: 'scandal', headline: '{playerName} Defends Security After Fan Shoving Video', topic: 'the security video', heat: 58, valence: -50, hashtag: 'JusticeForTheFan', tags: ['fans'] },
          flavorText: 'You defended your security. The fan has a broken wrist and a lawyer.',
        },
      },
      {
        id: 'pay-quietly',
        text: "Quietly pay the fan's hospital bill.",
        consequences: {
          moneyDelta: -3000,
          statChanges: [{ stat: 'reputation', delta: 2 }],
          moment: { kind: 'charity', headline: "{playerName} Covered Shoved Fan's Hospital Bill, Fan Reveals", topic: "covering the fan's hospital bill", heat: 38, valence: 50, tags: ['fans'] },
          flavorText: 'You paid the hospital bill and said nothing. The fan said it for you.',
        },
      },
    ],
  },
  {
    id: 'stolen-beat',
    category: 'drama',
    title: 'A Producer Says You Stole Their Beat',
    description: 'An underground producer posted a side-by-side: their beat from two years ago and your latest single. The comments are not on your side.',
    weight: 4,
    triggers: [{ type: 'has_released_track' }, { type: 'fans_gte', value: 8000 }, { type: 'random', value: 0.2 }],
    cooldown: 30,
    tags: ['scandal', 'music'],
    choices: [
      {
        id: 'credit',
        text: 'Credit them and split the royalties.',
        consequences: {
          moneyDelta: -4000,
          statChanges: [{ stat: 'reputation', delta: 3 }, { stat: 'authenticity', delta: 2 }],
          moment: { kind: 'best', headline: '{playerName} Credits Underground Producer After Beat Dispute', topic: 'crediting the producer', heat: 38, valence: 40, tags: ['music'] },
          flavorText: 'You credited them and split the royalties. They posted a thank-you. Their career just started.',
        },
      },
      {
        id: 'court',
        text: 'Lawyer up. You made that beat.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -4 }],
          spawnControversyId: 'ctrl-lawsuit',
          moment: { kind: 'scandal', headline: '{playerName} Lawyers Up in Beat Theft Dispute', topic: 'the beat theft claim', heat: 50, valence: -30, tags: ['music', 'lawsuit'] },
          flavorText: 'You lawyered up. It will take months. Every month, the side-by-side gets reposted.',
        },
      },
      {
        id: 'drag',
        text: 'Drag them online. Clout chaser.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -5 }],
          socialReaction: 'negative',
          moment: { kind: 'scandal', headline: '{playerName} Calls Producer a "Clout Chaser" Amid Theft Claims', topic: 'the beat theft claim', heat: 58, valence: -40, hashtag: '{playerName}StoleIt', tags: ['music'] },
          flavorText: 'You called them a clout chaser. They now have ten times the followers. You gave them that.',
        },
      },
    ],
  },

  // ─── Giving back ─────────────────────────────────────────────────────────
  {
    id: 'fan-hospital-bill',
    category: 'social',
    title: "A Fan Can't Pay Their Hospital Bill",
    description: "A fan who has been to every show of yours posted that they can't cover a surgery. Someone tagged you. Then a hundred people did.",
    weight: 5,
    triggers: [{ type: 'fans_gte', value: 3000 }, { type: 'random', value: 0.25 }],
    cooldown: 16,
    tags: ['charity', 'fans'],
    choices: [
      {
        id: 'quiet',
        text: 'Pay it. Tell no one.',
        consequences: {
          moneyDelta: -5000,
          statChanges: [{ stat: 'reputation', delta: 4 }, { stat: 'fanLoyalty', delta: 4 }],
          moment: { kind: 'charity', headline: "{playerName} Quietly Paid a Fan's Surgery Bill", topic: "the fan's surgery bill", heat: 46, valence: 80, hashtag: '{playerName}RealOne', tags: ['charity'] },
          flavorText: "You paid the surgery bill and told no one. The fan found out who it was and told everyone.",
        },
      },
      {
        id: 'public',
        text: 'Pay it and post the receipt.',
        consequences: {
          moneyDelta: -5000,
          statChanges: [{ stat: 'reputation', delta: 3 }],
          fansDelta: 1500,
          moment: { kind: 'charity', headline: "{playerName} Pays Fan's Surgery Bill and Shares the Receipt", topic: "the fan's surgery bill", heat: 52, valence: 45, tags: ['charity'] },
          flavorText: 'You paid it and posted the receipt. Most people cried. A few called it PR. The fan does not care either way.',
        },
      },
      {
        id: 'share',
        text: 'Share their fundraiser with your fans.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 1 }, { stat: 'fanLoyalty', delta: 2 }],
          moment: { kind: 'charity', headline: "{playerName}'s Fans Fund a Fan's Surgery in a Day", topic: "the fundraiser {playerName} shared", heat: 34, valence: 55, tags: ['charity', 'fans'] },
          flavorText: 'You shared the fundraiser. Your fans covered it in nineteen hours. You felt proud of them.',
        },
      },
    ],
  },
  {
    id: 'school-music-program',
    category: 'social',
    title: 'Your Old School Lost Its Music Program',
    description: 'The school where you first touched a keyboard is cutting music. Your old teacher sent you a long email. You read it twice.',
    weight: 4,
    triggers: [{ type: 'fans_gte', value: 20000 }, { type: 'random', value: 0.2 }],
    unique: true,
    tags: ['charity', 'hometown'],
    choices: [
      {
        id: 'fund',
        text: 'Fund the program for the next five years.',
        consequences: {
          moneyDelta: -15000,
          statChanges: [{ stat: 'reputation', delta: 6 }, { stat: 'industryRespect', delta: 3 }, { stat: 'authenticity', delta: 3 }],
          moment: { kind: 'charity', headline: '{playerName} Saves Hometown School Music Program', topic: 'saving the school music program', heat: 55, valence: 85, hashtag: '{playerName}GivesBack', tags: ['charity', 'hometown'] },
          flavorText: 'You funded the program for five years. Your old teacher cried on the local news. You watched it twice too.',
        },
      },
      {
        id: 'benefit',
        text: 'Play a benefit show in the school gym.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 4 }, { stat: 'energy', delta: -15 }],
          fansDelta: 1000,
          moment: { kind: 'charity', headline: "{playerName} Plays Benefit Show in Old School's Gym", topic: 'the school gym benefit show', heat: 45, valence: 75, tags: ['charity', 'hometown'] },
          flavorText: 'You played a benefit show in the gym where you had PE. It sold out in minutes. The program is safe.',
        },
      },
      {
        id: 'guitar',
        text: 'Send a signed guitar for their auction.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 1 }],
          flavorText: 'You sent a signed guitar. It raised enough for one more year. The teacher wrote back: "it\'s a start."',
        },
      },
    ],
  },
  {
    id: 'hometown-storm',
    category: 'social',
    title: 'A Storm Hit Your Hometown',
    description: "A storm flattened half of the neighborhood you grew up in. Your family is fine. Your mentions are full of people asking what you're going to do.",
    weight: 3,
    triggers: [{ type: 'fans_gte', value: 10000 }, { type: 'random', value: 0.12 }],
    cooldown: 40,
    tags: ['charity', 'hometown'],
    choices: [
      {
        id: 'concert',
        text: 'Organize a relief concert and bring your friends.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 6 }, { stat: 'industryRespect', delta: 3 }],
          fansDelta: 4000,
          moment: { kind: 'charity', headline: '{playerName} Leads All-Star Relief Concert for Hometown', topic: 'the relief concert', heat: 62, valence: 85, hashtag: '{city}Strong', tags: ['charity', 'hometown'] },
          flavorText: 'You put together a relief concert in eleven days. It raised millions. You did not sleep much. It was worth it.',
        },
      },
      {
        id: 'donate',
        text: 'Donate a serious amount.',
        consequences: {
          moneyDelta: -10000,
          statChanges: [{ stat: 'reputation', delta: 4 }],
          moment: { kind: 'charity', headline: '{playerName} Makes Major Donation to Hometown Storm Relief', topic: 'the storm relief donation', heat: 45, valence: 70, tags: ['charity', 'hometown'] },
          flavorText: 'You sent the money that night. The relief fund posted your name first.',
        },
      },
      {
        id: 'prayers',
        text: 'Post thoughts and prayers.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -3 }],
          moment: { kind: 'ugly', headline: '{playerName} Slammed for "Thoughts and Prayers" Post About Hometown', topic: 'the "thoughts and prayers" post', heat: 40, valence: -35, tags: ['hometown'] },
          flavorText: 'You posted "thoughts and prayers". Your hometown noticed. They expected more from one of their own.',
        },
      },
    ],
  },

  // ─── Best moments ───────────────────────────────────────────────────────────
  {
    id: 'crowd-sang-it',
    category: 'social',
    title: "The Crowd Wouldn't Stop Singing",
    description: 'The song ended. The crowd kept going. Ten thousand voices singing the hook again, a cappella, and you could not stop smiling.',
    weight: 5,
    triggers: [{ type: 'fans_gte', value: 5000 }, { type: 'has_released_track' }, { type: 'random', value: 0.3 }],
    cooldown: 16,
    tags: ['best', 'performance'],
    choices: [
      {
        id: 'let-them',
        text: 'Put the mic down and let them sing the whole thing.',
        consequences: {
          statChanges: [{ stat: 'fanLoyalty', delta: 5 }, { stat: 'mentalHealth', delta: 5 }],
          moment: { kind: 'best', headline: "Watch {playerName}'s Crowd Sing the Entire Song Without Them", topic: 'the crowd singing the whole song', heat: 55, valence: 85, hashtag: '{playerName}Crowd', tags: ['performance'] },
          flavorText: 'You stepped back and let them sing it all. Someone filmed your face. That is the clip people share.',
        },
      },
      {
        id: 'cry',
        text: 'You cried. On stage. In front of everyone.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 4 }, { stat: 'fanLoyalty', delta: 3 }],
          moment: { kind: 'best', headline: '{playerName} Breaks Down in Tears as Crowd Sings Their Song', topic: 'the tears on stage', heat: 58, valence: 75, tags: ['performance'] },
          flavorText: 'You cried in front of ten thousand people. Nobody laughed. A lot of them cried too.',
        },
      },
      {
        id: 'record',
        text: 'Record it. It is going on the next album.',
        consequences: {
          statChanges: [{ stat: 'creativity', delta: 3 }],
          fansDelta: 2000,
          moment: { kind: 'best', headline: '{playerName} Records Their Crowd for Next Album', topic: 'the crowd recording', heat: 48, valence: 70, tags: ['performance', 'music'] },
          flavorText: 'You recorded the crowd. Every person there now thinks they are on your next album. They are.',
        },
      },
    ],
  },
  {
    id: 'legend-brought-out',
    category: 'opportunity',
    title: 'A Legend Brought You Out on Stage',
    description: 'You were side-stage at a legend\'s show. Mid-set they said your name into the mic and waved you out. Forty thousand people. No warning.',
    weight: 4,
    triggers: [{ type: 'fans_gte', value: 100000 }, { type: 'random', value: 0.2 }],
    cooldown: 30,
    tags: ['best', 'performance'],
    choices: [
      {
        id: 'hit',
        text: 'Do your biggest song.',
        consequences: {
          statChanges: [{ stat: 'industryRespect', delta: 6 }, { stat: 'charisma', delta: 3 }],
          fansDelta: 20000,
          moment: { kind: 'best', headline: 'A Legend Brought {playerName} Out and the Stadium Lost It', topic: 'the surprise stadium moment', heat: 70, valence: 85, hashtag: '{playerName}Stadium', tags: ['performance', 'legend'] },
          flavorText: 'You walked out and did your biggest song for forty thousand people who did not come to see you. They do now.',
        },
      },
      {
        id: 'their-classic',
        text: 'Ask to do one of their classics with them.',
        consequences: {
          statChanges: [{ stat: 'industryRespect', delta: 8 }, { stat: 'authenticity', delta: 3 }],
          fansDelta: 14000,
          moment: { kind: 'best', headline: '{playerName} Duets a Classic With a Legend in Surprise Moment', topic: 'the classic duet', heat: 72, valence: 90, tags: ['performance', 'legend'] },
          flavorText: 'You sang their classic with them. Their fans cried. Their fans are your fans now.',
        },
      },
      {
        id: 'freestyle',
        text: 'Freestyle. Right there. No net.',
        consequences: {
          statChanges: [{ stat: 'writing', delta: 3 }, { stat: 'charisma', delta: 4 }],
          fansDelta: 10000,
          socialReaction: 'viral',
          moment: { kind: 'best', headline: '{playerName} Freestyles in Front of 40,000 After Legend Calls Them Out', topic: 'the stadium freestyle', heat: 66, valence: 75, tags: ['performance', 'legend'] },
          flavorText: 'You freestyled. One line hit so hard the legend fell back laughing. That frame is a wallpaper now.',
        },
      },
    ],
  },
  {
    id: 'kid-talent-show',
    category: 'social',
    title: 'A Kid Sang Your Song at a Talent Show',
    description: 'A nine-year-old sang your song at a school talent show, off-key and fearless. The video has two million views. Everyone is tagging you.',
    weight: 4,
    triggers: [{ type: 'fans_gte', value: 15000 }, { type: 'has_released_track' }, { type: 'random', value: 0.2 }],
    cooldown: 30,
    tags: ['best', 'fans'],
    choices: [
      {
        id: 'share',
        text: 'Share it with a heart.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 2 }],
          moment: { kind: 'best', headline: '{playerName} Reacts to Kid Singing Their Song at Talent Show', topic: 'the talent show kid', heat: 40, valence: 85, tags: ['fans'] },
          flavorText: 'You shared it. The kid saw. The kid lost it. So did the internet.',
        },
      },
      {
        id: 'call',
        text: 'Surprise the kid with a video call.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 4 }, { stat: 'fanLoyalty', delta: 3 }],
          fansDelta: 3000,
          moment: { kind: 'best', headline: "Watch {playerName} Surprise the Talent Show Kid With a Call", topic: 'the surprise call', heat: 58, valence: 95, hashtag: '{playerName}Wholesome', tags: ['fans'] },
          flavorText: 'You video-called the kid. Their scream will be in your head for the rest of your life, in the best way.',
        },
      },
      {
        id: 'stage',
        text: 'Bring the kid on stage at your next show.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 5 }, { stat: 'charisma', delta: 2 }],
          fansDelta: 5000,
          socialReaction: 'viral',
          moment: { kind: 'best', headline: '{playerName} Brings Viral Talent Show Kid On Stage', topic: 'the kid on stage', heat: 68, valence: 95, hashtag: '{playerName}AndTheKid', tags: ['fans', 'performance'] },
          flavorText: 'You brought the kid on stage. They hit the high note you never hit. You will never live it down. You do not want to.',
        },
      },
    ],
  },
];
