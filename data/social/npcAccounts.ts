import type { NpcAccount } from '../../types/social';

export const NPC_ACCOUNTS: NpcAccount[] = [
  // Stan accounts
  { id: 'stan-1', username: 'Main Character Energy', handle: 'maincharacterstan', accountType: 'stan', followers: 12000, isVerified: false, preferredPlatforms: ['chirper', 'flashpic'] },
  { id: 'stan-2', username: 'Daily Updates', handle: 'dailyupdatesonly', accountType: 'stan', followers: 8500, isVerified: false, preferredPlatforms: ['chirper'] },
  { id: 'stan-3', username: 'Certified Defender', handle: 'certifieddefender', accountType: 'stan', followers: 22000, isVerified: false, preferredPlatforms: ['chirper', 'tunetok'] },
  { id: 'stan-4', username: 'Ride or Die Forever', handle: 'rideordieforeverr', accountType: 'stan', followers: 5400, isVerified: false, preferredPlatforms: ['chirper', 'flashpic'] },
  { id: 'stan-5', username: 'Streaming Since Day One', handle: 'streamingsincedayone', accountType: 'stan', followers: 18000, isVerified: false, preferredPlatforms: ['chirper'] },

  // Regular fans
  { id: 'fan-1', username: 'Jordan K', handle: 'jordankmusic', accountType: 'fan', followers: 340, isVerified: false, preferredPlatforms: ['chirper', 'flashpic'] },
  { id: 'fan-2', username: 'Bri P', handle: 'bripdaily', accountType: 'fan', followers: 890, isVerified: false, preferredPlatforms: ['chirper', 'tunetok'] },
  { id: 'fan-3', username: 'Marcus T', handle: 'marcustvibes', accountType: 'fan', followers: 220, isVerified: false, preferredPlatforms: ['chirper'] },
  { id: 'fan-4', username: 'Aisha R', handle: 'aisharr_', accountType: 'fan', followers: 1200, isVerified: false, preferredPlatforms: ['flashpic', 'chirper'] },
  { id: 'fan-5', username: 'Dev G', handle: 'devg_real', accountType: 'fan', followers: 450, isVerified: false, preferredPlatforms: ['chirper', 'tunetok'] },
  { id: 'fan-6', username: 'Lena M', handle: 'lenamvibes', accountType: 'fan', followers: 670, isVerified: false, preferredPlatforms: ['flashpic'] },
  { id: 'fan-7', username: 'Ty Banks', handle: 'tybanksreal', accountType: 'fan', followers: 340, isVerified: false, preferredPlatforms: ['chirper'] },
  { id: 'fan-8', username: 'Nia Love', handle: 'nialove__', accountType: 'fan', followers: 2100, isVerified: false, preferredPlatforms: ['flashpic', 'chirper'] },

  // Music critics
  { id: 'critic-1', username: 'Sound Review', handle: 'soundreviewhq', accountType: 'critic', followers: 145000, isVerified: true, preferredPlatforms: ['chirper', 'vibestream'] },
  { id: 'critic-2', username: 'Pitch Report', handle: 'pitchreport', accountType: 'critic', followers: 89000, isVerified: true, preferredPlatforms: ['chirper'] },
  { id: 'critic-3', username: 'Beat Journal', handle: 'beatjournal', accountType: 'critic', followers: 52000, isVerified: false, preferredPlatforms: ['chirper', 'vibestream'] },
  { id: 'critic-4', username: 'The Honest Ear', handle: 'thehonestear', accountType: 'critic', followers: 31000, isVerified: false, preferredPlatforms: ['chirper'] },

  // Gossip accounts
  { id: 'gossip-1', username: 'Music Tea Daily', handle: 'musicteadaily', accountType: 'gossip', followers: 780000, isVerified: true, preferredPlatforms: ['chirper', 'flashpic'] },
  { id: 'gossip-2', username: 'Industry Insider', handle: 'industryinsider_', accountType: 'gossip', followers: 290000, isVerified: false, preferredPlatforms: ['chirper'] },
  { id: 'gossip-3', username: 'Spill The Sound', handle: 'spillthesound', accountType: 'gossip', followers: 450000, isVerified: true, preferredPlatforms: ['chirper', 'flashpic'] },
  { id: 'gossip-4', username: 'Urban Blast', handle: 'urbanblast', accountType: 'gossip', followers: 180000, isVerified: false, preferredPlatforms: ['chirper', 'flashpic'] },
  { id: 'gossip-5', username: 'Behind The Beat', handle: 'behindthebeat_', accountType: 'gossip', followers: 95000, isVerified: false, preferredPlatforms: ['chirper'] },

  // Rival fans
  { id: 'rival-fan-1', username: 'Blaze Omen Army', handle: 'blazeomenarmy', accountType: 'rival-fan', followers: 34000, isVerified: false, preferredPlatforms: ['chirper'] },
  { id: 'rival-fan-2', username: 'Nova Nation', handle: 'novanation_', accountType: 'rival-fan', followers: 120000, isVerified: false, preferredPlatforms: ['chirper', 'flashpic'] },
  { id: 'rival-fan-3', username: 'Cash Melo Gang', handle: 'cashmelogang', accountType: 'rival-fan', followers: 450000, isVerified: false, preferredPlatforms: ['chirper'] },

  // Industry accounts
  { id: 'industry-1', username: 'Chart Watch', handle: 'chartwatch_', accountType: 'industry', followers: 220000, isVerified: true, preferredPlatforms: ['chirper', 'vibestream'] },
  { id: 'industry-2', username: 'Meridian Records', handle: 'meridianrecords', accountType: 'industry', followers: 890000, isVerified: true, preferredPlatforms: ['chirper', 'flashpic', 'vibestream'] },
  { id: 'industry-3', username: 'SoundWire Mag', handle: 'soundwiremag', accountType: 'industry', followers: 340000, isVerified: true, preferredPlatforms: ['chirper'] },
  { id: 'industry-4', username: 'Vibestream Charts', handle: 'vibestreamcharts', accountType: 'industry', followers: 1200000, isVerified: true, preferredPlatforms: ['vibestream', 'chirper'] },

  // General public
  { id: 'public-1', username: 'Regular Person', handle: 'regularfrequency', accountType: 'public', followers: 120, isVerified: false, preferredPlatforms: ['chirper'] },
  { id: 'public-2', username: 'Just Vibin', handle: 'justvibinn__', accountType: 'public', followers: 89, isVerified: false, preferredPlatforms: ['flashpic', 'chirper'] },
  { id: 'public-3', username: 'Average Listener', handle: 'avglistener99', accountType: 'public', followers: 340, isVerified: false, preferredPlatforms: ['chirper'] },

  // Meme pages (the internet's loudest bystanders)
  { id: 'public-4', username: 'Music Memes Daily', handle: 'musicmemesdaily', accountType: 'public', followers: 640000, isVerified: false, preferredPlatforms: ['flashpic', 'tunetok', 'chirper'] },
  { id: 'public-5', username: 'Unhinged Music Takes', handle: 'unhingedmusictakes', accountType: 'public', followers: 210000, isVerified: false, preferredPlatforms: ['chirper', 'flashpic'] },

  // Professional haters
  { id: 'hater-1', username: 'Not A Fan', handle: 'notafan_tbh', accountType: 'hater', followers: 18000, isVerified: false, preferredPlatforms: ['chirper', 'tunetok'] },
  { id: 'hater-2', username: 'The Auditor', handle: 'theauditor', accountType: 'hater', followers: 46000, isVerified: false, preferredPlatforms: ['chirper'] },
  { id: 'hater-3', username: 'Mid Alert 🚨', handle: 'mid_alert', accountType: 'hater', followers: 9200, isVerified: false, preferredPlatforms: ['chirper', 'flashpic'] },
  { id: 'hater-4', username: 'Ratio King', handle: 'ratiokingg', accountType: 'hater', followers: 31000, isVerified: false, preferredPlatforms: ['chirper', 'tunetok'] },

  // News accounts
  { id: 'news-1', username: 'Rap Daily', handle: 'rapdailynews', accountType: 'news', followers: 2300000, isVerified: true, preferredPlatforms: ['chirper', 'flashpic'] },
  { id: 'news-2', username: 'Pop Wire', handle: 'popwirenews', accountType: 'news', followers: 1800000, isVerified: true, preferredPlatforms: ['chirper'] },
  { id: 'news-3', username: 'Music Now', handle: 'musicnow_', accountType: 'news', followers: 890000, isVerified: true, preferredPlatforms: ['chirper', 'vibestream'] },
];

export function getAccountsByType(type: NpcAccount['accountType']): NpcAccount[] {
  return NPC_ACCOUNTS.filter((a) => a.accountType === type);
}
