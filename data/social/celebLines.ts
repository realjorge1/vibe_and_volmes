import type { WorldEventType } from '../../types/world';
import type { PhotoTag } from '../photos/photoPack';

/**
 * OTHER ARTISTS' LIVES ONLINE.
 *
 * What other artists post themselves, what the gossip pages and news say
 * about them, and what their lovers and their haters write. Driven by the
 * world engine's events (releases, collabs, romances, breakups, feuds,
 * scandals, awards...) plus their everyday life between events.
 *
 * Placeholders: {a} = the artist, {b} = the other person in the story,
 * {you} = the player (only in lines about rivalries with the player).
 */

type ByEvent = Partial<Record<WorldEventType, readonly string[]>>;

/** The artist's own post when something happens to them. */
export const OWN: ByEvent = {
  release: ['OUT NOW. this one’s for the ones who waited 🖤', 'new music is live. go listen loud', 'I put my whole heart in this one. it’s yours now', 'it’s out!!! tell me your favorite line'],
  'viral-moment': ['y’all are crazy for this 😭❤️', 'I didn’t expect this at all. thank you', 'woke up to my phone on fire. love you guys'],
  collaboration: ['me and {b} cooked something special 🔥', 'when {b} said yes I knew. coming soon', 'studio with {b}. that’s all I’m saying'],
  'feud-started': ['some people talk a lot for people who don’t do much', 'I’m not addressing it. my numbers will', 'funny how they only mention me when they need attention'],
  'diss-track': ['said what I said. it’s on everything.', 'they asked for it 🤷', 'no more subtweets. it’s a song now'],
  reconciliation: ['grown folks talk it out. love to {b} ❤️', 'squashed. life’s too short', 'me and {b} are good. the internet can relax'],
  'romance-started': ['🤍', 'my person', 'soft launch? hard launch. 🫶'],
  breakup: ['protecting my peace. that’s all', 'some chapters end. thank you for understanding', 'please respect my privacy right now 🤍'],
  'deal-signed': ['NEW HOME. big things coming ✍️', 'signed. this is just the beginning', 'dreams do come true. thank you to my team'],
  'deal-dropped': ['new chapter. independent and free', 'everything happens for a reason', 'betting on myself. watch this'],
  'tour-announced': ['TOUR!!! tickets Friday. see you on the road 🌍', 'I’m coming to your city 🖤 dates below', 'the biggest show I’ve ever done. let’s go'],
  scandal: ['I’ve seen what’s being said. I’ll speak when I’m ready', 'not everything you read is true', 'I hear you. I’m listening and I’m learning'],
  award: ['WE WON 🏆 thank you thank you thank you', 'this is for everyone who believed when nobody did', 'speechless. I love you all'],
  lawsuit: ['I can’t say much. my lawyers are handling it', 'the truth will come out'],
  'mental-crisis': ['taking some time for me. I’ll be back stronger 🤍', 'check on your strong friends. I’m okay, just resting', 'stepping back for a bit. thank you for the love'],
  comeback: ['I told you I’d be back.', 'missed you. new era starts now', 'they counted me out. look at us now'],
  retirement: ['thank you for everything. this is goodbye for now 🤍', 'it’s been the ride of my life', 'time for the next chapter. I love you all forever'],
  debut: ['my first song is finally out. I’m shaking', 'day one. thank you for listening', 'nobody knew my name last week 😭'],
};

/** Gossip pages and news accounts on the story (they love a headline). */
export const GOSSIP: ByEvent = {
  release: ['{a} just dropped and the timeline is split 👀', 'first reactions to {a}’s new release are in', '{a} is back with new music. thoughts?'],
  'viral-moment': ['{a} is everywhere right now 🔥', 'how {a} took over the internet in 48 hours', '{a} is the main character this week'],
  collaboration: ['{a} x {b} is happening 👀', 'nobody saw {a} and {b} coming', '{a} and {b} were spotted in the studio together'],
  'feud-started': ['{a} just took shots at {b} 😳', 'is there beef between {a} and {b}? the evidence 🧵', '{a} and {b} unfollowed each other'],
  'diss-track': ['{a} dropped a diss track aimed at {b} and the internet is losing it', 'is {a}’s diss at {b} a hit or a miss? 🗳️'],
  reconciliation: ['{a} and {b} squashed their beef?? 😭', '{a} and {b} spotted laughing together'],
  'romance-started': ['{a} and {b} were spotted leaving dinner together 👀', 'are {a} and {b} DATING?? the clues 🧵', '{a} and {b} soft launched and we are not okay'],
  breakup: ['{a} and {b} have unfollowed each other 💔', 'it’s over for {a} and {b}, sources say', '{a} just deleted every photo with {b} 👀'],
  'deal-signed': ['{a} just signed a major deal 🖊️', '{a} has a new label home'],
  'deal-dropped': ['{a} has reportedly been dropped by their label', '{a} and their label have parted ways'],
  'tour-announced': ['{a} announces tour dates 🌍', '{a}’s tour is selling out in minutes'],
  scandal: ['{a} is trending for all the wrong reasons 😬', 'what we know about the {a} situation 🧵', '{a} under fire after leaked audio'],
  award: ['{a} wins big 🏆', '{a} takes home the top prize'],
  lawsuit: ['{a} is taking {b} to court 😳', 'legal drama: {a} vs {b}'],
  'mental-crisis': ['{a} is stepping back from the spotlight. sending love 🤍', '{a} cancels appearances to focus on their health'],
  comeback: ['{a} is BACK 🔥', 'the {a} comeback nobody saw coming'],
  retirement: ['{a} announces retirement. end of an era 🕊️', 'is {a} really done with music?'],
  debut: ['{a} came out of nowhere and the numbers are crazy', 'new artist alert: {a} 🚨'],
};

/** Their stans react. */
export const STAN: ByEvent = {
  release: ['{a} DROPPED AND I’M ON THE FLOOR', 'stream {a} or we can’t be friends', '{a} did not miss a single time on this'],
  'viral-moment': ['{a} winning is my personal win', 'finally the world sees what we saw'],
  collaboration: ['{a} x {b} is the collab of the year don’t argue', 'my two favorites together I’m crying'],
  'feud-started': ['{b} is just mad they’re not {a}', 'leave {a} alone they did nothing wrong'],
  'diss-track': ['{a} ended {b}’s whole career in 3 minutes', 'it’s giving obituary for {b}'],
  'romance-started': ['{a} deserves all the love in the world 🥹', 'protect {a} and {b} at all costs'],
  breakup: ['{a} is better off honestly', 'we ride with {a} through everything'],
  award: ['{a} deserved that and more', 'MY ARTIST WON 🏆'],
  scandal: ['we don’t know the full story, let {a} speak', 'the internet will drag anyone, I believe in {a}'],
  comeback: ['the comeback of the decade', '{a} never left, y’all just stopped paying attention'],
  'mental-crisis': ['take all the time you need {a} 🤍', 'we’ll be here when you’re ready'],
};

/** Their haters react. */
export const HATE: ByEvent = {
  release: ['{a} really thought this was good 💀', 'skip. skip. skip. whole project skip', 'the bar was on the floor and {a} brought a shovel'],
  'viral-moment': ['{a} is an industry plant and this proves it', 'viral for what exactly'],
  collaboration: ['{b} needed {a} more than {a} needed {b} lol', 'this collab is for the algorithm, not the fans'],
  'feud-started': ['{a} is beefing for clout again', 'nobody cares about this fake beef'],
  'diss-track': ['that diss was weak, {b} won without even replying', '{a} wrote that in the notes app on the toilet'],
  'romance-started': ['PR relationship. give it two months', 'they’re dating for a rollout, I’m calling it'],
  breakup: ['saw this coming from space', 'shocking to absolutely nobody'],
  award: ['the awards are rigged and this is the receipt', 'who voted for this'],
  scandal: ['the mask finally slipped', '{a} is done. cancelled. finished.'],
  comeback: ['comeback from what', 'nobody asked for this era'],
  retirement: ['retiring from what lol', 'good riddance'],
};

/** Everyday life between events. Tags pick the photo when there's no portrait. */
export const LIFE: readonly { text: string; tags: readonly PhotoTag[]; scene?: string }[] = [
  { text: 'studio till sunrise again 🎙️', tags: ['studio', 'night'] },
  { text: 'locked in. new music soon', tags: ['studio', 'moody'] },
  { text: 'vacation mode 🌴 don’t text me', tags: ['beach', 'travel', 'pool'] },
  { text: 'fit check before the show', tags: ['fashion', 'backstage'], scene: 'street-style' },
  { text: 'gym first, everything else after', tags: ['fit'], scene: 'gym-selfie' },
  { text: 'thank you for 10 years of this 🖤', tags: ['stage', 'crowd'] },
  { text: 'throwback to when nobody knew my name', tags: ['bw', 'street'] },
  { text: 'the view from my hotel tonight', tags: ['hotel', 'city', 'night'] },
  { text: 'family dinner. no phones. (except this one)', tags: ['food', 'home'] },
  { text: 'jet lag is a lifestyle', tags: ['jet', 'travel'] },
  { text: 'last night was unreal. thank you {city}', tags: ['stage', 'crowd', 'festival'] },
  { text: 'new ink 🖋️', tags: ['aesthetic', 'moody'] },
  { text: 'sunday reset', tags: ['home', 'coffee'] },
];

/** With their partner. */
export const COUPLE: readonly string[] = ['date night with {b} 🤍', 'my favorite person', 'obsessed with this one 🫶', 'we don’t post much but here’s us', 'happy place'];

/** Fan edits on TokTalk. */
export const EDITS: readonly string[] = ['{a} edit because they deserve it 🔥', '{a} live vocals are unmatched', 'POV: you’re at a {a} concert', 'every {a} era ranked', '{a} being iconic for 60 seconds straight'];

/** Comments under any artist's post. */
export const COMMENTS = {
  love: ['{a} never misses 🔥', 'I would die for {a}', 'this is why {a} is my favorite', 'ate and left no crumbs', 'the way I screamed', '{a} has spoken', 'stream {a} 🗣️', 'no skips, no notes', 'icon. legend. {a}.'],
  hate: ['{a} is so overrated it’s crazy', 'who still listens to {a}?', 'fell off but ok', 'the hype makes no sense to me', 'this is so mid 💀', 'flop era', 'industry plant behavior'],
  ship: ['{a} and {b} forever 🥹', 'the way they look at each other', 'power couple', 'I’m so happy for them'],
  breakup: ['I KNEW IT', 'not {b} again 😭', 'the unfollow said everything', 'praying for {a} rn'],
  neutral: ['why is everyone fighting in here', 'the replies are a war zone 🍿', 'just here for the comments', 'can we talk about the outfit tho', 'internet is undefeated today'],
  /** The player's fans, under a rival's post. */
  yourFans: ['{you} would never post something this desperate', 'this is why {you} is winning', '{you} fans in the replies, assemble', 'imagine being this pressed about {you} 😂', '{you} is living in their head rent free'],
  /** The rival's fans, dragging the player under their idol's post. */
  atYou: ['{you} could never', '{you} fans are so quiet today 😂', 'this is what {you} wishes they had', '{a} > {you} and it’s not close'],
  /** Under a friendly artist's post. */
  friendly: ['{a} and {you} collab when??', '{you} and {a} are the best duo in the game', 'saw {you} in the likes 👀'],
} as const;
