import type { GameEvent } from '../../types/events';

/**
 * Asset events: what owning things (and living somewhere) invites. Pure
 * content. `{asset}` is bound when the event is slated to the priciest owned
 * item matching its `owns_asset` trigger — what a burglar would take — and
 * `{home}` / `{Home}` is where the artist lives.
 *
 * Salvaged from the shelved Crib (lifesim/): the burglar who takes the
 * priciest loose valuable unless an alarm brings the police (who pay a
 * reward), the repo man who comes when the bills go unpaid, and house fires.
 * The Crib's office "chance cards" live on as the day-job events at the end.
 */
export const ASSET_EVENTS: GameEvent[] = [
  // ─── Burglars (lifesim/core/services.ts) ───────────────────────────────────
  {
    id: 'asset-burglary',
    category: 'drama',
    title: 'Someone Was in {home}',
    description:
      'You came home to a broken lock and an empty display case. The {asset} is gone.',
    weight: 9,
    triggers: [
      { type: 'owns_asset', assetCategory: 'jewelry' },
      { type: 'lacks_asset', asset: 'security-detail' },
    ],
    choices: [
      {
        id: 'report',
        text: 'File a police report and move on.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -5 }],
          mentalChanges: [{ axis: 'paranoia', delta: 8 }],
          asset: { action: 'lose' },
          flavorText: 'The {asset} is gone. The police gave you a case number and a shrug.',
        },
      },
      {
        id: 'post',
        text: 'Post the empty case and offer a reward.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -3 }],
          fansDelta: 1_500,
          asset: { action: 'lose' },
          socialReaction: 'viral',
          flavorText: 'The internet turned detective. The {asset} is still gone, but the post did numbers.',
        },
      },
    ],
    tags: ['assets', 'crime'],
    cooldown: 16,
  },
  {
    id: 'asset-burglary-watch',
    category: 'drama',
    title: 'The Watch Box Is Empty',
    description:
      'Someone got past the lock while you were on stage. The {asset} was the only thing they took.',
    weight: 7,
    triggers: [
      { type: 'owns_asset', assetCategory: 'watch' },
      { type: 'lacks_asset', asset: 'security-detail' },
    ],
    choices: [
      {
        id: 'insurance',
        text: 'Call the insurance company.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -3 }],
          asset: { action: 'sell' },
          flavorText: 'Insurance paid out half. The {asset} was worth more to you than that.',
        },
      },
      {
        id: 'song',
        text: 'Write a song about it.',
        consequences: {
          statChanges: [
            { stat: 'writing', delta: 3 },
            { stat: 'mentalHealth', delta: -4 },
          ],
          asset: { action: 'lose' },
          flavorText: 'You lost the {asset} and gained a hook. Fair trade, maybe.',
        },
      },
    ],
    tags: ['assets', 'crime'],
    cooldown: 16,
  },
  {
    id: 'asset-burglar-caught',
    category: 'opportunity',
    title: 'The Alarm Worked',
    description:
      'At 2 a.m. the alarm went off. Your security had the burglar face-down on the lawn before the police arrived.',
    weight: 8,
    triggers: [{ type: 'owns_asset', asset: 'security-detail' }],
    choices: [
      {
        id: 'reward',
        text: 'Take the city\'s reward and thank the team.',
        consequences: {
          moneyDelta: 500,
          statChanges: [{ stat: 'mentalHealth', delta: 2 }],
          flavorText: 'Burglar apprehended. The city paid a $500 reward. Your team is insufferable about it.',
        },
      },
      {
        id: 'post-it',
        text: 'Post the doorbell footage.',
        consequences: {
          fansDelta: 2_000,
          socialReaction: 'viral',
          flavorText: 'The footage of your security guard tackling a burglar is the meme of the week.',
        },
      },
    ],
    tags: ['assets', 'crime'],
    cooldown: 20,
  },

  // ─── The repo man ──────────────────────────────────────────────────────────
  {
    id: 'asset-repo-man',
    category: 'drama',
    title: 'The Repo Man',
    description:
      'A man with a clipboard and total indifference is at the door. He is here for the {asset}.',
    weight: 16,
    triggers: [
      { type: 'has_tag', tag: 'behind-on-upkeep' },
      { type: 'owns_asset' },
    ],
    choices: [
      {
        id: 'hand-over',
        text: 'Hand over the {asset}.',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: -6 },
            { stat: 'reputation', delta: -3 },
          ],
          asset: { action: 'lose' },
          removeTags: ['behind-on-upkeep'],
          socialReaction: 'negative',
          flavorText: 'The repo man seized the {asset} with total indifference. A neighbor filmed it.',
          historyRecord: {
            kind: 'flop',
            summary: 'had the {asset} repossessed',
            severity: 40,
            tags: ['money', 'repossession'],
          },
        },
      },
      {
        id: 'sell-first',
        text: 'Sell the {asset} yourself before he can take it.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -3 }],
          asset: { action: 'sell' },
          removeTags: ['behind-on-upkeep'],
          flavorText: 'You sold the {asset} for half what you paid. At least it was your call.',
        },
      },
      {
        id: 'stall',
        text: 'Write him a check you know will bounce.',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: -4 },
            { stat: 'reputation', delta: -2 },
          ],
          flavorText: 'He left. He will be back, and the check will not clear.',
        },
      },
    ],
    tags: ['assets', 'money'],
    cooldown: 2,
  },
  {
    id: 'asset-sell-to-survive',
    category: 'personal',
    title: 'The {asset} Could Pay Rent',
    description:
      'Your account is nearly empty. The {asset} sitting in {home} is worth a lot of rent.',
    weight: 8,
    triggers: [
      { type: 'owns_asset' },
      { type: 'money_lte', value: 1_000 },
    ],
    choices: [
      {
        id: 'sell',
        text: 'Sell the {asset}.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 2 }],
          asset: { action: 'sell' },
          flavorText: 'You sold the {asset}. It hurt less than you expected.',
        },
      },
      {
        id: 'keep',
        text: 'Keep it. Things will turn around.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -3 }],
          flavorText: 'You kept the {asset}. You also kept checking your balance.',
        },
      },
    ],
    tags: ['assets', 'money'],
    cooldown: 10,
  },

  // ─── Fire ──────────────────────────────────────────────────────────────────
  {
    id: 'asset-house-fire',
    category: 'drama',
    title: 'Fire',
    description:
      'A candle, a curtain, and ten terrible minutes. The fire department saved {home}, mostly.',
    weight: 5,
    triggers: [{ type: 'week_gte', value: 8 }],
    choices: [
      {
        id: 'rebuild',
        text: 'Pay to fix everything properly.',
        consequences: {
          moneyDelta: -3_000,
          statChanges: [{ stat: 'mentalHealth', delta: -4 }],
          flavorText: 'The repairs took a month. {Home} smells like paint and a second chance.',
        },
      },
      {
        id: 'insurance',
        text: 'Let insurance handle it, slowly.',
        consequences: {
          moneyDelta: -500,
          statChanges: [
            { stat: 'energy', delta: -15 },
            { stat: 'mentalHealth', delta: -6 },
          ],
          flavorText: 'Six weeks of paperwork. You lived out of a suitcase and wrote a lot of sad songs.',
        },
      },
      {
        id: 'content',
        text: 'Film the aftermath for your fans.',
        consequences: {
          moneyDelta: -3_000,
          fansDelta: 1_200,
          statChanges: [{ stat: 'authenticity', delta: -3 }],
          socialReaction: 'mixed',
          flavorText: 'The house-fire vlog got millions of views and a lot of comments about priorities.',
        },
      },
    ],
    tags: ['assets', 'home', 'disaster'],
    cooldown: 40,
  },

  // ─── Fame at the gate ──────────────────────────────────────────────────────
  {
    id: 'asset-paparazzi-gate',
    category: 'drama',
    title: 'Paparazzi at the Gate',
    description:
      'Six photographers have been camped outside {home} since Tuesday. They shout your name when the blinds move.',
    weight: 8,
    triggers: [
      { type: 'fans_gte', value: 200_000 },
      { type: 'owns_asset', assetCategory: 'property' },
    ],
    choices: [
      {
        id: 'pose',
        text: 'Walk out and give them the shot.',
        consequences: {
          fansDelta: 2_000,
          statChanges: [{ stat: 'charisma', delta: 2 }],
          flavorText: 'You gave them one good photo. They left. It was on every blog by noon.',
        },
      },
      {
        id: 'security',
        text: 'Hire a gate guard.',
        consequences: {
          moneyDelta: -2_000,
          mentalChanges: [{ axis: 'paranoia', delta: -5 }],
          flavorText: 'The guard is enormous and does not talk. The photographers moved down the street.',
        },
      },
      {
        id: 'stay-in',
        text: 'Stay in until they get bored.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -5 }],
          mentalChanges: [{ axis: 'isolation', delta: 6 }],
          flavorText: 'You did not leave {home} for nine days. The walls started to feel closer.',
        },
      },
    ],
    tags: ['assets', 'fame', 'privacy'],
    cooldown: 14,
  },
  {
    id: 'asset-car-crash',
    category: 'drama',
    title: 'The {asset} Is Wrapped Around a Pole',
    description:
      'Nobody was hurt. The {asset} was not so lucky. A kid on a scooter got the whole thing on video.',
    weight: 6,
    triggers: [{ type: 'owns_asset', assetCategory: 'car' }],
    choices: [
      {
        id: 'own-it',
        text: 'Post an apology and a PSA about driving tired.',
        consequences: {
          statChanges: [
            { stat: 'reputation', delta: 2 },
            { stat: 'authenticity', delta: 3 },
          ],
          asset: { action: 'sell' },
          flavorText: 'You sold the wreck for parts and got some respect for owning it.',
        },
      },
      {
        id: 'blame',
        text: 'Blame the pole.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -4 }],
          fansDelta: 800,
          asset: { action: 'lose' },
          socialReaction: 'negative',
          flavorText: 'Your statement blamed "poor pole placement". The internet will never let it go.',
        },
      },
    ],
    tags: ['assets', 'car'],
    cooldown: 30,
  },
  {
    id: 'asset-flex-backlash',
    category: 'social',
    title: '"You Forgot Where You Came From"',
    description:
      'A clip of you showing off the {asset} is going around next to your first interview, where you talked about growing up broke.',
    weight: 7,
    triggers: [{ type: 'owns_asset' }, { type: 'fans_gte', value: 50_000 }],
    choices: [
      {
        id: 'give-back',
        text: 'Announce a scholarship in your hometown.',
        consequences: {
          moneyDelta: -5_000,
          statChanges: [
            { stat: 'reputation', delta: 5 },
            { stat: 'authenticity', delta: 4 },
          ],
          socialReaction: 'positive',
          flavorText: 'The scholarship made the local news. Your old school named a practice room after you.',
        },
      },
      {
        id: 'unapologetic',
        text: '"I worked for it. I will flex it."',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 3 },
            { stat: 'authenticity', delta: -4 },
          ],
          fansDelta: 1_000,
          socialReaction: 'mixed',
          flavorText: 'Half the internet called it inspiring. The other half called it tone-deaf.',
        },
      },
    ],
    tags: ['assets', 'fame'],
    cooldown: 24,
  },

  // ─── Day job (the Crib's chance cards, lifesim/data/careers.ts) ───────────
  {
    id: 'dayjob-speech',
    category: 'opportunity',
    title: 'The Boss Lost Their Voice',
    description:
      'Minutes before a big presentation at your day job, your boss loses their voice and pushes the notes into your hands.',
    weight: 8,
    triggers: [{ type: 'has_tag', tag: 'day-job' }],
    choices: [
      {
        id: 'give-it',
        text: 'Give the speech like it is a headline set.',
        consequences: {
          moneyDelta: 600,
          statChanges: [{ stat: 'charisma', delta: 3 }],
          flavorText: 'You brought the house down in a conference room. A bonus appeared.',
        },
      },
      {
        id: 'sick',
        text: 'Suddenly come down with something.',
        consequences: {
          statChanges: [{ stat: 'discipline', delta: -2 }],
          flavorText: 'You spent the afternoon in a stairwell writing lyrics instead.',
        },
      },
    ],
    tags: ['day-job'],
    cooldown: 10,
  },
  {
    id: 'dayjob-elevator-pitch',
    category: 'opportunity',
    title: '"Impress Me"',
    description:
      'An unscheduled elevator ride with the head of the company. They have heard you make music. "Impress me."',
    weight: 7,
    triggers: [{ type: 'has_tag', tag: 'day-job' }],
    choices: [
      {
        id: 'pitch',
        text: 'Pitch them a song for the company ad.',
        consequences: {
          moneyDelta: 1_200,
          fansDelta: 500,
          statChanges: [{ stat: 'creativity', delta: 2 }],
          flavorText: 'They loved it. Your song is in the ad. Your coworkers will not stop humming it.',
        },
      },
      {
        id: 'weather',
        text: 'Discuss the weather.',
        consequences: {
          flavorText: 'It was a nice elevator ride. Nothing happened.',
        },
      },
    ],
    tags: ['day-job'],
    unique: true,
  },
  {
    id: 'dayjob-shortcut',
    category: 'drama',
    title: 'The Shortcut',
    description:
      'A senior colleague offers you their shortcut for the quarterly task. It would free up two nights for the studio. It smells faintly of rule-bending.',
    weight: 7,
    triggers: [{ type: 'has_tag', tag: 'day-job' }],
    choices: [
      {
        id: 'take',
        text: 'Take the shortcut. The studio needs you.',
        consequences: {
          statChanges: [
            { stat: 'energy', delta: 10 },
            { stat: 'discipline', delta: -3 },
          ],
          addTags: ['cut-corners-at-work'],
          flavorText: 'The shortcut worked. For now. You spent both nights in the booth.',
        },
      },
      {
        id: 'by-the-book',
        text: 'Do it by the book.',
        consequences: {
          statChanges: [
            { stat: 'discipline', delta: 3 },
            { stat: 'energy', delta: -10 },
          ],
          flavorText: 'You did it properly. The studio waited.',
        },
      },
    ],
    tags: ['day-job'],
    cooldown: 14,
  },
  {
    id: 'dayjob-quit',
    category: 'career',
    title: 'Two Weeks\' Notice',
    description:
      'Your music money finally matches your paycheck. The resignation letter has been in your drafts for a month.',
    weight: 12,
    triggers: [
      { type: 'has_tag', tag: 'day-job' },
      { type: 'fans_gte', value: 20_000 },
    ],
    choices: [
      {
        id: 'quit',
        text: 'Send it.',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: 8 },
            { stat: 'energy', delta: 15 },
          ],
          removeTags: ['day-job'],
          socialReaction: 'positive',
          flavorText: 'You quit your day job. Your last day, the whole office came to your show.',
        },
      },
      {
        id: 'stay',
        text: 'Not yet. One more year of safety.',
        consequences: {
          statChanges: [{ stat: 'discipline', delta: 2 }],
          flavorText: 'You deleted the draft. Then you wrote it again.',
        },
      },
    ],
    tags: ['day-job'],
    unique: true,
  },
];
