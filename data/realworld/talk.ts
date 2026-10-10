import type { RealCategory } from '../../types/realworld';

/**
 * HOW PEOPLE TALK ABOUT WHAT'S HAPPENING IN THE REAL WORLD.
 *
 * Rules for every line here:
 * - react to the topic (excitement, awe, jokes about yourself, "who's
 *   watching?"), never claim facts the headline didn't, never say anything
 *   bad about a real person
 * - friendly banter about teams, phones and games is fine; mocking people,
 *   taking political or religious sides is not
 *
 * Placeholders: {topic} the short name ("the Dodgers", "iPhone 18"), {a} {b}
 * the two sides of a matchup, {city} the player's city, {friend} a handle.
 */

export interface RealTalk {
  /** Someone posting about it ({topic} is its name). */
  posts: readonly string[];
  /** Someone quoting the headline: no name needed, the card shows it. */
  quotes: readonly string[];
  /** Comments under a post about it. */
  comments: readonly string[];
  /** Comments that use the name. */
  named: readonly string[];
  /** A matchup: {a} vs {b}. */
  matchup?: readonly string[];
  /** TokTalk video captions about it. */
  tok: readonly string[];
  /** How the news pages open a post ("🚨", "JUST IN:"). */
  leads: readonly string[];
}

export const REAL_TALK: Record<RealCategory, RealTalk> = {
  sports: {
    posts: [
      'who else is watching {topic} tonight 👀',
      '{topic} has my whole timeline going crazy',
      'can’t focus on anything, {topic} is all I’m thinking about',
      'the group chat is losing it over {topic} 😭',
      '{topic} had me screaming at my TV',
      'work tomorrow but {topic} is more important',
      'say what you want, {topic} is must-watch right now',
      'my heart can’t take {topic} anymore 😭',
      'okay {topic} is actually getting interesting',
      'everybody’s an expert on {topic} today 😂',
      'watching {topic} with the volume all the way up',
      '{topic} discourse is undefeated on here',
    ],
    quotes: ['WAIT 😭', 'oh this is big', 'called it months ago', 'the timeline is about to go crazy', 'I need to sit down', 'sports really is the best reality show', 'this season is wild man', 'okay now it’s getting serious', 'my group chat is already arguing about this 😂', 'can’t wait to see how this plays out'],
    comments: [
      'what a game honestly',
      'my heart can’t take these late games',
      'this season is going to be crazy',
      'who else stayed up for this 🙋',
      'the atmosphere looked unreal',
      'the refs need to explain themselves 😂',
      'my team is gonna be the end of me one day',
      'that last stretch had me pacing in my living room',
      'can’t wait for the rematch',
      'the highlights don’t do it justice',
      'sports twitter is undefeated today',
      'both sides played their hearts out honestly',
      'I’m too invested in this 😭',
      'watching this at work was a mistake',
      'see you all here next week, same time',
      'the commentary was elite too',
      'some of y’all celebrated way too early 😂',
      'my dad called me just to talk about this',
    ],
    named: ['{topic} never makes it easy 😭', 'nobody talk to me about {topic} until tomorrow', 'been waiting all week for {topic}', '{topic} fans are eating good today', 'the {topic} talk has taken over my feed'],
    matchup: ['{a} vs {b} is the only thing on my mind', 'who you got, {a} or {b}?', '{a} vs {b} is going to be a movie', 'my whole house is split on {a} vs {b} 😂', 'anyone else still thinking about {a} vs {b}?'],
    tok: ['POV: you stayed up for {topic} 😭', 'my reaction to {topic} 😭', 'the {topic} watch party went crazy', 'explaining {topic} to my friends who don’t watch sports', 'the vibes at the {topic} watch party'],
    leads: ['', '', '🚨 ', 'JUST IN: ', '⚽🏀🏈 ', 'REPORT: '],
  },
  tech: {
    posts: [
      'is anyone actually getting {topic}? 👀',
      '{topic} looks clean ngl',
      'my wallet is already nervous about {topic} 😭',
      'okay {topic} is all over my timeline today',
      'I’ll wait for the reviews on {topic}, I learned my lesson',
      '{topic} or keep my old one another year? help',
      'tech twitter is going crazy over {topic}',
      'not me watching every {topic} video at 2am',
      'the {topic} hype is real today',
    ],
    quotes: ['take my money 😭', 'okay this is actually cool', 'my current phone heard this and started lagging 😂', 'the future is here I guess', 'I’ll wait for the reviews', 'this is huge for nerds like me', 'my wallet said no', 'need this immediately', 'okay but what’s the battery like', 'tech companies really drop everything at once'],
    comments: [
      'do I upgrade or wait another year 😭',
      'the battery better be good this time',
      'my wallet is already crying',
      'the design is so clean',
      'I’ll wait for the reviews',
      'tech companies drop everything at once I swear',
      'android vs iphone debate starting in 3… 2… 1… 😂',
      'my 4 year old phone is holding on for dear life',
      'the price is gonna be the real headline',
      'need a full review before I believe anything',
      'my friend who knows tech already texted me about this',
      'okay this is actually useful for once',
      'can it make my notifications less stressful though 😂',
      'adding to my wishlist, not my cart',
    ],
    named: ['{topic} is all anyone at work is talking about', 'the {topic} reviews are gonna be interesting', 'saving up for {topic} starting today 😭', '{topic} looks like a real upgrade honestly'],
    tok: ['unboxing energy for {topic} 📦', 'everything you need to know about {topic} in 30 seconds', 'my honest first take on {topic}', 'POV: you’re deciding whether to get {topic}'],
    leads: ['', '', '📱 ', 'JUST IN: ', 'NEW: '],
  },
  gaming: {
    posts: [
      'clearing my whole weekend for {topic} 🎮',
      'my backlog is already too long and now {topic} 😭',
      '{topic} looks so good, day one for me',
      'who’s playing {topic} with me??',
      'the {topic} hype is real in my group chat',
      'not me checking for {topic} news every hour',
      '{topic} is the only thing I want to talk about today',
    ],
    quotes: ['DAY ONE 🎮', 'my backlog is crying', 'the trailer had me hyped', 'clearing my schedule', 'okay this looks so good', 'gamers we eating good', 'the wait is going to feel forever', 'adding to my wishlist right now'],
    comments: [
      'my backlog is already too long 😭',
      'day one purchase for me',
      'the trailer had me hyped',
      'clearing my weekend for this',
      'this better run well on my setup',
      'who’s squading up?',
      'my console heard this and started heating up 😂',
      'the graphics look unreal',
      'the community is gonna be wild for this',
      'saving up for this one',
      'I’ve been waiting for this for years',
      'someone tell my boss I’m sick that day 😂',
    ],
    named: ['{topic} is going to eat my whole weekend', 'the {topic} community is about to be unhinged', 'I’ve been waiting so long for {topic}', '{topic} hype is unmatched'],
    tok: ['my reaction to {topic} 🎮', 'POV: {topic} finally drops', 'ranking everything we know about {topic}', 'first hour of {topic} vibes'],
    leads: ['', '🎮 ', 'NEW: ', 'JUST IN: '],
  },
  science: {
    posts: [
      'reading about {topic} and my brain is melting in a good way',
      'science is so cool, {topic} is proof',
      '{topic} is the kind of news I’m here for',
      'okay {topic} is fascinating actually',
      'down a 2 hour rabbit hole about {topic} 😭',
      'can we talk about {topic} for a second',
    ],
    quotes: ['science is so cool', 'the universe is wild', 'this is the kind of news I’m here for', 'I understood 20% of this and I’m still amazed', 'scientists really out here doing the most and I love it', 'this is fascinating', 'my brain needs a minute', 'imagine being the person who figured this out'],
    comments: [
      'science is so cool',
      'the world is so much bigger than we think',
      'this is the kind of news I’m here for',
      'I understood 20% of this and I’m still amazed',
      'scientists really out here doing the most and I love it',
      'imagine being the person who discovered this',
      'my science teacher would be so proud I’m reading this',
      'okay this is going in my notes app',
      'more of this on my timeline please',
      'nature is unreal',
      'how do they even figure this stuff out',
      'this is giving documentary on a Sunday',
    ],
    named: ['{topic} is blowing my mind today', 'can’t stop reading about {topic}', '{topic} is so fascinating'],
    tok: ['explaining {topic} like you’re 5 🔬', 'the coolest thing I learned today: {topic}', 'POV: you fell down a {topic} rabbit hole at 2am'],
    leads: ['', '🔬 ', 'NEW STUDY: ', 'SCIENCE: '],
  },
  space: {
    posts: [
      'space is so cool and so terrifying at the same time. {topic} 🚀',
      'who else is following {topic}?? 🌌',
      'setting an alarm for {topic}',
      '{topic} is the only news I want today',
      'okay {topic} has me wanting to be an astronaut again',
      'the pictures from {topic} are unreal',
      'my camera better be ready for {topic} 📸',
    ],
    quotes: ['space is so cool', 'the universe never misses', 'the photos are unreal', 'anyone else want to be an astronaut now', 'this is incredible', 'I need to see this with my own eyes', 'we are so small and I love it', 'humans are actually amazing sometimes'],
    comments: [
      'space is so cool and so terrifying',
      'anyone else want to be an astronaut now',
      'the photos are unreal',
      'setting an alarm for this',
      'the universe never misses',
      'my camera better be ready tonight',
      'we are so small and I love it',
      'imagine seeing this in person 😭',
      'humans are actually amazing sometimes',
      'I’m going outside tonight just in case',
      'this is my new wallpaper',
      'my 8 year old self is screaming',
    ],
    named: ['{topic} is the best thing on my timeline', 'can’t stop looking at {topic} pics', 'who’s watching {topic} with me tonight 🌌'],
    tok: ['how to see {topic} tonight 🌌', 'POV: you finally saw {topic} 😭', '{topic} explained in 30 seconds 🚀', 'my phone pics of {topic} vs reality 😭'],
    leads: ['', '🚀 ', '🌌 ', 'SPACE: '],
  },
  health: {
    posts: [
      'okay {topic} is making me rethink my whole routine',
      'starting {topic} tomorrow. for real this time 😂',
      'this {topic} stuff actually makes sense',
      'saving this {topic} info for later',
    ],
    quotes: ['okay I’m starting tomorrow 💪', 'saving this for later', 'this is your sign to go for a walk', 'sleep really is the cheat code', 'drinking water and calling it self care', 'taking notes', 'my body needed me to read this', 'okay this is actually helpful'],
    comments: [
      'okay I’m starting tomorrow 💪',
      'drinking water and calling it self care',
      'sleep is the real cheat code',
      'my 10k steps are mostly to the fridge 😂',
      'saving this for later',
      'this is your sign to go for a walk',
      'my gym buddy needs to see this',
      'small habits really add up',
      'consistency over everything',
      'taking notes 📝',
      'my mom has been saying this for years 😂',
      'adding this to my routine',
    ],
    named: ['{topic} is my new obsession', 'trying the {topic} thing this week', 'everyone at my gym is talking about {topic}'],
    tok: ['trying {topic} for a week 💪', 'what I learned about {topic}', 'POV: you finally start {topic}'],
    leads: ['', '💪 ', 'NEW STUDY: ', 'HEALTH: '],
  },
  luxury: {
    posts: [
      'adding {topic} to my vision board ✨',
      '{topic} is so beautiful I can’t stop looking',
      'my bank account said no but my heart said {topic}',
      'one day I’ll have {topic}. manifesting 🙏',
      'the craftsmanship on {topic} is unreal',
      'okay {topic} is serving today',
    ],
    quotes: ['adding this to my vision board', 'my bank account said no 😭', 'one day 🙏', 'the craftsmanship is unreal', 'manifesting this', 'okay this is beautiful', 'how much? asking for my future self', 'the details are crazy'],
    comments: [
      'adding this to my vision board',
      'my bank account said no but my heart said yes',
      'one day 🙏',
      'the craftsmanship is unreal',
      'how much? asking for my future self 😂',
      'manifesting this',
      'the details are crazy',
      'this is art honestly',
      'saving up starting today',
      'the colorway is everything',
      'I’ll just look at the pictures for now 😭',
      'timeless',
    ],
    named: ['{topic} never misses', 'the new {topic} pieces are beautiful', '{topic} is on my vision board now'],
    tok: ['rating {topic} pieces I can’t afford 😂', 'POV: you walk into {topic} with $20', 'the details on {topic} up close ✨'],
    leads: ['', '✨ ', 'NEW: ', 'LUXURY: '],
  },
  auto: {
    posts: [
      '{topic} looks insane, dream car unlocked',
      'need to see {topic} in person',
      'the design on {topic} 😍',
      'one day I’m pulling up in {topic}',
      '{topic} is all the car pages are posting today',
    ],
    quotes: ['dream car unlocked', 'the design 😍', 'need to see this in person', 'the sound must be crazy', 'my bus pass could never', 'okay this is beautiful', 'one day 🙏', 'car people we are eating today'],
    comments: [
      'the design 😍',
      'dream car unlocked',
      'need to see this in person',
      'the sound of that engine must be crazy',
      'EV or gas, I still can’t decide',
      'my bus pass could never',
      'one day 🙏',
      'saving this to my dream garage',
      'the interior is gonna be the real flex',
      'my dad would lose his mind over this',
    ],
    named: ['{topic} is the dream', 'the new {topic} is beautiful', 'I would take {topic} in any color'],
    tok: ['POV: you hear {topic} start up 🏎️', 'rating {topic} from the outside 😂', '{topic} in 30 seconds'],
    leads: ['', '🏎️ ', 'NEW: ', 'FIRST LOOK: '],
  },
};

/** Tagging a friend under a real-world post. */
export const REAL_WORLD_TAGS: readonly string[] = ['@{friend} did you see this??', '@{friend} we’re watching this together', '@{friend} look 👀', '@{friend} I told you!!', '@{friend} we need to talk about this'];
