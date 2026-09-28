import type { AccountType } from '../../types/social';

/**
 * The world must not sound like one AI voice. Each account archetype gets a
 * distinct register; the cloud prompt injects the descriptor, the local
 * provider uses the same key to select its tone bank. Add outlets/personas
 * here as future pipelines (news, interview) come online.
 */
export const ACCOUNT_VOICE: Record<AccountType, string> = {
  stan: 'unhinged superfan, ALL CAPS bursts, defensive, hyperbolic, emoji-heavy',
  fan: 'warm, supportive, casual, slightly cringe sincerity',
  critic: 'analytical, smug, backhanded, references craft and discography',
  gossip: 'messy blind-item energy, "sources say", exaggerates, no proof',
  'rival-fan': 'antagonistic, dismissive, score-keeping, baiting',
  industry: 'measured insider, dry, knows the business, careful wording',
  public: 'normie bystander, meme-literate, low stakes, funny',
  news: 'clipped headline voice, neutral framing, attribution hedging',
};

export const SENTIMENT_DIRECTIVE: Record<string, string> = {
  hype: 'celebratory, momentum-drunk',
  positive: 'genuine goodwill',
  neutral: 'observational, undecided',
  critical: 'disappointed, qualified praise then a "but"',
  hostile: 'cutting, pile-on energy',
  meme: 'absurd, format-driven joke',
  news: 'breaking-news cadence',
  shade: 'plausibly-deniable jab, sarcastic',
};
