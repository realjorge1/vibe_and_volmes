import type { PhotoKind } from '../../../types/social';

/**
 * WHAT PEOPLE SAY ABOUT WHAT THE ARTIST POSTED (everything that isn't one of
 * the player's real photos; those only ever get data/social/realPhotoComments).
 *
 * On top of the kind lines in realPhotoComments, each kind has the internet's
 * louder side: slang that reads as a compliment ("this is insane"), jokes
 * about what's in the picture, and haters who at least looked at the post
 * ("cute dog. still not streaming tho"). Nobody comments on a dog's looks
 * like it's a person, or calls a meme "beautiful".
 *
 * Placeholders: {name} the artist, {thing} what the photo shows, {friend} an
 * @handle, {city}, {rival}.
 */

export interface OpenKindTalk {
  /** Loud love (fine anywhere but under a real photo). */
  hype: readonly string[];
  /** Jokes about what's in it, not at anyone's expense. */
  funny: readonly string[];
  /** Haters who looked at the post first. Empty = nobody hates on this. */
  shade: readonly string[];
}

export const OPEN_BY_KIND: Record<PhotoKind, OpenKindTalk> = {
  selfie: {
    hype: ['sheesh 🔥', 'okay you ate this', 'the camera loves you fr', 'not you looking this good on a random tuesday', 'stop playing with us 😭', 'this is unfair honestly 😭', 'face card never declines', 'posting this was a public service'],
    funny: ['who’s taking your pics I need their number', 'the confidence to post this at 2am 😂', 'the front camera has never been this kind to me', 'me pretending this didn’t make me open my own camera 😂'],
    shade: ['filter doing overtime', 'we get it you have a camera', 'post the music not your face', 'cool pic, now drop the album', 'selfie #400 this month'],
  },
  fit: {
    hype: ['the fit is insane 🔥', 'you snapped with this one', 'outfit of the century', 'this fit should be illegal 😭', 'okay fashion icon'],
    funny: ['my bank account could never', 'dressed like the main character in my dreams', 'me in the same outfit: 🤡', 'I own nothing that looks like this 😭'],
    shade: ['rented 😭', 'tag still on probably', 'fit is cool but where’s the music', 'all style no hits'],
  },
  duo: {
    hype: ['this pic goes so hard', 'the chemistry 😭', 'power duo energy', 'y’all look unstoppable'],
    funny: ['third wheeling from my phone rn', 'the way I’m invested in this', 'who’s the funny one, I need to know 😂', 'me looking at this alone in my room 🧍'],
    shade: ['give it 3 months 👀', 'soft launch? we see you', 'PR relationship 😭'],
  },
  group: {
    hype: ['the whole squad is fire', 'best friend group on the internet', 'this crew is unmatched'],
    funny: ['the one taking the picture deserves a raise', 'which one of you is the problem 😂', 'every friend group has one and I’m looking at all of you', 'the group chat after this pic: 📸📸📸'],
    shade: ['squad pic to distract from the flop 😂', 'all these friends and no features'],
  },
  baby: {
    hype: ['I can’t handle the cuteness 😭', 'this baby is too precious for this world'],
    funny: ['the baby already has more aura than me', 'future superstar loading 👶', 'baby said “no photos please” 😂'],
    shade: [],
  },
  pet: {
    hype: ['THE {thing} 😭😭', 'I would die for this {thing}', 'this {thing} is the best thing on my feed today', 'I’m screaming at this face'],
    funny: ['the {thing} has more aura than all of us', 'the {thing} is the real artist in this family', 'I’d stream anything this {thing} releases', '{thing} tax paid, thank you', 'the {thing} looks like they pay rent', 'this {thing} has never had a bad day in its life'],
    shade: ['cute {thing}. still not streaming tho', 'the {thing} has more talent', 'using the {thing} for engagement 😭', 'the {thing} is carrying this account'],
  },
  food: {
    hype: ['this looks insane 😩', 'I’d fight for a bite of this', 'okay that looks unreal', 'the food is food-ing'],
    funny: ['the camera eats first', 'calories don’t count on posts', 'where’s mine though', 'me with my instant noodles looking at this 😭', 'I can smell this through the screen'],
    shade: ['that’s a lot of money for a small plate 😭', 'overpriced and you know it', 'eating good off our streams I see'],
  },
  ride: {
    hype: ['that thing is a beast 🔥', 'sheeeesh', 'the whip is crazy', 'I can hear the engine from here'],
    funny: ['my bus pass could never', 'can I at least sit in it 😭', 'I’m buying one in my next life'],
    shade: ['rental 😭', 'is it paid off though 👀', 'nice car, buy a better producer', 'leased for the gram'],
  },
  travel: {
    hype: ['living the life fr', 'this trip looks unreal', 'okay jetsetter ✈️'],
    funny: ['my vacation is going to the fridge', 'out of office forever huh', 'packing myself in your suitcase next time'],
    shade: ['must be nice 🙄', 'travel more, release less I see', 'vacationing on our streams'],
  },
  home: {
    hype: ['this house is crazy', 'MTV cribs where??', 'this place is insane'],
    funny: ['how many bathrooms is too many', 'I’d get lost in there', 'can I rent the couch'],
    shade: ['airbnb 😭', 'the mortgage gon be crazy', 'staged for the photo'],
  },
  drip: {
    hype: ['that {thing} is insane 🔥', 'iced out fr', 'the {thing} is crazy clean', 'okay rich'],
    funny: ['that {thing} costs more than my rent', 'one {thing} could pay my tuition', 'my whole outfit costs less than this'],
    shade: ['is it real tho 👀', 'all that drip and no hits', 'flexing for engagement'],
  },
  money: {
    hype: ['bag secured fr', 'rich energy 🤑', 'paper chasing pays'],
    funny: ['venmo me', 'I could use a little of that', 'drop the account number 😂', 'my bank app is shaking'],
    shade: ['flexing for engagement', 'who did you borrow that from', 'all that money, still no hits'],
  },
  scenery: {
    hype: ['this view is insane', 'unreal shot', 'the sky went crazy'],
    funny: ['my phone could never take this', 'nature said pose', 'me at my window looking at a wall 🧱'],
    shade: ['nice view, mid music', 'post less sunsets, more songs'],
  },
  city: {
    hype: ['the city looks crazy tonight', 'this shot is cinema'],
    funny: ['the city is giving movie set', 'my city could never 😭'],
    shade: ['tourist energy', 'cool city pic, where’s the album'],
  },
  party: {
    hype: ['this party looked insane', 'the turn up was real', 'y’all went crazy'],
    funny: ['the hangover tomorrow 😭', 'who’s paying for all this', 'the group chat is gonna be wild after this'],
    shade: ['partying instead of working on the album', 'party every week, song every year'],
  },
  music: {
    hype: ['drop it already 😭', 'we know you’re cooking 👀', 'this is gonna be crazy'],
    funny: ['the studio lights are doing a lot 😂', 'me refreshing for the drop every 5 minutes'],
    shade: ['another studio pic, zero songs', 'all studio no release'],
  },
  active: {
    hype: ['beast mode 💪', 'you’re built different', 'the work is showing'],
    funny: ['watching this from my bed 😂', 'I worked out vicariously through this', 'me doing one push-up after this'],
    shade: ['gym pics don’t make hits', 'lifting more than your streams'],
  },
  art: {
    hype: ['this is crazy talented', 'the skill is insane'],
    funny: ['meanwhile I can’t draw a stick figure', 'my art teacher could never'],
    shade: ['did AI make this 👀'],
  },
  meme: {
    hype: ['I’m deceased 💀', 'LMAOOOO', '💀💀💀', 'this is sending me', 'I’m crying real tears 😭'],
    funny: ['who made this 😭', 'I need this on a shirt', 'stealing this for my story', 'the timing of this 😂'],
    shade: ['old meme', 'this was funny in 2019', 'stick to music 😭', 'the meme is funnier than the last single'],
  },
  screenshot: {
    hype: ['the way this is SO true', 'everybody needs to read this twice'],
    funny: ['not the screenshot 😭', 'zoom in on the third line 😂', 'the screenshot has the whole timeline shaking'],
    shade: ['ok and?', 'nobody asked for this', 'post music not screenshots'],
  },
  milestone: {
    hype: ['big moment!!', 'so earned 🙌'],
    funny: ['the photographer did not miss', 'crying at my desk over a stranger’s big day 😭'],
    shade: [],
  },
  tech: {
    hype: ['the setup is crazy', 'clean setup 🔥'],
    funny: ['how many monitors is enough? yes', 'RGB adds 10 fps', 'my laptop is crying looking at this'],
    shade: ['spent the advance on gadgets 😭'],
  },
  other: {
    hype: ['this is fire', 'love this', 'okay this goes hard'],
    funny: ['the vibes in this 😂', 'not sure what I’m looking at but I love it'],
    shade: ['ok', 'random', 'post the music'],
  },
};

/**
 * Fans reacting to the artist posting at all (any post). Kept off music
 * talk: a dog photo doesn't get "on repeat since midnight".
 */
export const FAN_ANY: readonly string[] = [
  '{name} posted, my day is made',
  'notifications on for this 🔔',
  'first 🙋',
  'we love you {name}!!',
  'early gang 😤',
  'when’s the album though 👀',
  'never stop posting',
  'commenting so the algorithm knows',
  'love you {name} ❤️',
  'okay {name} is online today 👀',
  'the way I ran here',
  '{name} posting twice this week?? spoiled',
];

// --- Text posts (no photo) -------------------------------------------------------

/** What a text-only post is doing, and how people answer it. */
export type TextIntent = 'question' | 'music' | 'gratitude' | 'vent' | 'joke' | 'greeting' | 'opinion' | 'statement';

export const TEXT_TALK: Record<TextIntent, { lines: readonly string[]; shade: readonly string[] }> = {
  question: {
    lines: [
      'following for the answer 👀',
      'I need to know too',
      'honestly yes',
      'depends on the vibe 😂',
      'great question honestly',
      'replying so I see the answers',
      'yes. next question',
      'I’ve been wondering the same thing',
      'the replies are about to be chaos 😂',
      '{city} always',
      'ask me again after coffee',
    ],
    shade: ['google exists', 'why are you asking us 😭', 'ask your producer'],
  },
  music: {
    lines: [
      'FINALLY 😭😭😭',
      'we been waiting for THIS',
      'clear my whole schedule',
      'the countdown starts now',
      'I’m ready, I was born ready',
      '{name} never misses 🔥🔥',
      'already pre-saved',
      'notifications on, volume up',
      'this one is gonna be different, I can feel it',
      'not me crying at work over a tweet',
    ],
    shade: ['we’ll see', 'another “soon” 😂', 'flop loading…', 'heard that before'],
  },
  gratitude: {
    lines: ['you deserve it all 🙏', 'grateful for you too ❤️', 'from the start we knew', 'so happy for you', 'and we’re thankful for you', 'the journey has been beautiful to watch', 'here since day one 🥹'],
    shade: ['thank us with an album'],
  },
  vent: {
    lines: ['sending hugs 🫂', 'rest up, we’ll be here', 'take care of yourself first ❤️', 'it gets better, promise', 'proud of you for saying this', 'one day at a time', 'we’re not going anywhere ❤️', 'drink some water and get some sleep 🙏'],
    shade: ['the industry isn’t for everyone', 'cry me a river'],
  },
  joke: {
    lines: ['😂😂😂', 'LMAO', 'why is this so funny', 'not you being funny now', 'stoppp 😭', 'the way I laughed', 'comedian era unlocked', 'I wheezed'],
    shade: ['not funny', 'stick to music', 'tried it'],
  },
  greeting: {
    lines: ['good morning ☀️', 'gm!!', 'morning {name}!', 'have a great day!!', 'hiii {name} 👋', 'good morning to you too ❤️'],
    shade: ['ok'],
  },
  opinion: {
    lines: ['facts', 'say it louder', 'nah I can’t agree 😭', 'respectfully disagree', 'hot take but I’m with you', 'the replies are about to be a war zone 🍿', 'this is the realest thing you’ve said', 'finally someone said it'],
    shade: ['worst take of the year', 'delete this', 'nobody asked', 'ratio'],
  },
  statement: {
    lines: ['real', 'this is so you 😂', 'love this', 'tell us more!!', 'okay noted ✍️', '{name} really said that', 'I felt this'],
    shade: ['ok and?', 'who asked', 'cool story'],
  },
};
