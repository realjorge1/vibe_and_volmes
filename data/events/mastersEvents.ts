import type { GameEvent } from '../../types/events';

/**
 * MASTERS: the bad first deal, and what it costs years later. "The Paper" is
 * the tempting night a predatory label offers more money than the artist has
 * ever seen; it owns every song they release under it, forever. Then the
 * label sells those songs over their head, offers them back at a price, and
 * the artist decides: pay, or re-record everything as "(Your Version)"
 * (Studio · Catalog).
 */

const MASTERS = ['masters'];

export const MASTERS_EVENTS: GameEvent[] = [
  {
    id: 'masters-the-paper',
    category: 'opportunity',
    title: 'The Paper',
    description:
      'A man in a very nice car parks outside your building. He’s from Goldline Records. He has a contract and a pen, and an advance bigger than everything you have ever earned. "Tonight only." The small print is very small.',
    weight: 9,
    triggers: [
      { type: 'lacks_contract' },
      { type: 'has_released_track' },
      { type: 'fans_gte', value: 800 },
      { type: 'fans_lte', value: 60_000 },
      { type: 'money_lte', value: 15_000 },
      { type: 'not_in_jail' },
    ],
    choices: [
      {
        id: 'sign',
        text: 'Sign it tonight.',
        consequences: {
          signDeal: 'predatory',
          statChanges: [{ stat: 'mentalHealth', delta: 4 }],
          flavorText: 'You signed on the hood of his car. The advance hit your account before you got upstairs. You read the small print a week later. Then you read it again.',
          plantSeed: { kind: 'signed-bad-deal', after: [18, 40], who: 'none', note: 'You signed with Goldline on the hood of a car, without a lawyer.' },
        },
      },
      {
        id: 'lawyer',
        text: 'Tell him your lawyer will call.',
        consequences: {
          statChanges: [{ stat: 'industryRespect', delta: 3 }],
          flavorText: 'You don’t have a lawyer. He doesn’t know that. He left his card and a slightly worse mood.',
          spawnContractOfferTier: 'indie',
        },
      },
      {
        id: 'no',
        text: 'Hand back the pen.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 4 }],
          flavorText: 'You handed him back the pen. You stood on the sidewalk for a while after he drove off, doing the math.',
        },
      },
      {
        id: 'trust-issues',
        text: 'Read every line out loud, slowly, in front of him.',
        requiresTrait: 'trust-issues',
        consequences: {
          statChanges: [{ stat: 'industryRespect', delta: 4 }],
          signDeal: 'fair',
          flavorText: 'You read the contract out loud until he crossed out the masters clause himself. You signed a fair deal. He did not enjoy the evening.',
        },
      },
    ],
    tags: MASTERS,
    unique: true,
  },
  {
    id: 'masters-sold',
    category: 'drama',
    title: 'They Sold Your Songs',
    description:
      'You find out on social media: Goldline sold your entire catalog under them — your songs, your voice — to a private equity firm called Vault Capital. Nobody called. The deal you signed {ago} said they didn’t have to.',
    weight: 12,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'signed-bad-deal' }, { type: 'label_owns_masters' }],
    choices: [
      {
        id: 'statement',
        text: 'Post a statement. Let the fans know.',
        consequences: {
          masters: { action: 'sold' },
          statChanges: [{ stat: 'fanLoyalty', delta: 6 }, { stat: 'industryRespect', delta: -2 }],
          moment: { kind: 'scandal', headline: '{playerName}’s old label sold their masters without telling them', topic: 'the masters sale', heat: 75, valence: 60, hashtag: 'Free{playerName}Masters' },
          flavorText: 'You posted the whole story. Fans are furious on your behalf. Vault Capital’s comments are closed now.',
          plantSeed: { kind: 'masters-sold', after: [4, 12], who: 'none', note: 'Your masters were sold to Vault Capital without your consent.' },
        },
      },
      {
        id: 'quiet',
        text: 'Say nothing. Plan.',
        consequences: {
          masters: { action: 'sold' },
          statChanges: [{ stat: 'discipline', delta: 3 }],
          mentalChanges: [{ axis: 'paranoia', delta: 8 }],
          flavorText: 'You said nothing. You opened a new notes file called "my version."',
          plantSeed: { kind: 'masters-sold', after: [4, 12], who: 'none', note: 'Your masters were sold to Vault Capital without your consent.' },
        },
      },
    ],
    tags: MASTERS,
    unique: true,
  },
  {
    id: 'masters-buyback-offer',
    category: 'opportunity',
    title: 'Vault Capital Is Calling',
    description:
      'Vault Capital will sell you your own songs back. Their number: {mastersPrice}. Your accountant made a noise you have never heard a person make.',
    weight: 10,
    priority: true,
    triggers: [{ type: 'seed_ripe', seed: 'masters-sold' }, { type: 'label_owns_masters' }, { type: 'lacks_contract' }],
    choices: [
      {
        id: 'pay',
        text: 'Pay it. They’re your songs.',
        consequences: {
          masters: { action: 'buy-back' },
          statChanges: [{ stat: 'mentalHealth', delta: 8 }, { stat: 'authenticity', delta: 3 }],
          flavorText: 'You wired the money. Every song you ever made under that deal is yours again. You played the first one alone, very loud.',
        },
      },
      {
        id: 'rerecord',
        text: 'Refuse. You’ll re-record every one of them.',
        consequences: {
          statChanges: [{ stat: 'discipline', delta: 4 }, { stat: 'fanLoyalty', delta: 5 }],
          moment: { kind: 'best', headline: '{playerName} refuses to buy back their masters and vows to re-record them all', topic: 'the re-record vow', heat: 70, valence: 70, hashtag: 'YourVersion' },
          flavorText: 'You told Vault Capital no. Then you told the fans: you’re re-recording everything. (Studio · Catalog.)',
        },
      },
      {
        id: 'hustle',
        text: 'Counter at half.',
        requiresTrait: 'hustler',
        consequences: {
          flavorText: 'You countered at half. They laughed. Then, a week later, they called back. (They will offer again.)',
          plantSeed: { kind: 'masters-sold', after: [3, 6], who: 'none', note: 'You countered Vault Capital at half.' },
        },
      },
    ],
    tags: MASTERS,
    cooldown: 8,
  },
  {
    id: 'masters-deluxe-reissue',
    category: 'drama',
    title: 'A Deluxe Edition You Didn’t Make',
    description:
      'Your old label is releasing a "deluxe edition" of your early songs: remastered, with demos you never wanted anyone to hear. They own them. They don’t need to ask.',
    weight: 7,
    triggers: [{ type: 'label_owns_masters' }, { type: 'lacks_contract' }, { type: 'fans_gte', value: 50_000 }],
    choices: [
      {
        id: 'disown',
        text: 'Tell fans not to buy it.',
        consequences: {
          statChanges: [{ stat: 'fanLoyalty', delta: 4 }, { stat: 'industryRespect', delta: -3 }],
          flavorText: 'You asked fans not to buy it. It still charted. Your fans bought it and then apologized to you.',
        },
      },
      {
        id: 'embrace',
        text: 'Promote it anyway. It’s still your music.',
        consequences: {
          fansDelta: 6_000,
          statChanges: [{ stat: 'authenticity', delta: -2 }],
          flavorText: 'You promoted the deluxe. The old demos found new fans. The label sent you a fruit basket, which felt like a threat.',
        },
      },
    ],
    tags: MASTERS,
    cooldown: 30,
  },
];
