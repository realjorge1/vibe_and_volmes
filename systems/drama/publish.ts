import type { Moment, MomentKind, MomentSpec } from '../../types/drama';
import type { HistoryKind } from '../../types/industry';
import type { SocialPost } from '../../types/social';
import { useDramaStore } from '../../store/dramaStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useSocialStore } from '../../store/socialStore';
import { useCareerStore } from '../../store/careerStore';
import { useMusicStore } from '../../store/musicStore';
import { usePeopleStore } from '../../store/peopleStore';
import { useRivalryStore } from '../../store/rivalryStore';
import { useRelationshipStore } from '../../store/relationshipStore';
import { activePeople, partnerOf } from '../life/peopleEngine';
import { genreLabel } from '../../utils/formatters';
import { uid } from '../../utils/id';
import { publishStoryBeat } from '../social/storyPost';
import { makeMoment, fillSpec, isHistoric } from './moments';
import { composePost, topicsFor, type DiscourseInput, type DiscourseRival, type Topic } from './discourse';
import { handleOf, toSocialPost } from './feedPosts';
import { NPC_ACCOUNTS } from '../../data/social/npcAccounts';
import { computeEngagement } from '../social/platformAlgorithms';

/**
 * Store-level glue for the drama layer: build the discourse input from the
 * game's stores, and turn a moment into the internet's reaction.
 */

/** The rival the internet is watching: the hottest known rivalry. */
export function hottestRival(): (DiscourseRival & { fans: number }) | null {
  const rivals = useRivalryStore.getState().allRivals().filter((r) => !r.dormant);
  if (rivals.length === 0) return null;
  const top = [...rivals].sort((a, b) => b.intensity - a.intensity)[0];
  const artist = useRelationshipStore.getState().knownArtists.find((a) => a.id === top.artistId);
  if (!artist) return null;
  const war = useDramaStore.getState().wars[top.artistId];
  return {
    id: artist.id,
    name: artist.name,
    handle: handleOf(artist.name),
    intensity: top.intensity,
    score: war?.score ?? 50,
    fans: top.fans,
  };
}

export function partnerName(): string | null {
  return partnerOf(activePeople(usePeopleStore.getState().people))?.name ?? null;
}

export function discourseInput(): DiscourseInput | null {
  const player = usePlayerStore.getState().player;
  if (!player) return null;
  const track = useMusicStore.getState().getLatestTrack();
  return {
    playerName: player.artistName,
    gender: player.gender,
    genre: genreLabel(player.genre),
    city: player.city,
    fans: player.stats.fans,
    reputation: player.stats.reputation,
    trackTitle: track?.title ?? null,
    // How it's landing: the critics' verdict, else the song's own quality.
    trackScore: track ? (track.criticsScore ?? track.quality) : null,
    moments: useDramaStore.getState().moments,
    rival: hottestRival(),
    partnerName: partnerName(),
  };
}

const HISTORY_KIND: Record<MomentKind, HistoryKind> = {
  scandal: 'scandal',
  ugly: 'embarrassment',
  charity: 'charity',
  best: 'triumph',
  romance: 'romance',
  beef: 'feud',
  meme: 'viral',
  flop: 'flop',
};

/** Who breaks the story: gossip pages for the messy kinds, news for the rest. */
function breakerOf(kind: MomentKind): 'gossip' | 'news' {
  return kind === 'scandal' || kind === 'romance' || kind === 'ugly' || kind === 'meme' ? 'gossip' : 'news';
}

export interface SpawnOpts {
  rivalId?: string;
  rivalName?: string;
  partnerName?: string;
  /** Extra token values, e.g. {name} for the person in a DM. */
  name?: string;
  /** Skip the immediate posts (the weekly feed will carry it). */
  quiet?: boolean;
}

/**
 * Something happened. It becomes a moment: a headline, a trend, reaction
 * posts across the apps right now, and (if it's big) a line in the Chronicle.
 */
export function spawnMoment(spec: MomentSpec, opts: SpawnOpts = {}): Moment | null {
  const player = usePlayerStore.getState().player;
  if (!player) return null;
  const week = useGameStore.getState().week;
  const rival = opts.rivalName ? { name: opts.rivalName, id: opts.rivalId } : hottestRival();
  const partner = opts.partnerName ?? partnerName() ?? undefined;
  const filled = fillSpec(
    {
      ...spec,
      headline: opts.name ? spec.headline.replace(/\{name\}/g, opts.name) : spec.headline,
      topic: opts.name ? spec.topic.replace(/\{name\}/g, opts.name) : spec.topic,
      hashtag: spec.hashtag && opts.name ? spec.hashtag.replace(/\{name\}/g, opts.name) : spec.hashtag,
    },
    { playerName: player.artistName, rival: rival?.name, partner, city: player.city }
  );
  const moment = makeMoment(filled, week, {
    rivalId: rival?.id,
    rivalName: rival?.name,
    partnerName: partner,
  });
  const drama = useDramaStore.getState();
  // The same story twice in a week just gets hotter.
  const dupe = drama.moments.find((m) => m.topic === moment.topic && m.week === week);
  if (dupe) {
    drama.updateMoment(dupe.id, { heat: Math.min(100, dupe.heat + 15), peak: Math.max(dupe.peak, dupe.heat + 15) });
    return dupe;
  }
  drama.addMoment(moment);

  if (isHistoric(moment)) {
    useCareerStore.getState().addHistory({
      id: uid('hist'),
      kind: HISTORY_KIND[moment.kind],
      week,
      summary: moment.headline,
      severity: Math.round(Math.max(moment.peak, Math.abs(moment.valence))),
      tags: ['moment', moment.kind, ...(moment.tags ?? [])],
      artistId: moment.rivalId ?? null,
      resurfacedCount: 0,
      buried: false,
    });
  }

  if (!opts.quiet) {
    publishStoryBeat(
      {
        sentiment: moment.valence <= -25 ? 'shade' : 'news',
        from: breakerOf(moment.kind),
        text: moment.headline,
        trend: moment.hashtag,
      },
      moment.id
    );
    reactNow(moment, 2 + (moment.heat >= 50 ? 2 : 0));
    if (moment.heat >= 35) newsArticle(moment);
  }
  useDramaStore.getState().save();
  return moment;
}

/** A few reaction posts about a moment, straight onto the feed. */
export function reactNow(moment: Moment, count: number): SocialPost[] {
  const input = discourseInput();
  const player = usePlayerStore.getState().player;
  if (!input || !player) return [];
  const topic: Topic = { kind: moment.kind, weight: 1, moment, takes: {} };
  // Reuse the engine's weights for this kind of moment.
  const t = topicsFor({ ...input, moments: [moment] }).find((x) => x.moment?.id === moment.id);
  if (t) topic.takes = t.takes;
  const rival = input.rival;
  const out: SocialPost[] = [];
  for (let i = 0; i < count * 3 && out.length < count; i++) {
    const c = composePost(topic, input, Math.random, { visual: Math.random() < 0.4 });
    if (!c) continue;
    const p = toSocialPost(c, input, { player, week: useGameStore.getState().week, rival, controversy: moment.valence < 0 ? 0.6 : 0.2, idPrefix: `react-${moment.id}` }, i, Math.random);
    if (p) out.push(p);
  }
  if (out.length > 0) {
    const social = useSocialStore.getState();
    social.setFeed([...out, ...social.feed]);
    social.addToHistory(out);
  }
  return out;
}

/** Hot moments get written up on VibeNews too, with a photo of what it's about. */
export function newsArticle(moment: Moment): SocialPost | null {
  const player = usePlayerStore.getState().player;
  if (!player) return null;
  const outlets = NPC_ACCOUNTS.filter((a) => a.preferredPlatforms.includes('vibestream') && (a.accountType === 'news' || a.accountType === 'industry'));
  if (outlets.length === 0) return null;
  const account = outlets[Math.floor(Math.random() * outlets.length)];
  const scene: Record<string, string> = {
    scandal: '📸 paparazzi shot of {playerName} leaving a building, head down',
    ugly: '📸 side-by-side "then vs now" of {playerName}',
    charity: '📸 {playerName} with volunteers at the community kitchen',
    best: '📸 crowd losing it at the show, phones up',
    romance: '📸 long lens shot of a couple at a candlelit dinner',
    beef: '📸 {playerName} on stage, close-up, lights hitting just right',
    meme: '📸 slowed frame of {topic}, circled in red',
    flop: "📸 empty venue seats photoshopped under {playerName}'s tour poster",
  };
  const eng = computeEngagement({
    platform: 'vibestream',
    followers: account.followers,
    playerFans: player.stats.fans,
    sentiment: 'news',
    controversyLevel: moment.valence < 0 ? 0.6 : 0.2,
    reputation: player.stats.reputation,
    trendAlignment: 0.6,
  });
  const post: SocialPost = {
    id: `news-${moment.id}`,
    platform: 'vibestream',
    account,
    content: moment.headline,
    sentiment: 'news',
    likes: eng.likes,
    reposts: eng.reposts,
    replies: eng.comments,
    shares: eng.shares,
    views: eng.views,
    media: { kind: 'image', description: (scene[moment.kind] ?? '').replace(/\{playerName\}/g, player.artistName).replace(/\{topic\}/g, moment.topic) },
    week: useGameStore.getState().week,
    take: 'news',
    topic: moment.kind,
    momentId: moment.id,
    relatedEventId: moment.id,
  };
  const social = useSocialStore.getState();
  social.setFeed([post, ...social.feed]);
  social.addToHistory([post]);
  return post;
}
