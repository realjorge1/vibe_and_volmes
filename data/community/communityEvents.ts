import type { CommunityEventDef } from '../../types/sync';

/**
 * Bundled community-wide events. No multiplayer — these are shared global
 * "moments" everyone experiences in parallel. The local adapter rotates two of
 * them as active; scheduling the matching activity during the window earns a
 * small bounded bonus in the away sim and a callout in the recap.
 */
export const COMMUNITY_EVENTS: CommunityEventDef[] = [
  {
    id: 'global-cypher',
    name: 'Global Cypher Week',
    blurb: 'Everyone is in the booth. Studio time earns extra visibility.',
    boostActivity: 'studio',
    goalLabel: 'Community goal: 10M studio hours logged',
  },
  {
    id: 'feed-frenzy',
    name: 'Feed Frenzy',
    blurb: 'The whole community is terminally online. Being social pops off.',
    boostActivity: 'social',
    goalLabel: 'Community goal: 1B impressions',
  },
  {
    id: 'press-circuit',
    name: 'World Press Circuit',
    blurb: 'Media wants new faces. Press runs reach further this week.',
    boostActivity: 'press',
    goalLabel: 'Community goal: 50K interviews booked',
  },
  {
    id: 'grind-season',
    name: 'Grind Season',
    blurb: 'The community is locked in. Promotion pushes harder.',
    boostActivity: 'promotion',
    goalLabel: 'Community goal: collective glow-up',
  },
];
