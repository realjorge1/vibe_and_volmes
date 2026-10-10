import type { PhotoKind } from '../../types/social';

/**
 * THE ONLY THINGS ANYONE EVER SAYS UNDER THE PLAYER'S REAL PHOTOS.
 *
 * The phone reads what a photo shows (systems/social/sense: a selfie, a
 * couple, a dog, food, a car, a meme...), so the comments fit the picture:
 * a pet gets pet comments, a meme gets meme comments, and only a picture of
 * a person hears "you look great". When the phone couldn't tell, only the
 * lines that fit ANY picture are used.
 *
 * Rules for adding lines (enforced by systems/social/__tests__/protect.test.ts):
 * - warm, supportive, never sarcastic, never "jokingly" mean
 * - no flirting and nothing about bodies: it may not be the player
 * - no slang that also reads as an insult ("sick", "insane", "I'm dead", 💀)
 * - placeholders: {loc} = the location, {name} = the artist's name,
 *   {thing} = what the photo shows ("dog", "sunset"), {friend} = a handle (after an @),
 *   {n} = a slide number
 *
 * systems/social/protect.ts only lets a comment through if it came from this
 * file, so a line that isn't here can never appear under a real photo.
 */

/** Fits ANY picture, memes and screenshots included. */
export const REAL_ANY: readonly string[] = [
  'obsessed with this',
  'love this so much ❤️',
  'this made my day',
  'love to see it 🙌',
  'needed this on my timeline today',
  'saving this one',
  'this post just made me smile',
  'big mood 🙌',
  'this is the content I’m here for',
  'keep posting like this please',
  'the best kind of post',
  'you always post the best stuff',
  'we love a {name} post 🙌',
  'more posts like this {name} 🙏',
  'happy vibes only ✨',
  'can never get enough of these',
  'love this for you',
  'such good energy',
  '{name} posting is always a good day',
  'notifications on for a reason 🔔',
  'you never miss with the posts',
  'this is my favorite post this week',
];

/** Fits any photograph (not a meme or a screenshot) when the phone couldn't tell what's in it. */
export const REAL_GENERAL: readonly string[] = [
  'this is everything 😍',
  'okay this is beautiful',
  'the energy here 🔥',
  'such a vibe ✨',
  'happy for you fr',
  'beautiful moment 🥹',
  'core memory right here',
  'this is so pure ❤️',
  'living your best life and I love that',
  'the vibes are immaculate',
  'can’t stop looking at this',
  'this is art honestly',
  'wishing you nothing but good days ✨',
  'gorgeous shot',
  'this belongs in a frame',
  'you deserve all the good things',
  'pure joy right here',
  'this is so lovely',
  'thank you for sharing this with us ❤️',
  'this is giving peace',
  'such a beautiful picture',
  'love the vibe of this',
  'this one is special',
  'such a good day by the looks of it',
  'this is so nice to see',
];

/** Emoji-only replies: half of any real comment section. */
export const REAL_EMOJI: readonly string[] = [
  '😍😍😍',
  '🔥🔥',
  '❤️❤️',
  '🙌🙌',
  '👏👏👏',
  '✨✨',
  '🥹❤️',
  '💯',
  '😍🔥',
  '❤️',
  '🫶🫶',
  '💖',
];

/** Emoji that fit what the photo shows. */
export const REAL_EMOJI_BY_KIND: Partial<Record<PhotoKind, readonly string[]>> = {
  pet: ['🥹🥹', '🐾❤️', '😭❤️', '🥺'],
  food: ['😋😋', '🤤', '😋🔥', '🍽️✨'],
  meme: ['😂😂😂', '🤣🤣', '😂', '😭😂'],
  screenshot: ['😂', '👀', '💯💯', '🙏'],
  baby: ['🥹🥹', '👶❤️', '🥺❤️'],
  milestone: ['🎉🎉', '🥳🥳', '🎓🎉', '💍✨'],
  party: ['🎉🎉', '🥳', '🍾✨'],
  ride: ['🔥🔥', '🏎️💨', '😍'],
  scenery: ['😍😍', '🌅✨', '🌊😍'],
  active: ['💪💪', '💪🔥', '🏆'],
  music: ['🎶🔥', '🎧✨', '🔥🔥'],
  duo: ['🥹❤️', '🫶', '❤️❤️'],
  group: ['🫶🫶', '❤️🔥', '🥳'],
  drip: ['🔥🔥', '💎✨', '😍'],
};

/** When the player tagged a place. */
export const REAL_LOCATION: readonly string[] = [
  '{loc} looks amazing 😍',
  'wait you’re in {loc}?? love that',
  'adding {loc} to my list',
  '{loc} is so lucky to have you',
  'enjoy {loc}!! ✨',
  'okay {loc} looks like a dream',
  'have the best time in {loc} ❤️',
];

/** What a photo shows -> lines that fit it. */
export interface RealKindTalk {
  lines: readonly string[];
  /** Kind questions about it. */
  asks?: readonly string[];
  /** Tagging a friend (`@{friend}`: the line has the @, {friend} is the handle). */
  tags?: readonly string[];
  /** Lines for one specific thing ("dog", "sunset", "watch"...). */
  things?: Readonly<Record<string, readonly string[]>>;
}

export const REAL_BY_KIND: Record<PhotoKind, RealKindTalk> = {
  selfie: {
    lines: [
      'this pic is everything 😍',
      'the glow ✨',
      'that smile 🥹',
      'okay main character energy',
      'such a good picture of you',
      'you look so happy here, love that',
      'happiness looks good on you',
      'the lighting is perfect',
      'new profile pic material',
      'face card stays undefeated',
      'serving as usual ✨',
      'glowing!!',
      'always giving 🔥',
      'best selfie on my timeline today',
      'this energy >>>',
      'you look amazing 😍',
      'the vibe in this one 😍',
      'looking great {name}!',
      'healthy and happy, love to see it ❤️',
      'okay selfie of the year',
      'radiant fr ✨',
      'this is such a good look on you',
    ],
    asks: ['where was this taken?? the background 😍', 'what camera do you use??', 'who took this?? oh wait 😂'],
    tags: ['@{friend} this is the energy we need this week', '@{friend} look at this pic!!'],
  },
  fit: {
    lines: [
      'the fit 🔥',
      'outfit of the year, no debate',
      'okay the styling!!',
      'dressed to impress as always',
      'this outfit is everything ✨',
      'the colors in this fit 😍',
      'need this whole look',
      'fashion week who?',
      'the confidence ✨',
      'clean fit',
      'this look is so you',
      'the drip is real',
      'styled perfectly',
      'every piece works together, love it',
      'the way you put outfits together 😍',
      'outfit inspo saved',
    ],
    asks: ['where did you get this?? I need it', 'link to the fit please 🙏', 'who styled you??', 'where is the top from??'],
    tags: ['@{friend} recreate this with me', '@{friend} this is your next outfit'],
  },
  duo: {
    lines: [
      'you two!! 🥹',
      'the duo ❤️',
      'love this pic of you two',
      'matching energy',
      'iconic duo',
      'the best duo out here',
      'this pic radiates love',
      'two of a kind ✨',
      'this made me smile so much',
      'my favorite duo',
      'look at you two 🥹',
      'the happiness in this pic',
    ],
    asks: ['where was this?? cute spot', 'who took this?? they did amazing'],
    tags: ['@{friend} us', '@{friend} this is us next year'],
  },
  group: {
    lines: [
      'the squad!! ❤️',
      'everyone looks so happy',
      'friendship goals 🫶',
      'the whole gang',
      'good people, good vibes',
      'love this crew',
      'this group is iconic',
      'the energy in this pic',
      'invite me next time 😭',
      'surround yourself with people like this',
      'so much love in one picture',
      'the best kind of day',
    ],
    asks: ['what was the occasion??', 'where was this?? looks so fun'],
    tags: ['@{friend} when are we doing this', '@{friend} us next weekend'],
  },
  baby: {
    lines: [
      'so precious ❤️',
      'the sweetest 🥹',
      'tiny human, huge cuteness',
      'what a blessing',
      'sending love to the little one',
      'this baby has my whole heart',
      'protect at all costs ❤️',
      'the cutest little one',
      'heart = melted',
      'so much love for this little one 🥹',
    ],
    asks: ['what’s the little one’s name?? 🥹'],
    tags: ['@{friend} look at this little one'],
  },
  pet: {
    lines: [
      'the cutest {thing} ever 🥹',
      'I need to meet this baby',
      'protect at all costs ❤️',
      'so adorable 😍',
      'look at this little face 🥹',
      'the {thing} is the real star here',
      'this {thing} has my heart',
      'pets make everything better',
      'that face!! 😭❤️',
      'who’s a good baby 🥹',
      'I would do anything for this {thing}',
      'such a sweet baby',
      '10/10 no notes',
      'the {thing} knows they’re cute',
      'more {thing} content please',
      'okay this {thing} is everything',
    ],
    asks: ['what’s their name??', 'tell me everything about them 🥹', 'can I pet them through the screen 🥺'],
    tags: ['@{friend} we need one', '@{friend} look at this baby!!'],
    things: {
      dog: ['what breed is this?? 😍', 'the doggo is so happy 🥹', 'best boy or best girl, either way 10/10', 'dogs really are the best'],
      cat: ['the cat said pose 😍', 'cats really own the house', 'look at those whiskers 🥹', 'what breed is this?? 😍'],
      bird: ['such a pretty bird', 'the colors on this bird 😍'],
      horse: ['what a beautiful horse', 'majestic 😍'],
    },
  },
  food: {
    lines: [
      'this looks delicious 😋',
      'okay now I’m hungry',
      'save me a plate 🙏',
      'the presentation!!',
      'food goals',
      'my mouth is watering',
      'chef’s kiss 🤌',
      'this is making me hungry at work',
      'the {thing} looks amazing',
      'I can almost taste it',
      'treat yourself!!',
      'perfect meal',
      'food is the love language fr',
      'this looks so good',
    ],
    asks: ['where is this from??', 'recipe please 🙏', 'what is this called??', 'did you make this?? 😍'],
    tags: ['@{friend} we’re going here', '@{friend} make this for me'],
    things: {
      coffee: ['coffee first, always ☕', 'the latte art 😍', 'cozy vibes ☕'],
      pizza: ['pizza is always the answer 🍕', 'that crust 😋'],
      sushi: ['sushi night is the best night 🍣', 'the sushi looks so fresh'],
      cake: ['that cake 😍', 'save me a slice 🎂'],
      'ice cream': ['ice cream weather 🍦', 'perfect treat'],
      wine: ['cheers!! 🍷', 'a well deserved glass'],
      burger: ['that burger 😋', 'the perfect bite'],
    },
  },
  ride: {
    lines: [
      'the {thing} is clean 🔥',
      'okay this ride!!',
      'dream ride right here',
      'the color on this 😍',
      'take me for a spin 🙏',
      'this is so clean',
      'road trip when?',
      'drive safe and enjoy it!!',
      'goals right here',
      'what a beauty',
      'built different 🔥',
      'enjoy every mile ✨',
    ],
    asks: ['what model is this??', 'how does it drive??'],
    tags: ['@{friend} our future ride', '@{friend} look at this!!'],
    things: {
      bike: ['the bike is clean 🔥', 'ride safe!!'],
    },
  },
  travel: {
    lines: [
      'enjoy the trip!! ✨',
      'take me with you 😭❤️',
      'travel goals',
      'where to next??',
      'living the dream',
      'the adventures you go on 😍',
      'have the best time!!',
      'adding this to my bucket list',
      'safe travels ✈️',
      'this looks like a movie',
      'the world is yours ✨',
      'vacation mode suits you',
    ],
    asks: ['where is this??', 'how long are you there for??'],
    tags: ['@{friend} book the flight', '@{friend} next trip, us'],
    things: {
      plane: ['safe flight!! ✈️', 'window seat is the best seat'],
      passport: ['passport out, adventure loading ✈️', 'where are you headed?? 👀'],
      boat: ['boat days are the best days ⛵', 'living on the water 😍'],
      yacht: ['boat days are the best days ⛵', 'living on the water 😍'],
      jet: ['flying in style ✈️', 'safe flight!!'],
    },
  },
  home: {
    lines: [
      'the space is beautiful 😍',
      'dream home vibes',
      'the interior is so nice',
      'so cozy in here',
      'okay home goals',
      'the {thing} is gorgeous',
      'this is the kind of place I dream about',
      'the decor!!',
      'house tour when??',
      'such a vibe',
      'the light in here is perfect',
      'make yourself at home ✨',
    ],
    asks: ['where did you get that decor??', 'house tour please 🙏'],
    tags: ['@{friend} our future place', '@{friend} decor inspo'],
    things: {
      pool: ['pool days!! 😍', 'that pool looks so inviting'],
      kitchen: ['that kitchen 😍', 'dream kitchen right here'],
    },
  },
  drip: {
    lines: [
      'the {thing} is so clean 🔥',
      'okay the details!!',
      'that piece is beautiful',
      'the shine ✨',
      'taste is expensive and it shows',
      'love the style',
      'drip check passed',
      'need this so much',
      'the {thing} 😍',
      'collection goals',
      'tasteful as always',
      'this goes so hard',
    ],
    asks: ['where did you get the {thing}??', 'what brand is that?? 😍'],
    tags: ['@{friend} birthday gift idea 👀', '@{friend} we need these'],
    things: {
      sneakers: ['the colorway 🔥', 'fresh pair, love it', 'what size are you?? asking for me 😂'],
      shoes: ['those shoes 😍', 'the shoe game is strong'],
      watch: ['the wrist game 🔥', 'that watch is beautiful', 'timeless ⌚'],
      bag: ['the bag 😍', 'bag goals'],
      nails: ['the nails!! 😍', 'who did your nails?? they’re perfect'],
      makeup: ['the makeup is perfect ✨', 'what color is that?? 😍'],
      shades: ['the shades 😎', 'cool look 😎'],
    },
  },
  money: {
    lines: [
      'secure the bag 🙌',
      'the hard work paying off',
      'love to see you winning',
      'blessings on blessings',
      'manifesting this energy',
      'the grind is real',
      'big moves only',
      'keep stacking 🙌',
      'proud of you fr',
      'you earned every bit',
    ],
    asks: ['teach me your ways 🙏'],
    tags: ['@{friend} this is us soon'],
  },
  scenery: {
    lines: [
      'what a view 😍',
      'nature showing off',
      'this view is unreal in the best way',
      'the colors 😍',
      'peace in a picture',
      'this belongs in a frame',
      'this is my new wallpaper',
      'the {thing} is stunning',
      'needed this calm on my timeline',
      'beautiful shot',
      'wow just wow',
      'the world is so pretty sometimes',
    ],
    asks: ['where is this?? 😍', 'is it as pretty in person??'],
    tags: ['@{friend} we’re going here', '@{friend} look how pretty'],
    things: {
      sunset: ['golden hour perfection ✨', 'the sky really said ✨', 'sunsets like this 🌅'],
      beach: ['beach days are the best days', 'take me to the beach 😭❤️', 'the water looks so clear'],
      flowers: ['the flowers are so pretty 🌸', 'fresh flowers make everything better'],
      'northern lights': ['the northern lights?? bucket list!!', 'that sky is magical'],
      moon: ['the moon looks amazing tonight', 'moon lovers unite 🌙'],
      rainbow: ['a rainbow!! good luck is coming 🌈', 'the rainbow 😍'],
      view: ['that view 😍', 'standing there must feel amazing'],
      sky: ['the sky today 😍', 'sky lovers unite ✨'],
    },
  },
  city: {
    lines: [
      'the skyline 😍',
      'city lights hit different',
      'this city looks amazing',
      'what a shot of the city',
      'love the energy here',
      'city nights ✨',
      'the architecture!!',
      'adding this to my travel list',
      'the city looks so alive',
      'that view of the city 😍',
    ],
    asks: ['which city is this??', 'where is this spot??'],
    tags: ['@{friend} city trip soon?'],
  },
  party: {
    lines: [
      'looks like the best night 🎉',
      'the vibes were clearly perfect',
      'celebrate every win!!',
      'why wasn’t I invited 😭',
      'the energy!!',
      'party of the year',
      'enjoy it, you earned it 🥂',
      'this looks like so much fun',
      'good times only',
      'the memories from this night ✨',
    ],
    asks: ['what was the occasion??', 'where was this?? looks so fun'],
    tags: ['@{friend} next time we’re going', '@{friend} we need a night like this'],
    things: {
      fireworks: ['fireworks!! 🎆', 'what a show ✨'],
      christmas: ['happy holidays!! 🎄', 'festive vibes ❤️'],
      holidays: ['happy holidays!! ✨', 'wishing you and yours the best 🎉'],
      prom: ['prom night ✨', 'what a night to remember'],
      festival: ['festival season 🎉', 'the festival vibes!!'],
    },
  },
  music: {
    lines: [
      'the music vibes ✨',
      'studio magic happening',
      'can’t wait to hear what’s next 🙏',
      'the energy in this pic 🔥',
      'that setup!!',
      'music is life ❤️',
      'the {thing} 😍',
      'front row energy',
      'what a night that must have been',
      'the passion shows ✨',
      'cooking something special, I can feel it',
    ],
    asks: ['when is the new music??', 'what are you working on?? 👀'],
    tags: ['@{friend} we’re going to the next one'],
    things: {
      concert: ['the concert looks amazing 🎶', 'what a show!!'],
      piano: ['the piano 😍', 'play us something 🎹'],
      decks: ['DJ set when?? 🎧', 'the decks 🔥'],
      studio: ['studio mode, we’re ready', 'the new music is gonna be special 🔥'],
      stage: ['born for the stage ✨', 'the stage looks so good on you'],
    },
  },
  active: {
    lines: [
      'the discipline 💪',
      'putting in the work, love to see it',
      'this is motivating me fr',
      'consistency pays off 🙌',
      'gym mode activated',
      'healthy and strong ✨',
      'I need this motivation',
      'proud of the work you’re putting in',
      'no days off 💪',
      'the dedication is everything',
    ],
    asks: ['what’s your routine??', 'how often do you train??'],
    tags: ['@{friend} we start monday', '@{friend} gym buddy needed'],
    things: {
      football: ['game day energy ⚽', 'what a pitch!!'],
      run: ['every mile counts 🏃', 'runner energy!!'],
      slopes: ['snow days ❄️', 'the slopes look amazing'],
      skate: ['skate session 🛹', 'the skills!!'],
      stadium: ['game day!! 🏟️', 'the atmosphere 🔥'],
    },
  },
  art: {
    lines: [
      'this is so talented',
      'the details!!',
      'you made this?? amazing',
      'art is everything ✨',
      'the colors are beautiful',
      'this needs to be in a gallery',
      'so creative',
      'the patience this took 🙏',
      'the {thing} 😍',
      'talent on talent',
    ],
    asks: ['how long did this take??', 'do you take commissions?? 👀'],
    tags: ['@{friend} look at this art!!'],
    things: {
      tattoo: ['the tattoo is beautiful', 'the line work 😍', 'what does it mean?? 🥹'],
      lego: ['the lego build 😍', 'the patience for this lego build 🙏'],
      painting: ['the painting is beautiful 🎨', 'frame it!!'],
      craft: ['handmade is the best made ✨', 'the craft skills!!'],
      toy: ['the cutest little collectible', 'collection goals'],
    },
  },
  meme: {
    lines: [
      'this is so me 😭',
      'LMAO the accuracy',
      'why is this so accurate 😂',
      'I feel so seen',
      'sending this to the group chat',
      'this made my whole day 😂',
      'not me laughing at this in public',
      'the way I laughed 😂',
      'this is literally my life',
      'okay this one got me 😂',
      'every single time 😂',
      'the humor here 😂',
      'I laughed way too hard at this',
      'this is the funniest thing I’ve seen today',
      'you have the best sense of humor {name} 😂',
    ],
    asks: ['where do you find these 😂'],
    tags: ['@{friend} this is literally you', '@{friend} LOOK 😂', '@{friend} us 😂'],
  },
  screenshot: {
    lines: [
      'so true honestly',
      'this is a whole lesson',
      'the way I felt this',
      'needed to read this today',
      'facts ✨',
      'everyone needs to see this',
      'this is so real',
      'okay this is interesting',
      'reading this twice',
      'this deserves more attention',
      'thanks for sharing this 🙏',
    ],
    asks: ['wait where is this from??'],
    tags: ['@{friend} read this', '@{friend} this one’s for you'],
  },
  milestone: {
    lines: ['congratulations!! 🎉', 'what a moment', 'so happy for you', 'a day to remember ✨', 'so deserved 🙏', 'proud moment ❤️'],
    asks: [],
    tags: ['@{friend} look!! 🥹'],
    things: {
      graduation: ['congratulations grad!! 🎓🎉', 'so proud of you!!', 'you did that 🎓', 'the hard work paid off ✨', 'congrats on this huge moment ❤️'],
      wedding: ['congratulations to you both!! 💍', 'wishing you a lifetime of happiness', 'what a beautiful day', 'the love here 🥹', 'happily ever after ✨'],
    },
  },
  tech: {
    lines: [
      'the setup is clean 🔥',
      'setup goals',
      'okay this is so nice',
      'tech goals',
      'the desk setup 😍',
      'this is so aesthetic',
      'productive vibes',
      'the {thing} 😍',
    ],
    asks: ['what are the specs??', 'what phone is that??'],
    tags: ['@{friend} our next setup'],
  },
  other: { lines: [] },
};

/** Fans who like each other's comments: the nested replies under a real photo. */
export const REAL_REPLIES: readonly string[] = [
  'right?? 😭',
  'literally',
  'same 🥹',
  'came here to say this',
  'agreed ❤️',
  'so true',
  'this ❤️',
  'exactly',
  'yes!!',
  '🥹🥹',
  '❤️❤️',
  'couldn’t agree more',
  'you said it',
  'say it again ✨',
];

/** A friend who got tagged, answering. */
export const REAL_TAG_BACK: readonly string[] = ['omg yes 😭', 'we NEED to', 'say less', 'I’m in!!', 'okay this is so us 🥹', 'booking it now ✨', 'saving this for later'];

/** A fan the artist replied to, answering back (vetted: it can sit under a real photo). */
export const REAL_REPLY_BACK: readonly string[] = [
  'omg you replied 😭❤️',
  'THANK YOU 🥹',
  'you just made my whole week',
  'ahh hi!!',
  'not me screenshotting this reply',
  'best day ever fr',
  'love you more ❤️',
  'I’m framing this reply',
  'okay I’m smiling so hard',
  'thank you for replying!! 🥹',
  'you’re the sweetest {name} 🥹',
  'wait you actually replied 😭',
];

/** Other fans noticing the artist replying in their own comments. */
export const REAL_REPLY_NOTICED: readonly string[] = [
  'you’re so sweet for replying ❤️',
  'replying to comments?? love you {name}',
  'hi {name}!! 🥹',
  'reply to me too 🥹',
  '{name} in the comments today ❤️',
];

/** Caption keyword -> lines that fit it, and the kinds of photo they suit (all when missing). */
export const REAL_BY_CAPTION: readonly { words: readonly string[]; lines: readonly string[]; fits?: readonly PhotoKind[]; not?: readonly PhotoKind[] }[] = [
  {
    words: ['birthday', 'bday', 'b-day', 'born day', 'hbd'],
    lines: ['happy birthday!! 🎂🎉', 'HBD!! hope it’s the best one yet 🥳', 'happy birthday, wishing you the best year ✨', 'birthday vibes!! enjoy every second 🎉'],
  },
  {
    words: ['vacation', 'holiday', 'trip', 'travel', 'beach', 'island', 'getaway', 'vacay'],
    lines: ['vacation mode suits you 🌴', 'enjoy every second of this trip!', 'you deserve this break ✨', 'take me with you next time 😭❤️'],
    fits: ['travel', 'scenery', 'city', 'selfie', 'duo', 'group', 'fit', 'food', 'party', 'home', 'other'],
  },
  {
    words: ['food', 'dinner', 'lunch', 'breakfast', 'brunch', 'eat', 'eating', 'meal', 'chef', 'cooking'],
    lines: ['this looks delicious 😋', 'okay now I’m hungry', 'food is the love language fr', 'save me a plate please 🙏'],
    fits: ['food', 'other'],
  },
  {
    words: ['gym', 'workout', 'training', 'running', 'fitness', 'grind'],
    lines: ['the discipline 💪', 'putting in the work, love to see it', 'this is motivating me fr', 'consistency pays off 🙌'],
    fits: ['active', 'selfie', 'fit', 'other'],
  },
  {
    words: ['family', 'mom', 'mum', 'dad', 'mama', 'papa', 'sister', 'brother', 'grandma', 'grandpa', 'cousin', 'auntie', 'uncle'],
    lines: ['family is everything ❤️', 'this is so precious', 'love the family moments 🥹', 'nothing beats family time'],
    not: ['meme', 'screenshot', 'ride', 'drip', 'money', 'tech'],
  },
  {
    words: ['friends', 'squad', 'crew', 'besties', 'bestie', 'gang', 'homies', 'link up'],
    lines: ['friendship goals 🫶', 'love this crew', 'the squad!! ❤️', 'good people only, love this'],
    not: ['meme', 'screenshot', 'ride', 'drip', 'money', 'tech', 'pet'],
  },
  {
    words: ['studio', 'recording', 'session', 'new music', 'album', 'song', 'mixtape'],
    lines: ['the new music is gonna be special 🔥', 'studio mode, we’re ready', 'cannot wait for what’s coming 🙏', 'can’t wait to hear this'],
    fits: ['music', 'selfie', 'tech', 'other', 'fit'],
  },
  {
    words: ['fit', 'outfit', 'ootd', 'drip', 'style', 'dressed'],
    lines: ['the style 🔥', 'love the outfit!!', 'always dressed perfectly', 'the fit is everything ✨'],
    fits: ['fit', 'selfie', 'duo', 'group', 'drip', 'other'],
  },
  {
    words: ['graduation', 'graduated', 'grad', 'degree', 'diploma'],
    lines: ['congratulations!! 🎓🎉', 'so proud of you!!', 'you did that 🎓', 'congrats on this huge moment ❤️'],
    not: ['meme'],
  },
  {
    words: ['dog', 'puppy', 'cat', 'kitten', 'pet', 'pup', 'doggo'],
    lines: ['the cutest!! 🥹', 'I need to meet this baby', 'protect this little one at all costs ❤️', 'so adorable 😍'],
    fits: ['pet', 'other'],
  },
  {
    words: ['baby', 'newborn', 'son', 'daughter', 'kid', 'kids', 'little one'],
    lines: ['so precious ❤️', 'what a blessing 🥹', 'sending so much love to your family', 'the sweetest 🫶'],
    fits: ['baby', 'duo', 'group', 'selfie', 'other'],
  },
  {
    words: ['sunset', 'sunrise', 'sky', 'view', 'skyline', 'ocean', 'sea', 'mountains', 'nature'],
    lines: ['what a view 😍', 'nature showing off', 'this view is unreal in the best way', 'golden hour perfection ✨'],
    fits: ['scenery', 'city', 'travel', 'home', 'other'],
  },
  {
    words: ['tbt', 'throwback', 'flashback', 'back then', 'old photo', 'memories'],
    lines: ['love a throwback 🥹', 'look how far you’ve come ❤️', 'this throwback is precious', 'memories like this are everything'],
    not: ['meme', 'screenshot'],
  },
  {
    words: ['coffee', 'morning', 'monday', 'sunday'],
    lines: ['good morning to you too ☀️', 'the perfect start to the day', 'love a slow morning'],
    not: ['meme', 'screenshot'],
  },
  {
    words: ['party', 'night out', 'club', 'celebrate', 'celebrating', 'celebration', 'turn up'],
    lines: ['looks like the best night 🎉', 'celebrate every win!!', 'the vibes were clearly perfect', 'enjoy it, you earned it 🥂'],
    fits: ['party', 'group', 'duo', 'selfie', 'fit', 'music', 'city', 'food', 'other'],
  },
  {
    words: ['car', 'ride', 'whip', 'drive', 'road trip'],
    lines: ['the ride is clean 🔥', 'road trip vibes 🚗', 'enjoy the ride!!', 'love this'],
    fits: ['ride', 'other', 'scenery', 'travel'],
  },
  {
    words: ['bae', 'babe', 'anniversary', 'date night', 'my person', 'my love'],
    lines: ['love this for you two ❤️', 'happy for you both 🥹', 'the love is real ✨', 'so happy for you', 'you two are so cute together', 'couple goals fr'],
    fits: ['duo', 'selfie', 'food', 'travel', 'scenery', 'party', 'city', 'other'],
  },
  {
    words: ['christmas', 'xmas', 'new year', 'thanksgiving', 'eid', 'diwali', 'easter', 'festive'],
    lines: ['happy holidays!! ✨', 'wishing you and yours the best 🎉', 'festive vibes ❤️', 'enjoy the celebrations!!'],
  },
  {
    words: ['blessed', 'grateful', 'thankful', 'gratitude'],
    lines: ['so deserved 🙏', 'gratitude looks good on you', 'blessings on blessings ✨', 'love the energy, stay blessed'],
    not: ['meme'],
  },
  {
    words: ['new house', 'new home', 'new place', 'keys', 'moved in', 'housewarming', 'new crib'],
    lines: ['congrats on the new place!! 🏡', 'new home, new memories ✨', 'housewarming when?? 🎉'],
    fits: ['home', 'selfie', 'duo', 'group', 'city', 'other'],
  },
  {
    words: ['new car', 'new whip', 'new ride'],
    lines: ['congrats on the new ride!! 🔥', 'you deserve this!!', 'enjoy every mile ✨'],
    fits: ['ride', 'selfie', 'other'],
  },
];

/** A photo dump: comments about one slide ({n} is its number). */
export const REAL_SLIDES: readonly string[] = [
  'slide {n} 🥹',
  'number {n} is my favorite',
  'slide {n} has my heart ❤️',
  'every slide is perfect',
  'the last one 🥹',
  'okay slide {n}!!',
];

/** Slide comments about what that slide shows. */
export const REAL_SLIDE_KIND: Partial<Record<PhotoKind, readonly string[]>> = {
  pet: ['slide {n}, the baby 😭❤️', 'the {thing} on slide {n} 🥹'],
  food: ['slide {n} made me hungry 😋', 'the food on slide {n} 😍'],
  selfie: ['slide {n} is such a good pic of you', 'slide {n} 😍'],
  duo: ['slide {n}, you two 🥹'],
  group: ['slide {n}, the squad!!'],
  scenery: ['the view on slide {n} 😍'],
  meme: ['slide {n} 😂😂'],
};

/** Other artists who like the player, under their real photo. */
export const REAL_ARTIST_FRIEND: readonly string[] = [
  'proud of you fr 🙏',
  'always love to see it ❤️',
  'we gotta link soon!!',
  'this is so nice, happy for you',
  'love this for you 🙌',
  'keep shining ✨',
];

/**
 * The only words {thing} can stand for (what the phone or the game's tags
 * say a photo shows). The guard accepts nothing else in its place.
 */
export const THING_WORDS: readonly string[] = [
  'this', 'baby', 'dog', 'cat', 'bird', 'horse', 'hamster', 'turtle', 'fish',
  'food', 'pizza', 'sushi', 'burger', 'hot dog', 'cake', 'dessert', 'ice cream', 'bread', 'coffee', 'juice', 'wine', 'drinks', 'menu', 'fruit',
  'ride', 'car', 'bike', 'van',
  'plane', 'helicopter', 'passport', 'boat', 'train', 'camping', 'yacht', 'jet', 'hotel',
  'place', 'room', 'kitchen', 'bathroom', 'living room', 'pool', 'house',
  'piece', 'jewelry', 'necklace', 'bracelet', 'ring', 'chain', 'shades', 'bag', 'watch', 'sneakers', 'shoes', 'makeup', 'nails', 'outfit', 'swimwear',
  'cash',
  'view', 'sunset', 'beach', 'rainbow', 'northern lights', 'moon', 'night sky', 'sky', 'flowers', 'plants', 'ocean', 'butterfly',
  'skyline', 'architecture', 'lights', 'rooftop', 'night',
  'prom', 'fireworks', 'christmas', 'holidays', 'festival',
  'setup', 'concert', 'instrument', 'piano', 'decks', 'speakers', 'studio', 'mic', 'vinyl', 'stage', 'crowd',
  'gym', 'run', 'football', 'stadium', 'slopes', 'skate',
  'painting', 'craft', 'lego', 'tattoo', 'toy',
  'graduation', 'wedding', 'family',
  'phone', 'tv', 'receipt',
];

/** Every template above, for the guard in systems/social/protect.ts. */
export const ALL_REAL_TEMPLATES: readonly string[] = [
  ...REAL_ANY,
  ...REAL_GENERAL,
  ...REAL_EMOJI,
  ...Object.values(REAL_EMOJI_BY_KIND).flat(),
  ...REAL_LOCATION,
  ...Object.values(REAL_BY_KIND).flatMap((k) => [...k.lines, ...(k.asks ?? []), ...(k.tags ?? []), ...Object.values(k.things ?? {}).flat()]),
  ...REAL_REPLIES,
  ...REAL_TAG_BACK,
  ...REAL_REPLY_BACK,
  ...REAL_REPLY_NOTICED,
  ...REAL_BY_CAPTION.flatMap((g) => g.lines),
  ...REAL_SLIDES,
  ...Object.values(REAL_SLIDE_KIND).flat(),
  ...REAL_ARTIST_FRIEND,
];
