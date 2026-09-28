import type { GameEvent } from '../../types/events';

export const DRAMA_EVENTS: GameEvent[] = [
  {
    id: 'leaked-messages',
    category: 'drama',
    title: 'Your Old Messages Just Got Leaked',
    description:
      'Screenshots of private messages from two years ago are circulating. The context is missing. The quotes — taken out of context — are not flattering. The comments are already loading.',
    weight: 7,
    triggers: [
      { type: 'fans_gte', value: 5000 },
      { type: 'random', value: 0.4 },
    ],
    choices: [
      {
        id: 'apologize-fast',
        text: 'Post a full apology immediately. Get ahead of it.',
        consequences: {
          statChanges: [
            { stat: 'reputation', delta: -8 },
            { stat: 'authenticity', delta: 5 },
            { stat: 'charisma', delta: 3 },
          ],
          addTags: ['issued-apology'],
          socialReaction: 'mixed',
          flavorText:
            'Some people accept it. Others say the apology was too rehearsed. The story lives two more days.',
        },
      },
      {
        id: 'deny-context',
        text: 'Post that the messages are fake or missing context.',
        consequences: {
          statChanges: [
            { stat: 'reputation', delta: -15 },
            { stat: 'authenticity', delta: -10 },
          ],
          addTags: ['lied-publicly'],
          socialReaction: 'negative',
          flavorText:
            'The original source drops more screenshots. It gets worse before it gets better.',
        },
      },
      {
        id: 'stay-silent',
        text: 'Say nothing. Let it die on its own.',
        consequences: {
          statChanges: [
            { stat: 'reputation', delta: -10 },
            { stat: 'mentalHealth', delta: -10 },
          ],
          socialReaction: 'negative',
          flavorText:
            'The silence is interpreted as guilt. The story trends for three days.',
        },
      },
      {
        id: 'address-directly',
        text: 'Go live. Address it directly with full transparency.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 15 },
            { stat: 'fanLoyalty', delta: 10 },
            { stat: 'reputation', delta: -5 },
          ],
          socialReaction: 'positive',
          flavorText:
            'The live is raw and real. Most fans rally behind you. A few leave. The ones who stay, stay hard.',
        },
      },
    ],
    tags: ['drama', 'scandal', 'social-media'],
    cooldown: 12,
  },
  {
    id: 'cheating-allegations',
    category: 'drama',
    title: 'Cheating Allegations Are Spreading',
    description:
      'Someone is claiming they were romantically involved with you while you were in a relationship. No evidence yet — just a Twitter thread with 50,000 likes and growing.',
    weight: 5,
    triggers: [
      { type: 'fans_gte', value: 10000 },
      { type: 'random', value: 0.3 },
    ],
    choices: [
      {
        id: 'deny-allegations',
        text: 'Deny everything. It\'s all lies.',
        consequences: {
          statChanges: [
            { stat: 'reputation', delta: -5 },
            { stat: 'authenticity', delta: -8 },
          ],
          socialReaction: 'mixed',
          flavorText:
            'The internet splits. Your loyal fans believe you. Everyone else picks a side.',
        },
      },
      {
        id: 'confirm-apologize',
        text: 'Confirm it and apologize deeply.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 10 },
            { stat: 'reputation', delta: -20 },
            { stat: 'fanLoyalty', delta: -15 },
          ],
          addTags: ['admitted-cheating', 'cancelled-wave'],
          socialReaction: 'negative',
          flavorText:
            'The honesty is respected by some. The consequences are severe. #Cancel starts trending.',
        },
      },
      {
        id: 'no-comment',
        text: 'No comment. Private life stays private.',
        consequences: {
          statChanges: [
            { stat: 'reputation', delta: -8 },
            { stat: 'mentalHealth', delta: -8 },
          ],
          socialReaction: 'mixed',
          flavorText:
            'The "no comment" only fuels speculation. People fill the silence with their own stories.',
        },
      },
    ],
    tags: ['drama', 'scandal', 'personal'],
    cooldown: 15,
  },
  {
    id: 'plagiarism-accusation',
    category: 'drama',
    title: 'Someone Says You Stole Their Song',
    description:
      'An independent artist dropped a thread claiming your biggest song sounds suspiciously similar to a track they released three years ago — on a Soundcloud with 200 plays.',
    weight: 6,
    triggers: [
      { type: 'has_released_track' },
      { type: 'fans_gte', value: 5000 },
    ],
    choices: [
      {
        id: 'deny-plagiarism',
        text: 'Deny it firmly. You\'ve never heard their song.',
        consequences: {
          statChanges: [
            { stat: 'reputation', delta: -5 },
            { stat: 'authenticity', delta: -5 },
          ],
          socialReaction: 'mixed',
          flavorText:
            'A music theory thread goes viral comparing the songs. People debate endlessly. No clear verdict.',
        },
      },
      {
        id: 'settle-quietly',
        text: 'Reach out privately and offer to settle.',
        consequences: {
          statChanges: [
            { stat: 'industryRespect', delta: 8 },
            { stat: 'reputation', delta: 3 },
          ],
          moneyDelta: -5000,
          flavorText:
            'The situation dies quickly. Word gets around that you handled it with class.',
        },
      },
      {
        id: 'call-bluff',
        text: 'Publicly challenge them to sue. Call their bluff.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 8 },
            { stat: 'authenticity', delta: -5 },
            { stat: 'industryRespect', delta: -8 },
          ],
          socialReaction: 'mixed',
          flavorText:
            'The boldness earns clout from some. The industry thinks it\'s reckless.',
        },
      },
    ],
    tags: ['drama', 'legal', 'music'],
    cooldown: 20,
  },
  {
    id: 'old-posts-resurface',
    category: 'drama',
    title: 'Your Old Posts Just Resurfaced',
    description:
      'A fan account dug up posts from your early social media days. Some of what you said back then doesn\'t age well. The posts are getting shared with commentary.',
    weight: 8,
    triggers: [
      { type: 'fans_gte', value: 20000 },
      { type: 'week_gte', value: 15 },
    ],
    choices: [
      {
        id: 'apologize-old-posts',
        text: 'Acknowledge them. You were younger and you\'ve grown.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 10 },
            { stat: 'reputation', delta: -5 },
          ],
          addTags: ['addressed-past'],
          socialReaction: 'mixed',
          flavorText:
            'The statement is measured. Most fans appreciate the growth narrative. Some are still upset.',
        },
      },
      {
        id: 'deflect-old-posts',
        text: 'Post something new and bury it with distraction.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: -8 },
            { stat: 'charisma', delta: 5 },
          ],
          socialReaction: 'negative',
          flavorText:
            'The attempt to distract doesn\'t work. People archive both.',
        },
      },
      {
        id: 'own-old-posts',
        text: 'Fully own them without apology. That was you.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 15 },
            { stat: 'reputation', delta: -12 },
            { stat: 'fanLoyalty', delta: 8 },
          ],
          socialReaction: 'mixed',
          addTags: ['unapologetic'],
          flavorText:
            'The unapologetic stance splits the internet. Your core fans dig in harder. New fans are scared off.',
        },
      },
    ],
    tags: ['drama', 'scandal', 'past'],
    cooldown: 25,
    unique: true,
  },
  {
    id: 'drunk-post',
    category: 'drama',
    title: 'You Posted While Drunk',
    description:
      'It was 2 AM. You had a few drinks. You posted a string of things that — in the daylight — look very different. The comments are already moving.',
    weight: 8,
    triggers: [
      { type: 'stat_lte', stat: 'discipline', value: 50 },
      { type: 'fans_gte', value: 1000 },
      { type: 'random', value: 0.4 },
    ],
    choices: [
      {
        id: 'delete-act-normal',
        text: 'Delete everything and act like it didn\'t happen.',
        consequences: {
          statChanges: [
            { stat: 'reputation', delta: -8 },
            { stat: 'authenticity', delta: -5 },
          ],
          socialReaction: 'negative',
          flavorText:
            'Screenshots existed before you deleted. The "2AM deleted post" becomes its own story.',
        },
      },
      {
        id: 'leave-it-up',
        text: 'Leave the posts up. Own it.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 8 },
            { stat: 'reputation', delta: -10 },
            { stat: 'charisma', delta: 5 },
          ],
          addTags: ['chaotic-energy'],
          socialReaction: 'mixed',
          flavorText:
            'The posts are unhinged and people can\'t look away. You trend for 24 hours.',
        },
      },
      {
        id: 'joke-about-it',
        text: 'Wake up and joke about it publicly.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 12 },
            { stat: 'reputation', delta: -3 },
            { stat: 'fanLoyalty', delta: 8 },
          ],
          socialReaction: 'positive',
          flavorText:
            'The self-awareness kills it. Everyone loves a person who can laugh at themselves.',
        },
      },
    ],
    tags: ['drama', 'social-media', 'personal'],
    cooldown: 10,
  },
  {
    id: 'cancel-wave',
    category: 'drama',
    title: 'The Cancel Culture Found You',
    description:
      'Suddenly your name is attached to a broad internet outrage campaign. The reasons are partially manufactured, partially real. The hashtag is moving fast.',
    weight: 5,
    triggers: [
      { type: 'fans_gte', value: 50000 },
      { type: 'has_tag', tag: 'controversy-magnet' },
    ],
    choices: [
      {
        id: 'fight-cancel',
        text: 'Fight back. You\'re not cancelled.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 8 },
            { stat: 'reputation', delta: -20 },
            { stat: 'fanLoyalty', delta: 15 },
          ],
          addTags: ['fought-cancel', 'controversial'],
          socialReaction: 'mixed',
          flavorText:
            'The fight makes it worse and better simultaneously. Enemies double down. Fans armor up.',
        },
      },
      {
        id: 'go-quiet',
        text: 'Log off. Disappear for a few weeks.',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: 10 },
            { stat: 'reputation', delta: -10 },
            { stat: 'fans', delta: -5 },
          ],
          socialReaction: 'neutral',
          flavorText:
            'The internet gets bored quickly. Three weeks of silence and people have moved on.',
        },
      },
      {
        id: 'comeback-with-music',
        text: 'Drop music instead of a response. Let the work answer.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 15 },
            { stat: 'reputation', delta: -5 },
            { stat: 'fanLoyalty', delta: 12 },
          ],
          socialReaction: 'positive',
          addTags: ['responded-with-music'],
          flavorText:
            'You release a track instead of a statement. The music rewrites the narrative.',
        },
      },
    ],
    tags: ['drama', 'cancel', 'major'],
    cooldown: 30,
  },
  {
    id: 'expose-thread',
    category: 'drama',
    title: 'An Ex Just Posted a Thread About You',
    description:
      'Someone you used to be close with — romantically or professionally — published a detailed thread about their experience with you. It\'s getting thousands of retweets.',
    weight: 5,
    triggers: [
      { type: 'fans_gte', value: 15000 },
      { type: 'random', value: 0.35 },
    ],
    choices: [
      {
        id: 'respond-thread',
        text: 'Write a detailed response post.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 5 },
            { stat: 'reputation', delta: -10 },
          ],
          socialReaction: 'mixed',
          flavorText:
            'The back-and-forth spirals. Both of you trend. Lawyers get mentioned.',
        },
      },
      {
        id: 'ignore-thread',
        text: 'Ignore it completely. No comment.',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: -15 },
            { stat: 'reputation', delta: -8 },
          ],
          socialReaction: 'negative',
          flavorText:
            'The silence amplifies the narrative. Everyone assumes it\'s true.',
        },
      },
      {
        id: 'brief-response',
        text: 'Post one brief, dignified statement and stop there.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 8 },
            { stat: 'reputation', delta: -3 },
            { stat: 'industryRespect', delta: 5 },
          ],
          socialReaction: 'mixed',
          flavorText:
            'The measured response earns respect. The industry notices the composure.',
        },
      },
    ],
    tags: ['drama', 'scandal', 'personal', 'social-media'],
    cooldown: 20,
  },
  {
    id: 'cultural-appropriation',
    category: 'drama',
    title: 'You\'re Being Called Out for Cultural Appropriation',
    description:
      'A prominent critic published a piece accusing you of borrowing cultural elements from communities you\'re not part of. The discourse is getting louder.',
    weight: 4,
    triggers: [
      { type: 'fans_gte', value: 30000 },
      { type: 'random', value: 0.25 },
    ],
    choices: [
      {
        id: 'listen-and-learn',
        text: 'Take the criticism seriously. Listen and respond thoughtfully.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 10 },
            { stat: 'reputation', delta: 5 },
            { stat: 'charisma', delta: 5 },
          ],
          socialReaction: 'positive',
          flavorText:
            'Your response is mature. Critics who expected denial are surprised. The tone shifts.',
        },
      },
      {
        id: 'defend-self',
        text: 'Defend yourself. Art has no borders.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: -5 },
            { stat: 'reputation', delta: -15 },
          ],
          addTags: ['controversy-magnet'],
          socialReaction: 'negative',
          flavorText:
            'The defense lands poorly. The article gets more shares. The topic stays alive.',
        },
      },
    ],
    tags: ['drama', 'cultural', 'controversy'],
    cooldown: 30,
  },
  {
    id: 'stage-meltdown',
    category: 'drama',
    title: 'You Had a Moment On Stage',
    description:
      'Something went wrong at the show last night. Whether it was technical issues, personal stress, or something in the crowd — you broke character. The video is everywhere.',
    weight: 5,
    triggers: [
      { type: 'stat_lte', stat: 'mentalHealth', value: 40 },
      { type: 'fans_gte', value: 5000 },
    ],
    choices: [
      {
        id: 'meltdown-apologize',
        text: 'Apologize to fans. Be human about it.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 10 },
            { stat: 'fanLoyalty', delta: 8 },
            { stat: 'reputation', delta: -5 },
          ],
          addTags: ['vulnerable-public'],
          socialReaction: 'positive',
          flavorText:
            'The vulnerability is real. Fans who\'ve felt the same way rally around you.',
        },
      },
      {
        id: 'spin-it-art',
        text: 'Frame it as artistic expression. It was intentional.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: -10 },
            { stat: 'charisma', delta: 5 },
          ],
          socialReaction: 'mixed',
          flavorText:
            'Half the internet buys it as performance art. The other half doesn\'t.',
        },
      },
    ],
    tags: ['drama', 'mental-health', 'performance'],
    cooldown: 10,
  },
  {
    id: 'label-dispute-public',
    category: 'drama',
    title: 'Your Label Drama Just Went Public',
    description:
      'Internal conflicts with your label have been leaking for weeks. Now a music journalist published a full account. Sources close to the situation are talking.',
    weight: 4,
    triggers: [
      { type: 'has_tag', tag: 'label-deal' },
      { type: 'random', value: 0.35 },
    ],
    choices: [
      {
        id: 'confirm-dispute',
        text: 'Confirm the conflict. Your fans deserve the truth.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 15 },
            { stat: 'industryRespect', delta: -20 },
            { stat: 'fanLoyalty', delta: 15 },
          ],
          addTags: ['label-feud'],
          socialReaction: 'mixed',
          flavorText:
            'The label goes cold. But your fans become a movement defending your independence.',
        },
      },
      {
        id: 'deny-dispute',
        text: 'Deny everything. "We\'re all good here."',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: -10 },
            { stat: 'industryRespect', delta: 5 },
          ],
          socialReaction: 'negative',
          flavorText:
            'Nobody believes the statement but the label is appeased for now.',
        },
      },
    ],
    tags: ['drama', 'industry', 'label'],
    cooldown: 20,
  },
  {
    id: 'tour-cancellation',
    category: 'drama',
    title: 'You Cancelled the Tour',
    description:
      'You pulled out of a scheduled tour. The reasons are real — mental health, burnout, family. But tickets were sold. Refunds are being processed. The internet is reacting.',
    weight: 4,
    triggers: [
      { type: 'stat_lte', stat: 'mentalHealth', value: 35 },
      { type: 'fans_gte', value: 30000 },
    ],
    choices: [
      {
        id: 'honest-cancel',
        text: 'Release a full honest statement about why.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 15 },
            { stat: 'fanLoyalty', delta: 5 },
            { stat: 'mentalHealth', delta: 10 },
          ],
          socialReaction: 'mixed',
          flavorText:
            'The honesty divides people. Mental health advocates rally. Others demand refunds.',
        },
      },
      {
        id: 'vague-cancel',
        text: 'Post a vague "I need a break" and go quiet.',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: 15 },
            { stat: 'reputation', delta: -12 },
          ],
          socialReaction: 'negative',
          flavorText:
            'The mystery makes fans anxious. Rumors fill the silence.',
        },
      },
    ],
    tags: ['drama', 'tour', 'mental-health'],
    cooldown: 20,
  },
  {
    id: 'feuding-fans',
    category: 'drama',
    title: 'Your Fans Are Attacking Someone',
    description:
      'Your fanbase — unprompted — decided to go to war with another artist\'s audience. Death threats have been sent. The attacked artist is posting about it.',
    weight: 6,
    triggers: [
      { type: 'fans_gte', value: 50000 },
      { type: 'stat_gte', stat: 'fanLoyalty', value: 60 },
    ],
    choices: [
      {
        id: 'condemn-fans',
        text: 'Publicly condemn the behavior. Your fans need to stop.',
        consequences: {
          statChanges: [
            { stat: 'reputation', delta: 12 },
            { stat: 'fanLoyalty', delta: -15 },
            { stat: 'industryRespect', delta: 10 },
          ],
          socialReaction: 'positive',
          flavorText:
            'The industry respects the call-out. Some fans leave. The responsible ones stay.',
        },
      },
      {
        id: 'stay-quiet-fans',
        text: 'Say nothing. It\'ll die down.',
        consequences: {
          statChanges: [
            { stat: 'reputation', delta: -15 },
            { stat: 'authenticity', delta: -8 },
          ],
          addTags: ['enabled-fanbase'],
          socialReaction: 'negative',
          flavorText:
            'The silence is seen as approval. The attacked artist names you. It escalates.',
        },
      },
      {
        id: 'subtle-encourage',
        text: 'Post something vague that subtly fires your fans up more.',
        consequences: {
          statChanges: [
            { stat: 'fanLoyalty', delta: 15 },
            { stat: 'reputation', delta: -25 },
            { stat: 'industryRespect', delta: -15 },
          ],
          addTags: ['enabled-fanbase', 'controversy-magnet'],
          socialReaction: 'negative',
          flavorText:
            'The fan war goes nuclear. You gain stans. You lose everyone else.',
        },
      },
    ],
    tags: ['drama', 'fans', 'controversy'],
    cooldown: 12,
  },
];
