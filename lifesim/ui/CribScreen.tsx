/**
 * The Crib — the artist's home life, powered by the LifeSim engine.
 * Top bar (clock, wallet, modes, speeds) · lot canvas · mode panel ·
 * pie menus, dialogs, neighborhood sheet, event ticker.
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLifeSimStore } from '../../store/lifeSimStore';
import { LotCanvas } from './LotCanvas';
import { LivePanel } from './Panels';
import { BuyPanel, BuildPanel } from './BuyBuildPanels';
import { PieMenu } from './PieMenu';
import { DialogHost } from './DialogHost';
import { clockLabel, DAY_NAMES, weekday } from '../core/types';
import { activeLot } from '../core/world';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';

export function CribScreen() {
  const world = useLifeSimStore((s) => s.world);
  const version = useLifeSimStore((s) => s.version);
  const init = useLifeSimStore((s) => s.init);
  const startDriver = useLifeSimStore((s) => s.startDriver);
  const stopDriver = useLifeSimStore((s) => s.stopDriver);
  const setSpeed = useLifeSimStore((s) => s.setSpeed);
  const setMode = useLifeSimStore((s) => s.setMode);
  const tapTile = useLifeSimStore((s) => s.tapTile);
  const [showHood, setShowHood] = useState(false);
  void version;

  useEffect(() => {
    init();
    startDriver();
    return () => stopDriver();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!world) return <View style={styles.root} />;
  const lot = activeLot(world);
  const hh = world.playerHouseholdId ? world.households[world.playerHouseholdId] : null;
  const lastLog = world.log[world.log.length - 1];

  return (
    <View style={styles.root}>
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.clock}>
            {DAY_NAMES[weekday(world.day) - 1]} · Day {world.day} · {clockLabel(world.minute)}
          </Text>
          <Text style={styles.funds}>§{hh?.funds ?? 0}</Text>
        </View>
        <View style={styles.controls}>
          <View style={styles.btnRow}>
            {([0, 1, 2, 3] as const).map((s) => (
              <Pressable
                key={s}
                onPress={() => setSpeed(s)}
                style={[styles.speedBtn, world.speed === s && styles.btnActive]}
              >
                <Text style={styles.btnText}>{s === 0 ? '⏸' : `${s}×`}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.btnRow}>
            {(['live', 'buy', 'build'] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={[styles.modeBtn, world.mode === m && styles.btnActive]}
              >
                <Text style={styles.btnText}>
                  {m === 'live' ? '▶ Live' : m === 'buy' ? '🛋 Buy' : '🔨 Build'}
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setShowHood(true)} style={styles.modeBtn}>
              <Text style={styles.btnText}>🗺</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Event ticker ────────────────────────────────────────────── */}
      {lastLog && (
        <View style={styles.ticker}>
          <Text style={styles.tickerText} numberOfLines={1}>
            {lastLog.icon} {lastLog.text}
          </Text>
        </View>
      )}

      {/* ── Lot ─────────────────────────────────────────────────────── */}
      {lot ? (
        <LotCanvas
          world={world}
          lot={lot}
          version={version}
          selectedSimId={world.selectedSimId}
          onTapTile={tapTile}
        />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No active lot. Open the map 🗺</Text>
        </View>
      )}

      {/* ── Mode panel ──────────────────────────────────────────────── */}
      {world.mode === 'live' && <LivePanel world={world} />}
      {world.mode === 'buy' && <BuyPanel />}
      {world.mode === 'build' && <BuildPanel />}

      <PieMenu />
      <DialogHost />
      <NeighborhoodSheet visible={showHood} onClose={() => setShowHood(false)} />
    </View>
  );
}

function NeighborhoodSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const world = useLifeSimStore((s) => s.world);
  const setActiveLot = useLifeSimStore((s) => s.setActiveLot);
  const moveHouseholdTo = useLifeSimStore((s) => s.moveHouseholdTo);
  const resetLifeSim = useLifeSimStore((s) => s.resetLifeSim);
  const [error, setError] = useState<string | null>(null);
  if (!world) return null;

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={styles.hoodScrim}>
        <View style={styles.hoodCard}>
          <Text style={styles.hoodTitle}>🗺 The Neighborhood</Text>
          <ScrollView style={{ maxHeight: 420 }}>
            {Object.values(world.lots).map((lot) => {
              const hh = lot.householdId ? world.households[lot.householdId] : null;
              const isActive = world.activeLotId === lot.id;
              const isPlayerHome = lot.householdId === world.playerHouseholdId;
              return (
                <View key={lot.id} style={[styles.lotRow, isActive && styles.lotRowActive]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lotName}>
                      {isPlayerHome ? '🎤 ' : ''}{lot.name}
                    </Text>
                    <Text style={styles.lotSub}>
                      {hh
                        ? `${hh.name} · ${hh.simIds.length} sim(s) · §${hh.funds}`
                        : `Empty lot · §${lot.price}`}
                    </Text>
                  </View>
                  {hh ? (
                    <Pressable
                      style={styles.lotBtn}
                      onPress={() => {
                        setActiveLot(lot.id);
                        onClose();
                      }}
                    >
                      <Text style={styles.lotBtnText}>{isActive ? 'Playing' : 'Play'}</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.lotBtn}
                      onPress={() => {
                        const err = moveHouseholdTo(lot.id);
                        setError(err);
                        if (!err) onClose();
                      }}
                    >
                      <Text style={styles.lotBtnText}>Move In</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </ScrollView>
          {error && <Text style={styles.hoodError}>{error}</Text>}
          <View style={styles.hoodFooter}>
            <Pressable style={styles.dangerBtn} onPress={resetLifeSim}>
              <Text style={styles.dangerText}>Reset LifeSim</Text>
            </Pressable>
            <Pressable style={styles.lotBtn} onPress={onClose}>
              <Text style={styles.lotBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING['2xl'],
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  clock: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs },
  funds: {
    color: COLORS.gold,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  controls: { alignItems: 'flex-end', gap: 4 },
  btnRow: { flexDirection: 'row', gap: 4 },
  speedBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface2,
  },
  modeBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface2,
  },
  btnActive: { backgroundColor: COLORS.primary },
  btnText: { color: COLORS.text, fontSize: FONTS.sizes.xs },
  ticker: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tickerText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.textMuted },
  hoodScrim: {
    flex: 1,
    backgroundColor: COLORS.scrim,
    justifyContent: 'flex-end',
  },
  hoodCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  hoodTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    marginBottom: SPACING.md,
  },
  lotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  lotRowActive: { backgroundColor: COLORS.glass },
  lotName: { color: COLORS.text, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.medium },
  lotSub: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  lotBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  lotBtnText: { color: '#FFF', fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold },
  hoodError: { color: COLORS.negative, fontSize: FONTS.sizes.xs, marginTop: 8 },
  hoodFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.base,
  },
  dangerBtn: {
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.negative,
  },
  dangerText: { color: COLORS.negative, fontSize: FONTS.sizes.xs },
});
