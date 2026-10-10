import { PEOPLE, type PeoplePhoto } from '../../data/photos/peoplePack';
import { hashOf } from './photoIndex';

/**
 * The people pack, indexed for the drama layer: faces for accounts and DM
 * senders (by gender, so a "Kayla" is a woman), reaction faces for memes,
 * scenes with people in them, and the rivals' own photos. Every pick is a
 * pure function of a seed. When the pack has nothing that fits, callers get
 * null and fall back to the stock pack.
 */

export type Gender = 'woman' | 'man';

const SELFIES: PeoplePhoto[] = PEOPLE.filter((p) => p.category === 'selfie');
const BY_KEY = new Map(PEOPLE.map((p) => [p.key, p]));

function pickOf<T>(list: readonly T[], seed: string): T | null {
  return list.length > 0 ? list[hashOf(seed) % list.length] : null;
}

export function peopleByKey(key: string | null | undefined): PeoplePhoto | null {
  return key ? (BY_KEY.get(key) ?? null) : null;
}

/** A face for someone: matching gender, everyday look (or a glam one for admirers). */
export function faceFor(seed: string, gender?: Gender, admirer = false): PeoplePhoto | null {
  const pool = SELFIES.filter((p) => (!gender || p.gender === gender) && (admirer ? p.admirer : !p.admirer));
  if (pool.length > 0) return pickOf(pool, `face:${seed}`);
  // Any face of the right gender beats none.
  return pickOf(SELFIES.filter((p) => !gender || p.gender === gender), `face:${seed}`);
}

/** A reaction face for a meme. */
export function reactionFace(reaction: string | undefined, seed: string): PeoplePhoto | null {
  const all = PEOPLE.filter((p) => p.category === 'reaction');
  const exact = reaction ? all.filter((p) => p.reaction === reaction) : [];
  return pickOf(exact.length > 0 ? exact : all, `meme:${seed}`);
}

/** A scene with people in it, by scene id in priority order. */
export function scenePhoto(scenes: readonly string[], seed: string, gender?: Gender): PeoplePhoto | null {
  for (const s of scenes) {
    const pool = PEOPLE.filter((p) => p.category === 'scene' && p.scene === s);
    const g = gender ? pool.filter((p) => p.gender === gender) : [];
    const pick = pickOf(g.length > 0 ? g : pool, `scene:${seed}:${s}`);
    if (pick) return pick;
  }
  return null;
}

/** A rival's own photo. */
export function rivalPhoto(rivalId: string, shot: 'portrait' | 'stage' = 'portrait'): PeoplePhoto | null {
  return (
    PEOPLE.find((p) => p.category === 'rival' && p.rival === rivalId && p.shot === shot) ??
    PEOPLE.find((p) => p.category === 'rival' && p.rival === rivalId) ??
    null
  );
}

export function hasPeople(): boolean {
  return PEOPLE.length > 0;
}
