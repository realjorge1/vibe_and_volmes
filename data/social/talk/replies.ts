/**
 * REPLIES: people talking to each other under a post, and answering the
 * artist when they comment or reply. Never used under the player's real
 * photos (those use the vetted REAL_REPLIES / REAL_REPLY_BACK lines).
 *
 * Placeholders: {name} the artist, {to} the handle being answered,
 * {friend} an @handle, {owner} the post's author.
 */

/** Agreeing with the comment above. */
export const AGREE: readonly string[] = [
  'fr',
  'literally',
  'right?? 😭',
  'say it louder',
  'THIS',
  'came here to say this',
  'facts',
  'exactly what I was thinking',
  'you said it',
  'same here 😭',
  'not you reading my mind',
  'took the words out of my mouth',
];

/** Laughing at the comment above. */
export const LAUGH: readonly string[] = ['😭😭', 'LMAOOO', 'why is this so accurate', 'stop 😂', 'I’m crying', '💀💀', 'the way I laughed at this', 'not you being the funniest one here'];

/** Pushing back. */
export const DISAGREE: readonly string[] = ['nah 😭', 'hard disagree', 'be so serious', 'that’s not it', 'respectfully no', 'you’re wrong for this 😂', 'absolutely not'];

/** Fans clapping back at a hater. */
export const DEFEND: readonly string[] = [
  'go be miserable somewhere else',
  'who hurt you',
  'the jealousy is loud',
  'and yet here you are commenting',
  'blocked and reported 😂',
  'imagine taking time out of your day for this',
  'touch grass bestie',
  'your account is private for a reason 😭',
];

/** A hater doubling down. */
export const DOUBLE_DOWN: readonly string[] = ['stay mad', 'cry about it', 'the stans are so sensitive 😂', 'I can say what I want', 'ratio + you’re a stan'];

/** Tagging someone into it. */
export const TAG_REPLY: readonly string[] = ['@{friend} 👀', '@{friend} told you', '@{friend} see!!', '@{friend} we’re doing this', '@{friend} LOOK'];

// --- When the artist comments or replies ------------------------------------------

/** A fan the artist replied to (open version; the vetted one lives in realPhotoComments). */
export const REPLY_BACK: readonly string[] = [
  'omg you replied 😭😭',
  'I’M SCREAMING {name} replied',
  'my phone just died and came back to life',
  'not me screenshotting this',
  'can’t believe you saw this 😭',
  'this is the best day of my life',
  'I’m framing this',
  'everyone look {name} talked to me 😭',
];

/** Somebody's post the artist commented on: the author answers. */
export const OWNER_THANKS: readonly string[] = ['thank you!! 🥹', 'appreciate you 🙏', 'you’re too kind ❤️', 'haha thank you!', 'means a lot ❤️', 'thanks!!', '🙏❤️'];

/** A regular person realizing a famous artist commented on their post. */
export const OWNER_STARSTRUCK: readonly string[] = [
  'OMG {name} commented 😭😭',
  'wait {name} saw this??',
  'ok I’m never deleting this post',
  '{name} in my comments… I’m done for',
  'I’m shaking, thank you {name}!!',
  'notifications said {name} and I fell off my bed',
];

/** Brands and pages answering a comment. */
export const BRAND_REPLY: readonly string[] = ['thanks for the love! 🙌', 'glad you like it!', 'we appreciate you!', 'ha! couldn’t agree more', 'you get it 🙌', 'tell your friends 😉'];

/** Another artist answering the player (friendly). */
export const ARTIST_REPLY: readonly string[] = ['appreciate you {name} 🙏', 'love from me too ❤️', 'we gotta link soon', 'haha thank you!!', 'you already know 🤝', 'respect, always'];

/** A rival answering the player. */
export const RIVAL_REPLY: readonly string[] = ['who let you in here 😂', 'stay in your lane', 'cute.', 'focus on your own numbers', 'the obsession 😭', 'did I ask?'];

/** Other people noticing the artist in someone's comments (scales with fame). */
export const CROWD_NOTICES: readonly string[] = [
  '{name} is in the comments!!',
  'the {name} comment 😭',
  'not {name} being in every comment section 😂',
  '{name} we see you 👀',
  'hi {name} I love your music!!',
  'wait is this the real {name}??',
  'the way I scrolled past {name}’s comment and came back',
];

/** The artist said something hostile on someone else's post. */
export const REPLY_TO_HOSTILE: readonly string[] = [
  'who hurt you 😭',
  'be nice {name}',
  '{name} woke up and chose violence',
  'this is not the {name} I know',
  'the shade 😭',
  'chill 😂',
  'screenshotted. for history.',
  'the blogs are gonna eat this up 👀',
];

/** The artist asked a question: answers. */
export const ANSWER_OWNER: readonly string[] = ['yes!!', 'DM me 🙏', 'link in bio!', 'check the caption 😂', 'soon 👀', 'good question, I’ll post about it!', 'right here in {city} 😉'];
export const ANSWER_CROWD: readonly string[] = ['I was wondering the same thing', 'following for the answer', 'yes 😭', 'pretty sure it’s in the caption', 'asking the real questions'];

/** The artist made a joke. */
export const REPLY_TO_JOKE: readonly string[] = ['😂😂', 'stop I’m crying', 'LMAO {name} is funny too??', 'not {name} doing comedy now 😭', 'the jokes are free today'];

/** The artist was kind. */
export const REPLY_TO_KIND: readonly string[] = ['{name} is so sweet', 'protect {name} at all costs', 'the kindness ❤️', 'this is why we love {name}'];

/** A hater the artist answered kindly. */
export const HATER_SOFTENS: readonly string[] = ['ok that was actually nice', 'fine. one stream.', 'didn’t expect a reply ngl', 'ok you got me there', 'respect for replying I guess'];

/** A brand answering a complaint. */
export const BRAND_SORRY: readonly string[] = ['sorry to hear that! DM us and we’ll make it right', 'we hear you, thanks for the feedback', 'that’s not the experience we want for you. DM us?'];

/** A friendly artist the player was rude to. */
export const ARTIST_HURT: readonly string[] = ['damn ok', 'wow. noted.', 'we were cool yesterday', 'didn’t expect that from you', 'ok I see how it is'];

/** Somebody the artist replied to, answering back (when the artist isn't famous yet). */
export const PEER_REPLY: readonly string[] = ['haha right', 'exactly!!', 'glad someone gets it', 'hahaha yes', 'you get it', 'thank you!!', 'facts'];
