import type { GameEvent } from '../../types/events';

/**
 * THE RIVAL WAR, as decisions. `{rival}` is the hottest rivalry (an event
 * that names a rival only fires when there is one). `warSwing` moves public
 * opinion in the war; `rivalryIntensityDelta` turns the heat up or down.
 */
export const WAR_EVENTS: GameEvent[] = [
  {
    id: 'war-diss-dropped',
    category: 'rivalry',
    title: '{rival} Dropped a Diss Track About You',
    description: 'Three minutes, your name in the first bar, a line about your mom in the second verse. It hit every platform at midnight. Your phone has not stopped since.',
    weight: 8,
    triggers: [{ type: 'rivalry_intensity_gte', value: 55 }, { type: 'random', value: 0.45 }],
    cooldown: 6,
    tags: ['rivalry', 'diss'],
    choices: [
      {
        id: 'respond',
        text: 'Write the response tonight. Drop it tomorrow.',
        consequences: {
          statChanges: [{ stat: 'writing', delta: 3 }, { stat: 'fanLoyalty', delta: 4 }],
          fansDelta: 4000,
          rivalryIntensityDelta: { delta: 15 },
          warSwing: 15,
          socialReaction: 'viral',
          moment: { kind: 'beef', headline: '{playerName} Fires Back at {rival} in Under 24 Hours', topic: 'your response diss', heat: 72, valence: 30, hashtag: '{playerName}Responds', tags: ['diss'] },
          flavorText: 'You wrote all night and dropped it at noon. The response is all anyone is playing. The beef is fully on.',
        },
      },
      {
        id: 'memes',
        text: 'Do not dignify it. Just post memes about it.',
        consequences: {
          statChanges: [{ stat: 'charisma', delta: 3 }],
          warSwing: 6,
          moment: { kind: 'meme', headline: "{playerName} Responds to {rival}'s Diss Track With Memes Only", topic: 'the meme response', heat: 52, valence: 25, hashtag: 'MemeResponse', tags: ['diss'] },
          flavorText: 'You answered a diss track with a meme of a sleeping dog. Somehow it is working.',
        },
      },
      {
        id: 'high-road',
        text: 'Take the high road. Wish them well and say nothing else.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 3 }, { stat: 'industryRespect', delta: 2 }],
          rivalryIntensityDelta: { delta: -5 },
          warSwing: -5,
          flavorText: 'You wished {rival} well. The grown-ups respected it. The internet called you scared.',
        },
      },
      {
        id: 'call',
        text: 'Call {rival} directly. No phones out.',
        consequences: {
          rivalryIntensityDelta: { delta: -12 },
          statChanges: [{ stat: 'mentalHealth', delta: 3 }],
          moment: { kind: 'beef', headline: '{playerName} and {rival} Reportedly Spoke on the Phone After Diss', topic: 'the phone call with {rival}', heat: 36, valence: 15, tags: ['diss'] },
          flavorText: 'You called {rival}. It got loud, then quiet. You both hung up with a lot less to say in public.',
        },
      },
    ],
  },
  {
    id: 'war-crew-at-show',
    category: 'rivalry',
    title: "{rival}'s Crew Showed Up to Your Show",
    description: 'Front of the balcony: {rival}\'s whole crew, filming, laughing during your slow song. The crowd has noticed them too.',
    weight: 6,
    triggers: [{ type: 'rivalry_intensity_gte', value: 40 }, { type: 'fans_gte', value: 5000 }, { type: 'random', value: 0.35 }],
    cooldown: 8,
    tags: ['rivalry', 'performance'],
    choices: [
      {
        id: 'call-out',
        text: 'Call them out from the stage.',
        consequences: {
          statChanges: [{ stat: 'charisma', delta: 3 }],
          rivalryIntensityDelta: { delta: 10 },
          warSwing: 8,
          moment: { kind: 'beef', headline: "{playerName} Calls Out {rival}'s Crew Mid-Show", topic: 'the balcony call-out', heat: 55, valence: 25, tags: ['performance'] },
          flavorText: 'You pointed at the balcony and said it. The crowd turned around and booed them out. Legend behavior.',
        },
      },
      {
        id: 'dedicate',
        text: 'Dedicate the next song to "our friends in the balcony".',
        consequences: {
          statChanges: [{ stat: 'charisma', delta: 2 }],
          warSwing: 5,
          moment: { kind: 'meme', headline: '{playerName} Dedicates a Song to {rival}\'s Crew, Smiling', topic: 'the balcony dedication', heat: 46, valence: 30, tags: ['performance'] },
          flavorText: 'You dedicated a song to them with a smile. It was the most passive-aggressive thing you have ever done. It went viral.',
        },
      },
      {
        id: 'security',
        text: 'Have security remove them.',
        consequences: {
          rivalryIntensityDelta: { delta: 8 },
          warSwing: -3,
          moment: { kind: 'ugly', headline: "{rival}'s Crew Removed From {playerName}'s Show — Both Sides Posting", topic: 'the balcony ejection', heat: 44, valence: -10, tags: ['performance'] },
          flavorText: 'Security walked them out. They filmed the whole walk and captioned it "scared".',
        },
      },
    ],
  },
  {
    id: 'war-fan-war',
    category: 'rivalry',
    title: "Your Fans and {rival}'s Fans Are at War",
    description: 'It started with a poll and now it is doxxing threats and fake screenshots. Both fanbases are tagging you and {rival} in everything.',
    weight: 6,
    triggers: [{ type: 'rivalry_intensity_gte', value: 45 }, { type: 'fans_gte', value: 20000 }, { type: 'random', value: 0.35 }],
    cooldown: 10,
    tags: ['rivalry', 'fans'],
    choices: [
      {
        id: 'stop',
        text: 'Tell your fans to stop. Clearly.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 4 }, { stat: 'fanLoyalty', delta: -2 }],
          warSwing: -2,
          flavorText: 'You told your fans to stop. Most did. A few called you soft. It was the right call.',
        },
      },
      {
        id: 'egg-on',
        text: 'Egg them on. Your fans ride for you.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -6 }, { stat: 'fanLoyalty', delta: 4 }],
          rivalryIntensityDelta: { delta: 12 },
          warSwing: 6,
          moment: { kind: 'scandal', headline: '{playerName} Accused of Encouraging Fan Harassment in {rival} Feud', topic: 'the fan war', heat: 55, valence: -40, hashtag: 'FanWar', tags: ['fans'] },
          flavorText: 'You egged them on. It worked. Someone on {rival}\'s side got doxxed, and now it is your scandal too.',
        },
      },
      {
        id: 'joint',
        text: 'Post a joint statement with {rival} asking everyone to calm down.',
        consequences: {
          rivalryIntensityDelta: { delta: -20 },
          statChanges: [{ stat: 'reputation', delta: 3 }, { stat: 'industryRespect', delta: 3 }],
          moment: { kind: 'best', headline: '{playerName} and {rival} Unite to Call Off Their Fan War', topic: 'the joint statement with {rival}', heat: 45, valence: 50, tags: ['fans', 'peace'] },
          flavorText: 'You and {rival} posted the same message at the same minute. The fan war stopped. The beef did not, but it is quieter.',
        },
      },
    ],
  },
  {
    id: 'war-poll',
    category: 'rivalry',
    title: 'A Viral Poll Says {rival} Is Winning',
    description: 'A huge account ran a "who is winning the beef" poll. Two million votes. You are losing. Everyone has sent it to you.',
    weight: 6,
    triggers: [{ type: 'rivalry_intensity_gte', value: 40 }, { type: 'random', value: 0.4 }],
    cooldown: 8,
    tags: ['rivalry'],
    choices: [
      {
        id: 'surprise',
        text: 'Drop a surprise single tonight.',
        consequences: {
          statChanges: [{ stat: 'discipline', delta: 2 }],
          fansDelta: 3500,
          warSwing: 10,
          moment: { kind: 'beef', headline: '{playerName} Answers Losing Poll With a Surprise Single', topic: 'the surprise single', heat: 55, valence: 35, tags: ['music'] },
          flavorText: 'You dropped a surprise single at midnight. By morning a new poll had you up eight points.',
        },
      },
      {
        id: 'mock',
        text: 'Mock the poll. "Polls are for politicians."',
        consequences: {
          warSwing: 3,
          moment: { kind: 'meme', headline: '"Polls Are for Politicians": {playerName} Brushes Off Beef Poll', topic: 'the poll clapback', heat: 40, valence: 10, tags: [] },
          flavorText: '"Polls are for politicians." It is on shirts now. You are still losing the poll.',
        },
      },
      {
        id: 'ignore',
        text: 'Ignore it.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 2 }],
          warSwing: -3,
          flavorText: 'You ignored the poll. You did look at it eleven times.',
        },
      },
    ],
  },
  {
    id: 'war-chart-battle',
    category: 'rivalry',
    title: 'You and {rival} Are Neck and Neck on the Chart',
    description: 'Your single and {rival}\'s are separated by a few thousand streams. The chart update is Friday. The whole internet is counting.',
    weight: 6,
    triggers: [{ type: 'rivalry_intensity_gte', value: 35 }, { type: 'has_released_track' }, { type: 'random', value: 0.35 }],
    cooldown: 10,
    tags: ['rivalry', 'charts'],
    choices: [
      {
        id: 'push',
        text: 'Push it: remixes, a lyric video, every playlist pitch you have.',
        consequences: {
          moneyDelta: -2500,
          fansDelta: 2500,
          warSwing: 8,
          moment: { kind: 'beef', headline: '{playerName} Goes All In Before Chart Showdown With {rival}', topic: 'the chart showdown', heat: 50, valence: 15, hashtag: 'ChartWar', tags: ['charts'] },
          flavorText: 'You spent big on the push. Friday will tell. Your fans are streaming in shifts.',
        },
      },
      {
        id: 'remix',
        text: 'Call {rival} and put them on the remix instead.',
        consequences: {
          rivalryIntensityDelta: { delta: -40 },
          fansDelta: 8000,
          statChanges: [{ stat: 'industryRespect', delta: 5 }],
          moment: { kind: 'best', headline: '{playerName} and {rival} End Chart War With a Surprise Remix', topic: 'the {rival} remix', heat: 66, valence: 60, hashtag: 'TheRemix', tags: ['charts', 'peace'] },
          flavorText: 'You put {rival} on the remix. It debuted at number one. Both fanbases are confused and streaming anyway.',
        },
      },
      {
        id: 'trash-talk',
        text: 'Talk trash all week.',
        consequences: {
          rivalryIntensityDelta: { delta: 10 },
          warSwing: 4,
          moment: { kind: 'beef', headline: '{playerName} Trash-Talks {rival} Ahead of Chart Update', topic: 'the chart trash talk', heat: 46, valence: 0, tags: ['charts'] },
          flavorText: 'You talked trash all week. It is fun until Friday.',
        },
      },
    ],
  },
  {
    id: 'war-rival-ex',
    category: 'rivalry',
    title: "{rival}'s Ex Wants to Work With You",
    description: "{rival}'s ex, a producer with real hits, sent you a beat and a message: \"I know things about how {rival} writes.\"",
    weight: 4,
    triggers: [{ type: 'rivalry_intensity_gte', value: 30 }, { type: 'random', value: 0.25 }],
    cooldown: 20,
    tags: ['rivalry'],
    choices: [
      {
        id: 'work',
        text: 'Work with them. Make it obvious.',
        consequences: {
          statChanges: [{ stat: 'creativity', delta: 3 }],
          rivalryIntensityDelta: { delta: 15 },
          warSwing: 6,
          moment: { kind: 'beef', headline: "{playerName} Hits the Studio With {rival}'s Ex", topic: "the studio session with {rival}'s ex", heat: 58, valence: -5, hashtag: 'MessyMessy', tags: [] },
          flavorText: "You posted a studio photo with {rival}'s ex. That was a choice. The internet is having a holiday.",
        },
      },
      {
        id: 'decline',
        text: 'Decline. That is too messy even for you.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 1 }, { stat: 'industryRespect', delta: 1 }],
          flavorText: 'You passed. Somewhere, a gossip page is disappointed.',
        },
      },
    ],
  },
];
