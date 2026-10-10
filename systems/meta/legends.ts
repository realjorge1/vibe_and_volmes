import type { Npc } from '../../types/world';
import type { PastLife } from '../../types/meta';
import type { CareerDossier } from '../../types/legacy';
import type { LegendView } from '../events/personalize';
import { useMetaStore } from '../../store/metaStore';
import { useWorldStore } from '../../store/worldStore';
import { usePlayerStore } from '../../store/playerStore';
import { useMusicStore } from '../../store/musicStore';
import { getEnding } from '../../data/life/endings';
import { generateNpc } from '../world/generateNpc';
import { Rng, hashString } from '../world/rng';

/**
 * One universe, many lives. When a life ends, the artist joins the world of
 * the lives after it: still touring if they retired, a legend whose estate
 * releases music if they died. Their songs are on the radio, their name is in
 * every comparison, and an heir grows up in their shadow.
 */

/** How many past lives live on in a new world. */
const LEGENDS_IN_WORLD = 6;

export function legendNpcId(pastLifeId: string): string {
  return `legend-${pastLifeId}`;
}

/** The life that just ended, as a past life for the meta profile. */
export function pastLifeFrom(dossier: CareerDossier): PastLife | null {
  const player = usePlayerStore.getState().player;
  if (!player) return null;
  const ending = dossier.ending;
  const hits = [...useMusicStore.getState().discography]
    .filter((t) => !t.rerecordOf)
    .sort((a, b) => (a.peakChartPosition ?? 999) - (b.peakChartPosition ?? 999) || b.totalStreams - a.totalStreams)
    .slice(0, 3)
    .map((t) => ({ title: t.title, peak: t.peakChartPosition }));
  const endingId = ending?.id ?? 'retirement';
  return {
    id: `life-${player.createdAt.toString(36)}`,
    artistName: player.artistName,
    genre: player.genre,
    gender: player.gender,
    city: player.city,
    identity: dossier.identity.label,
    identityTitle: dossier.identity.title,
    legacyTier: dossier.legacy.tier,
    ending: endingId,
    died: getEnding(endingId).kind === 'died',
    ageAtEnd: ending?.age ?? player.startAge,
    peakFans: dossier.peakFans,
    hits,
    generation: player.generation ?? 1,
    endedAt: Date.now(),
  };
}

/** Past lives an event can name (`{legend}`), alive and gone. */
export function legendViews(): { alive: LegendView[]; dead: LegendView[] } {
  const lives = useMetaStore.getState().pastLives.slice(0, LEGENDS_IN_WORLD);
  const view = (p: PastLife): LegendView => ({ id: p.id, name: p.artistName, hit: p.hits[0]?.title ?? null });
  return {
    alive: lives.filter((p) => !p.died).map(view),
    dead: lives.filter((p) => p.died).map(view),
  };
}

/** A past life as a living-world NPC: a legend still working, or an estate. */
export function legendNpc(p: PastLife, week: number): Npc {
  const rng = new Rng(hashString(p.id));
  const base = generateNpc({ rng, id: legendNpcId(p.id), role: 'artist', week, genre: p.genre, forceTier: 4 });
  const followers = Math.max(base.social.followers, p.peakFans);
  return {
    ...base,
    name: p.artistName,
    handle: `@${p.artistName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    stage: p.died ? 'legend' : p.peakFans >= 1_000_000 ? 'legend' : 'established',
    // The dead don't post or release, but the world still talks about them.
    active: !p.died,
    social: { ...base.social, followers },
    roleData: { ...base.roleData, fans: followers },
    bornWeek: -520,
    tags: ['past-life', ...(p.died ? ['deceased'] : [])],
  };
}

/** Put the most recent past lives into a freshly generated world. */
export function injectLegends(week: number): void {
  const lives = useMetaStore.getState().pastLives.slice(0, LEGENDS_IN_WORLD);
  if (lives.length === 0) return;
  useWorldStore.getState().addNpcs(lives.map((p) => legendNpc(p, week)));
}
