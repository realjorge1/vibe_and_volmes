import type { SocialPost } from '../../types/social';
import type { Player } from '../../types/player';
import { getAccountsByType } from '../../data/social/npcAccounts';
import { pick, randInt, chance } from '../../utils/random';

/**
 * Comment threads + stan wars. A high-heat post spawns an escalating
 * back-and-forth between the artist's stans and a rival fanbase — the
 * exact dopamine-rage loop real fandoms run on.
 */

export type ReplySide = 'stan' | 'rival' | 'neutral' | 'critic';

export interface ThreadReply {
  id: string;
  side: ReplySide;
  username: string;
  handle: string;
  verified: boolean;
  content: string;
  likes: number;
}

const STAN_LINES = [
  'be so for real right now. {name} carried this entire genre.',
  'the obsession is diabolical. touch grass and stream {name}.',
  'imagine being this pressed over someone you claim to not listen to 💀',
  'screenshotting this so we can laugh when {name} drops next week',
  'not the daily {name} hate thread again. we get it, you’re jealous.',
  'the numbers don’t lie babe. {name} won. cope.',
];

const RIVAL_LINES = [
  '{name} is the most overrated artist alive and you all know it.',
  'industry plant behavior. nobody actually listens to this.',
  'this flopped and you’re all in denial. it’s actually sad.',
  'the bar was on the floor and {name} still tripped over it 😭',
  'manufactured hype. real ones remember the old sound.',
  'crazy how the stans show up in 0.2 seconds but the songs still flop',
];

const NEUTRAL_LINES = [
  'why is every thread like this now. just listen to what you like??',
  'the replies are a war zone and I’m only here for the chaos 🍿',
  'genuinely cannot tell if this is satire anymore',
  'logging off, the internet is undefeated today',
];

const CRITIC_LINES = [
  'objectively the production is solid, the discourse is not.',
  'this take ages like milk. screenshot it.',
  'context matters and nobody in these replies has it.',
];

function line(pool: string[], player: Player): string {
  return pick(pool).replace(/\{name\}/g, player.artistName);
}

function reply(side: ReplySide, content: string): ThreadReply {
  const typeMap = {
    stan: 'stan',
    rival: 'rival-fan',
    neutral: 'public',
    critic: 'critic',
  } as const;
  const acct =
    pick(getAccountsByType(typeMap[side])) ??
    pick(getAccountsByType('public'));
  return {
    id: `rep-${side}-${Date.now()}-${randInt(0, 99999)}`,
    side,
    username: acct.username,
    handle: acct.handle,
    verified: acct.isVerified,
    content,
    likes: randInt(0, side === 'stan' || side === 'rival' ? 4200 : 600),
  };
}

/**
 * Build a thread under `post`. Hostile/hype/shade/meme posts escalate
 * into a stan war; calmer posts get a normal reply spread.
 */
export function generateThread(post: SocialPost, player: Player): ThreadReply[] {
  const war =
    post.sentiment === 'hostile' ||
    post.sentiment === 'shade' ||
    post.sentiment === 'hype' ||
    post.sentiment === 'meme';

  const out: ThreadReply[] = [];

  if (war) {
    const rounds = randInt(4, 7);
    let turn: ReplySide = post.sentiment === 'hostile' ? 'stan' : 'rival';
    for (let i = 0; i < rounds; i++) {
      if (turn === 'stan') out.push(reply('stan', line(STAN_LINES, player)));
      else out.push(reply('rival', line(RIVAL_LINES, player)));
      turn = turn === 'stan' ? 'rival' : 'stan';
      if (chance(0.25))
        out.push(reply('neutral', line(NEUTRAL_LINES, player)));
    }
    if (chance(0.5)) out.push(reply('critic', line(CRITIC_LINES, player)));
  } else {
    const n = randInt(3, 6);
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      if (r < 0.4) out.push(reply('stan', line(STAN_LINES, player)));
      else if (r < 0.6) out.push(reply('critic', line(CRITIC_LINES, player)));
      else out.push(reply('neutral', line(NEUTRAL_LINES, player)));
    }
  }

  return out.sort((a, b) => b.likes - a.likes);
}
