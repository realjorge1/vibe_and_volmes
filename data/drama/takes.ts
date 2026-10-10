import type { MomentKind, Take } from '../../types/drama';

/**
 * WHAT THE INTERNET SAYS.
 *
 * Post copy for the drama layer, by topic and by take. The internet is never
 * unanimous: every topic carries love AND hate AND jokes, and the discourse
 * engine decides the mix from the artist's fame, reputation and what's hot.
 *
 * Tokens: {playerName} {trackTitle} {topic} {rival} {partner} {city} {genre}
 * and the artist's pronouns {he} {him} {his} {He} {His} {he's} {He's}
 * {himself}, plus {king} (king/queen/icon), {bro} (bro/sis/bestie) and
 * {spouse} (what an admirer wants to be: wife/husband/partner).
 * Write around 3rd-person present-tense verbs after {he} (they/them artists).
 */

export type TopicKind = 'vibe' | 'track' | 'looks' | 'rival' | MomentKind;

export const TAKES: Record<TopicKind, Partial<Record<Take, readonly string[]>>> = {
  vibe: {
    love: [
      '{playerName} has been on my repeat for three days straight and I am not sorry',
      "nobody's doing it like {playerName} right now and I'm tired of pretending otherwise",
      '{playerName} said "let me fix {genre}" and then just... did it',
      "if you don't get {playerName} you haven't listened properly. go back. start over.",
      'my therapist asked what brings me joy and I said {playerName} and she wrote it down 😭',
      'protect {playerName} at all costs. the industry does not deserve {him}',
      "{playerName} is the only artist my whole group chat agrees on and that's saying something",
      "I've been a {playerName} fan since 300 monthly listeners and I'll be one at 300 million",
      '{playerName} is so underrated it should be studied',
      'the way {playerName} switches flows mid verse... genius behavior',
      'give {playerName} the Grammy now and save everyone time',
    ],
    hate: [
      '{playerName} is the most mid artist I have ever been forced to hear in a grocery store',
      'who is still listening to {playerName} unironically. genuinely asking',
      '{playerName} sounds like a Spotify ad for a meal kit',
      'the {playerName} hype is a group project and I did not sign up for it',
      'every {playerName} song is the same song in a different hoodie',
      '{playerName} fans will call this hate but it is called having ears',
      "I tried. I really tried with {playerName}. it's giving nothing",
      '{playerName} is what happens when the algorithm gets lonely',
      "imagine being {playerName}'s engineer and hearing that take forty times 💀",
      "{playerName}'s whole career is vibes and a ring light",
      'industry plant with extra fertilizer. {playerName} I see you',
      'not one {playerName} song has made it past my skip button and I respect my skip button',
      "{playerName} can't sing live and y'all know it. stop gaslighting me",
    ],
    banter: [
      '{playerName} looks like {he} says "it\'s giving" unironically',
      '{playerName} definitely has a playlist called "songs for my villain arc"',
      '{playerName} is the type to send a voice note longer than {his} songs',
      '{playerName} probably replies "lol" to deep texts',
      "{playerName} wearing sunglasses indoors again. it's a Tuesday. it's raining.",
      "{playerName} walks into the studio like {he's} about to save the industry ({he's} not) ({he} might)",
      "{playerName} fans arguing in my mentions at 3am like it's a job. do you get paid?",
      'me: I am not a {playerName} fan. also me: knows every adlib',
      '{playerName} has never once been on time to anything and I would bet my rent on it',
      '{playerName} talks about "the vision" like {he} invented eyes',
      '{playerName} definitely eats cereal with orange juice. look at {him}',
    ],
    meme: [
      'nobody:\n{playerName} at 2am: "new music soon 👀"',
      '{playerName} fans when {he} posts a picture of a microphone: ALBUM CONFIRMED',
      'POV: you said one bad thing about {playerName} and now 400 stans know your address',
      "me pretending I'm not checking if {playerName} posted: 🧍",
      'teachers: there is no such thing as a stupid question\nme: is {playerName} single',
      '{playerName} entering the chat: 🕺🕺🕺',
      'my villain origin story is {playerName} not following me back',
      '{playerName} stans hear one negative word: 🚨🚨🚨',
    ],
    skeptic: [
      'Is {playerName} actually good or is it just aggressive marketing? Thread 🧵',
      "Real question: name three {playerName} songs without googling. I'll wait.",
      '{playerName} has one good song and a great social media manager',
      'the {playerName} discourse is louder than the {playerName} music',
    ],
    defend: [
      'the {playerName} slander on this app is out of control. listen to the deep cuts',
      'say what you want about {playerName}, {he} actually writes. respect it',
      "y'all hate {playerName} because {he's} winning. it's not that deep",
    ],
    news: [
      "{playerName}'s numbers have quietly climbed all week. The industry is watching.",
      'Insiders say {playerName} has been in the studio every night this month.',
      '{playerName} is one of the most searched artists on the platform this week.',
    ],
    shade: [
      "Who's going to tell {playerName}'s team the rollout is not working? 👀",
      'Heard {playerName} was rude to a waiter in {city}. Just what we heard. 👀',
      '{playerName} unfollowed some people this week. Interesting timing 🍵',
    ],
  },

  track: {
    love: [
      '"{trackTitle}" is the song of the year and the year is not even close to over',
      '{playerName} really dropped "{trackTitle}" with zero warning and ruined my whole week (positive)',
      'the second verse of "{trackTitle}" is a crime against my emotional stability',
      'replay count on "{trackTitle}": unhealthy. medically concerning.',
      '"{trackTitle}" in the car with the windows down is a religious experience',
      'the beat switch on "{trackTitle}" 😮‍💨😮‍💨😮‍💨',
      '"{trackTitle}" is what happens when an artist actually cares. {playerName} cooked',
      'played "{trackTitle}" at the party and the aux has never been safer in my hands',
    ],
    hate: [
      '"{trackTitle}" sounds like it was written in the Uber on the way to the studio',
      '{playerName} really thought "{trackTitle}" was ready. who approved this',
      'the hook on "{trackTitle}" should be studied as a warning',
      '"{trackTitle}" is giving "my label needed a single by Friday"',
      'played "{trackTitle}" once. my speaker asked for a refund',
      '"{trackTitle}" is three minutes I will never get back',
      'not "{trackTitle}" being the most skipped song on my shuffle 💀',
    ],
    banter: [
      '"{trackTitle}" goes hard but why does {playerName} say "yeah" 41 times',
      '"{trackTitle}" got me texting people I blocked in 2021',
      '"{trackTitle}" is a good song but the cover art looks like a screensaver',
      '{playerName} on "{trackTitle}": heartbroken. {playerName} on the cover: smirking. which is it',
      'whoever told {playerName} to put a sax on "{trackTitle}" deserves a raise',
    ],
    meme: [
      'my mom hearing "{trackTitle}" through my bedroom wall: is everything okay in there',
      'me after one listen of "{trackTitle}": I\'m healed\nme after the bridge: I\'m unwell',
      '"{trackTitle}" came on and the whole Uber turned into a music video',
      'gym playlist before "{trackTitle}": 🚶\ngym playlist after "{trackTitle}": 🏃💨',
    ],
    skeptic: [
      '"{trackTitle}" is good but y\'all are acting like it cured something',
      '"{trackTitle}" is fine. FINE. stop calling it a classic',
    ],
    news: [
      '{playerName}\'s "{trackTitle}" is moving fast on streaming this week.',
      'Listeners are split on {playerName}\'s new single "{trackTitle}".',
    ],
    defend: [
      'y\'all calling "{trackTitle}" mid have never written a song in your life',
      '"{trackTitle}" is a grower. come back in a week and apologize',
    ],
  },

  scandal: {
    drag: [
      "so we're just going to pretend {topic} didn't happen? {playerName} has 24 hours",
      "{playerName} really thought we'd forget {topic}. we have screenshots babe",
      "every day I wake up and remember {topic} and {playerName} still hasn't said a word",
      "{playerName}'s comments are just people asking about {topic} 😭",
      '{playerName} posting like nothing happened after {topic} is a choice',
      'unfollowed. {topic} was the last straw',
      '{topic} is crazy but {playerName} going silent is crazier',
      "can't believe I defended {playerName} for years and then {topic}. never again",
      '{topic}? in this economy? {playerName} is done',
    ],
    defend: [
      "y'all were waiting for {playerName} to slip so you could dogpile. {topic} isn't even confirmed",
      'nobody is perfect. {playerName} is human. let {him} breathe',
      '{topic} is being taken so far out of context it is actually insane. read the whole thing',
      'the same people screaming about {topic} were streaming {playerName} last week. relax',
      "I'm riding with {playerName} until I see real proof. that's loyalty",
    ],
    banter: [
      "{playerName}'s PR team watching {topic} trend for the third day: 🧍",
      "me refreshing {playerName}'s page waiting for the notes app apology",
      "{playerName}'s notes app apology loading... ███▒▒▒▒▒ 30%",
      'the {topic} discourse has ruined my whole timeline and I am loving every second 🍿',
      "{playerName}'s publicist is googling 'how to quit without notice' right now",
    ],
    news: [
      'BREAKING: {playerName} under fire over {topic}. Fans are divided.',
      "{playerName}'s team has not responded to questions about {topic}.",
      '{topic}: what we know so far about the {playerName} controversy.',
    ],
    shade: [
      "Someone close to {playerName} says {topic} is 'only half the story' 👀",
      "We're hearing there's more coming on {topic}. Stay tuned. 🍵",
      "{playerName} just turned off comments. In other news, {topic} is still trending.",
    ],
    skeptic: [
      'I need receipts before I believe {topic}. not saying it did not happen. just saying.',
      '{topic} is one blurry screenshot and a burner account. calm down',
    ],
    hate: [
      'this is who {playerName} always was. {topic} just proved it',
      'cancel {playerName}. {topic} is not the first time and it will not be the last',
      'dropping {playerName} from every playlist I own. {topic} is disgusting',
    ],
  },

  ugly: {
    meme: [
      '{topic} is the funniest thing that has happened this year and I have watched it 70 times',
      "I can't stop replaying {topic} 😭😭😭",
      "{playerName} right after {topic}: that was intentional, it's art",
      'not {topic} becoming a sound already',
      '{topic} has me crying at work. my manager asked if I was okay',
      'someone set {topic} to the Titanic song and I have never laughed harder',
    ],
    banter: [
      '{playerName} after {topic}: "it was the in-ears." sure it was.',
      "{topic} is going on {playerName}'s Wikipedia and there's nothing {he} can do about it",
      'giving {playerName} a 10 for {topic}. the judges are crying',
    ],
    drag: [
      "{topic} was embarrassing but {playerName}'s reaction was worse",
      '{playerName} is a professional? after {topic}??',
      'paid real money to watch {topic}. refund please',
    ],
    defend: [
      '{topic} could happen to anyone. {he} got up and kept going. respect',
      "laugh all you want, {playerName} handled {topic} better than any of y'all would",
    ],
    love: [
      '{playerName} laughing at {topic} with everyone is exactly why I am a fan',
      '{topic} and {he} still finished the set?? {king} behavior',
    ],
    news: ["{playerName}'s {topic} is going viral for all the wrong reasons."],
  },

  charity: {
    wholesome: [
      "{topic} happened and {playerName} didn't even post about it until someone else did. a real one",
      "crying at {topic}. {playerName} didn't have to do that",
      'this is why {playerName} wins. {topic}. genuinely good person',
      'the world needs more {playerName}s 🥹',
      '{topic} restored my faith in this whole industry for at least a day',
    ],
    skeptic: [
      '{topic} right before an album drop? convenient timing. just saying 🤔',
      'nice of {playerName} but did {he} need four cameras for {topic}?',
      'the PR team cooked with {topic}, I will give them that',
      "billionaires... I mean {playerName}... doing {topic} instead of paying {his} producers. ok",
    ],
    banter: [
      '{playerName} out here doing {topic} while I can\'t even reply to my group chat',
      '{playerName} doing {topic} and me pretending I donate to stuff too 🙂',
    ],
    news: ['{playerName} praised after {topic}.', 'Fans flood {playerName} with love after {topic}.'],
    love: ['{playerName} could have done nothing. {he} chose {topic}. forever a fan'],
  },

  best: {
    love: [
      '{topic}. that is the tweet.',
      '{topic} gave me chills through my PHONE',
      "I was there for {topic} and I'll be telling my grandkids about it",
      '{playerName} after {topic}: unstoppable',
      '{topic} is the moment {playerName} became a legend. no debate',
    ],
    hate: [
      "y'all acting like {topic} was historic. it was fine. a fine moment.",
      "{topic} was cool I guess but let's not rewrite history",
      'the {topic} glazing on this app is unbearable',
    ],
    meme: ['{playerName} walking into every room after {topic}: 😤', 'my blood pressure watching {topic}: 📈📈📈'],
    news: ['{topic}: the moment everyone is talking about.', '{playerName} has the internet in a chokehold after {topic}.'],
    skeptic: ['{topic} was rehearsed. calm down'],
  },

  romance: {
    shade: [
      '👀 {playerName} and {partner}?? the signs were there',
      '{playerName} spotted with {partner} AGAIN. that is three times. that is a pattern.',
      'Not {playerName} soft-launching {partner} with a hand on a steering wheel 👀',
    ],
    love: [
      '{playerName} and {partner} are the couple of the year and I am not accepting other answers',
      'the way {playerName} looks at {partner} 😭 I want what they have',
      'happy for {playerName}. {he} deserves someone who gets {him}',
    ],
    hate: [
      '{partner} who?? {playerName} could do so much better',
      'this relationship is a PR stunt and I will be proven right in six weeks',
      "nah because I was supposed to be {playerName}'s {spouse}",
    ],
    banter: [
      '{playerName} and {partner} breaking up in two weeks. screenshot this',
      "{playerName}'s in-love era means 14 sad songs when it ends. I'm ready",
      'the way I will be watching {partner} like a hawk now',
    ],
    meme: ['me pretending to be happy for {playerName} and {partner}: 🙂', 'every {playerName} stan seeing {partner}: 🧍‍♀️🧍🧍‍♂️'],
    news: ['{playerName} and {partner}: everything we know about the rumored couple.'],
  },

  beef: {
    stanwar: [
      '{rival} fans are so quiet today. wonder why 🤭',
      "{rival} had to drag {playerName}'s name to get a streams bump. that's all you need to know",
      "{playerName} doesn't even need to respond. {rival} is losing to silence",
      "{rival} stans are crying in the replies again, someone get them a tissue",
    ],
    hate: [
      '{rival} ate {playerName} UP. there is nothing left. not even crumbs',
      "{playerName} vs {rival}?? that's not a beef that's a mismatch",
      '{playerName} better hire a ghostwriter for this one because {rival} cooked',
      '{rival} said one line and {playerName} has been crying for a week',
    ],
    banter: [
      '{playerName} vs {rival} is the best thing to happen to music this year and both of them are losing',
      'me watching {playerName} and {rival} go back and forth: 🍿🍿🍿',
      "the {playerName} and {rival} beef is just two people promoting albums and we're all falling for it",
      "{playerName} and {rival} are going to collab in a year and act like this never happened",
    ],
    meme: ['{rival} reading {playerName}\'s response: 😐', 'the group chat when {playerName} drops a reply to {rival}: 🗣️🗣️🗣️'],
    news: ['{rival} fires shots at {playerName}. The internet is picking sides.', 'The {playerName}–{rival} feud just escalated again.'],
    defend: ["{playerName} stayed classy while {rival} threw tantrums. that's the difference"],
  },

  rival: {
    subtweet: [
      'funny how some people only get loud when they need streams 😂',
      "I don't do features with people who need features",
      'imagine copying my whole sound and still flopping',
      "they mad. they been mad. they'll stay mad 🤷",
      'some of y\'all should focus on your own catalog. oh wait',
      "the industry is full of plants. I'm a tree 🌳",
      "not gonna name names but the math ain't mathing on those streams 🤔",
      "stay humble. some people forgot where they came from. I didn't",
      'number one. again. some people could never 🏆',
      'if you have to tell people you are the best... you are not',
    ],
  },

  looks: {
    thirst: [], // gendered: see THIRST
  },

  meme: {
    meme: ['{playerName} is a meme now and honestly {he} earned it', '{topic} is the only format on my timeline this week'],
    banter: ['{topic} has been going for a week and it is still funny'],
    love: ['{playerName} leaning into {topic} is the best marketing this year'],
  },

  flop: {
    drag: [
      '{topic}. {playerName} is cooked',
      'the way {topic} happened in front of everyone 😭',
      '{playerName} after {topic} needs to log off for a month',
    ],
    banter: ['{topic} is giving "it\'s not you, it\'s the algorithm"', 'not {topic} 💀 the label is in a meeting right now'],
    defend: ['{topic} doesn\'t mean anything. real fans are still here', 'one {topic} and y\'all write the obituary. relax'],
    news: ['{topic}: is the {playerName} wave over?'],
    hate: ['{topic} was the most predictable thing ever', 'told y\'all {playerName} was overrated. {topic} proves it'],
  },
};

/** Thirst posts by the artist's gender (what their admirers say). */
export const THIRST: Record<'male' | 'female' | 'nonbinary', readonly string[]> = {
  male: [
    '{playerName} can get it. that is the tweet.',
    "I'm not saying I'd leave my man for {playerName} but I'm not NOT saying it",
    '{playerName} in that last photo should be illegal. call the authorities',
    "{playerName}'s jawline is paying rent in my head",
    'the way {playerName} holds a microphone 😮‍💨',
    '{playerName} if you are reading this, I can cook',
    "nobody gonna talk about {playerName}'s arms in the new video? okay just me then",
    'husband material. I am manifesting it. {playerName} 🙏',
    '{playerName} said one word in that interview and I gained a crush',
    'not me zooming in on {playerName} in the background of someone else\'s video',
  ],
  female: [
    '{playerName} is too fine to be this talented. pick one',
    '{playerName} if you see this I am free friday. and saturday. and forever',
    '{playerName} smiled in that video and I forgot my own name',
    '{playerName} could ruin my life and I would say thank you',
    "{playerName} isn't real. they made her in a lab. a simulation",
    'wife material. I am manifesting it. {playerName} 🙏',
    'the way {playerName} looks at the camera 😮‍💨 someone check on me',
    "{playerName}'s voice + {his} smile = unfair advantage",
    'every man on this app is in {playerName}\'s comments and honestly same',
    '{playerName} said "hey guys" in a live and I took it personally',
  ],
  nonbinary: [
    '{playerName} can get it. that is the tweet.',
    "{playerName}'s whole look in that photo should be illegal",
    '{playerName} if you are reading this, I can cook',
    'the way {playerName} holds a microphone 😮‍💨',
    '{playerName} smiled in that video and I forgot my own name',
  ],
};

/** "Who won?" polls by topic. */
export const POLLS: Partial<Record<TopicKind, readonly { q: string; a: string; b: string }[]>> = {
  beef: [
    { q: "Who's winning the beef?", a: '{playerName}', b: '{rival}' },
    { q: 'Better diss so far?', a: '{playerName}', b: '{rival}' },
    { q: 'Who needs to log off?', a: '{playerName}', b: '{rival}' },
  ],
  track: [
    { q: '"{trackTitle}": hit or skip?', a: 'hit 🔥', b: 'skip ⏭️' },
    { q: 'Is "{trackTitle}" {playerName}\'s best song?', a: 'yes', b: 'not even close' },
  ],
  vibe: [
    { q: 'Is {playerName} overrated?', a: 'yes', b: 'no, y\'all are' },
    { q: '{playerName}: real talent or marketing?', a: 'talent', b: 'marketing' },
  ],
  scandal: [{ q: 'Should {playerName} apologize for {topic}?', a: 'yes, today', b: "no, it's overblown" }],
  ugly: [{ q: '{topic}: funny or embarrassing?', a: 'funny 😭', b: 'embarrassing 💀' }],
  romance: [{ q: '{playerName} and {partner}?', a: 'cute 🥹', b: 'PR stunt 🙄' }],
};

/** Meme captions over reaction faces: top, bottom, and the face it needs. */
export const MEMES: Partial<Record<TopicKind, readonly { top: string; bottom?: string; face: string }[]>> = {
  vibe: [
    { top: 'me hearing {playerName} for the first time', face: 'mind-blown' },
    { top: "{playerName} fans when you say {he's} mid", face: 'yelling' },
    { top: 'when the {playerName} song comes on at the function', face: 'screaming' },
    { top: 'me trying to explain {playerName} to my parents', face: 'nervous' },
    { top: '{playerName} haters watching {him} win again', face: 'side-eye' },
    { top: 'my face when someone says they never heard of {playerName}', face: 'disgusted' },
  ],
  track: [
    { top: 'first listen of "{trackTitle}"', face: 'mind-blown' },
    { top: 'me after the bridge on "{trackTitle}"', face: 'crying' },
    { top: '"{trackTitle}" haters when it charts', face: 'side-eye' },
    { top: 'me: one more replay of "{trackTitle}"', bottom: '(it was not one more)', face: 'smug' },
  ],
  scandal: [
    { top: "{playerName}'s PR team right now", face: 'nervous' },
    { top: 'me waiting for {playerName} to address {topic}', face: 'popcorn' },
    { top: '{playerName} reading the comments', face: 'facepalm' },
    { top: 'the timeline during {topic}', face: 'tea' },
  ],
  ugly: [
    { top: 'me rewatching {topic}', bottom: 'for the 80th time', face: 'crying-laughing' },
    { top: '{playerName} right after {topic}', face: 'nervous' },
    { top: 'everyone who saw {topic} live', face: 'shocked' },
  ],
  charity: [
    { top: '{playerName} doing {topic}', bottom: 'me who can\'t text back', face: 'unimpressed' },
    { top: 'haters trying to find something wrong with {topic}', face: 'confused' },
  ],
  best: [
    { top: 'everyone after {topic}', face: 'screaming' },
    { top: 'the haters during {topic}', face: 'side-eye' },
  ],
  romance: [
    { top: 'me finding out about {playerName} and {partner}', face: 'shocked' },
    { top: '{playerName} stans seeing {partner} for the first time', face: 'side-eye' },
    { top: 'me acting happy for {playerName}', face: 'nervous' },
  ],
  beef: [
    { top: "{rival} reading {playerName}'s response", face: 'nervous' },
    { top: 'me watching {playerName} vs {rival}', face: 'popcorn' },
    { top: '{playerName} when {rival} drops another diss', face: 'smug' },
    { top: "{rival}'s fans after {playerName}'s reply", face: 'crying' },
  ],
  flop: [{ top: '{playerName} checking the numbers', face: 'facepalm' }],
  meme: [{ top: 'me every time {topic} shows up', face: 'crying-laughing' }],
};
