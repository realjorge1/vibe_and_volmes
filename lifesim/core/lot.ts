/**
 * Lot construction: blank lots and the furnished starter-home template.
 * Starter furniture is placed free — the shared wallet (music-game money)
 * shouldn't be emptied by the front door existing.
 */

import type { Lot, World } from './types';
import { newId } from './types';
import { blankTile, placeObject, tileAt } from './grid';

export const LOT_W = 20;
export const LOT_H = 20;

export function createLot(world: World, name: string, price: number): Lot {
  const lot: Lot = {
    id: newId(world, 'lot'),
    name,
    w: LOT_W,
    h: LOT_H,
    price,
    tiles: Array.from({ length: LOT_W * LOT_H }, () => blankTile()),
    objects: {},
    householdId: null,
    spawn: { x: 10, y: 18 },
    maidHired: false,
  };
  placeObject(world, lot, 'mailbox', 9, 18);
  world.lots[lot.id] = lot;
  return lot;
}

function wallLine(lot: Lot, x1: number, y1: number, x2: number, y2: number): void {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      const t = tileAt(lot, x, y);
      if (t) {
        t.wall = true;
        t.door = false;
        t.window = false;
      }
    }
  }
}

function door(lot: Lot, x: number, y: number): void {
  const t = tileAt(lot, x, y);
  if (t) {
    t.wall = true;
    t.door = true;
  }
}

function windowAt(lot: Lot, x: number, y: number): void {
  const t = tileAt(lot, x, y);
  if (t) {
    t.wall = true;
    t.window = true;
  }
}

function floorRect(lot: Lot, x1: number, y1: number, x2: number, y2: number, style: number): void {
  for (let x = x1; x <= x2; x++) {
    for (let y = y1; y <= y2; y++) {
      const t = tileAt(lot, x, y);
      if (t && !t.wall) t.floor = style;
    }
  }
}

/**
 * The starter bungalow. Interior is 5 rows tall (y=9..13) so furniture never
 * seals off a region — row y=10 is kept as an always-open corridor spanning
 * the whole living/kitchen space. Verified by a flood-fill reachability test.
 *
 *   ┌──────────────┐  y3
 *   │  bed │  bath │
 *   ├──d───┴──d────┤  y8
 *   │  kitchen/liv │  y9..13
 *   └──────d───────┘  y14
 */
export function buildStarterHome(world: World, lot: Lot): void {
  // Outer shell.
  wallLine(lot, 3, 3, 16, 3);
  wallLine(lot, 3, 14, 16, 14);
  wallLine(lot, 3, 3, 3, 14);
  wallLine(lot, 16, 3, 16, 14);
  // Interior: top strip split into bedroom | bathroom, living below.
  wallLine(lot, 4, 8, 15, 8);
  wallLine(lot, 10, 4, 10, 7);
  door(lot, 7, 8); // bedroom → living
  door(lot, 12, 8); // bathroom → living
  door(lot, 10, 14); // front door
  windowAt(lot, 5, 3);
  windowAt(lot, 13, 3);
  windowAt(lot, 3, 11);
  windowAt(lot, 16, 11);

  floorRect(lot, 4, 4, 9, 7, 4); // bedroom: carpet
  floorRect(lot, 11, 4, 15, 7, 1); // bathroom: tile
  floorRect(lot, 4, 9, 15, 13, 2); // living/kitchen: hardwood

  // Bedroom.
  placeObject(world, lot, 'bed_cheap', 4, 4);
  placeObject(world, lot, 'lamp_floor', 9, 4);
  // Bathroom.
  placeObject(world, lot, 'toilet', 11, 4);
  placeObject(world, lot, 'shower', 14, 4);
  placeObject(world, lot, 'sink', 11, 6);
  // Kitchen appliances line the top wall (row 9); row 10 stays a clear
  // corridor so every object below has a reachable approach tile.
  placeObject(world, lot, 'fridge_cheap', 4, 9);
  placeObject(world, lot, 'counter', 5, 9);
  placeObject(world, lot, 'stove', 6, 9);
  placeObject(world, lot, 'lamp_floor', 9, 9);
  placeObject(world, lot, 'bookshelf', 14, 9);
  placeObject(world, lot, 'phone', 15, 9);
  // Dining (row 11, chairs on row 12 — corridor row 10 untouched).
  placeObject(world, lot, 'table_dining', 6, 11);
  placeObject(world, lot, 'chair_dining', 6, 12);
  placeObject(world, lot, 'chair_dining', 7, 11);
  // Living (right side).
  placeObject(world, lot, 'sofa_cheap', 11, 12);
  placeObject(world, lot, 'tv_cheap', 11, 13);
  placeObject(world, lot, 'trash_can', 4, 13);
  placeObject(world, lot, 'lamp_floor', 15, 13);
}

/** A slightly nicer pre-built for the neighbor households. */
export function buildNeighborHome(world: World, lot: Lot): void {
  buildStarterHome(world, lot);
  placeObject(world, lot, 'bed_cheap', 6, 4);
  placeObject(world, lot, 'stereo', 14, 13);
  placeObject(world, lot, 'plant_potted', 13, 13);
}
