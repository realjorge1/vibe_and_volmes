import type { GameEvent } from '../../types/events';

export const SOCIAL_EVENTS: GameEvent[] = [
  {
    id: 'fan-edit-viral',
    category: 'social',
    title: 'A Fan Edit of You Is Going Viral',
    description:
      'Someone made a highly produced fan edit — cinematic, emotional, perfectly soundtracked to your music. It has 2 million views and counting. The comments are people discovering you for the first time.',
    weight: 10,
    triggers: [
      { type: 'has_released_track' },
      { type: 'fans_gte', value: 2000 },
    ],
    choices: [
      {
        id: 'repost-edit',
        text: 'Share it on all your platforms. Show the love.',
        consequences: {
          statChanges: [
            { stat: 'fanLoyalty', delta: 12 },
            { stat: 'charisma', delta: 5 },
          ],
          fansDelta: 15000,
          socialReaction: 'positive',
          flavorText:
            'The creator loses their mind when you repost. New fans flood in through the share.',
        },
      },
      {
        id: 'ignore-edit',
        text: 'Don\'t engage. Let it live on its own.',
        consequences: {
          fansDelta: 8000,
          flavorText:
            'The edit keeps circulating. Not sharing it feels slightly wrong to the creator but the growth is still real.',
        },
      },
    ],
    tags: ['social', 'fans', 'viral'],
    cooldown: 8,
  },
  {
    id: 'meme-origin',
    category: 'social',
    title: 'You Became a Meme',
    description:
      'A clip — a face you made, a lyric twist, a candid moment — has been turned into a template. It\'s everywhere. Millions of people are using it. Most of them have no idea who you are.',
    weight: 8,
    triggers: [
      { type: 'fans_gte', value: 5000 },
      { type: 'random', value: 0.4 },
    ],
    choices: [
      {
        id: 'embrace-meme',
        text: 'Lean in. Post memes of yourself.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 15 },
            { stat: 'authenticity', delta: -5 },
          ],
          fansDelta: 40000,
          socialReaction: 'viral',
          flavorText:
            'You become the main character. The fan conversion rate from meme to listener is surprisingly good.',
        },
      },
      {
        id: 'ignore-meme',
        text: 'Don\'t acknowledge it. Keep the mystique.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 5 }],
          fansDelta: 15000,
          flavorText:
            'The meme circulates without your participation. Some people respect the silence.',
        },
      },
      {
        id: 'hate-meme',
        text: 'Post that you hate being a meme.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 8 },
            { stat: 'charisma', delta: -5 },
          ],
          fansDelta: 5000,
          socialReaction: 'mixed',
          flavorText:
            'The complaint creates its own content cycle. People meme your complaint.',
        },
      },
    ],
    tags: ['social', 'viral', 'meme'],
    cooldown: 15,
  },
  {
    id: 'fan-army-named',
    category: 'social',
    title: 'Your Fans Gave Themselves a Name',
    description:
      'Your fanbase — without you doing anything — organized and started calling themselves a name. They\'ve started fan accounts, Discord servers, and mass-streamed your catalog. The community is forming.',
    weight: 7,
    triggers: [
      { type: 'fans_gte', value: 10000 },
      { type: 'stat_gte', stat: 'fanLoyalty', value: 55 },
      { type: 'lacks_tag', tag: 'named-fanbase' },
    ],
    choices: [
      {
        id: 'endorse-fanbase',
        text: 'Officially endorse the name. Welcome the community.',
        consequences: {
          statChanges: [
            { stat: 'fanLoyalty', delta: 20 },
            { stat: 'charisma', delta: 8 },
          ],
          fansDelta: 12000,
          addTags: ['named-fanbase'],
          socialReaction: 'positive',
          flavorText:
            'The community explodes with excitement. They become an army overnight.',
        },
      },
      {
        id: 'suggest-new-name',
        text: 'Suggest a different name — one you actually like.',
        consequences: {
          statChanges: [
            { stat: 'fanLoyalty', delta: 10 },
            { stat: 'charisma', delta: 5 },
          ],
          fansDelta: 8000,
          addTags: ['named-fanbase'],
          flavorText:
            'They debate, vote, and ultimately love that you cared enough to engage.',
        },
      },
    ],
    tags: ['social', 'fans', 'community'],
    cooldown: 40,
    unique: true,
  },
  {
    id: 'hashtag-trends',
    category: 'social',
    title: 'A Hashtag About You Is Trending',
    description:
      'Whether it\'s praise, shade, or controversy — a hashtag with your name is number 3 trending right now. People are posting at a rate of 10,000 tweets per hour.',
    weight: 10,
    triggers: [
      { type: 'fans_gte', value: 5000 },
      { type: 'random', value: 0.5 },
    ],
    choices: [
      {
        id: 'engage-trending',
        text: 'Post into the trend. Ride the attention.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 8 },
            { stat: 'authenticity', delta: -3 },
          ],
          fansDelta: 20000,
          socialReaction: 'positive',
          flavorText:
            'Your post gets 50,000 likes. The hashtag lives another day.',
        },
      },
      {
        id: 'ignore-trending',
        text: 'Don\'t engage. Let the internet talk.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 5 }],
          fansDelta: 8000,
          flavorText:
            'The mystique of silence becomes its own topic in the trend.',
        },
      },
    ],
    tags: ['social', 'trending', 'viral'],
    cooldown: 6,
  },
  {
    id: 'stan-war',
    category: 'social',
    title: 'Your Fans and Another Fanbase Are at War',
    description:
      'It started with one comparison post. Now your fans and the fanbase of another major artist are in full combat mode online. Both sides are spamming each other\'s mentions.',
    weight: 7,
    triggers: [
      { type: 'fans_gte', value: 30000 },
      { type: 'stat_gte', stat: 'fanLoyalty', value: 50 },
    ],
    choices: [
      {
        id: 'call-truce',
        text: 'Post asking your fans to calm down.',
        consequences: {
          statChanges: [
            { stat: 'reputation', delta: 10 },
            { stat: 'fanLoyalty', delta: -8 },
            { stat: 'industryRespect', delta: 8 },
          ],
          socialReaction: 'positive',
          flavorText:
            'The call-out calms things down. The other artist reposted your statement. Briefly, you\'re allies.',
        },
      },
      {
        id: 'fuel-war',
        text: 'Post something that subtly fuels your fans\' side.',
        consequences: {
          statChanges: [
            { stat: 'fanLoyalty', delta: 15 },
            { stat: 'reputation', delta: -18 },
          ],
          fansDelta: 20000,
          addTags: ['enabled-fanbase'],
          socialReaction: 'negative',
          flavorText:
            'The war goes thermonuclear. New fans join just for the chaos.',
        },
      },
      {
        id: 'joke-war',
        text: 'Post a meme making fun of both fanbases equally.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 12 },
            { stat: 'fanLoyalty', delta: -5 },
          ],
          socialReaction: 'mixed',
          flavorText:
            'Both fanbases briefly unite to be upset at you. Then they laugh.',
        },
      },
    ],
    tags: ['social', 'fans', 'war', 'drama'],
    cooldown: 10,
  },
  {
    id: 'cancel-attempt',
    category: 'social',
    title: 'Someone Tried to Cancel You Today',
    description:
      'An account with 200K followers posted a thread attempting to expose or discredit you. It\'s based on a thin premise but it\'s gaining traction.',
    weight: 6,
    triggers: [
      { type: 'fans_gte', value: 15000 },
      { type: 'random', value: 0.35 },
    ],
    choices: [
      {
        id: 'clap-back',
        text: 'Clap back hard. Make it clear they\'re lying.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 10 },
            { stat: 'reputation', delta: -8 },
          ],
          socialReaction: 'mixed',
          flavorText:
            'The clap-back is fire. Your fans screenshot and share it. The thread poster disappears.',
        },
      },
      {
        id: 'let-fans-handle',
        text: 'Say nothing. Let your fans handle it.',
        consequences: {
          statChanges: [
            { stat: 'fanLoyalty', delta: 10 },
            { stat: 'reputation', delta: -5 },
          ],
          addTags: ['enabled-fanbase'],
          socialReaction: 'mixed',
          flavorText:
            'The fans go to war. The cancel attempt fails. The pile-on becomes concerning.',
        },
      },
      {
        id: 'rise-above',
        text: 'Post something completely unbothered and positive.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 10 },
            { stat: 'reputation', delta: 5 },
            { stat: 'charisma', delta: 8 },
          ],
          socialReaction: 'positive',
          flavorText:
            'The contrast makes the cancel attempt look small. The internet rewards the composure.',
        },
      },
    ],
    tags: ['social', 'cancel', 'drama'],
    cooldown: 10,
  },
  {
    id: 'viral-dance-challenge',
    category: 'social',
    title: 'Your Song Has a Dance Challenge',
    description:
      'Someone created a dance challenge to your track and it took off on TuneTok. 80,000 people have made videos. The song is everywhere.',
    weight: 6,
    triggers: [
      { type: 'has_released_track' },
      { type: 'fans_gte', value: 5000 },
      { type: 'random', value: 0.3 },
    ],
    choices: [
      {
        id: 'join-challenge',
        text: 'Film yourself doing the challenge.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 12 },
            { stat: 'authenticity', delta: -5 },
          ],
          fansDelta: 60000,
          socialReaction: 'viral',
          flavorText:
            'The original creator duets your video and it hits 5 million views. The song charts.',
        },
      },
      {
        id: 'skip-challenge',
        text: 'Let the challenge exist without joining it.',
        consequences: {
          fansDelta: 25000,
          socialReaction: 'positive',
          flavorText:
            'The challenge stays organic. The mystery of your absence is its own talking point.',
        },
      },
    ],
    tags: ['social', 'viral', 'dance', 'tunetok'],
    cooldown: 20,
  },
  {
    id: 'charity-moment-viral',
    category: 'social',
    title: 'A Good Deed Just Went Viral',
    description:
      'Someone filmed you doing something genuinely kind — helping a fan, surprising a shelter, paying for someone\'s meal. You didn\'t know they were recording.',
    weight: 5,
    triggers: [
      { type: 'stat_gte', stat: 'authenticity', value: 55 },
      { type: 'fans_gte', value: 3000 },
    ],
    choices: [
      {
        id: 'acknowledge-moment',
        text: 'Acknowledge it briefly. Express that kindness isn\'t a performance.',
        consequences: {
          statChanges: [
            { stat: 'reputation', delta: 15 },
            { stat: 'authenticity', delta: 10 },
            { stat: 'fanLoyalty', delta: 12 },
          ],
          fansDelta: 20000,
          socialReaction: 'positive',
          flavorText:
            'The sincerity is palpable. People share the original video for weeks.',
        },
      },
      {
        id: 'do-more',
        text: 'Use the moment to announce a charity initiative.',
        consequences: {
          statChanges: [
            { stat: 'reputation', delta: 20 },
            { stat: 'industryRespect', delta: 8 },
          ],
          fansDelta: 30000,
          moneyDelta: -2000,
          socialReaction: 'positive',
          flavorText:
            'You convert one viral moment into an ongoing cause. The press covers it.',
        },
      },
    ],
    tags: ['social', 'positive', 'reputation'],
    cooldown: 20,
  },
];
