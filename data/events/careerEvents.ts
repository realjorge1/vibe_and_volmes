import type { GameEvent } from '../../types/events';

export const CAREER_EVENTS: GameEvent[] = [
  {
    id: 'label-scout-dm',
    category: 'career',
    title: 'A Label Scout Just Slid Into Your DMs',
    description:
      'You wake up to a notification. An A&R rep from Meridian Records — one of the bigger indie labels — has messaged you. They want to set up a call. No promises, but this could be the first real door opening.',
    weight: 8,
    triggers: [
      { type: 'fans_gte', value: 500 },
      { type: 'stat_gte', stat: 'talent', value: 40 },
      { type: 'lacks_tag', tag: 'label-deal' },
    ],
    choices: [
      {
        id: 'reply-enthusiastic',
        text: 'Reply immediately. You\'re ready for this.',
        consequences: {
          statChanges: [{ stat: 'industryRespect', delta: 5 }],
          addTags: ['label-interest'],
          socialReaction: 'positive',
          flavorText: 'You fire back within minutes. They respond warmly. A call is scheduled for next week.',
        },
      },
      {
        id: 'play-cool',
        text: 'Wait a day. Play it cool.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 3 },
            { stat: 'industryRespect', delta: 8 },
          ],
          addTags: ['label-interest'],
          flavorText: 'Twenty-four hours pass. Your delayed response signals you\'re in demand. They\'re even more interested.',
        },
      },
      {
        id: 'ignore-independence',
        text: 'Leave it on read. You\'re building independently.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 10 },
            { stat: 'industryRespect', delta: -5 },
          ],
          addTags: ['indie-for-life'],
          socialReaction: 'positive',
          flavorText: 'Word gets around that you left Meridian on read. The underground community goes wild.',
        },
      },
    ],
    tags: ['career', 'label'],
    cooldown: 10,
    unique: false,
  },
  {
    id: 'label-deal-offer',
    category: 'career',
    title: 'The Label Offer Is On the Table',
    description:
      'Meridian Records put together a full deal: 3-album contract, 70/30 split in your favor, $50,000 advance. Your manager (if you have one) says it\'s decent but not great. Signing away creative control is the real question.',
    weight: 6,
    triggers: [
      { type: 'has_tag', tag: 'label-interest' },
      { type: 'fans_gte', value: 2000 },
      { type: 'lacks_tag', tag: 'label-deal' },
    ],
    choices: [
      {
        id: 'sign-deal',
        text: 'Sign the deal. The money and support are worth it.',
        consequences: {
          statChanges: [
            { stat: 'industryRespect', delta: 15 },
            { stat: 'authenticity', delta: -8 },
            { stat: 'fanLoyalty', delta: -5 },
          ],
          moneyDelta: 50000,
          fansDelta: 5000,
          addTags: ['label-deal', 'meridian-records'],
          socialReaction: 'mixed',
          flavorText:
            'The check clears. Your fans have mixed feelings — some celebrate, some mourn the independence.',
        },
      },
      {
        id: 'negotiate-better',
        text: 'Counter-offer. You want 80/20 and fewer albums.',
        consequences: {
          statChanges: [
            { stat: 'industryRespect', delta: 10 },
            { stat: 'charisma', delta: 5 },
          ],
          addTags: ['negotiating-label'],
          flavorText:
            'Bold move. They say they\'ll think about it. The counter-negotiation begins.',
        },
      },
      {
        id: 'reject-deal',
        text: 'Reject it. Your art belongs to you.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 15 },
            { stat: 'fanLoyalty', delta: 10 },
            { stat: 'industryRespect', delta: -10 },
          ],
          addTags: ['indie-for-life', 'refused-label'],
          socialReaction: 'positive',
          flavorText:
            'You walk away from $50,000. The internet erupts. #StayIndependent is trending by morning.',
        },
      },
    ],
    tags: ['career', 'label', 'major'],
    unique: true,
  },
  {
    id: 'producer-collab-offer',
    category: 'career',
    title: 'A Producer Wants to Work With You',
    description:
      'Dex Phantom — a producer known for crafting three number-one hits this year — reached out. He heard your latest and said he wants to build something. His beats cost $15K normally. He\'s offering a trade.',
    weight: 9,
    triggers: [
      { type: 'fans_gte', value: 200 },
      { type: 'stat_gte', stat: 'talent', value: 45 },
    ],
    choices: [
      {
        id: 'collab-agree',
        text: 'Agree immediately. Dex Phantom is elite.',
        consequences: {
          statChanges: [
            { stat: 'talent', delta: 8 },
            { stat: 'creativity', delta: 6 },
            { stat: 'industryRespect', delta: 10 },
          ],
          addTags: ['producer-collab', 'dex-phantom-link'],
          socialReaction: 'positive',
          flavorText:
            'The session is electric. You two vibe immediately. The track you build together is going to be different.',
        },
      },
      {
        id: 'collab-negotiate',
        text: 'Ask about ownership split before agreeing.',
        consequences: {
          statChanges: [
            { stat: 'discipline', delta: 5 },
            { stat: 'industryRespect', delta: 5 },
          ],
          addTags: ['producer-collab', 'dex-phantom-link'],
          flavorText:
            'He respects the question. You agree on a 60/40 split. The session is on.',
        },
      },
      {
        id: 'collab-decline',
        text: 'Decline. You produce your own sound.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 8 },
            { stat: 'creativity', delta: 3 },
          ],
          addTags: ['self-producer'],
          flavorText:
            'Dex is surprised. Your dedication to independence earns underground respect.',
        },
      },
    ],
    tags: ['career', 'producer'],
    cooldown: 6,
  },
  {
    id: 'open-mic-win',
    category: 'career',
    title: 'You Won the Open Mic',
    description:
      'You entered a local open mic competition — 30 artists, one winner. When they called your name, the room lost it. A small moment, but it feels like something starting.',
    weight: 12,
    triggers: [
      { type: 'fans_lte', value: 5000 },
      { type: 'stat_gte', stat: 'vocalSkill', value: 35 },
    ],
    choices: [
      {
        id: 'celebrate-post',
        text: 'Post about it. Let people know.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 5 },
            { stat: 'reputation', delta: 3 },
          ],
          fansDelta: 200,
          socialReaction: 'positive',
          flavorText:
            'The post gets traction. A few hundred new people click follow.',
        },
      },
      {
        id: 'stay-humble',
        text: 'Say nothing. Let the work speak.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 8 },
            { stat: 'discipline', delta: 3 },
          ],
          fansDelta: 80,
          flavorText:
            'The other artists spread the word. Your name is now known in the local scene.',
        },
      },
    ],
    tags: ['career', 'early'],
    cooldown: 4,
  },
  {
    id: 'song-goes-viral',
    category: 'career',
    title: 'One of Your Songs Is Going Viral',
    description:
      'It started with one TikTok sound. Then a big account used it. Then another. Now the song has a life of its own — and people who\'ve never heard of you are suddenly repeating your lyrics.',
    weight: 5,
    triggers: [
      { type: 'has_released_track' },
      { type: 'fans_gte', value: 1000 },
      { type: 'random', value: 0.3 },
    ],
    choices: [
      {
        id: 'ride-the-wave',
        text: 'Post content riding the trend. Capitalize immediately.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 8 },
            { stat: 'authenticity', delta: -5 },
          ],
          fansDelta: 50000,
          socialReaction: 'viral',
          flavorText:
            'You flood the algorithm. The fan count climbs daily. Some purists complain but they\'re outnumbered.',
        },
      },
      {
        id: 'stay-authentic',
        text: 'Post once and let it grow naturally.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 8 },
            { stat: 'fanLoyalty', delta: 10 },
          ],
          fansDelta: 25000,
          socialReaction: 'positive',
          flavorText:
            'Slower growth, but every new fan actually cares. The fanbase feels different now.',
        },
      },
    ],
    tags: ['career', 'viral', 'breakthrough'],
    cooldown: 20,
  },
  {
    id: 'award-nomination',
    category: 'career',
    title: 'You Got Nominated',
    description:
      'The Meridian Music Awards announced their nominees today. Your name is on the list — Best New Artist. The category is loaded. You won\'t win. But being named is everything right now.',
    weight: 4,
    triggers: [
      { type: 'fans_gte', value: 10000 },
      { type: 'stat_gte', stat: 'industryRespect', value: 40 },
      { type: 'has_released_track' },
    ],
    choices: [
      {
        id: 'attend-prepared',
        text: 'Attend. Dress to kill. Make it a moment.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 10 },
            { stat: 'industryRespect', delta: 12 },
            { stat: 'reputation', delta: 8 },
          ],
          fansDelta: 15000,
          socialReaction: 'positive',
          flavorText:
            'You walk the carpet and the photographers lose their minds. Every outlet covers your look.',
        },
      },
      {
        id: 'attend-lowkey',
        text: 'Attend, but keep it humble. Eyes open, mouth mostly closed.',
        consequences: {
          statChanges: [
            { stat: 'industryRespect', delta: 8 },
            { stat: 'authenticity', delta: 5 },
          ],
          fansDelta: 8000,
          flavorText:
            'You observe everything. Connections made in quiet corners at award shows are worth more than the trophy.',
        },
      },
      {
        id: 'skip-awards',
        text: 'Skip it. You\'re not about the politics.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 10 },
            { stat: 'industryRespect', delta: -8 },
          ],
          socialReaction: 'mixed',
          flavorText:
            'The absence speaks. Half the internet thinks you\'re too cool. The other half thinks you\'re ungrateful.',
        },
      },
    ],
    tags: ['career', 'awards', 'major'],
    cooldown: 20,
  },
  {
    id: 'interview-request',
    category: 'career',
    title: 'Big Media Wants an Interview',
    description:
      'SoundWire Magazine — the biggest music publication online — wants a full feature. Profile piece. Cover potential. They\'re known for asking hard questions.',
    weight: 7,
    triggers: [
      { type: 'fans_gte', value: 5000 },
      { type: 'stat_gte', stat: 'reputation', value: 40 },
    ],
    choices: [
      {
        id: 'interview-open',
        text: 'Do it fully open. No topics off limits.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 8 },
            { stat: 'authenticity', delta: 10 },
            { stat: 'reputation', delta: -5 },
          ],
          fansDelta: 10000,
          socialReaction: 'mixed',
          flavorText:
            'The interview gets clipped everywhere. Some quotes go wrong. Most go right. It\'s the most people have ever talked about you.',
        },
      },
      {
        id: 'interview-controlled',
        text: 'Do it, but have your publicist set conditions.',
        consequences: {
          statChanges: [
            { stat: 'industryRespect', delta: 5 },
            { stat: 'authenticity', delta: -5 },
          ],
          fansDelta: 5000,
          socialReaction: 'neutral',
          flavorText:
            'The interview is safe, polished. Nobody gets hurt. Nobody goes viral either.',
        },
      },
      {
        id: 'interview-decline',
        text: 'Decline. You\'re not ready for this level yet.',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: 5 },
            { stat: 'industryRespect', delta: -3 },
          ],
          flavorText:
            'You pass. SoundWire moves on. The moment waits for another day.',
        },
      },
    ],
    tags: ['career', 'media', 'press'],
    cooldown: 8,
  },
  {
    id: 'brand-deal',
    category: 'career',
    title: 'A Brand Wants to Pay You',
    description:
      'Apex Headphones reached out with a $20,000 sponsorship deal. One social post. One mention per month. Easy money — but your fans hate sellouts.',
    weight: 6,
    triggers: [
      { type: 'fans_gte', value: 15000 },
      { type: 'stat_gte', stat: 'charisma', value: 45 },
    ],
    choices: [
      {
        id: 'take-deal',
        text: 'Take the deal. Money is money.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: -10 },
            { stat: 'fanLoyalty', delta: -8 },
          ],
          moneyDelta: 20000,
          socialReaction: 'negative',
          flavorText:
            'The post drops. The comments are brutal. But the check clears.',
        },
      },
      {
        id: 'negotiate-creative',
        text: 'Negotiate creative control into the deal.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: -3 },
            { stat: 'charisma', delta: 5 },
          ],
          moneyDelta: 12000,
          socialReaction: 'neutral',
          flavorText:
            'You make the post feel organic. Less money but far less backlash.',
        },
      },
      {
        id: 'reject-deal',
        text: 'Reject it. Your brand is not for sale.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 12 },
            { stat: 'fanLoyalty', delta: 8 },
          ],
          socialReaction: 'positive',
          flavorText:
            'You post about turning down the deal. Your fans go insane. The loyalty compounds.',
        },
      },
    ],
    tags: ['career', 'money', 'brand'],
    cooldown: 6,
  },
  {
    id: 'playlist-placement',
    category: 'career',
    title: 'Your Song Hit a Major Playlist',
    description:
      'Vibestream\'s "Future Hits" playlist just added your track. That playlist has 4 million followers. Your streaming numbers are about to look very different.',
    weight: 7,
    triggers: [
      { type: 'has_released_track' },
      { type: 'fans_gte', value: 1000 },
      { type: 'stat_gte', stat: 'talent', value: 50 },
    ],
    choices: [
      {
        id: 'promote-placement',
        text: 'Aggressively promote the placement across all platforms.',
        consequences: {
          statChanges: [{ stat: 'charisma', delta: 5 }],
          fansDelta: 30000,
          socialReaction: 'positive',
          flavorText:
            'The push works. Numbers jump. 30,000 new people discovered you this week.',
        },
      },
      {
        id: 'let-it-breathe',
        text: 'Let the playlist do the work without overselling it.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 5 },
            { stat: 'fanLoyalty', delta: 5 },
          ],
          fansDelta: 18000,
          flavorText:
            'The growth is slower but the fans who find you organically tend to stick.',
        },
      },
    ],
    tags: ['career', 'streaming', 'growth'],
    cooldown: 8,
  },
  {
    id: 'manager-approach',
    category: 'career',
    title: 'Someone Wants to Manage You',
    description:
      'Marcus Dell — known for managing two platinum artists — reached out. He thinks you have something. Management would give you structure, access, and industry power. It also costs you 20% of everything.',
    weight: 5,
    triggers: [
      { type: 'fans_gte', value: 3000 },
      { type: 'lacks_tag', tag: 'has-manager' },
    ],
    choices: [
      {
        id: 'hire-manager',
        text: 'Sign with Marcus Dell.',
        consequences: {
          statChanges: [
            { stat: 'industryRespect', delta: 12 },
            { stat: 'discipline', delta: 8 },
          ],
          addTags: ['has-manager', 'marcus-dell'],
          flavorText:
            'Marcus starts making calls immediately. Doors you didn\'t know existed begin to open.',
        },
      },
      {
        id: 'self-manage',
        text: 'Decline. You manage yourself.',
        consequences: {
          statChanges: [
            { stat: 'discipline', delta: -5 },
            { stat: 'authenticity', delta: 8 },
          ],
          addTags: ['self-managed'],
          flavorText:
            'You keep full control. The road is harder but the ownership is yours.',
        },
      },
    ],
    tags: ['career', 'management'],
    unique: true,
  },
  {
    id: 'movie-soundtrack',
    category: 'career',
    title: 'Hollywood Wants Your Music',
    description:
      'A Netflix film director wants one of your tracks for a pivotal scene in a drama. The movie already has Oscar buzz. The sync fee is $8,000 and the exposure would be enormous.',
    weight: 3,
    triggers: [
      { type: 'has_released_track' },
      { type: 'fans_gte', value: 50000 },
      { type: 'stat_gte', stat: 'industryRespect', value: 50 },
    ],
    choices: [
      {
        id: 'accept-sync',
        text: 'Accept. Film syncs are career-defining.',
        consequences: {
          statChanges: [
            { stat: 'industryRespect', delta: 20 },
            { stat: 'creativity', delta: 5 },
          ],
          moneyDelta: 8000,
          fansDelta: 80000,
          socialReaction: 'positive',
          flavorText:
            'The scene hits. Critics quote your lyrics. The song streams double overnight.',
        },
      },
      {
        id: 'decline-sync',
        text: 'Decline. Your music isn\'t background noise.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 8 },
            { stat: 'industryRespect', delta: -5 },
          ],
          flavorText:
            'You pass on Hollywood. The underground appreciates the stance.',
        },
      },
    ],
    tags: ['career', 'media', 'film'],
    cooldown: 20,
  },
  {
    id: 'collab-request',
    category: 'career',
    title: 'Another Artist Wants to Collaborate',
    description:
      'An artist in your city — not famous but respected — slid into your DMs asking about a feature. If the collab works, both of you grow. If it flops, the comparison isn\'t flattering.',
    weight: 10,
    triggers: [
      { type: 'fans_gte', value: 500 },
      { type: 'stat_gte', stat: 'talent', value: 35 },
    ],
    choices: [
      {
        id: 'collab-yes',
        text: 'Say yes. Community matters.',
        consequences: {
          statChanges: [
            { stat: 'creativity', delta: 5 },
            { stat: 'charisma', delta: 5 },
          ],
          fansDelta: 3000,
          addTags: ['collab-history'],
          socialReaction: 'positive',
          flavorText:
            'The track drops and both fanbases collide. The chemistry is genuine.',
        },
      },
      {
        id: 'collab-no',
        text: 'Politely decline. The timing isn\'t right.',
        consequences: {
          statChanges: [{ stat: 'discipline', delta: 3 }],
          flavorText:
            'They understand. The focus stays on your own project.',
        },
      },
    ],
    tags: ['career', 'collab'],
    cooldown: 4,
  },
  {
    id: 'radio-airplay',
    category: 'career',
    title: 'Radio Just Started Playing Your Song',
    description:
      'A regional radio station added your track to rotation. Old-school, but it means your music is playing in cars, kitchens, and barbershops across your city.',
    weight: 6,
    triggers: [
      { type: 'has_released_track' },
      { type: 'fans_gte', value: 5000 },
      { type: 'stat_gte', stat: 'charisma', value: 50 },
    ],
    choices: [
      {
        id: 'radio-embrace',
        text: 'Embrace it. Call in to the station. Be gracious.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 7 },
            { stat: 'industryRespect', delta: 5 },
          ],
          fansDelta: 8000,
          socialReaction: 'positive',
          flavorText:
            'You call in live. The DJs love you. Their listeners do too.',
        },
      },
      {
        id: 'radio-ignore',
        text: 'Let it play. You don\'t need to celebrate radio.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 5 }],
          fansDelta: 4000,
          flavorText:
            'The radio plays on. New listeners find you at their own pace.',
        },
      },
    ],
    tags: ['career', 'radio', 'media'],
    cooldown: 12,
  },
  {
    id: 'reality-show-offer',
    category: 'career',
    title: 'Reality TV Came Knocking',
    description:
      'A streaming series called "Break or Make" — following 10 artists in a music competition — wants you as a cast member. The exposure is massive. The humiliation risk is real.',
    weight: 4,
    triggers: [
      { type: 'fans_gte', value: 2000 },
      { type: 'fans_lte', value: 200000 },
    ],
    choices: [
      {
        id: 'join-reality-show',
        text: 'Say yes. Exposure is exposure.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 10 },
            { stat: 'authenticity', delta: -15 },
            { stat: 'fanLoyalty', delta: -10 },
          ],
          fansDelta: 100000,
          addTags: ['reality-tv', 'controversy-magnet'],
          socialReaction: 'mixed',
          flavorText:
            'The cameras are always on. You gain 100,000 followers. Half of your old fans feel betrayed.',
        },
      },
      {
        id: 'reject-reality',
        text: 'Hard no. Reality TV is a trap.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 12 },
            { stat: 'fanLoyalty', delta: 8 },
          ],
          socialReaction: 'positive',
          flavorText:
            'You turn it down publicly. Your fans applaud the integrity.',
        },
      },
    ],
    tags: ['career', 'media', 'tv'],
    cooldown: 30,
    unique: true,
  },
  {
    id: 'streaming-milestone',
    category: 'career',
    title: 'You Just Hit a Streaming Milestone',
    description:
      'One of your tracks just crossed 1 million streams. The notification hits and for a second you just stare at the number.',
    weight: 8,
    triggers: [
      { type: 'has_released_track' },
      { type: 'fans_gte', value: 5000 },
    ],
    choices: [
      {
        id: 'celebrate-milestone',
        text: 'Post about it. The milestone deserves recognition.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 5 },
            { stat: 'reputation', delta: 3 },
          ],
          fansDelta: 5000,
          socialReaction: 'positive',
          flavorText:
            'The post blows up. Fans who helped get you there feel seen.',
        },
      },
      {
        id: 'quiet-milestone',
        text: 'Say nothing. Keep working.',
        consequences: {
          statChanges: [
            { stat: 'discipline', delta: 5 },
            { stat: 'authenticity', delta: 3 },
          ],
          flavorText:
            'The number means nothing without the next one. You keep your head down.',
        },
      },
    ],
    tags: ['career', 'milestone', 'streaming'],
    cooldown: 15,
  },
];
