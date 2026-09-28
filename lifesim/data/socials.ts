/**
 * Social interaction definitions. The other Sim is just another smart object:
 * these defs advertise Social, and resolution (core/social.ts) rolls against
 * relationship + mood + personality + zodiac chemistry.
 */

import type { TraitId } from '../core/types';

export interface SocialDef {
  id: string;
  label: string;
  icon: string;
  romantic?: boolean;
  mean?: boolean;
  adultOnly?: boolean;
  /** Menu gating on the actor's personality (grouchy unlocks Insult, etc.) */
  gate?: { trait: TraitId; min?: number; max?: number };
  /** Target relationship gates for the option to appear at all. */
  minDaily?: number;
  needsLove?: boolean;
  /** Base accept chance 0..100 before relationship/mood/chemistry modifiers. */
  baseChance: number;
  duration: number; // sim-minutes
  /** Applied to BOTH parties' social motive on accept (actor, target). */
  actorSocial: number;
  targetSocial: number;
  actorFun?: number;
  targetFun?: number;
  accept: { daily: number; lifetime: number };
  reject: { daily: number; lifetime: number };
  /** Advert strength for the autonomy auction. */
  advertValue: number;
  /** Autonomy bias: outgoing sims chat, grouchy sims tease. */
  traitBias?: { trait: TraitId; weight: number };
  autonomous?: boolean;
  /** Scripted follow-up in core/social.ts (proposals, baby prompt). */
  special?: string;
}

export const SOCIALS: Record<string, SocialDef> = {
  greet: {
    id: 'greet', label: 'Greet', icon: '👋', baseChance: 95, duration: 3,
    actorSocial: 5, targetSocial: 5, accept: { daily: 5, lifetime: 1 },
    reject: { daily: -2, lifetime: 0 }, advertValue: 10, autonomous: true,
  },
  chat: {
    id: 'chat', label: 'Chat', icon: '💬', baseChance: 80, duration: 20,
    actorSocial: 18, targetSocial: 18, accept: { daily: 7, lifetime: 1 },
    reject: { daily: -4, lifetime: 0 }, advertValue: 26,
    traitBias: { trait: 'outgoing', weight: 1.0 }, autonomous: true,
  },
  joke: {
    id: 'joke', label: 'Tell Joke', icon: '🤡', baseChance: 65, duration: 10,
    actorSocial: 10, targetSocial: 10, actorFun: 8, targetFun: 12,
    accept: { daily: 8, lifetime: 1 }, reject: { daily: -6, lifetime: -1 },
    advertValue: 22, traitBias: { trait: 'playful', weight: 1.2 }, autonomous: true,
  },
  tell_story: {
    id: 'tell_story', label: 'Tell Story', icon: '📖', baseChance: 70, duration: 15,
    actorSocial: 14, targetSocial: 12, targetFun: 8,
    accept: { daily: 7, lifetime: 1 }, reject: { daily: -5, lifetime: 0 },
    advertValue: 20, traitBias: { trait: 'outgoing', weight: 0.8 }, autonomous: true,
  },
  compliment: {
    id: 'compliment', label: 'Compliment', icon: '🌟', baseChance: 75, duration: 6,
    actorSocial: 8, targetSocial: 12, accept: { daily: 10, lifetime: 2 },
    reject: { daily: -8, lifetime: -1 }, advertValue: 18,
    traitBias: { trait: 'nice', weight: 1.2 }, autonomous: true,
  },
  cheer_up: {
    id: 'cheer_up', label: 'Cheer Up', icon: '🤗', baseChance: 70, duration: 12,
    gate: { trait: 'nice', min: 6 }, actorSocial: 10, targetSocial: 14, targetFun: 15,
    accept: { daily: 10, lifetime: 2 }, reject: { daily: -4, lifetime: 0 },
    advertValue: 16, autonomous: true, traitBias: { trait: 'nice', weight: 1.0 },
  },
  brag: {
    id: 'brag', label: 'Brag', icon: '😤', baseChance: 45, duration: 8,
    actorSocial: 12, targetSocial: 4, accept: { daily: 4, lifetime: 0 },
    reject: { daily: -8, lifetime: -1 }, advertValue: 12,
    traitBias: { trait: 'outgoing', weight: 0.6 }, autonomous: true,
  },
  tease: {
    id: 'tease', label: 'Tease', icon: '😜', mean: true, baseChance: 50, duration: 8,
    gate: { trait: 'nice', max: 6 }, actorSocial: 10, targetSocial: -4, actorFun: 10,
    accept: { daily: -6, lifetime: -1 }, reject: { daily: -12, lifetime: -2 },
    advertValue: 12, traitBias: { trait: 'playful', weight: 0.8 }, autonomous: true,
  },
  insult: {
    id: 'insult', label: 'Insult', icon: '💢', mean: true, baseChance: 100, duration: 6,
    gate: { trait: 'nice', max: 4 }, actorSocial: 8, targetSocial: -10, actorFun: 6,
    accept: { daily: -14, lifetime: -3 }, reject: { daily: -14, lifetime: -3 },
    advertValue: 8, autonomous: true, traitBias: { trait: 'nice', weight: -1.0 },
  },
  slap: {
    id: 'slap', label: 'Slap', icon: '🖐️', mean: true, baseChance: 100, duration: 5,
    actorSocial: 4, targetSocial: -12, accept: { daily: -20, lifetime: -6 },
    reject: { daily: -20, lifetime: -6 }, advertValue: 0, special: 'slap',
  },
  apologize: {
    id: 'apologize', label: 'Apologize', icon: '🙇', baseChance: 60, duration: 8,
    actorSocial: 6, targetSocial: 8, accept: { daily: 15, lifetime: 2 },
    reject: { daily: -4, lifetime: 0 }, advertValue: 6,
  },
  flirt: {
    id: 'flirt', label: 'Flirt', icon: '😏', romantic: true, adultOnly: true,
    minDaily: 20, baseChance: 45, duration: 10, actorSocial: 12, targetSocial: 12,
    actorFun: 8, targetFun: 8, accept: { daily: 12, lifetime: 3 },
    reject: { daily: -12, lifetime: -2 }, advertValue: 16,
    traitBias: { trait: 'outgoing', weight: 1.0 }, autonomous: true, special: 'romance',
  },
  backrub: {
    id: 'backrub', label: 'Give Back Rub', icon: '💆', romantic: true, adultOnly: true,
    minDaily: 30, baseChance: 55, duration: 12, actorSocial: 10, targetSocial: 14,
    accept: { daily: 10, lifetime: 3 }, reject: { daily: -10, lifetime: -2 },
    advertValue: 12, special: 'romance',
  },
  hug: {
    id: 'hug', label: 'Hug', icon: '🤗', romantic: true, minDaily: 25,
    baseChance: 60, duration: 6, actorSocial: 12, targetSocial: 12,
    accept: { daily: 10, lifetime: 3 }, reject: { daily: -10, lifetime: -2 },
    advertValue: 14, autonomous: true, special: 'romance',
  },
  kiss: {
    id: 'kiss', label: 'Kiss', icon: '💋', romantic: true, adultOnly: true,
    minDaily: 45, baseChance: 45, duration: 8, actorSocial: 16, targetSocial: 16,
    actorFun: 10, targetFun: 10, accept: { daily: 14, lifetime: 5 },
    reject: { daily: -16, lifetime: -3 }, advertValue: 14, special: 'romance',
  },
  deep_kiss: {
    id: 'deep_kiss', label: 'Passionate Kiss', icon: '💞', romantic: true,
    adultOnly: true, minDaily: 60, needsLove: true, baseChance: 50, duration: 10,
    actorSocial: 20, targetSocial: 20, actorFun: 14, targetFun: 14,
    accept: { daily: 16, lifetime: 6 }, reject: { daily: -18, lifetime: -4 },
    advertValue: 12, special: 'deep_kiss',
  },
  propose: {
    id: 'propose', label: 'Propose Moving In', icon: '💍', romantic: true,
    adultOnly: true, minDaily: 70, needsLove: true, baseChance: 40, duration: 12,
    actorSocial: 10, targetSocial: 10, accept: { daily: 10, lifetime: 10 },
    reject: { daily: -25, lifetime: -8 }, advertValue: 0, special: 'propose',
  },
  dance_together: {
    id: 'dance_together', label: 'Dance Together', icon: '🕺', minDaily: 15,
    baseChance: 60, duration: 20, actorSocial: 16, targetSocial: 16,
    actorFun: 18, targetFun: 18, accept: { daily: 10, lifetime: 2 },
    reject: { daily: -8, lifetime: -1 }, advertValue: 18,
    traitBias: { trait: 'playful', weight: 1.0 }, autonomous: true,
  },
  tickle: {
    id: 'tickle', label: 'Tickle', icon: '🫳', baseChance: 55, duration: 6,
    gate: { trait: 'playful', min: 5 }, actorSocial: 8, targetSocial: 8,
    actorFun: 10, targetFun: 12, accept: { daily: 8, lifetime: 1 },
    reject: { daily: -10, lifetime: -1 }, advertValue: 12,
    traitBias: { trait: 'playful', weight: 1.4 }, autonomous: true,
  },
  entertain: {
    id: 'entertain', label: 'Entertain', icon: '🎭', baseChance: 60, duration: 12,
    actorSocial: 10, targetSocial: 10, targetFun: 16,
    accept: { daily: 8, lifetime: 1 }, reject: { daily: -8, lifetime: -1 },
    advertValue: 14, traitBias: { trait: 'playful', weight: 1.0 }, autonomous: true,
  },
  say_goodbye: {
    id: 'say_goodbye', label: 'Say Goodbye', icon: '👋', baseChance: 100, duration: 3,
    actorSocial: 2, targetSocial: 2, accept: { daily: 2, lifetime: 0 },
    reject: { daily: 0, lifetime: 0 }, advertValue: 0, special: 'goodbye',
  },
};

/** Kid-safe subset (children never get romantic/mean-heavy menus). */
export const CHILD_SOCIAL_IDS = [
  'greet', 'chat', 'joke', 'tell_story', 'tease', 'tickle', 'entertain', 'say_goodbye',
];
