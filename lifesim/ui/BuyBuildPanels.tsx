/**
 * Buy mode: the catalog scroller (tap an item, tap the lot to place; tap a
 * placed object to sell). Build mode: wall/door/window/floor/pool/bulldoze
 * tools with floor-style picker.
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BUY_CATEGORIES, CATALOG, FLOOR_STYLES } from '../data/catalog';
import type { BuildTool } from '../core/grid';
import { useLifeSimStore } from '../../store/lifeSimStore';
import {
  DOOR_COST,
  FLOOR_COST,
  POOL_COST,
  WALL_COST,
  WINDOW_COST,
} from '../data/tuning';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';

export function BuyPanel() {
  const [category, setCategory] = useState(BUY_CATEGORIES[0].id);
  const buyDefId = useLifeSimStore((s) => s.buyDefId);
  const setBuyDef = useLifeSimStore((s) => s.setBuyDef);

  const items = Object.values(CATALOG).filter(
    (d) => d.category === category && !d.unbuyable
  );

  return (
    <View style={styles.panel}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
        {BUY_CATEGORIES.filter((c) => c.id !== 'misc' ||
          Object.values(CATALOG).some((d) => d.category === 'misc' && !d.unbuyable)
        ).map((c) => (
          <Pressable
            key={c.id}
            onPress={() => setCategory(c.id)}
            style={[styles.catBtn, category === c.id && styles.catBtnActive]}
          >
            <Text style={styles.catIcon}>{c.icon}</Text>
            <Text style={styles.catLabel}>{c.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {items.map((def) => (
          <Pressable
            key={def.id}
            onPress={() => setBuyDef(buyDefId === def.id ? null : def.id)}
            style={[styles.item, buyDefId === def.id && styles.itemActive]}
          >
            <Text style={styles.itemIcon}>{def.icon}</Text>
            <Text style={styles.itemName} numberOfLines={1}>
              {def.name}
            </Text>
            <Text style={styles.itemPrice}>§{def.price}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.hint}>
        {buyDefId
          ? `Tap the lot to place. ${CATALOG[buyDefId].blurb}`
          : 'Pick an item to buy — or tap a placed object to sell it.'}
      </Text>
    </View>
  );
}

const TOOLS: { id: BuildTool; label: string; icon: string; cost: string }[] = [
  { id: 'wall', label: 'Wall', icon: '🧱', cost: `§${WALL_COST}` },
  { id: 'door', label: 'Door', icon: '🚪', cost: `§${DOOR_COST}` },
  { id: 'window', label: 'Window', icon: '🪟', cost: `§${WINDOW_COST}` },
  { id: 'floor', label: 'Floor', icon: '🟫', cost: `§${FLOOR_COST}` },
  { id: 'pool', label: 'Pool', icon: '🌊', cost: `§${POOL_COST}` },
  { id: 'wall_delete', label: 'Rm Wall', icon: '🔨', cost: 'refund' },
  { id: 'bulldoze', label: 'Bulldoze', icon: '🚜', cost: 'refund' },
];

export function BuildPanel() {
  const buildTool = useLifeSimStore((s) => s.buildTool);
  const setBuildTool = useLifeSimStore((s) => s.setBuildTool);
  const floorStyle = useLifeSimStore((s) => s.floorStyle);
  const setFloorStyle = useLifeSimStore((s) => s.setFloorStyle);

  return (
    <View style={styles.panel}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {TOOLS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setBuildTool(buildTool === t.id ? null : t.id)}
            style={[styles.item, buildTool === t.id && styles.itemActive]}
          >
            <Text style={styles.itemIcon}>{t.icon}</Text>
            <Text style={styles.itemName}>{t.label}</Text>
            <Text style={styles.itemPrice}>{t.cost}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {buildTool === 'floor' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
          {FLOOR_STYLES.filter((f) => f.id !== 0).map((f) => (
            <Pressable
              key={f.id}
              onPress={() => setFloorStyle(f.id)}
              style={[
                styles.swatch,
                { backgroundColor: f.color },
                floorStyle === f.id && styles.swatchActive,
              ]}
            >
              <Text style={styles.swatchLabel}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      <Text style={styles.hint}>
        {buildTool
          ? 'Tap tiles to apply the tool. Pools need a ladder (Buy › Misc) or swimmers stay in.'
          : 'Pick a tool. Walls need doors. Sims are unreasonable about this.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  catRow: { marginBottom: 8 },
  catBtn: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
    marginRight: 6,
    backgroundColor: COLORS.surface2,
  },
  catBtnActive: { backgroundColor: COLORS.primary },
  catIcon: { fontSize: 14 },
  catLabel: { color: COLORS.textSecondary, fontSize: 9 },
  item: {
    width: 86,
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginRight: 8,
  },
  itemActive: { borderWidth: 1, borderColor: COLORS.primary },
  itemIcon: { fontSize: 22 },
  itemName: { color: COLORS.text, fontSize: 10, marginTop: 2 },
  itemPrice: { color: COLORS.gold, fontSize: 10, marginTop: 1 },
  hint: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 8 },
  swatch: {
    width: 74,
    height: 30,
    borderRadius: RADIUS.sm,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchActive: { borderWidth: 2, borderColor: '#FFFFFF' },
  swatchLabel: { color: '#DDE3EA', fontSize: 9 },
});
