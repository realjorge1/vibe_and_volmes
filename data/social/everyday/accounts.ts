import type { NpcAccount } from '../../../types/social';
import type { PhotoTag } from '../../photos/photoPack';
import type { RealCategory } from '../../../types/realworld';
import { REAL_OUTLETS } from '../../realworld/outlets';

/**
 * THE REST OF THE INTERNET.
 *
 * Accounts the artist "follows" that have nothing to do with music: meme
 * pages, a food account, a gym guy, the sports page, the weather, friends
 * from home, the news, and the brands whose ads show up between posts. They
 * keep posting week after week, so the feed has regulars you recognize.
 * All names are made up.
 */

export type EverydayVibe =
  | 'food'
  | 'pets'
  | 'sports'
  | 'fitness'
  | 'travel'
  | 'fashion'
  | 'memes'
  | 'tech'
  | 'tv'
  | 'weather'
  | 'money'
  | 'dating'
  | 'motivation'
  | 'gaming'
  | 'cars'
  | 'work'
  | 'family'
  | 'life'
  | 'news';

export type NewsSection = 'world' | 'business' | 'sports' | 'tech' | 'health' | 'entertainment' | 'weather';

export type RegularAvatar =
  | { kind: 'logo'; text: string; bg: string; fg: string }
  | { kind: 'face'; gender: 'woman' | 'man' }
  | { kind: 'photo'; tags: readonly PhotoTag[] };

export interface RegularAccount extends NpcAccount {
  vibes: readonly EverydayVibe[];
  avatar: RegularAvatar;
  /** Outlets: which Headlines sections they cover. */
  sections?: readonly NewsSection[];
  /** A brand: every post is an ad. */
  brand?: boolean;
  /** Posts real-world news (data/realworld/outlets): kept out of the made-up world's posts. */
  realWorld?: readonly RealCategory[];
  bio: string;
}

const acct = (a: Omit<RegularAccount, 'accountType'> & { accountType?: NpcAccount['accountType'] }): RegularAccount => ({
  accountType: 'public',
  ...a,
});

export const REGULARS: readonly RegularAccount[] = [
  // Pages
  acct({ id: 'ev-relatable', username: 'Relatable Daily', handle: 'relatabledaily', followers: 4_800_000, isVerified: true, preferredPlatforms: ['chirper', 'flashpic', 'tunetok'], vibes: ['memes', 'work', 'dating'], avatar: { kind: 'logo', text: 'RD', bg: '#FFE600', fg: '#111111' }, bio: 'if it happened to you, it happened to us first' }),
  acct({ id: 'ev-hoops', username: 'Hoops Nation', handle: 'hoopsnation', followers: 3_100_000, isVerified: true, preferredPlatforms: ['chirper', 'flashpic', 'tunetok'], vibes: ['sports'], avatar: { kind: 'logo', text: 'HN', bg: '#E8590C', fg: '#FFFFFF' }, bio: 'every bucket, every brick, every meltdown' }),
  acct({ id: 'ev-goalzone', username: 'Goal Zone', handle: 'goalzone', followers: 2_400_000, isVerified: true, preferredPlatforms: ['chirper', 'flashpic'], vibes: ['sports'], avatar: { kind: 'logo', text: 'GZ', bg: '#0B6E4F', fg: '#FFFFFF' }, bio: 'football, the global kind' }),
  acct({ id: 'ev-screentea', username: 'Screen Tea', handle: 'screentea', followers: 1_900_000, isVerified: true, preferredPlatforms: ['chirper', 'flashpic', 'tunetok'], vibes: ['tv'], avatar: { kind: 'logo', text: 'ST', bg: '#7C3AED', fg: '#FFFFFF' }, bio: 'TV, reality shows and the finales nobody recovered from' }),
  acct({ id: 'ev-bytesize', username: 'Byte Size', handle: 'bytesizetech', followers: 1_200_000, isVerified: true, preferredPlatforms: ['chirper', 'tunetok'], vibes: ['tech'], avatar: { kind: 'logo', text: 'B/', bg: '#111827', fg: '#22D3EE' }, bio: 'tech news you can read on one coffee' }),
  acct({ id: 'ev-moneymoves', username: 'Money Moves Daily', handle: 'moneymovesdaily', followers: 860_000, isVerified: false, preferredPlatforms: ['chirper', 'tunetok', 'flashpic'], vibes: ['money', 'motivation'], avatar: { kind: 'logo', text: '$M', bg: '#14532D', fg: '#BBF7D0' }, bio: 'save it, stack it, stop buying things to impress strangers' }),
  acct({ id: 'ev-situationship', username: 'Situationship Diaries', handle: 'situationshipdiaries', followers: 2_200_000, isVerified: false, preferredPlatforms: ['chirper', 'tunetok', 'flashpic'], vibes: ['dating', 'memes'], avatar: { kind: 'logo', text: 'SD', bg: '#DB2777', fg: '#FFFFFF' }, bio: 'we are not okay and neither is your group chat' }),
  acct({ id: 'ev-riseandgrind', username: 'Rise & Grind', handle: 'riseandgrind', followers: 1_500_000, isVerified: false, preferredPlatforms: ['flashpic', 'chirper'], vibes: ['motivation', 'fitness'], avatar: { kind: 'logo', text: 'R&G', bg: '#0F172A', fg: '#FACC15' }, bio: 'daily reminder: you are one decision away' }),
  acct({ id: 'ev-9to5', username: '9 to 5 Problems', handle: '9to5problems', followers: 1_300_000, isVerified: false, preferredPlatforms: ['chirper', 'tunetok'], vibes: ['work', 'memes'], avatar: { kind: 'logo', text: '9-5', bg: '#334155', fg: '#FFFFFF' }, bio: 'per my last email' }),
  acct({ id: 'ev-fitcheck', username: 'Fit Check Daily', handle: 'fitcheckdaily', followers: 980_000, isVerified: false, preferredPlatforms: ['flashpic', 'tunetok'], vibes: ['fashion'], avatar: { kind: 'photo', tags: ['fashion', 'sneakers'] }, bio: 'street style from everywhere' }),
  acct({ id: 'ev-streetspotted', username: 'Street Spotted', handle: 'streetspotted', followers: 640_000, isVerified: false, preferredPlatforms: ['flashpic', 'tunetok'], vibes: ['cars'], avatar: { kind: 'photo', tags: ['car', 'drive'] }, bio: 'cars in the wild. no rentals.' }),
  acct({ id: 'ev-pupdate', username: 'Daily Pupdate', handle: 'dailypupdate', followers: 3_600_000, isVerified: true, preferredPlatforms: ['flashpic', 'tunetok'], vibes: ['pets'], avatar: { kind: 'photo', tags: ['pets'] }, bio: 'the good boys and girls of the internet' }),
  acct({ id: 'ev-citycats', username: 'Cats Of The City', handle: 'catsofthecity', followers: 1_100_000, isVerified: false, preferredPlatforms: ['flashpic', 'chirper'], vibes: ['pets'], avatar: { kind: 'photo', tags: ['pets'] }, bio: 'street cats, shop cats, judging cats' }),
  acct({ id: 'ev-wander', username: 'Wander With Ade', handle: 'wanderwithade', followers: 720_000, isVerified: false, preferredPlatforms: ['flashpic', 'tunetok'], vibes: ['travel'], avatar: { kind: 'face', gender: 'man' }, bio: '41 countries, one backpack, zero sense of direction' }),
  // People
  acct({ id: 'ev-eatwithtasha', username: 'Eat With Tasha', handle: 'eatwithtasha', followers: 410_000, isVerified: false, preferredPlatforms: ['flashpic', 'tunetok'], vibes: ['food'], avatar: { kind: 'face', gender: 'woman' }, bio: 'I eat so you know where to eat' }),
  acct({ id: 'ev-chefmarco', username: 'Chef Marco', handle: 'chefmarcocooks', followers: 1_700_000, isVerified: true, preferredPlatforms: ['tunetok', 'flashpic'], vibes: ['food'], avatar: { kind: 'face', gender: 'man' }, bio: 'five ingredients, ten minutes, no excuses' }),
  acct({ id: 'ev-jaylifts', username: 'Jay Lifts', handle: 'jaylifts', followers: 530_000, isVerified: false, preferredPlatforms: ['flashpic', 'tunetok'], vibes: ['fitness'], avatar: { kind: 'face', gender: 'man' }, bio: 'coach. leg day is not optional.' }),
  acct({ id: 'ev-ritaruns', username: 'Rita Runs', handle: 'ritaruns', followers: 260_000, isVerified: false, preferredPlatforms: ['flashpic', 'chirper'], vibes: ['fitness', 'motivation'], avatar: { kind: 'face', gender: 'woman' }, bio: 'marathons, slowly. sunrise every day.' }),
  acct({ id: 'ev-gadgetgabe', username: 'Gadget Gabe', handle: 'gadgetgabe', followers: 890_000, isVerified: true, preferredPlatforms: ['tunetok', 'chirper'], vibes: ['tech'], avatar: { kind: 'face', gender: 'man' }, bio: 'I unbox it so you don’t regret it' }),
  acct({ id: 'ev-pixelpete', username: 'Pixel Pete', handle: 'pixelpete', followers: 690_000, isVerified: false, preferredPlatforms: ['tunetok', 'chirper'], vibes: ['gaming', 'memes'], avatar: { kind: 'face', gender: 'man' }, bio: 'professional respawner' }),
  acct({ id: 'ev-momofthree', username: 'Mom Of Three', handle: 'momofthreeandcoffee', followers: 340_000, isVerified: false, preferredPlatforms: ['flashpic', 'chirper', 'tunetok'], vibes: ['family', 'memes'], avatar: { kind: 'face', gender: 'woman' }, bio: 'running on coffee and snack negotiations' }),
  // Friends from home (small accounts, real-life posts)
  acct({ id: 'ev-kemi', username: 'Kemi', handle: 'kemi.xo', followers: 940, isVerified: false, preferredPlatforms: ['flashpic', 'chirper'], vibes: ['life', 'food', 'travel'], avatar: { kind: 'face', gender: 'woman' }, bio: 'just vibes' }),
  acct({ id: 'ev-dre', username: 'Dre', handle: 'dre_moves', followers: 1_400, isVerified: false, preferredPlatforms: ['chirper', 'flashpic'], vibes: ['life', 'sports', 'cars'], avatar: { kind: 'face', gender: 'man' }, bio: 'hometown legend (self-appointed)' }),
  acct({ id: 'ev-jules', username: 'Jules', handle: 'julesinthecity', followers: 2_100, isVerified: false, preferredPlatforms: ['flashpic', 'tunetok'], vibes: ['life', 'fashion', 'dating'], avatar: { kind: 'face', gender: 'woman' }, bio: 'main character in training' }),
  acct({ id: 'ev-tobi', username: 'Tobi', handle: 'tobi.wav', followers: 760, isVerified: false, preferredPlatforms: ['chirper', 'tunetok'], vibes: ['life', 'gaming', 'work'], avatar: { kind: 'face', gender: 'man' }, bio: 'professional overthinker' }),
  // Weather
  acct({ id: 'ev-weathernow', username: 'Weather Now', handle: 'weathernow', followers: 2_000_000, isVerified: true, preferredPlatforms: ['chirper', 'vibestream'], vibes: ['weather'], avatar: { kind: 'logo', text: '☀', bg: '#0EA5E9', fg: '#FFFFFF' }, sections: ['weather'], bio: 'forecasts you can actually use', accountType: 'news' }),
  // News outlets (VibeNews)
  acct({ id: 'ev-ledger', username: 'The Daily Ledger', handle: 'dailyledger', followers: 6_200_000, isVerified: true, preferredPlatforms: ['vibestream', 'chirper'], vibes: ['news'], avatar: { kind: 'logo', text: 'DL', bg: '#111111', fg: '#FFFFFF' }, sections: ['world', 'business'], bio: 'news, plainly', accountType: 'news' }),
  acct({ id: 'ev-metrowire', username: 'Metro Wire', handle: 'metrowire', followers: 3_400_000, isVerified: true, preferredPlatforms: ['vibestream', 'chirper'], vibes: ['news'], avatar: { kind: 'logo', text: 'MW', bg: '#B91C1C', fg: '#FFFFFF' }, sections: ['world', 'health', 'weather'], bio: 'the city and the world, every hour', accountType: 'news' }),
  acct({ id: 'ev-sportsdesk', username: 'Sports Desk', handle: 'sportsdesk', followers: 4_100_000, isVerified: true, preferredPlatforms: ['vibestream', 'chirper'], vibes: ['news', 'sports'], avatar: { kind: 'logo', text: 'SD', bg: '#1D4ED8', fg: '#FFFFFF' }, sections: ['sports'], bio: 'scores, trades, takes', accountType: 'news' }),
  acct({ id: 'ev-techpulse', username: 'Tech Pulse', handle: 'techpulse', followers: 2_700_000, isVerified: true, preferredPlatforms: ['vibestream', 'chirper'], vibes: ['news', 'tech'], avatar: { kind: 'logo', text: 'TP', bg: '#0F766E', fg: '#FFFFFF' }, sections: ['tech', 'business'], bio: 'the future, reviewed', accountType: 'news' }),
  acct({ id: 'ev-screenreport', username: 'Screen Report', handle: 'screenreport', followers: 2_300_000, isVerified: true, preferredPlatforms: ['vibestream'], vibes: ['news', 'tv'], avatar: { kind: 'logo', text: 'SR', bg: '#6D28D9', fg: '#FFFFFF' }, sections: ['entertainment'], bio: 'film, TV and everything you binge', accountType: 'news' }),
  // Brands (their posts are ads)
  acct({ id: 'ad-fizzly', username: 'Fizzly', handle: 'fizzly', followers: 2_900_000, isVerified: true, preferredPlatforms: ['flashpic', 'tunetok', 'chirper'], vibes: ['food'], brand: true, avatar: { kind: 'logo', text: 'fz', bg: '#F43F5E', fg: '#FFFFFF' }, bio: 'the fizz that hits different' }),
  acct({ id: 'ad-kloudkicks', username: 'Kloud Kicks', handle: 'kloudkicks', followers: 1_800_000, isVerified: true, preferredPlatforms: ['flashpic', 'tunetok'], vibes: ['fashion'], brand: true, avatar: { kind: 'logo', text: 'KK', bg: '#F8FAFC', fg: '#0F172A' }, bio: 'walk on clouds' }),
  acct({ id: 'ad-novabank', username: 'NovaBank', handle: 'novabank', followers: 940_000, isVerified: true, preferredPlatforms: ['chirper', 'flashpic', 'tunetok'], vibes: ['money'], brand: true, avatar: { kind: 'logo', text: 'N', bg: '#4F46E5', fg: '#FFFFFF' }, bio: 'banking that doesn’t feel like banking' }),
  acct({ id: 'ad-glowy', username: 'Glowy Skin', handle: 'glowyskin', followers: 1_300_000, isVerified: true, preferredPlatforms: ['flashpic', 'tunetok'], vibes: ['fashion'], brand: true, avatar: { kind: 'logo', text: 'g.', bg: '#FDE68A', fg: '#78350F' }, bio: 'skin first' }),
  acct({ id: 'ad-zippeats', username: 'Zipp Eats', handle: 'zippeats', followers: 2_100_000, isVerified: true, preferredPlatforms: ['flashpic', 'tunetok', 'chirper'], vibes: ['food'], brand: true, avatar: { kind: 'logo', text: 'Z', bg: '#16A34A', fg: '#FFFFFF' }, bio: 'hungry? it’s already on the way' }),
  acct({ id: 'ad-volt', username: 'Volt Energy', handle: 'voltenergy', followers: 1_600_000, isVerified: true, preferredPlatforms: ['tunetok', 'flashpic'], vibes: ['fitness'], brand: true, avatar: { kind: 'logo', text: 'V', bg: '#18181B', fg: '#A3E635' }, bio: 'charge up' }),
  acct({ id: 'ad-haven', username: 'Haven Hotels', handle: 'havenhotels', followers: 720_000, isVerified: true, preferredPlatforms: ['flashpic'], vibes: ['travel'], brand: true, avatar: { kind: 'logo', text: 'H', bg: '#78716C', fg: '#FFFFFF' }, bio: 'stay somewhere worth posting' }),
  acct({ id: 'ad-nimbus', username: 'Nimbus', handle: 'nimbus', followers: 8_400_000, isVerified: true, preferredPlatforms: ['flashpic', 'tunetok', 'chirper'], vibes: ['tech'], brand: true, avatar: { kind: 'logo', text: '◐', bg: '#0A0A0A', fg: '#FFFFFF' }, bio: 'think in orbit' }),
  // Real-world news pages (systems/realworld)
  ...REAL_OUTLETS,
];

const BY_ID = new Map(REGULARS.map((a) => [a.id, a]));

export function regularById(id: string): RegularAccount | undefined {
  return BY_ID.get(id);
}

export function isRegularId(id: string): boolean {
  return id.startsWith('ev-') || id.startsWith('ad-');
}
