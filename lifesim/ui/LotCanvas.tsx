/**
 * The lot view: a scrollable tile grid with walls, floors, pools, fire,
 * objects (emoji sprites) and sims (colored tokens with mood rings and
 * thought bubbles). One Pressable overlay converts taps to tile coords.
 */

import React, { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Lot, Sim, World } from '../core/types';
import { getDef, FLOOR_STYLES } from '../data/catalog';
import { OUTFIT_COLORS } from '../core/sim';
import { COLORS } from '../../constants/theme';

export const TILE = 26;

interface Props {
  world: World;
  lot: Lot;
  version: number;
  selectedSimId: string | null;
  onTapTile: (x: number, y: number) => void;
}

const TileView = memo(function TileView({
  floor,
  wall,
  door,
  window: win,
  pool,
  fire,
}: {
  floor: number;
  wall: boolean;
  door: boolean;
  window: boolean;
  pool: boolean;
  fire: number;
}) {
  let bg = FLOOR_STYLES[floor]?.color ?? FLOOR_STYLES[0].color;
  if (pool) bg = '#144A6E';
  if (wall) bg = door ? '#6B5B3E' : win ? '#3E5A6B' : '#585F6B';
  return (
    <View style={[styles.tile, { backgroundColor: bg }]}>
      {door && <Text style={styles.tileGlyph}>🚪</Text>}
      {win && !door && <Text style={styles.tileGlyph}>▢</Text>}
      {fire > 0 && <Text style={styles.fireGlyph}>🔥</Text>}
    </View>
  );
});

function moodColor(mood: number): string {
  if (mood >= 30) return COLORS.positive;
  if (mood >= -20) return COLORS.warning;
  return COLORS.negative;
}

const SimToken = memo(function SimToken({
  sim,
  selected,
}: {
  sim: Sim;
  selected: boolean;
}) {
  const color = sim.npc
    ? '#666D78'
    : OUTFIT_COLORS[sim.outfit % OUTFIT_COLORS.length];
  const initial = sim.name.charAt(0).toUpperCase();
  return (
    <View
      pointerEvents="none"
      style={[
        styles.sim,
        {
          left: sim.pos.x * TILE + 2,
          top: sim.pos.y * TILE + 2,
          borderColor: moodColor(sim.mood),
          backgroundColor: color,
          opacity: sim.ghost ? 0.45 : 1,
        },
        selected && styles.simSelected,
      ]}
    >
      <Text style={styles.simInitial}>
        {sim.npc === 'reaper' ? '💀' : sim.ghost ? '👻' : sim.age === 'baby' ? '👶' : initial}
      </Text>
      {sim.asleep && <Text style={styles.zzz}>💤</Text>}
      {sim.swimming && <Text style={styles.zzz}>🌊</Text>}
      {sim.thought && (
        <View style={styles.thought}>
          <Text style={styles.thoughtIcon}>{sim.thought.icon}</Text>
        </View>
      )}
    </View>
  );
});

export function LotCanvas({ world, lot, version, selectedSimId, onTapTile }: Props) {
  const width = lot.w * TILE;
  const height = lot.h * TILE;

  const tiles: React.ReactNode[] = [];
  for (let y = 0; y < lot.h; y++) {
    for (let x = 0; x < lot.w; x++) {
      const t = lot.tiles[y * lot.w + x];
      tiles.push(
        <View key={`${x}_${y}`} style={{ position: 'absolute', left: x * TILE, top: y * TILE }}>
          <TileView
            floor={t.floor}
            wall={t.wall}
            door={t.door}
            window={t.window}
            pool={t.pool}
            fire={t.fire}
          />
        </View>
      );
    }
  }

  const objects = Object.values(lot.objects)
    .filter((o) => !o.carriedBy)
    .map((obj) => {
      const def = getDef(obj.defId);
      return (
        <View
          key={obj.id}
          pointerEvents="none"
          style={[
            styles.obj,
            {
              left: obj.x * TILE,
              top: obj.y * TILE,
              width: def.w * TILE,
              height: def.h * TILE,
            },
          ]}
        >
          <Text style={styles.objIcon}>{def.icon}</Text>
          {obj.broken && <Text style={styles.badge}>⚠️</Text>}
          {obj.dirty && !obj.broken && <Text style={styles.badge}>🪰</Text>}
          {obj.onFire && <Text style={styles.badge}>🔥</Text>}
        </View>
      );
    });

  const sims = Object.values(world.sims)
    .filter((s) => s.lotId === lot.id && !s.dead && !s.career?.atWork)
    .map((sim) => <SimToken key={sim.id} sim={sim} selected={sim.id === selectedSimId} />);

  // Corpses awaiting the reaper render flat and tragic.
  const corpses = Object.values(world.sims)
    .filter((s) => s.lotId === lot.id && s.dead)
    .map((sim) => (
      <View
        key={sim.id}
        pointerEvents="none"
        style={[styles.obj, { left: sim.pos.x * TILE, top: sim.pos.y * TILE, width: TILE, height: TILE }]}
      >
        <Text style={styles.objIcon}>🪦</Text>
      </View>
    ));

  return (
    <ScrollView
      style={styles.outer}
      contentContainerStyle={{ padding: 12 }}
      maximumZoomScale={2}
      minimumZoomScale={0.5}
    >
      <ScrollView horizontal contentContainerStyle={{ paddingBottom: 12 }}>
        <Pressable
          style={{ width, height }}
          onPress={(e) => {
            const x = Math.floor(e.nativeEvent.locationX / TILE);
            const y = Math.floor(e.nativeEvent.locationY / TILE);
            if (x >= 0 && y >= 0 && x < lot.w && y < lot.h) onTapTile(x, y);
          }}
        >
          {tiles}
          {objects}
          {corpses}
          {sims}
        </Pressable>
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: COLORS.bg },
  tile: {
    width: TILE,
    height: TILE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileGlyph: { fontSize: 12, color: '#B9C2CE' },
  fireGlyph: { fontSize: 16, position: 'absolute' },
  obj: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  objIcon: { fontSize: 17 },
  badge: { position: 'absolute', top: -4, right: -2, fontSize: 10 },
  sim: {
    position: 'absolute',
    width: TILE - 4,
    height: TILE - 4,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  simSelected: {
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 8,
    transform: [{ scale: 1.15 }],
  },
  simInitial: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  zzz: { position: 'absolute', top: -12, right: -8, fontSize: 11 },
  thought: {
    position: 'absolute',
    top: -20,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 8,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  thoughtIcon: { fontSize: 11 },
});
