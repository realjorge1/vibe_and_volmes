import type { EventConsequence } from './events';
import type { Platform, StoryBeat } from './social';

/**
 * THE DRAMA LAYER.
 *
 * The internet doesn't talk about an artist in general: it talks about the
 * thing they did this week. A Moment is that thing (the stage fall, the
 * leaked DMs, the hospital visit, the diss track) and it carries heat that
 * burns down week by week. Moments drive what the phone apps argue about,
 * what the news writes, what lands in the DMs and what the Chronicle keeps.
 */

export type MomentKind =
  | 'scandal'   // allegations, leaks, lawsuits: the bad kind of trending
  | 'ugly'      // embarrassing: fell on stage, forgot the words, snapped at a fan
  | 'charity'   // giving back (and the people who call it PR)
  | 'best'      // the moments people clip forever
  | 'romance'   // dating rumors, soft launches, breakups, cheating talk
  | 'beef'      // the rival war
  | 'meme'      // the artist became a format
  | 'flop';     // the release / show that didn't land

export interface MomentSpec {
  kind: MomentKind;
  /** News-style headline. Tokens: {playerName}, {rival}, {partner}, {city}. */
  headline: string;
  /** How people refer to it in posts: "the stage fall", "the leaked DMs". */
  topic: string;
  /** 0..100: how loud it starts. */
  heat: number;
  /** -100 (awful) .. 100 (wholesome): how the public reads it. */
  valence: number;
  /** Hashtag without '#'; tokens allowed (spaces are stripped). */
  hashtag?: string;
  tags?: string[];
}

export interface Moment extends MomentSpec {
  id: string;
  week: number;
  peak: number;
  rivalId?: string;
  rivalName?: string;
  partnerName?: string;
}

/** The angle a post takes on a topic. */
export type Take =
  | 'love'       // fans gushing
  | 'hate'       // haters hating
  | 'banter'     // jokes and roasts
  | 'meme'       // a meme format
  | 'drag'       // piling on over something specific
  | 'defend'     // stans defending
  | 'thirst'     // admirers commenting on looks
  | 'news'       // headline voice
  | 'stanwar'    // fanbase vs fanbase
  | 'subtweet'   // a rival's thinly veiled post
  | 'poll'       // "who won?"
  | 'wholesome'  // warm reactions
  | 'skeptic'    // "this is PR"
  | 'shade';     // gossip-page side-eye

export interface PostPoll {
  options: [string, string];
  /** Percent for option 0 (option 1 is the rest). */
  pct: number;
  votes: number;
}

/** A meme the post renders: a reaction photo with captions, or a screenshot of a post. */
export interface PostMeme {
  format: 'caption' | 'tweet';
  top?: string;
  bottom?: string;
  /** Reaction face to use: 'shocked', 'side-eye', ... (see the people pack). */
  reaction?: string;
  /** 'tweet' format: who said it. */
  name?: string;
  handle?: string;
  verified?: boolean;
}

// --- DMs ------------------------------------------------------------------------------

export type DmKind =
  | 'admirer'      // someone with a crush
  | 'celeb-crush'  // someone famous sliding in
  | 'superfan'     // devoted (a little too devoted)
  | 'obsessed'     // the one who knows where you are
  | 'wannabe'      // "listen to my mixtape"
  | 'beggar'       // "can you send $50"
  | 'scammer'      // "brand deal, just pay shipping"
  | 'conspiracy'   // "blink twice"
  | 'kid'          // a parent's account, a small fan
  | 'hater'        // came to your DMs to hate
  | 'rival'        // the rival, privately
  | 'ex'           // "u up?"
  | 'shipper';     // fans running your love life

export interface DmPerson {
  /** Account id: crowd 'c-w-<handle>' / 'c-m-<handle>', rival 'artist-<id>', or an NPC id. */
  id: string;
  name: string;
  handle: string;
  gender?: 'woman' | 'man';
  followers: number;
  verified: boolean;
  /** Living-world NPC behind a famous sender. */
  npcId?: string;
}

export interface DmMessage {
  from: 'them' | 'me';
  text: string;
  /** Wall-clock ms. */
  at: number;
}

export interface DmReplyOption {
  id: string;
  /** Chip label. */
  label: string;
}

export interface DmThread {
  id: string;
  platform: Platform;
  arc: string;
  kind: DmKind;
  person: DmPerson;
  stage: string;
  messages: DmMessage[];
  /** Quick replies waiting on the artist; empty when nothing is pending. */
  options: DmReplyOption[];
  unread: boolean;
  /** A message request: the artist doesn't follow them. */
  request: boolean;
  state: 'open' | 'closed' | 'blocked';
  startedWeek: number;
  lastWeek: number;
  /** Weeks since they last heard back (some arcs escalate when ignored). */
  ignoredWeeks: number;
  /** Arc values chosen once: {amount}, {mixtape}, {spot}. */
  vars: Record<string, string>;
}

/** What answering a DM does to the rest of the game. */
export interface DmOutcome {
  /** Deck line + stats, applied through the event consequence pipeline. */
  consequences?: Omit<EventConsequence, 'flavorText'> & { flavorText?: string };
  moment?: MomentSpec;
  social?: StoryBeat;
  /** Structural effects the action layer performs. */
  effect?: 'date' | 'friend' | 'producer' | 'security' | 'leak';
}

export interface DmArcReply {
  id: string;
  label: string;
  /** What the artist sends (one picked). */
  say: string[];
  /** Next stage (their answer). Omit to end the thread after this. */
  next?: string;
  end?: 'close' | 'block';
  outcome?: DmOutcome;
  /** Rolled outcome: with probability p use `then`, else `otherwise`. */
  roll?: {
    p: number;
    /** The stat that tilts the roll (0..100 -> +/-0.25). */
    stat?: 'charisma' | 'talent' | 'writing' | 'reputation' | 'authenticity';
    then: { next?: string; end?: 'close' | 'block'; outcome?: DmOutcome };
    otherwise: { next?: string; end?: 'close' | 'block'; outcome?: DmOutcome };
  };
  /** Only offered when the artist has (true) / has no (false) partner. */
  partnered?: boolean;
}

export interface DmStage {
  /** What they send when the stage opens: one sequence (1-3 bubbles) is picked. */
  say: string[][];
  replies: DmArcReply[];
  /** Ignored for this many weeks -> they follow up with this stage. */
  ignored?: { weeks: number; next: string };
}

export interface DmArc {
  id: string;
  kind: DmKind;
  weight: number;
  /** Who sends it. */
  sender: 'admirer' | 'crowd' | 'celeb' | 'rival' | 'kid' | 'brand';
  platforms: Platform[];
  minFans?: number;
  maxFans?: number;
  /** Only while the artist has (true) / has no (false) partner. */
  partnered?: boolean;
  needsRival?: boolean;
  /** Weeks before this arc can start again. */
  cooldown?: number;
  /** Values chosen when the thread starts. */
  vars?: Record<string, readonly string[]>;
  start: string;
  stages: Record<string, DmStage>;
}

/** Rival war bookkeeping (lives next to the rivalry engine's own record). */
export interface BeefWar {
  rivalId: string;
  /** Public opinion share for the artist, 0..100 (50 = dead even). */
  score: number;
  /** Escalation the internet sees. */
  phase: 'cold' | 'shade' | 'subtweets' | 'diss' | 'war' | 'truce';
  startedWeek: number;
  lastMoveWeek: number;
  /** What happened, newest first (short lines for the war room). */
  log: { week: number; text: string; swing: number }[];
}
