import type { LyricTheme, LyricSectionType } from '../../types/audio';

/**
 * Modular line pools. The lyric generator stitches these into sections and
 * fills tokens — no AI API, fully offline, instant. Lines are intentionally
 * short and punchy so generated verses scan like real lyrics on screen.
 *
 * Tokens: {name} {city} {genre} {rival} {ex} {moneyWord}
 */
export type LyricPools = Partial<Record<LyricSectionType, string[]>>;

export const MONEY_WORDS = ['bag', 'check', 'racks', 'paper', 'guap', 'bands'];

export const LYRIC_TEMPLATES: Record<LyricTheme, LyricPools> = {
  flex: {
    intro: ['Yeah', 'Ay, {name} on the track', 'They not ready'],
    hook: [
      "Came from {city}, now they know my name",
      "Counting up the {moneyWord}, it's never the same",
      "Top down, no roof, feel the rush",
      "Said they wanted real, well here's too much",
    ],
    verse: [
      "Started in the basement with a dollar and a dream",
      "Now the whole {genre} scene act like they on my team",
      "I don't chase the wave, I'm the reason that it move",
      "Every time I drop it's another thing to prove",
      "Used to count my losses, now I lost the count",
      "They was sleeping on me, now it's a different amount",
    ],
    bridge: ["Look how far, look how far we came", "Same kid, brand new name"],
    adlib: ['(yeah)', '(uh)', "(it's lit)", '(skrrt)', '(too much)'],
    outro: ['And we still going', 'Tell em who did it — {name}'],
  },

  heartbreak: {
    intro: ['Mm', 'Yeah, this one for you', 'Last time I say this'],
    hook: [
      "You said forever, forever didn't last",
      "Now I'm playing our song just to live in the past",
      "I gave you my all, you gave me a maybe",
      "Don't call me at 2, I'm not your baby",
    ],
    verse: [
      "Empty side of the bed where you used to be",
      "Every love song on the radio sounds like me",
      "I keep your hoodie even though it hurts to wear",
      "Telling all my friends I'm fine, but I'm barely there",
      "You moved on so fast it's like I wasn't real",
      "Funny how the deepest cuts are the ones that don't heal",
    ],
    bridge: ["I'd take you back and I hate that I would", "Loved you more than I ever understood"],
    adlib: ['(oh)', '(yeah)', '(why)', '(mm)'],
    outro: ['So goodbye, I guess', "I hope it was worth it"],
  },

  diss: {
    intro: ['Ha', "Let's get into it", "You really want this?"],
    hook: [
      "{rival} talking loud but the music too quiet",
      "Say my name in your songs, that's the only way you climb it",
      "I'm the standard, you the watered-down version",
      "One verse from me end your whole excursion",
    ],
    verse: [
      "You been biting my flow since the very first day",
      "Industry plant with a ghostwriter to pay",
      "I built this from nothing, you was handed the keys",
      "Now you're sweating in the booth, begging labels for a please",
      "Talk that tough talk, but you fold when it's real",
      "I don't need a diss back, I need you to be still",
    ],
    bridge: ["Numbers don't lie and your numbers a joke", "Run me my respect or stay broke"],
    adlib: ['(ha)', '(cap)', '(who?)', '(weak)'],
    outro: ['And that\'s on God', 'Delete your account'],
  },

  motivational: {
    intro: ['Listen', 'For anybody doubting', "Yeah, you needed this"],
    hook: [
      "Get up, get up, the world ain't gonna wait",
      "Every closed door is a chance to create",
      "They told me no so many times it sound like yes",
      "Pressure made the diamond out this mess",
    ],
    verse: [
      "You was made for more than the box they put you in",
      "Scars are just the story of the wars you living in",
      "Tired ain't a reason, it's a step on the climb",
      "Greatness is just patience plus a whole lotta time",
      "Don't compare your chapter one to their chapter ten",
      "Fall down seven, you get up eight again",
    ],
    bridge: ["Keep going, keep going, you're closer than you think", "Don't you dare blink"],
    adlib: ['(let\'s go)', '(yeah)', '(rise)', '(c\'mon)'],
    outro: ['Now go get it', "This your sign — {name} said so"],
  },

  party: {
    intro: ['Ay', 'Turn it up', "{city} where you at"],
    hook: [
      "Lights low, bass up, we don't go home",
      "Phone off, live it, leave it all alone",
      "Pour it, vibe it, dance til the floor break",
      "One life, tonight, that's all that it take",
    ],
    verse: [
      "Walked in with the crew and the whole room moved",
      "DJ on my line asking what to do",
      "We don't watch the clock, the clock watch us",
      "Strangers turn family on the back of the bus",
      "No bad energy allowed past the door",
      "If your feet still still then what you came for",
    ],
    bridge: ["Hands up if you feel it tonight", "Don't stop til the morning light"],
    adlib: ['(ay)', '(woo)', '(turn up)', '(let\'s go)'],
    outro: ['One more time', 'Til the sun come up'],
  },

  introspective: {
    intro: ['Mm', 'Just thinking out loud', 'Late night thoughts'],
    hook: [
      "Who am I when the cameras turn off",
      "Chasing all this noise just to feel soft",
      "Mirror, mirror, do you even know me",
      "Everything I wanted feels so lonely",
    ],
    verse: [
      "Got the dream I prayed for, now I can't sleep at all",
      "Standing on a stage but I feel so small",
      "Money fixed my pockets, left my head the same",
      "Smiling for the world while I'm fighting with my name",
      "Maybe peace ain't a place, maybe it's a choice",
      "Tired of the echo, I just want my voice",
    ],
    bridge: ["I'm okay, I'm okay, that's the lie I keep", "Promises to self I don't keep"],
    adlib: ['(mm)', '(yeah)', '(hm)', '(...)'],
    outro: ["Anyway", "Just had to say it out loud"],
  },

  love: {
    intro: ['Mm yeah', 'This one\'s for you', 'Only you'],
    hook: [
      "You the calm in a life that's always loud",
      "Out of every face I'd find you in the crowd",
      "Stay, stay, you don't gotta run",
      "You feel like home and I just begun",
    ],
    verse: [
      "Met you on a Tuesday, changed my favorite day",
      "Didn't know I needed til you came my way",
      "You see all my mess and you stay anyway",
      "Every love I lost was just a road to say",
      "I'll be your front row when the whole world leaves",
      "You the only thing my tired heart believes",
    ],
    bridge: ["And if the lights go out I'd still see you", "Everything is better when I'm with you"],
    adlib: ['(yeah)', '(oh)', '(mm)', '(you)'],
    outro: ['Just you and me', 'Forever, if you let me'],
  },
};

export const THEME_LABELS: Record<LyricTheme, string> = {
  flex: 'Flex',
  heartbreak: 'Heartbreak',
  diss: 'Diss',
  motivational: 'Motivational',
  party: 'Party',
  introspective: 'Introspective',
  love: 'Love',
};

export const ALL_THEMES: LyricTheme[] = [
  'flex',
  'heartbreak',
  'diss',
  'motivational',
  'party',
  'introspective',
  'love',
];
