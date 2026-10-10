import type { DmThread } from '../../types/drama';
import { useDramaStore } from '../../store/dramaStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useMusicStore } from '../../store/musicStore';
import { useRivalryStore } from '../../store/rivalryStore';
import { useRelationshipStore } from '../../store/relationshipStore';
import { usePeopleStore } from '../../store/peopleStore';
import { getRivalryAction } from '../../data/rivalry/rivalryActions';
import { randomWorldNpc } from '../life/lifeContext';
import { activePeople, partnerOf } from '../life/peopleEngine';
import { spawnControversy } from '../pr/prEngine';
import { coolMoments, isHistoric } from './moments';
import { newWar, phaseFor, RIVAL_MOVES, settle, standing, swing } from './rivalWar';
import { weeklyDms, type DmCtx } from './dmEngine';
import { handleOf } from './feedPosts';
import { hottestRival, spawnMoment } from './publish';
import { notifyDm } from '../notifications/triggers';

/**
 * THE DRAMA HEARTBEAT: one week of the artist's public life.
 *
 * Runs in the week transition after the rivalry engine has acted, and before
 * the new week's events and feed are generated (so both see this week's
 * drama). Moments it spawns are quiet: the week's feed carries them. Returns
 * Deck lines for the week summary.
 */
export function runDramaWeek(week: number): string[] {
  const player = usePlayerStore.getState().player;
  if (!player) return [];
  const drama = useDramaStore.getState();
  const notes: string[] = [];

  // 1. Last week's stories cool off; the big ones go to the archive.
  const before = drama.moments;
  const after = coolMoments(before);
  const burned = before.filter((m) => !after.some((a) => a.id === m.id));
  drama.archiveMoments(burned.filter(isHistoric));
  drama.setMoments(after);

  // 2. The rival war: score what the rivals did this week.
  const rivals = useRivalryStore.getState().allRivals();
  const known = useRelationshipStore.getState().knownArtists;
  for (const rc of rivals) {
    const artist = known.find((a) => a.id === rc.artistId);
    if (!artist) continue;
    let war = useDramaStore.getState().wars[rc.artistId] ?? (rc.intensity >= 20 ? newWar(rc.artistId, week) : null);
    if (!war) continue;
    const acted = rc.lastActionWeek === week && rc.actionsTaken.length > 0;
    if (acted) {
      const action = getRivalryAction(rc.actionsTaken[rc.actionsTaken.length - 1]);
      const move = action ? RIVAL_MOVES[action.kind] : undefined;
      if (move) {
        war = swing(war, move.swing, week, `${artist.name}: ${action!.summary.replace('{rival}', artist.name)}`);
        spawnMoment(move.moment, { rivalId: artist.id, rivalName: artist.name, quiet: true });
      }
    } else {
      war = settle(war);
    }
    war = { ...war, phase: phaseFor(rc.intensity, war, week) };
    useDramaStore.getState().setWar(war);
  }
  const top = hottestRival();
  if (top && top.intensity >= 35) {
    const war = useDramaStore.getState().wars[top.id];
    if (war) notes.push(`⚔️ The ${top.name} war: ${standing(war, top.name)}.`);
  }

  // 3. The inbox.
  const partner = partnerOf(activePeople(usePeopleStore.getState().people));
  const ctx = dmContext(week, true);
  if (!ctx) return notes;
  const d = useDramaStore.getState();
  const res = weeklyDms(ctx, d.dms, { arcWeeks: d.arcWeeks, lastRomanceWeek: d.lastRomanceWeek }, Math.random);
  d.setDms(res.threads);
  for (const [arc, w] of Object.entries(res.arcWeeks)) if (d.arcWeeks[arc] !== w) d.noteArc(arc, w);
  if (res.lastRomanceWeek !== d.lastRomanceWeek) d.setLastRomanceWeek(res.lastRomanceWeek);
  const arrivals: DmThread[] = [...res.started, ...res.escalated];
  arrivals.forEach((t, i) => notifyDm(t, 6000 + i * 11000));
  if (res.started.length > 0) notes.push(dmNote(res.started));
  if (res.escalated.some((t) => t.kind === 'obsessed')) notes.push('📩 That fan messaged again. They know where you were today.');

  // 4. A secret fling doesn't stay secret forever.
  const game = useGameStore.getState();
  if (game.playerTags.includes('secret-fling') && partner && Math.random() < 0.25) {
    game.removeTag('secret-fling');
    usePeopleStore.getState().adjustAffinity(partner.id, -40);
    spawnControversy('ctrl-cheating', week);
    spawnMoment(
      { kind: 'scandal', headline: "Receipts Surface: {playerName}'s Secret Fling Exposed", topic: 'the secret fling', heat: 70, valence: -65, hashtag: '{playerName}Exposed', tags: ['romance', 'cheating', 'leak'] },
      { quiet: true, partnerName: partner.name }
    );
    notes.push(`🧾 It came out. ${partner.name} saw the screenshots before you could say anything.`);
  }

  // 5. Being with someone famous-adjacent means cameras.
  const romanceHot = useDramaStore.getState().moments.some((m) => m.kind === 'romance');
  if (partner && !romanceHot && player.stats.fans >= 8_000 && Math.random() < 0.12) {
    spawnMoment(
      { kind: 'romance', headline: '{playerName} and {partner} Spotted Holding Hands in {city}', topic: 'the {partner} sighting', heat: 26 + Math.min(30, player.stats.fans / 50_000), valence: 25, hashtag: '{playerName}InLove', tags: ['romance', 'paparazzi'] },
      { quiet: true, partnerName: partner.name }
    );
  }

  useDramaStore.getState().save();
  return notes;
}

function dmNote(started: readonly DmThread[]): string {
  const n = started.length;
  const kinds = new Set(started.map((t) => t.kind));
  const extra =
    kinds.has('celeb-crush') ? ' Someone famous is in there. 👀'
    : kinds.has('admirer') ? ' One of them is flirting.'
    : kinds.has('rival') ? ' One is from your rival.'
    : kinds.has('obsessed') ? ' One of them is... a lot.'
    : kinds.has('wannabe') ? ' Someone wants you to hear their mixtape.'
    : '';
  return `📩 ${n} new DM${n > 1 ? 's' : ''}.${extra}`;
}

/** The DM engine's view of the artist right now. `withCeleb` looks for a famous sender. */
export function dmContext(week = useGameStore.getState().week, withCeleb = false): DmCtx | null {
  const player = usePlayerStore.getState().player;
  if (!player) return null;
  const partner = partnerOf(activePeople(usePeopleStore.getState().people));
  const top = hottestRival();
  const celebNpc = withCeleb && player.stats.fans >= 25_000
    ? randomWorldNpc({ roles: ['artist', 'influencer'], unlinked: true, single: true, famous: true })
    : null;
  return {
    week,
    now: Date.now(),
    fans: player.stats.fans,
    gender: player.gender,
    partnerName: partner?.name ?? null,
    rival: top ? { id: top.id, name: top.name, handle: top.handle, intensity: top.intensity, followers: Math.round(top.fans * 0.65) } : null,
    celeb: celebNpc ? { name: celebNpc.name, handle: celebNpc.handle || handleOf(celebNpc.name), npcId: celebNpc.id, followers: celebNpc.social.followers } : null,
    playerName: player.artistName,
    trackTitle: useMusicStore.getState().getLatestTrack()?.title ?? null,
    city: player.city,
    stats: {
      charisma: player.stats.charisma,
      talent: player.stats.talent,
      writing: player.stats.writing,
      reputation: player.stats.reputation,
      authenticity: player.stats.authenticity,
    },
  };
}
