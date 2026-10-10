import type { NpcAccount, Platform, PostMedia, SocialPost } from '../../types/social';
import type { Player } from '../../types/player';
import type { ComposedPost, DiscourseInput, DiscourseRival } from './discourse';
import type { TopicKind } from '../../data/drama/takes';
import { NPC_ACCOUNTS } from '../../data/social/npcAccounts';
import { buildMedia } from '../../data/social/mediaTemplates';
import { platformOf } from '../../data/social/platforms';
import { computeEngagement } from '../social/platformAlgorithms';
import { crowdPerson } from './crowd';
import { fillText } from './discourse';

/**
 * Turn the discourse engine's composed posts into real feed posts: who said
 * it (a known account, a stranger with a face, or the rival themselves), on
 * which app, with what picture, and how far it traveled. Engagement still
 * runs through the platform algorithms, so posts about an unknown artist stay
 * small however spicy they are.
 */

export function rivalAccount(r: Pick<DiscourseRival, 'id' | 'name' | 'handle'> & { fans?: number }): NpcAccount {
  return {
    id: `artist-${r.id}`,
    username: r.name,
    handle: r.handle,
    accountType: 'artist',
    followers: Math.round((r.fans ?? 500_000) * 0.65),
    isVerified: true,
    preferredPlatforms: ['chirper', 'flashpic', 'tunetok'],
  };
}

export function handleOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Where a take naturally lives. */
function platformFor(c: ComposedPost, rnd: () => number): Platform {
  if (c.poll) return 'chirper';
  if (c.meme) return c.meme.format === 'tweet' || rnd() < 0.75 ? 'flashpic' : 'chirper';
  const x = rnd();
  switch (c.take) {
    case 'news':
      return x < 0.55 ? 'vibestream' : 'chirper';
    case 'shade':
      return x < 0.6 ? 'chirper' : 'flashpic';
    case 'drag':
    case 'hate':
    case 'skeptic':
    case 'stanwar':
      return x < 0.6 ? 'chirper' : x < 0.85 ? 'tunetok' : 'flashpic';
    case 'thirst':
      return x < 0.45 ? 'flashpic' : x < 0.8 ? 'tunetok' : 'chirper';
    case 'subtweet':
      return x < 0.7 ? 'chirper' : 'flashpic';
    case 'meme':
    case 'banter':
      return x < 0.4 ? 'chirper' : x < 0.75 ? 'tunetok' : 'flashpic';
    default:
      return x < 0.4 ? 'chirper' : x < 0.7 ? 'flashpic' : 'tunetok';
  }
}

function staticOfType(type: NpcAccount['accountType'], platform: Platform, rnd: () => number): NpcAccount | null {
  const exact = NPC_ACCOUNTS.filter((a) => a.accountType === type && a.preferredPlatforms.includes(platform));
  const any = exact.length > 0 ? exact : NPC_ACCOUNTS.filter((a) => a.accountType === type);
  return any.length > 0 ? any[Math.floor(rnd() * any.length)] : null;
}

const IMAGES: Partial<Record<TopicKind, readonly string[]>> = {
  scandal: [
    "📸 blurry zoomed screenshot of {playerName}'s face circled in red",
    "📸 receipts thread cover image, {playerName}'s name in a cracked-glass filter",
    '📸 paparazzi shot of {playerName} leaving a building, head down',
  ],
  ugly: ['📸 slowed frame of {topic}, circled in red', '📸 side-by-side "then vs now" of {playerName} captioned "what happened"'],
  charity: [
    '📸 {playerName} with volunteers at the community kitchen',
    '📸 volunteers packing donation boxes, {playerName} carrying one',
    '📸 free show in the park, families cheering',
  ],
  best: ['📸 crowd losing it at the show, phones up', '📸 a fan crying in the front row', '📸 {playerName} on stage, arms out, whole arena lit'],
  romance: [
    '📸 paparazzi shot of {playerName} and {partner} leaving dinner',
    '📸 long lens shot of a couple at a candlelit dinner',
    '📸 blurry paparazzi photo of {playerName} holding hands with someone',
  ],
  beef: ['📸 side-by-side "then vs now" of {playerName} and {rival}', "📸 screenshot of {rival}'s post circled in red"],
  looks: ['📸 {playerName} on stage, close-up, lights hitting just right', '📸 paparazzi shot of {playerName} in sunglasses', '📸 red carpet shot of {playerName}, photographers flashing'],
  flop: ["📸 empty venue seats photoshopped under {playerName}'s tour poster"],
};

const VIDEOS: Partial<Record<TopicKind, readonly string[]>> = {
  scandal: ['🎬 0:24 — drama channel recap of {topic}, sirens sfx', '🎬 0:16 — "we need to talk about {playerName}" thumbnail, red arrow, shocked face'],
  ugly: ['🎬 0:09 — clip of {topic}, slowed down, crowd gasps', '🎬 0:12 — {topic} but it\'s set to the Titanic song'],
  charity: ['🎬 0:21 — {playerName} surprising volunteers at the community kitchen', '🎬 0:18 — free show in the park, the whole block singing along'],
  best: ['🎬 0:14 — fancam of {topic}, the crowd screams', '🎬 0:17 — crowd losing it at the show, phones up'],
  romance: ['🎬 0:11 — paparazzi clip of {playerName} and {partner} getting into a car', '🎬 0:15 — "everything we know about {playerName} and {partner}" voiceover'],
  beef: ["🎬 0:19 — reacting to {rival}'s diss, pausing every line", '🎬 0:22 — ranking every shot in the {playerName} vs {rival} beef'],
  looks: ['🎬 0:08 — slow-mo edit of {playerName} on stage, heart filter', '🎬 0:10 — fancam of {playerName} at the show, zoom on the smile'],
  flop: ['🎬 0:10 — "{playerName} flop era" compilation, sad violin'],
};

function topicMedia(c: ComposedPost, platform: Platform, input: DiscourseInput, vars: { topic?: string; rival?: string; partner?: string }, rnd: () => number): PostMedia | undefined {
  const vibe = platformOf(platform).vibe;
  const wantVideo = vibe === 'viral' ? rnd() < 0.85 : false;
  const wantImage = vibe === 'visual' ? rnd() < 0.85 : vibe === 'timeline' ? rnd() < 0.15 : vibe === 'news' ? rnd() < 0.3 : false;
  if (!wantVideo && !wantImage) return undefined;
  const pool = (wantVideo ? VIDEOS : IMAGES)[c.topic];
  if (pool && pool.length > 0) {
    const d = pool[Math.floor(rnd() * pool.length)];
    return { kind: wantVideo ? 'video' : 'image', description: fillText(d, input, vars) };
  }
  return buildMedia(wantVideo ? 'video' : 'image', c.sentiment, {
    playerName: input.playerName,
    trackTitle: input.trackTitle ?? 'the new one',
    genre: input.genre,
  });
}

export interface ToPostCtx {
  player: Player;
  week: number;
  rival: (DiscourseRival & { fans?: number }) | null;
  controversy: number;
  idPrefix: string;
  /** Force an app (infinite scroll of one app); otherwise the take decides. */
  platform?: Platform;
}

export function toSocialPost(c: ComposedPost, input: DiscourseInput, ctx: ToPostCtx, n: number, rnd: () => number): SocialPost | null {
  let platform = ctx.platform ?? platformFor(c, rnd);
  // Polls only exist on Chirp; memes need a picture app; news isn't a TokTalk.
  if (ctx.platform) {
    if (c.poll && platform !== 'chirper') return null;
    if (c.meme && (platform === 'vibestream' || platform === 'tunetok')) return null;
    if (c.take === 'news' && platform === 'tunetok') return null;
  } else {
    if (c.poll && platform !== 'chirper') platform = 'chirper';
    if (c.meme && (platform === 'vibestream' || platform === 'tunetok')) platform = 'flashpic';
    if (c.take === 'news' && platform === 'tunetok') platform = 'vibestream';
  }

  let account: NpcAccount | null = null;
  const v = c.voice;
  if (v.kind === 'rival') {
    if (!ctx.rival) return null;
    account = rivalAccount(ctx.rival);
  } else if (v.kind === 'crowd') {
    account = crowdPerson(`${ctx.idPrefix}:${n}:${Math.floor(rnd() * 1e9)}`, { vibe: v.vibe, gender: v.gender, platform });
  } else {
    account = staticOfType(v.type, platform, rnd) ?? crowdPerson(`${ctx.idPrefix}:${n}:t`, { vibe: 'casual', platform });
  }
  if (!account) return null;

  const vars = {
    topic: input.moments.find((m) => m.id === c.momentId)?.topic,
    rival: ctx.rival?.name,
    partner: input.partnerName ?? undefined,
  };
  const media = c.meme ? { kind: 'image' as const, description: c.meme.format === 'tweet' ? '🧾 screenshot of a post' : `🖼️ meme: ${c.meme.top ?? ''}` } : topicMedia(c, platform, input, vars, rnd);
  const eng = computeEngagement({
    platform,
    followers: account.followers,
    playerFans: ctx.player.stats.fans,
    sentiment: c.sentiment,
    controversyLevel: ctx.controversy,
    reputation: ctx.player.stats.reputation,
    trendAlignment: c.momentId ? 0.5 : 0.1,
  });
  return {
    id: `${ctx.idPrefix}-${n}-${Date.now().toString(36)}-${Math.floor(rnd() * 1e6).toString(36)}`,
    platform,
    account,
    content: c.text,
    sentiment: c.sentiment,
    likes: eng.likes,
    reposts: eng.reposts,
    replies: eng.comments,
    shares: eng.shares,
    views: eng.views,
    media,
    week: ctx.week,
    take: c.take,
    topic: c.topic,
    momentId: c.momentId,
    poll: c.poll,
    meme: c.meme && c.meme.format === 'tweet'
      ? { ...c.meme, ...(() => {
          const author = crowdPerson(`${ctx.idPrefix}:${n}:shot`, { vibe: c.take === 'thirst' ? 'admirer' : 'casual' });
          return { name: author.username, handle: author.handle, verified: false };
        })() }
      : c.meme,
    relatedEventId: c.momentId,
  };
}
