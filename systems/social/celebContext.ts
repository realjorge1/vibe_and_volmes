import type { NpcAccount, Platform, SocialPost } from '../../types/social';
import { useWorldStore } from '../../store/worldStore';
import { useSocialStore } from '../../store/socialStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useRelationshipStore } from '../../store/relationshipStore';
import { useRivalryStore } from '../../store/rivalryStore';
import { RIVAL_ARTISTS } from '../../data/artists/rivalArtists';
import { rivalPhoto } from '../visuals/people';
import { genreLabel } from '../../utils/formatters';
import {
  buildCast,
  castAccount,
  celebEvents,
  celebTimeline,
  fanTimeline,
  genderOfName,
  linkNamed,
  type CastMember,
  type CelebInput,
  type NamedInfo,
} from './celebFeed';
import { friendlyArtists, rivalIds } from './relations';
import { baseYearOf } from './worldCalendar';
import type { LaneInput } from './lanes';
import { realTopicsNow } from '../realworld/refresh';

/**
 * Store glue for the celebrity lane: who the cast is right now (named artists
 * with their relation to the player, the world's biggest artists), and the
 * world's latest stories retold with their names. Rebuilt only when the
 * world, the week or the player's relationships change.
 */

let cache: { refs: readonly unknown[]; input: CelebInput } | null = null;

function namedInfo(): NamedInfo[] {
  const rivals = rivalIds();
  const friends = new Set(friendlyArtists().map((f) => f.id));
  const careers = useRivalryStore.getState().rivals;
  return RIVAL_ARTISTS.map((a) => ({
    id: a.id,
    name: a.name,
    genre: a.genre,
    fans: careers[a.id]?.fans ?? a.fans,
    gender: rivalPhoto(a.id)?.gender ?? genderOfName(a.name, a.id),
    relation: rivals.has(a.id) ? 'rival' : friends.has(a.id) ? 'friend' : 'neutral',
  }));
}

/** Keep the named artists linked to the same world artists (call outside render: the weekly tick, app load). */
export function syncCastLinks(): void {
  const world = useWorldStore.getState().world;
  if (!world) return;
  const social = useSocialStore.getState();
  const links = linkNamed(namedInfo(), world, social.castLinks);
  const same = Object.keys(links).length === Object.keys(social.castLinks).length && Object.entries(links).every(([k, v]) => social.castLinks[k] === v);
  if (!same) social.setCastLinks(links);
}

export function celebInput(): CelebInput | null {
  const player = usePlayerStore.getState().player;
  if (!player) return null;
  const world = useWorldStore.getState().world;
  const week = useGameStore.getState().week;
  const refs = [world, week, useRelationshipStore.getState().relationships, useRivalryStore.getState().rivals, useSocialStore.getState().castLinks, player.artistName];
  if (cache && cache.refs.length === refs.length && cache.refs.every((r, i) => r === refs[i])) return cache.input;
  const named = namedInfo();
  const links = world ? linkNamed(named, world, useSocialStore.getState().castLinks) : {};
  const recent = world ? world.events.filter((e) => world.week - e.week <= 2) : [];
  const extra = recent.flatMap((e) => [e.primaryId, e.secondaryId]).filter((id): id is string => !!id);
  const cast = buildCast(named, world, links, { extraNpcIds: extra, max: 24 });
  const input: CelebInput = {
    week,
    playerName: player.artistName,
    city: player.city,
    cast,
    events: world ? celebEvents(world, cast) : [],
  };
  cache = { refs, input };
  return input;
}

/** Everything the feed generators need for the everyday and celebrity lanes. */
export function laneInput(): LaneInput | null {
  const player = usePlayerStore.getState().player;
  if (!player) return null;
  return { baseYear: baseYearOf(player.createdAt), city: player.city, celeb: celebInput(), real: realTopicsNow() };
}

/** The cast member behind an account (an artist's own account, or a fan account's idol). */
export function castMemberOf(accountId: string): CastMember | null {
  const input = celebInput();
  if (!input) return null;
  const id = accountId.startsWith('cf-') ? accountId.slice(3).replace(/-\d+$/, '') : accountId;
  return input.cast.find((m) => m.accountId === id) ?? null;
}

export function castAccountById(accountId: string): NpcAccount | null {
  const m = castMemberOf(accountId);
  return m && !accountId.startsWith('cf-') ? castAccount(m) : null;
}

/** An artist's (or their fan account's) profile posts on an app; null when the account isn't one of theirs. */
export function castTimeline(account: NpcAccount, platform: Platform, count = 9): SocialPost[] | null {
  const fan = account.id.startsWith('cf-');
  if (!fan && !account.id.startsWith('artist-') && !account.id.startsWith('npc-')) return null;
  const input = celebInput();
  const m = castMemberOf(account.id);
  if (!input || !m) return null;
  return fan ? fanTimeline(account, m, platform, input, count) : celebTimeline(m, platform, input, count);
}

/** What an artist's profile bio says. */
export function castBio(accountId: string): string | null {
  const m = castMemberOf(accountId);
  if (!m || accountId.startsWith('cf-')) return null;
  const named = RIVAL_ARTISTS.find((a) => a.id === m.id);
  if (named) return named.bio;
  const npc = useWorldStore.getState().world?.npcs[m.id];
  const genre = npc?.genre ? genreLabel(npc.genre) : 'music';
  return m.partner ? `${genre} · taken 🤍` : `${genre} · new music soon`;
}
