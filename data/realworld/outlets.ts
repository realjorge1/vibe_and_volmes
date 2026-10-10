import type { RegularAccount } from '../social/everyday/accounts';

/**
 * The pages that post real-world news in the game's apps. Their names are
 * made up (no real outlet's name or logo), and every post credits the real
 * publication it comes from ("via ESPN"). VibeNews shows the publication
 * itself, like Google News does.
 */
export const REAL_OUTLETS: readonly RegularAccount[] = [
  { id: 'ev-rw-fulltime', username: 'Full Time Report', handle: 'fulltimereport', accountType: 'news', followers: 3_800_000, isVerified: true, preferredPlatforms: ['chirper', 'flashpic', 'tunetok'], vibes: ['sports'], realWorld: ['sports'], avatar: { kind: 'logo', text: 'FT', bg: '#0F5132', fg: '#FFFFFF' }, bio: 'the real scores, the real drama, every league' },
  { id: 'ev-rw-courtside', username: 'Courtside Daily', handle: 'courtsidedaily', accountType: 'news', followers: 2_600_000, isVerified: true, preferredPlatforms: ['chirper', 'flashpic', 'tunetok'], vibes: ['sports'], realWorld: ['sports'], avatar: { kind: 'logo', text: 'CD', bg: '#9A3412', fg: '#FFFFFF' }, bio: 'hoops, gridiron, diamonds, ice. we watch it all' },
  { id: 'ev-rw-gadgetwire', username: 'Gadget Wire', handle: 'gadgetwire', accountType: 'news', followers: 2_100_000, isVerified: true, preferredPlatforms: ['chirper', 'flashpic', 'tunetok'], vibes: ['tech'], realWorld: ['tech'], avatar: { kind: 'logo', text: 'GW', bg: '#1E293B', fg: '#38BDF8' }, bio: 'phones, chips, launches. no fluff' },
  { id: 'ev-rw-respawn', username: 'Respawn Daily', handle: 'respawndaily', accountType: 'news', followers: 1_700_000, isVerified: true, preferredPlatforms: ['chirper', 'tunetok', 'flashpic'], vibes: ['gaming'], realWorld: ['gaming'], avatar: { kind: 'logo', text: 'RS', bg: '#4C1D95', fg: '#A3E635' }, bio: 'trailers, drops, delays and day ones' },
  { id: 'ev-rw-orbit', username: 'Orbit Daily', handle: 'orbitdaily', accountType: 'news', followers: 1_900_000, isVerified: true, preferredPlatforms: ['chirper', 'flashpic', 'tunetok'], vibes: ['tech'], realWorld: ['space'], avatar: { kind: 'logo', text: 'OD', bg: '#0B1026', fg: '#C7D2FE' }, bio: 'launches, sky events, and pictures from very far away' },
  { id: 'ev-rw-labnotes', username: 'Lab Notes', handle: 'labnotes', accountType: 'news', followers: 1_200_000, isVerified: true, preferredPlatforms: ['chirper', 'flashpic', 'tunetok'], vibes: ['tech'], realWorld: ['science'], avatar: { kind: 'logo', text: 'LN', bg: '#065F46', fg: '#ECFDF5' }, bio: 'the coolest science, explained like a friend would' },
  { id: 'ev-rw-vitals', username: 'Vital Signs', handle: 'vitalsigns', accountType: 'news', followers: 980_000, isVerified: true, preferredPlatforms: ['chirper', 'flashpic', 'tunetok'], vibes: ['fitness'], realWorld: ['health'], avatar: { kind: 'logo', text: 'VS', bg: '#BE123C', fg: '#FFFFFF' }, bio: 'sleep, move, eat well. research, not hype' },
  { id: 'ev-rw-luxeledger', username: 'Luxe Ledger', handle: 'luxeledger', accountType: 'news', followers: 1_400_000, isVerified: true, preferredPlatforms: ['flashpic', 'chirper', 'tunetok'], vibes: ['fashion'], realWorld: ['luxury'], avatar: { kind: 'logo', text: 'LL', bg: '#111111', fg: '#D4AF37' }, bio: 'watches, houses, drops and runways' },
  { id: 'ev-rw-drivetime', username: 'Drive Time', handle: 'drivetimehq', accountType: 'news', followers: 1_100_000, isVerified: true, preferredPlatforms: ['flashpic', 'chirper', 'tunetok'], vibes: ['cars'], realWorld: ['auto'], avatar: { kind: 'logo', text: 'DT', bg: '#B91C1C', fg: '#FFFFFF' }, bio: 'new metal, first looks, dream garages' },
];
