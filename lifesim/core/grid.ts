/**
 * Lot grid: tiles, occupancy, A* routing, environment (Room) scoring, and the
 * Build/Buy mutations (walls, doors, floors, pools, object placement).
 *
 * Faithful behavior notes: routing failure does NOT silently repath — callers
 * surface the classic blocked-path tantrum. Walls are tile-based; doors are
 * wall tiles sims may pass through.
 */

import type { Lot, Sim, Tile, World, WorldObject } from './types';
import { newId } from './types';
import { getDef, type ObjectDef } from '../data/catalog';
import {
  DEPRECIATION_DAILY,
  DEPRECIATION_FLOOR,
  DEPRECIATION_INITIAL,
  DOOR_COST,
  FLOOR_COST,
  POOL_COST,
  WALL_COST,
  WALL_REFUND,
  WINDOW_COST,
} from '../data/tuning';

// ─── Tiles ──────────────────────────────────────────────────────────────────

export function blankTile(): Tile {
  return { floor: 0, wall: false, door: false, window: false, pool: false, fire: 0 };
}

export function tileAt(lot: Lot, x: number, y: number): Tile | null {
  if (x < 0 || y < 0 || x >= lot.w || y >= lot.h) return null;
  return lot.tiles[y * lot.w + x];
}

export function inBounds(lot: Lot, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < lot.w && y < lot.h;
}

// ─── Objects & occupancy ────────────────────────────────────────────────────

export function objectTiles(obj: WorldObject): { x: number; y: number }[] {
  const def = getDef(obj.defId);
  const out: { x: number; y: number }[] = [];
  for (let dx = 0; dx < def.w; dx++) {
    for (let dy = 0; dy < def.h; dy++) {
      out.push({ x: obj.x + dx, y: obj.y + dy });
    }
  }
  return out;
}

export function objectAt(lot: Lot, x: number, y: number): WorldObject | null {
  for (const id in lot.objects) {
    const obj = lot.objects[id];
    if (obj.carriedBy) continue;
    const def = getDef(obj.defId);
    if (x >= obj.x && x < obj.x + def.w && y >= obj.y && y < obj.y + def.h) return obj;
  }
  return null;
}

export function findObjects(lot: Lot, defId: string): WorldObject[] {
  return Object.values(lot.objects).filter((o) => o.defId === defId && !o.carriedBy);
}

export function findObjectsWhere(
  lot: Lot,
  pred: (o: WorldObject, def: ObjectDef) => boolean
): WorldObject[] {
  return Object.values(lot.objects).filter(
    (o) => !o.carriedBy && pred(o, getDef(o.defId))
  );
}

/**
 * Is the tile walkable for routing? Pool tiles block unless `allowPool`
 * (swimming). Walls block unless the tile is a door.
 */
export function isWalkable(lot: Lot, x: number, y: number, allowPool = false): boolean {
  const t = tileAt(lot, x, y);
  if (!t) return false;
  if (t.wall && !t.door) return false;
  if (t.pool && !allowPool) return false;
  if (t.fire > 0) return false;
  const obj = objectAt(lot, x, y);
  if (obj && !getDef(obj.defId).walkable) return false;
  return true;
}

/** A tile a sim can stand on to use an object (4-adjacent, or the object tile). */
export function usePosition(
  lot: Lot,
  obj: WorldObject,
  sitOn: boolean
): { x: number; y: number } | null {
  if (sitOn) {
    // Stand/sit on the object itself (chairs, beds, showers, ladders).
    const tiles = objectTiles(obj);
    for (const t of tiles) {
      const tile = tileAt(lot, t.x, t.y);
      if (tile && (!tile.wall || tile.door)) return t;
    }
    return null;
  }
  const candidates: { x: number; y: number }[] = [];
  for (const t of objectTiles(obj)) {
    candidates.push({ x: t.x + 1, y: t.y }, { x: t.x - 1, y: t.y }, { x: t.x, y: t.y + 1 }, { x: t.x, y: t.y - 1 });
  }
  for (const c of candidates) {
    if (isWalkable(lot, c.x, c.y)) return c;
  }
  return null;
}

/**
 * Among objects matching `pred`, return the nearest one the sim can actually
 * route to, with the path. Guards against furniture sealing off an object.
 */
export function findReachableUse(
  lot: Lot,
  sim: { pos: { x: number; y: number } },
  pred: (o: WorldObject, def: ObjectDef) => boolean
): { obj: WorldObject; use: { x: number; y: number }; path: { x: number; y: number }[] } | null {
  const matches = findObjectsWhere(lot, pred).sort(
    (a, b) => dist(sim.pos, a) - dist(sim.pos, b)
  );
  for (const obj of matches) {
    const use = usePosition(lot, obj, false);
    if (!use) continue;
    const path = findPath(lot, sim.pos, use);
    if (path !== null) return { obj, use, path };
  }
  return null;
}

// ─── A* pathfinding ─────────────────────────────────────────────────────────

export function findPath(
  lot: Lot,
  from: { x: number; y: number },
  to: { x: number; y: number },
  opts: { allowPool?: boolean; sitTarget?: boolean } = {}
): { x: number; y: number }[] | null {
  if (from.x === to.x && from.y === to.y) return [];
  const w = lot.w;
  const key = (x: number, y: number) => y * w + x;
  const open: number[] = [key(from.x, from.y)];
  const came = new Map<number, number>();
  const g = new Map<number, number>([[key(from.x, from.y), 0]]);
  const f = new Map<number, number>([
    [key(from.x, from.y), Math.abs(to.x - from.x) + Math.abs(to.y - from.y)],
  ]);
  const targetKey = key(to.x, to.y);
  const walkableTo = (x: number, y: number) =>
    (x === to.x && y === to.y)
      ? // Target itself may be a "sit" tile (object tile) — allow arrival.
        (opts.sitTarget ? inBounds(lot, x, y) && !(tileAt(lot, x, y)!.wall && !tileAt(lot, x, y)!.door) : isWalkable(lot, x, y, opts.allowPool))
      : isWalkable(lot, x, y, opts.allowPool);

  let guard = 0;
  while (open.length > 0 && guard++ < 4000) {
    // Lowest f-score (small grids: linear scan is fine).
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if ((f.get(open[i]) ?? Infinity) < (f.get(open[bestIdx]) ?? Infinity)) bestIdx = i;
    }
    const current = open.splice(bestIdx, 1)[0];
    if (current === targetKey) {
      // Reconstruct.
      const path: { x: number; y: number }[] = [];
      let c: number | undefined = current;
      while (c !== undefined && c !== key(from.x, from.y)) {
        path.unshift({ x: c % w, y: Math.floor(c / w) });
        c = came.get(c);
      }
      return path;
    }
    const cx = current % w;
    const cy = Math.floor(current / w);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!inBounds(lot, nx, ny) || !walkableTo(nx, ny)) continue;
      const nk = key(nx, ny);
      const tentative = (g.get(current) ?? Infinity) + 1;
      if (tentative < (g.get(nk) ?? Infinity)) {
        came.set(nk, current);
        g.set(nk, tentative);
        f.set(nk, tentative + Math.abs(to.x - nx) + Math.abs(to.y - ny));
        if (!open.includes(nk)) open.push(nk);
      }
    }
  }
  return null;
}

export function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// ─── Environment (Room motive) ──────────────────────────────────────────────

/**
 * Room score at a position: décor within radius 6, light, mess/broken
 * penalties. Returns -100..100. (Simplified room-based scoring: radius scan.)
 */
export function roomScoreAt(lot: Lot, x: number, y: number): number {
  let score = 0;
  let lit = false;
  const t = tileAt(lot, x, y);
  if (t && t.floor > 0) score += 4; // finished floors beat bare grass
  for (const id in lot.objects) {
    const obj = lot.objects[id];
    if (obj.carriedBy) continue;
    const d = Math.abs(obj.x - x) + Math.abs(obj.y - y);
    if (d > 6) continue;
    const def = getDef(obj.defId);
    if (def.roomScore) score += def.roomScore * 3;
    if (def.light) lit = true;
    if (obj.broken) score -= 5;
    if (obj.dirty) score -= 3;
    if (obj.onFire) score -= 40;
  }
  score += lit ? 8 : -8;
  return Math.max(-100, Math.min(100, score * 2.2));
}

// ─── Depreciation ───────────────────────────────────────────────────────────

export function currentValue(world: World, obj: WorldObject): number {
  const def = getDef(obj.defId);
  if (def.unbuyable) return 0;
  const days = Math.max(0, world.day - obj.boughtDay);
  const factor = Math.max(
    DEPRECIATION_FLOOR,
    1 - DEPRECIATION_INITIAL - days * DEPRECIATION_DAILY
  );
  return Math.round(def.price * factor);
}

export function lotAssetValue(world: World, lot: Lot): number {
  let total = 0;
  for (const id in lot.objects) total += currentValue(world, lot.objects[id]);
  return total;
}

// ─── Buy mode ───────────────────────────────────────────────────────────────

export function canPlaceObject(lot: Lot, def: ObjectDef, x: number, y: number): boolean {
  for (let dx = 0; dx < def.w; dx++) {
    for (let dy = 0; dy < def.h; dy++) {
      const t = tileAt(lot, x + dx, y + dy);
      if (!t) return false;
      if (t.wall && !def.walkable) return false;
      if (t.pool && def.id !== 'pool_ladder') return false;
      if (def.id === 'pool_ladder' && !t.pool) return false;
      if (objectAt(lot, x + dx, y + dy)) return false;
    }
  }
  return true;
}

/** Place a bought or spawned object. Returns null if blocked. */
export function placeObject(
  world: World,
  lot: Lot,
  defId: string,
  x: number,
  y: number
): WorldObject | null {
  const def = getDef(defId);
  if (!canPlaceObject(lot, def, x, y)) return null;
  const obj: WorldObject = {
    id: newId(world, 'obj'),
    defId,
    x,
    y,
    broken: false,
    dirty: false,
    value: Math.round(def.price * (1 - DEPRECIATION_INITIAL)),
    boughtDay: world.day,
    inUseBy: [],
    onFire: false,
    uses: 0,
    carriedBy: null,
    data: {},
  };
  lot.objects[obj.id] = obj;
  return obj;
}

/** Spawn a mess/prop even on slightly-occupied ground (walkable defs only). */
export function spawnProp(
  world: World,
  lot: Lot,
  defId: string,
  x: number,
  y: number
): WorldObject {
  const obj: WorldObject = {
    id: newId(world, 'obj'),
    defId,
    x: Math.max(0, Math.min(lot.w - 1, x)),
    y: Math.max(0, Math.min(lot.h - 1, y)),
    broken: false,
    dirty: false,
    value: 0,
    boughtDay: world.day,
    inUseBy: [],
    onFire: false,
    uses: 0,
    carriedBy: null,
    data: {},
  };
  lot.objects[obj.id] = obj;
  return obj;
}

export function removeObject(lot: Lot, objId: string): void {
  delete lot.objects[objId];
}

// ─── Build mode ─────────────────────────────────────────────────────────────

export type BuildTool =
  | 'wall'
  | 'wall_delete'
  | 'door'
  | 'window'
  | 'floor'
  | 'pool'
  | 'bulldoze';

export interface BuildResult {
  ok: boolean;
  cost: number;
  reason?: string;
}

export function applyBuildTool(
  world: World,
  lot: Lot,
  tool: BuildTool,
  x: number,
  y: number,
  floorStyle: number,
  funds: number
): BuildResult {
  const t = tileAt(lot, x, y);
  if (!t) return { ok: false, cost: 0, reason: 'Out of bounds' };
  if (objectAt(lot, x, y) && tool !== 'bulldoze')
    return { ok: false, cost: 0, reason: 'Object in the way' };

  switch (tool) {
    case 'wall': {
      if (t.wall) return { ok: false, cost: 0, reason: 'Wall exists' };
      if (t.pool) return { ok: false, cost: 0, reason: 'Water resists masonry' };
      if (funds < WALL_COST) return { ok: false, cost: 0, reason: 'Not enough funds' };
      t.wall = true;
      t.door = false;
      t.window = false;
      return { ok: true, cost: WALL_COST };
    }
    case 'wall_delete': {
      if (!t.wall) return { ok: false, cost: 0, reason: 'No wall here' };
      t.wall = false;
      t.door = false;
      t.window = false;
      return { ok: true, cost: -WALL_REFUND };
    }
    case 'door': {
      if (!t.wall) return { ok: false, cost: 0, reason: 'Doors need walls' };
      if (t.door) return { ok: false, cost: 0, reason: 'Door exists' };
      if (funds < DOOR_COST) return { ok: false, cost: 0, reason: 'Not enough funds' };
      t.door = true;
      t.window = false;
      return { ok: true, cost: DOOR_COST };
    }
    case 'window': {
      if (!t.wall) return { ok: false, cost: 0, reason: 'Windows need walls' };
      if (t.window) return { ok: false, cost: 0, reason: 'Window exists' };
      if (funds < WINDOW_COST) return { ok: false, cost: 0, reason: 'Not enough funds' };
      t.window = true;
      t.door = false;
      return { ok: true, cost: WINDOW_COST };
    }
    case 'floor': {
      if (t.wall) return { ok: false, cost: 0, reason: 'Wall in the way' };
      if (t.pool) return { ok: false, cost: 0, reason: 'Drain the pool first' };
      if (t.floor === floorStyle) return { ok: false, cost: 0, reason: 'Same floor' };
      if (funds < FLOOR_COST) return { ok: false, cost: 0, reason: 'Not enough funds' };
      t.floor = floorStyle;
      return { ok: true, cost: FLOOR_COST };
    }
    case 'pool': {
      if (t.wall) return { ok: false, cost: 0, reason: 'Wall in the way' };
      if (t.pool) return { ok: false, cost: 0, reason: 'Already a pool' };
      if (funds < POOL_COST) return { ok: false, cost: 0, reason: 'Not enough funds' };
      t.pool = true;
      t.floor = 0;
      return { ok: true, cost: POOL_COST };
    }
    case 'bulldoze': {
      if (t.pool) {
        t.pool = false;
        return { ok: true, cost: 0 };
      }
      const obj = objectAt(lot, x, y);
      if (obj) {
        const refund = currentValue(world, obj);
        removeObject(lot, obj.id);
        return { ok: true, cost: -refund };
      }
      if (t.floor !== 0) {
        t.floor = 0;
        return { ok: true, cost: 0 };
      }
      return { ok: false, cost: 0, reason: 'Nothing to remove' };
    }
  }
}
