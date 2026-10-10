import type { PostSentiment, PostMediaKind, PostMedia } from '../../types/social';
import { pick } from '../../utils/random';

/**
 * SAMPLE MEDIA CATALOGS.
 *
 * Posts on the visual (VibeGram) and short-video (TokTalk) platforms carry an
 * image-style or short-video *description* instead of bare text. These read as
 * the caption/alt-text the deterministic sim attaches; the AI layer may later
 * rewrite the post body, but the structured `media.kind` is preserved.
 *
 * Templates collapse the eight post sentiments into three visual moods so the
 * catalog stays tight while still feeling reactive.
 */

type MediaMood = 'positive' | 'neutral' | 'negative';

const SENTIMENT_MOOD: Record<PostSentiment, MediaMood> = {
  hype: 'positive',
  positive: 'positive',
  meme: 'positive',
  neutral: 'neutral',
  news: 'neutral',
  critical: 'negative',
  shade: 'negative',
  hostile: 'negative',
};

const IMAGE_DESCRIPTIONS: Record<MediaMood, string[]> = {
  positive: [
    '📸 grainy film shot of {playerName} mid-laugh backstage, confetti still falling',
    '📸 {playerName} in a custom fit on a rooftop at golden hour, city behind them',
    '📸 close-up of {playerName} at the mic, eyes closed, whole crowd lit up behind',
    '📸 carousel: {playerName} listening party — vinyl of "{trackTitle}", candles, friends',
    '📸 {playerName} hugging a fan who is openly crying, both glowing',
    '📸 mirror selfie, {genre} chain heavy, caption just says "we up"',
  ],
  neutral: [
    '📸 moody black-and-white of {playerName} looking out a tour bus window',
    '📸 {playerName} in the studio, hood up, notebook open, unreadable expression',
    '📸 paparazzi shot of {playerName} leaving a building, head down',
    '📸 a single story repost: "{trackTitle}" on a phone screen, no caption',
    '📸 {playerName} at a table read of contracts, coffee going cold',
  ],
  negative: [
    '📸 blurry zoomed screenshot of {playerName}\'s face circled in red',
    '📸 side-by-side "then vs now" of {playerName} captioned "what happened"',
    '📸 {playerName} caught mid-sentence, frame chosen to look as bad as possible',
    '📸 receipts thread cover image, {playerName}\'s name in a cracked-glass filter',
    '📸 empty venue seats photoshopped under {playerName}\'s tour poster',
  ],
};

const VIDEO_DESCRIPTIONS: Record<MediaMood, string[]> = {
  positive: [
    '🎬 0:14 — fancam of {playerName} hitting the run live, crowd screams, zoom on the high note',
    '🎬 0:09 — "{trackTitle}" dance challenge, three friends nailing the choreo in a parking lot',
    '🎬 0:21 — {playerName} reacting to their own song in the car, can\'t keep a straight face',
    '🎬 0:11 — transition edit: {playerName} broke → {playerName} on a private jet, on beat',
    '🎬 0:17 — POV you discovered {playerName} today, "{trackTitle}" over a sunset drive',
    '🎬 0:08 — {playerName} bringing a kid on stage to finish the hook, place erupts',
  ],
  neutral: [
    '🎬 0:13 — slowed + reverb edit of "{trackTitle}" over rain on a window',
    '🎬 0:19 — "the {playerName} timeline explained in 19 seconds" voiceover',
    '🎬 0:10 — studio b-roll, {playerName} mumbling a melody no one\'s heard yet',
    '🎬 0:22 — talking-head clip: "is {playerName} actually that deep? let\'s break it down"',
  ],
  negative: [
    '🎬 0:16 — "we need to talk about {playerName}" thumbnail, red arrow, shocked face',
    '🎬 0:12 — slowed clip of {playerName} stumbling on lyrics, captioned "it\'s over"',
    '🎬 0:24 — drama channel recap of the {playerName} situation, sirens sfx',
    '🎬 0:18 — duet stitch dragging "{trackTitle}", creator shaking their head the whole time',
  ],
};

function fillMedia(
  tpl: string,
  vars: { playerName: string; trackTitle: string; genre: string }
): string {
  return tpl
    .replace(/\{playerName\}/g, vars.playerName)
    .replace(/\{trackTitle\}/g, vars.trackTitle)
    .replace(/\{genre\}/g, vars.genre);
}

/** Build a media descriptor for a post, or return undefined for plain text. */
export function buildMedia(
  kind: PostMediaKind,
  sentiment: PostSentiment,
  vars: { playerName: string; trackTitle: string; genre: string }
): PostMedia {
  const mood = SENTIMENT_MOOD[sentiment];
  const pool = kind === 'video' ? VIDEO_DESCRIPTIONS[mood] : IMAGE_DESCRIPTIONS[mood];
  return { kind, description: fillMedia(pick(pool), vars) };
}

export { IMAGE_DESCRIPTIONS, VIDEO_DESCRIPTIONS };
