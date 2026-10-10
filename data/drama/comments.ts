/**
 * Comment lines for the drama layer. Same tokens as the takes ({name} is the
 * artist here, plus {topic} {rival} {partner} {trackTitle} and pronouns).
 */

/** Under the artist's own posts: the people who love them. */
export const FAN: readonly string[] = [
  'FINALLY 😭😭😭',
  'the way I screamed',
  'on repeat since midnight',
  'this one is different fr',
  '{name} never misses 🔥🔥',
  'song of the year and it is not close',
  'come to {city}!!!',
  'the second verse?? I need a minute',
  'played it 40 times already, no shame',
  'we been waiting for THIS',
  'not me crying at work over this',
  'the beat switch 😮‍💨',
  'okay but the cover art 😍',
  'chills. actual chills.',
  'proud of you fr 🥹',
  "{name} said 'let me remind them' 😤",
  'I was here before the blue check, remember that',
  'my whole group chat is talking about this',
];

/** Admirers, by the artist's gender. Kept to a sprinkle per thread. */
export const THIRST_COMMENTS: Record<'male' | 'female' | 'nonbinary', readonly string[]> = {
  male: [
    "sir it's 2am why do you look like that 😩",
    "I'm in love with you and it's not even a joke anymore",
    'husband ✍️',
    'marry me challenge',
    'you can get it. that is all.',
    'whoever has you is so lucky 😮‍💨',
    "can't focus on the music because of... the music 👀",
    'the arms 😮‍💨',
  ],
  female: [
    "ma'am it's 2am why do you look like that 😩",
    'wifey ✍️',
    "marry me. I'm serious. I have a job",
    "I'd fight a bear for you",
    "how are you this talented AND this fine",
    'whoever has you is so lucky 😮‍💨',
    'the smile 🥹 the voice 🥹',
    'not me liking every single post again',
  ],
  nonbinary: ['marry me challenge', 'you can get it. that is all.', 'the whole look 😮‍💨', 'obsessed. respectfully.'],
};

/** Haters in the replies. */
export const HATER: readonly string[] = [
  'mid. next.',
  'the old stuff was better tbh',
  'who asked 💀',
  'flop era loading…',
  'industry plant energy',
  'ratio',
  'my ears are bleeding but go off',
  "this ain't it chief",
  'auto-tune is doing the heavy lifting here',
  "y'all really clapping for this?",
  'unfollowed',
];

/** Jokes and roasts that aren't really hate. */
export const BANTER: readonly string[] = [
  'the way {name} posts and disappears for 3 weeks',
  "{name} replying to everyone but me again I see how it is 😤",
  'not the caption being one emoji 💀',
  'who is doing {his} lighting?? because I need them',
  '{name} really thinks we forgot about the sunglasses indoors',
  'first comment. I win. no prize.',
  "this post is giving 'my publicist said post something'",
];

/** The fans who are a little too much. */
export const CRAZY: readonly string[] = [
  'notice me 🥺 I have commented on 312 of your posts',
  "{name} I named my dog after you and he's now famous on my street",
  'I will be outside your hotel. jk. unless? 👀',
  "I've seen you live 9 times. my bank account is crying. worth it",
  'please follow me back it would heal my generational trauma',
  'I printed this post and framed it. normal behavior',
];

/** "Check my page" people. */
export const WANNABE: readonly string[] = [
  'yo check my page I make music too 🔥🎤',
  'collab?? I got a verse ready 👀 DM me',
  'I sound just like you but better, link in bio 😤',
  'can you repost my cover please 🙏🙏',
];

/** When a scandal is burning, it follows the artist into every comment section. */
export const ADDRESS_IT: readonly string[] = [
  "we're not going to talk about {topic}?",
  'address {topic} first 🤨',
  'posting like {topic} never happened 💀',
  'the comments are just people asking about {topic} 😭',
  'unfollowing until you explain {topic}',
  'still riding with you no matter what. {topic} is overblown',
  "y'all leave {him} alone about {topic}",
];

/** Rival fans raiding. */
export const RIVAL_RAID: readonly string[] = [
  '{rival} clears 🏆',
  '{rival} would never',
  'this is why {rival} is winning',
  '{rival} fans in here to remind you who won',
  'tell {rival} I said hi 😂',
];

/** Wholesome replies after a good deed. */
export const WHOLESOME: readonly string[] = [
  'what you did for {topic} 🥹 real one',
  'heard about {topic}. proud to be a fan',
  "the world needs more people like you",
  '{topic} made me cry ngl',
];

/** Shippers when the artist is dating. */
export const SHIPPER: readonly string[] = [
  'where is {partner} 👀',
  'you and {partner} are my parents now',
  'post {partner} more, that is all',
  "{partner} is so lucky. or are you lucky? both. both are lucky",
];
