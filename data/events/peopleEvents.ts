import type { GameEvent } from '../../types/events';

/**
 * People events: drama that happens to, or because of, the people in the
 * artist's life. Text names them through role tokens — {parent} is a name,
 * {parentTitle} "your mom", {ParentTitle} "Your mom" — filled when the event
 * is slated (systems/events/personalize.ts). An event only fires when every
 * role it names exists, and `personChanges` move the named person's affinity.
 */
export const PEOPLE_EVENTS: GameEvent[] = [
  // ─── Family ────────────────────────────────────────────────────────────────
  {
    id: 'people-parent-saw-messages',
    category: 'drama',
    title: '{parent} Saw the Leaked Messages',
    description:
      'The screenshots are everywhere, and {parentTitle} has seen all of them. {parent} has called four times. You have not picked up.',
    weight: 9,
    triggers: [{ type: 'controversy_active' }],
    choices: [
      {
        id: 'call-back',
        text: 'Call {parent} back and tell the whole truth.',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: 4 },
            { stat: 'authenticity', delta: 3 },
          ],
          personChanges: [{ role: 'parent', delta: 10 }],
          flavorText: 'It was the hardest call of your life. {parent} said "I raised you better" and then "I love you anyway".',
        },
      },
      {
        id: 'damage-control',
        text: 'Have your team send {parent} the official statement.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -4 }],
          personChanges: [{ role: 'parent', delta: -15 }],
          flavorText: '{parent} read the statement and texted back one word: "Really?"',
        },
      },
    ],
    tags: ['people', 'family', 'scandal'],
    cooldown: 12,
  },
  {
    id: 'people-parent-proud',
    category: 'personal',
    title: 'Framed on the Fridge',
    description:
      '{ParentTitle} printed your chart position, framed it, and hung it on the fridge. {parent} shows it to the mail carrier.',
    weight: 8,
    triggers: [
      { type: 'person_affinity_gte', role: 'parent', value: 40 },
      { type: 'fans_gte', value: 50_000 },
    ],
    choices: [
      {
        id: 'visit',
        text: 'Go home and take a photo with it.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 8 }],
          fansDelta: 1_000,
          personChanges: [{ role: 'parent', delta: 8 }],
          socialReaction: 'positive',
          flavorText: 'You posted the fridge photo with {parent}. It is your most-liked post ever.',
        },
      },
      {
        id: 'call',
        text: 'Call {parent} and say thank you.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 5 }],
          personChanges: [{ role: 'parent', delta: 5 }],
          flavorText: '{parent} cried a little. So did you.',
        },
      },
    ],
    tags: ['people', 'family'],
    unique: true,
  },
  {
    id: 'people-disapproving-parent-show',
    category: 'personal',
    title: '{parent} Is Coming to Your Show',
    description:
      '{ParentTitle} has never been to one of your shows. {parent} bought a ticket without telling you. Word got to you anyway.',
    weight: 9,
    triggers: [{ type: 'person_affinity_lte', role: 'parent', value: 0 }],
    choices: [
      {
        id: 'dedicate',
        text: 'Dedicate a song to {parent} from the stage.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 6 }],
          fansDelta: 600,
          personChanges: [{ role: 'parent', delta: 25 }],
          socialReaction: 'positive',
          flavorText: '{parent} stood still for the whole song. Afterward, a hug that lasted a verse.',
        },
      },
      {
        id: 'play-it-clean',
        text: 'Play a clean set. Swap out the explicit ones.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: -4 }],
          personChanges: [{ role: 'parent', delta: 12 }],
          flavorText: '{parent} said it was "nice". Your fans asked where the real set went.',
        },
      },
      {
        id: 'business-as-usual',
        text: 'Play it exactly as always.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 4 }],
          personChanges: [{ role: 'parent', delta: -5 }],
          flavorText: '{parent} left before the encore. The show was great.',
        },
      },
    ],
    tags: ['people', 'family', 'show'],
    cooldown: 20,
  },
  {
    id: 'people-sibling-rent',
    category: 'personal',
    title: '{sibling} Needs Rent Money',
    description:
      '{sibling} is short on rent. Again. The text ends with "you\'re famous now tho".',
    weight: 8,
    triggers: [{ type: 'has_person', role: 'sibling' }],
    choices: [
      {
        id: 'pay',
        text: 'Send {sibling} the money.',
        consequences: {
          moneyDelta: -800,
          personChanges: [{ role: 'sibling', delta: 12 }],
          flavorText: '{sibling} sent twelve heart emojis. You will probably do this again.',
        },
      },
      {
        id: 'job',
        text: 'Offer {sibling} a job on your team instead.',
        consequences: {
          moneyDelta: -300,
          statChanges: [{ stat: 'discipline', delta: 2 }],
          personChanges: [{ role: 'sibling', delta: 6 }],
          flavorText: '{sibling} is now "creative director". Nobody knows what that means.',
        },
      },
      {
        id: 'no',
        text: 'Not this time.',
        consequences: {
          personChanges: [{ role: 'sibling', delta: -15 }],
          flavorText: '{sibling} left you on read. The family group chat has gone quiet.',
        },
      },
    ],
    tags: ['people', 'family', 'money'],
    cooldown: 14,
  },
  {
    id: 'people-family-group-chat',
    category: 'drama',
    title: 'The Family Group Chat Heard the Song',
    description:
      'Your new song has a verse about home. {parent} and {sibling} have both heard it. The family group chat is typing.',
    weight: 7,
    triggers: [{ type: 'has_released_track' }],
    choices: [
      {
        id: 'explain',
        text: 'Explain it was about growing up, not about them.',
        consequences: {
          personChanges: [
            { role: 'parent', delta: 4 },
            { role: 'sibling', delta: 4 },
          ],
          flavorText: '{sibling} replied "sure." {parent} replied with a four-minute voice note.',
        },
      },
      {
        id: 'own-it',
        text: 'Say it was about them, and it was true.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 6 }],
          personChanges: [
            { role: 'parent', delta: -10 },
            { role: 'sibling', delta: -5 },
          ],
          flavorText: 'The chat went silent for three days. Then {sibling} admitted the verse was fair.',
        },
      },
    ],
    tags: ['people', 'family', 'music'],
    cooldown: 20,
  },

  // ─── Love ──────────────────────────────────────────────────────────────────
  {
    id: 'people-partner-never-home',
    category: 'personal',
    title: '"You\'re Never Home"',
    description:
      '{partner} is sitting up when you get in at 3 a.m. "I see you more on my phone than in this apartment."',
    weight: 11,
    triggers: [{ type: 'person_affinity_lte', role: 'partner', value: 10 }],
    choices: [
      {
        id: 'cancel',
        text: 'Cancel next week\'s shows. Be there.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 5 }],
          fansDelta: -800,
          personChanges: [{ role: 'partner', delta: 25 }],
          flavorText: 'A week with {partner} and no phone. You remember why you fell for each other.',
        },
      },
      {
        id: 'promise',
        text: 'Promise things will slow down after this era.',
        consequences: {
          personChanges: [{ role: 'partner', delta: 5 }],
          addTags: ['promised-partner'],
          flavorText: '{partner} nodded. They have heard that one before.',
        },
      },
      {
        id: 'career-first',
        text: 'Say this is the job, and they knew that.',
        consequences: {
          statChanges: [{ stat: 'discipline', delta: 3 }],
          personChanges: [{ role: 'partner', delta: -20 }],
          flavorText: '{partner} slept on the couch. It was not really a choice.',
        },
      },
    ],
    tags: ['people', 'love'],
    cooldown: 8,
  },
  {
    id: 'people-partner-dms',
    category: 'drama',
    title: '{partner} Found the DMs',
    description:
      'A fan screenshot a flirty reply you sent at 2 a.m. and tagged {partner}. It was harmless. Mostly.',
    weight: 8,
    triggers: [
      { type: 'has_partner' },
      { type: 'fans_gte', value: 10_000 },
    ],
    choices: [
      {
        id: 'come-clean',
        text: 'Show {partner} everything.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -3 }],
          personChanges: [{ role: 'partner', delta: -5 }],
          flavorText: '{partner} read every message, then said "okay". It was not okay, but it was honest.',
        },
      },
      {
        id: 'deny',
        text: 'Say the screenshot is fake.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: -5 }],
          personChanges: [{ role: 'partner', delta: -15 }],
          socialReaction: 'negative',
          flavorText: 'The screenshot was not fake. {partner} knows it. So does the internet.',
        },
      },
    ],
    tags: ['people', 'love', 'scandal'],
    cooldown: 16,
  },
  {
    id: 'people-partner-cheating-rumor',
    category: 'drama',
    title: 'Photos of {partner}',
    description:
      'The blogs have photos of {partner} leaving a club with someone else. Your phone is melting.',
    weight: 14,
    triggers: [
      { type: 'has_partner' },
      { type: 'has_tag', tag: 'partner-cheating-rumor' },
    ],
    choices: [
      {
        id: 'ask',
        text: 'Ask {partner} directly, in private.',
        consequences: {
          personChanges: [{ role: 'partner', delta: 5 }],
          removeTags: ['partner-cheating-rumor'],
          flavorText: '{partner} swears it was nothing. You decide to believe them. For now.',
        },
      },
      {
        id: 'subtweet',
        text: 'Post a cryptic lyric and let them see it.',
        consequences: {
          fansDelta: 2_000,
          personChanges: [{ role: 'partner', delta: -25 }],
          removeTags: ['partner-cheating-rumor'],
          socialReaction: 'viral',
          flavorText: 'Your lyric post broke the internet. {partner} has not come home.',
        },
      },
      {
        id: 'ignore',
        text: 'Refuse to look at the photos.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -6 }],
          removeTags: ['partner-cheating-rumor'],
          flavorText: 'You did not look. You thought about nothing else all week.',
        },
      },
    ],
    tags: ['people', 'love', 'rumor'],
    cooldown: 6,
  },
  {
    id: 'people-wedding-leak',
    category: 'drama',
    title: 'The Wedding Venue Leaked',
    description:
      'Someone sold your wedding venue and date to a gossip site. {partner} is furious, mostly at the guest list.',
    weight: 10,
    triggers: [{ type: 'has_partner', bond: 'engaged' }],
    choices: [
      {
        id: 'move',
        text: 'Move the wedding. Secret location.',
        consequences: {
          moneyDelta: -2_000,
          personChanges: [{ role: 'partner', delta: 10 }],
          flavorText: 'New venue, forty guests, phones in a basket. {partner} loved it.',
        },
      },
      {
        id: 'sell',
        text: 'Sell the exclusive photos yourself.',
        consequences: {
          moneyDelta: 5_000,
          statChanges: [{ stat: 'authenticity', delta: -5 }],
          personChanges: [{ role: 'partner', delta: -10 }],
          flavorText: 'The magazine paid well. {partner} called it "our wedding, sponsored".',
        },
      },
    ],
    tags: ['people', 'love', 'wedding'],
    unique: true,
  },
  {
    id: 'people-partner-album-clash',
    category: 'career',
    title: '{partner} Is Dropping the Same Week',
    description:
      '{partner}\'s album is dated for the same Friday as your single. Every blog wants a "couple chart war".',
    weight: 8,
    triggers: [
      { type: 'has_partner' },
      { type: 'has_released_track' },
    ],
    choices: [
      {
        id: 'move-yours',
        text: 'Move your single back a week.',
        consequences: {
          fansDelta: -500,
          personChanges: [{ role: 'partner', delta: 12 }],
          flavorText: '{partner} had the biggest week of their career. You were in the front row.',
        },
      },
      {
        id: 'joint-promo',
        text: 'Turn it into a joint promo run.',
        consequences: {
          fansDelta: 2_500,
          personChanges: [{ role: 'partner', delta: 6 }],
          socialReaction: 'positive',
          flavorText: 'The couple interviews did numbers. Both releases landed.',
        },
      },
      {
        id: 'compete',
        text: 'Keep the date. May the best song win.',
        consequences: {
          fansDelta: 1_500,
          personChanges: [{ role: 'partner', delta: -15 }],
          socialReaction: 'mixed',
          flavorText: 'You won the week. Dinner at home was very quiet.',
        },
      },
    ],
    tags: ['people', 'love', 'charts'],
    cooldown: 20,
  },
  {
    id: 'people-ex-podcast',
    category: 'drama',
    title: '{ex} Is Doing a Podcast Tell-All',
    description:
      '{ex} just announced a three-part podcast episode titled "What Really Happened". Part one drops tonight.',
    weight: 9,
    triggers: [{ type: 'has_person', role: 'ex' }],
    choices: [
      {
        id: 'reach-out',
        text: 'Call {ex}. Ask them not to.',
        consequences: {
          personChanges: [{ role: 'ex', delta: 10 }],
          statChanges: [{ stat: 'mentalHealth', delta: -2 }],
          flavorText: '{ex} postponed it "indefinitely". You owe them a favor now.',
        },
      },
      {
        id: 'respond',
        text: 'Go on a rival podcast and tell your side.',
        consequences: {
          fansDelta: 3_000,
          statChanges: [{ stat: 'reputation', delta: -4 }],
          personChanges: [{ role: 'ex', delta: -30 }],
          socialReaction: 'viral',
          flavorText: 'Two podcasts, two stories, one very entertained internet.',
          historyRecord: {
            kind: 'feud',
            summary: 'traded podcast tell-alls with {ex}',
            severity: 45,
            tags: ['ex', 'podcast'],
          },
        },
      },
      {
        id: 'silence',
        text: 'Say nothing. Let it pass.',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: -4 },
            { stat: 'reputation', delta: 2 },
          ],
          flavorText: 'You did not listen. Everyone else did. It blew over in a week.',
        },
      },
    ],
    tags: ['people', 'ex', 'drama'],
    cooldown: 24,
  },

  // ─── Kids ──────────────────────────────────────────────────────────────────
  {
    id: 'people-child-school-play',
    category: 'personal',
    title: '{child}\'s School Play',
    description:
      '{child} has one line in the school play. It is the same night as a sold-out show.',
    weight: 10,
    triggers: [{ type: 'has_child' }],
    choices: [
      {
        id: 'go',
        text: 'Move the show. Be in the audience.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 8 }],
          moneyDelta: -2_000,
          personChanges: [{ role: 'child', delta: 20 }],
          flavorText: '{child} found you in the crowd and forgot the line. You clapped loudest anyway.',
        },
      },
      {
        id: 'facetime',
        text: 'Watch it on FaceTime from the green room.',
        consequences: {
          personChanges: [{ role: 'child', delta: -5 }],
          flavorText: 'The video froze on {child}\'s big line. You told them it was perfect.',
        },
      },
    ],
    tags: ['people', 'kids'],
    cooldown: 12,
  },
  {
    id: 'people-child-paparazzi',
    category: 'drama',
    title: 'A Photographer at {child}\'s School',
    description:
      'A photographer was waiting outside {child}\'s school. The photo is already online.',
    weight: 8,
    triggers: [
      { type: 'has_child' },
      { type: 'fans_gte', value: 200_000 },
    ],
    choices: [
      {
        id: 'statement',
        text: 'Post a statement: leave my kid out of it.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: 3 }],
          fansDelta: 1_000,
          personChanges: [{ role: 'child', delta: 5 }],
          socialReaction: 'positive',
          flavorText: 'Other parents in the industry backed you up. The photo came down.',
        },
      },
      {
        id: 'security',
        text: 'Hire security for the school run.',
        consequences: {
          moneyDelta: -3_000,
          personChanges: [{ role: 'child', delta: 3 }],
          flavorText: '{child} thinks the security guard is their new best friend.',
        },
      },
    ],
    tags: ['people', 'kids', 'privacy'],
    cooldown: 20,
  },

  // ─── Friends & team ────────────────────────────────────────────────────────
  {
    id: 'people-friend-leaked-verse',
    category: 'drama',
    title: '{friend} Used Your Verse',
    description:
      'The new {friend} single has a line you wrote in their kitchen last month. You never said they could use it.',
    weight: 8,
    triggers: [{ type: 'has_person', role: 'friend' }],
    choices: [
      {
        id: 'let-it-go',
        text: 'Let it go. Friends share.',
        consequences: {
          personChanges: [{ role: 'friend', delta: 5 }],
          statChanges: [{ stat: 'mentalHealth', delta: -2 }],
          flavorText: '{friend} thanked you in the liner notes. Small print.',
        },
      },
      {
        id: 'credit',
        text: 'Ask {friend} for a writing credit.',
        consequences: {
          moneyDelta: 1_000,
          statChanges: [{ stat: 'industryRespect', delta: 2 }],
          personChanges: [{ role: 'friend', delta: -5 }],
          flavorText: 'You got the credit and a small check. Things are a little stiff with {friend}.',
        },
      },
      {
        id: 'expose',
        text: 'Post the voice memo with the timestamp.',
        consequences: {
          fansDelta: 1_500,
          personChanges: [{ role: 'friend', delta: -40 }],
          socialReaction: 'viral',
          flavorText: 'The voice memo went everywhere. {friend} has blocked you.',
        },
      },
    ],
    tags: ['people', 'friends', 'music'],
    cooldown: 16,
  },
  {
    id: 'people-manager-offer',
    category: 'opportunity',
    title: 'A Manager Wants to Sign You',
    description:
      '{new} has managed two acts you have heard of. They want 15% and your trust.',
    weight: 9,
    triggers: [
      { type: 'lacks_person', role: 'manager' },
      { type: 'fans_gte', value: 5_000 },
    ],
    choices: [
      {
        id: 'sign',
        text: 'Sign with {new}.',
        consequences: {
          statChanges: [
            { stat: 'industryRespect', delta: 4 },
            { stat: 'discipline', delta: 3 },
          ],
          addPerson: { role: 'manager', title: 'your manager', affinity: 25 },
          flavorText: '{new} is your manager now. Your calendar has never looked this organized.',
        },
      },
      {
        id: 'pass',
        text: 'Stay independent for now.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 2 }],
          flavorText: '{new} left a card. "When you are ready."',
        },
      },
    ],
    tags: ['people', 'team'],
    cooldown: 16,
  },
  {
    id: 'people-manager-skimming',
    category: 'drama',
    title: 'The Numbers Do Not Add Up',
    description:
      'Your accountant found gaps in the tour money. Every gap has {manager}\'s initials near it.',
    weight: 8,
    triggers: [
      { type: 'has_person', role: 'manager' },
      { type: 'person_affinity_lte', role: 'manager', value: 20 },
    ],
    choices: [
      {
        id: 'confront',
        text: 'Confront {manager} with the spreadsheet.',
        consequences: {
          moneyDelta: 2_000,
          personChanges: [{ role: 'manager', delta: -30 }],
          flavorText: '{manager} paid some of it back and swore it was a mistake.',
        },
      },
      {
        id: 'lawyer',
        text: 'Let your lawyer handle {manager}.',
        consequences: {
          moneyDelta: 3_500,
          statChanges: [{ stat: 'mentalHealth', delta: -4 }],
          personChanges: [{ role: 'manager', delta: -60 }],
          flavorText: 'The settlement came through. So did a very long text from {manager}.',
          historyRecord: {
            kind: 'betrayal',
            summary: 'caught {manager} skimming tour money',
            severity: 50,
            tags: ['manager', 'money'],
          },
        },
      },
    ],
    tags: ['people', 'team', 'money'],
    cooldown: 24,
  },
  {
    id: 'people-old-friend',
    category: 'social',
    title: 'An Old Friend From Before',
    description:
      '{new} was in the audience at your first open mic. They just messaged: "remember me?"',
    weight: 7,
    triggers: [{ type: 'week_gte', value: 6 }],
    choices: [
      {
        id: 'reconnect',
        text: 'Meet up with {new}.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 5 }],
          mentalChanges: [{ axis: 'isolation', delta: -6 }],
          addPerson: { role: 'friend', title: 'your friend', affinity: 30 },
          flavorText: 'Four hours with {new} felt like no time had passed.',
        },
      },
      {
        id: 'ignore',
        text: 'Leave it on read.',
        consequences: {
          mentalChanges: [{ axis: 'isolation', delta: 3 }],
          flavorText: 'You meant to reply to {new}. You never did.',
        },
      },
    ],
    tags: ['people', 'friends'],
    cooldown: 30,
  },
];
