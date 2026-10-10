import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { Player } from '../../types/player';
import { useProgressionStore } from '../../store/progressionStore';
import { useIdentityStore } from '../../store/identityStore';
import { levelInfo, levelProgress } from '../../constants/progression';
import { COLORS, RADIUS, SPACING, shade, withAlpha } from '../../constants/theme';
import { formatFanCount, formatMoney } from '../../utils/statHelpers';
import { formatWeek } from '../../utils/formatters';
import { Text } from '../ui/Typography';
import { PressableScale } from '../ui/PressableScale';
import { RingGauge } from '../fx/RingGauge';
import { AnimatedNumber } from '../fx/AnimatedNumber';

type Glyph = keyof typeof Ionicons.glyphMap;

interface Props {
  player: Player;
  week: number;
  age: number;
  onPressAvatar: () => void;
  onPressSettings: () => void;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function StatPill({
  icon,
  color,
  label,
  value,
  format,
  meter,
}: {
  icon: string;
  color: string;
  label: string;
  value: number;
  format: (n: number) => string;
  /** 0..1 — draws a thin glowing meter along the bottom. */
  meter?: number;
}) {
  return (
    <View style={styles.pill}>
      <LinearGradient
        colors={[withAlpha(color, 0.16), 'rgba(255,255,255,0.03)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.pillTop}>
        <View style={[styles.pillIcon, { backgroundColor: withAlpha(color, 0.2) }]}>
          <Ionicons name={icon as Glyph} size={12} color={color} />
        </View>
        <Text variant="label" color={COLORS.textMuted} style={styles.pillLabel}>
          {label}
        </Text>
      </View>
      <AnimatedNumber
        value={value}
        format={format}
        variant="metric"
        style={styles.pillValue}
        numberOfLines={1}
      />
      {meter !== undefined && (
        <View style={styles.meterTrack}>
          <View
            style={[
              styles.meterFill,
              {
                width: `${Math.round(Math.max(0, Math.min(1, meter)) * 100)}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

/**
 * The Deck's heads-up display: avatar inside a glowing level ring, name,
 * week and age chips, and three live stat pills whose numbers roll.
 */
export function DeckHeader({ player, week, age, onPressAvatar, onPressSettings }: Props) {
  const xp = useProgressionStore((s) => s.xp);
  const era = useIdentityStore((s) => s.eras.find((e) => e.id === s.currentEraId) ?? null);
  const prog = levelProgress(xp);
  const info = levelInfo(prog.level);
  const energy = Math.round(player.stats.energy);
  const energyColor = energy < 25 ? COLORS.negative : energy < 50 ? COLORS.warning : COLORS.positive;

  return (
    <View style={styles.header}>
      <View style={styles.top}>
        <PressableScale onPress={onPressAvatar} scaleTo={0.92}>
          <RingGauge progress={prog.ratio} size={58} stroke={4} color={info.color}>
            <View style={styles.avatar}>
              <LinearGradient
                colors={[shade(info.color, 0.25), shade(info.color, -0.55)]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text variant="title" style={styles.initials}>
                {initials(player.artistName)}
              </Text>
            </View>
          </RingGauge>
          <View style={[styles.lvBadge, { backgroundColor: info.color }]}>
            <Text variant="label" color={COLORS.bg} style={styles.lvText}>
              {prog.level}
            </Text>
          </View>
        </PressableScale>

        <View style={styles.identity}>
          <View style={styles.chips}>
            <View style={[styles.chip, styles.chipLive]}>
              <View style={styles.liveDot} />
              <Text variant="label" color={COLORS.text} style={styles.chipText}>
                {formatWeek(week).toUpperCase()}
              </Text>
            </View>
            <View style={styles.chip}>
              <Text variant="label" color={COLORS.textSecondary} style={styles.chipText}>
                AGE {age}
              </Text>
            </View>
            {era ? (
              <View style={[styles.chip, { flexShrink: 1, borderColor: withAlpha(era.color, 0.55), backgroundColor: withAlpha(era.color, 0.12) }]}>
                <Text variant="label" color={era.color} numberOfLines={1} style={styles.chipText}>
                  {`${era.name.toUpperCase()} ERA`}
                </Text>
              </View>
            ) : null}
          </View>
          <Text variant="title" numberOfLines={1} adjustsFontSizeToFit style={styles.name}>
            {player.artistName}
          </Text>
          <Text variant="caption" color={info.color} numberOfLines={1} weight="semibold">
            {info.title}
          </Text>
        </View>

        <PressableScale onPress={onPressSettings} style={styles.iconBtn} scaleTo={0.9}>
          <Ionicons name="options" size={19} color={COLORS.textSecondary} />
        </PressableScale>
      </View>

      <View style={styles.stats}>
        <StatPill icon="people" color={COLORS.accent} label="FANS" value={player.stats.fans} format={formatFanCount} />
        <StatPill icon="cash" color={COLORS.gold} label="CASH" value={player.money} format={formatMoney} />
        <StatPill
          icon="flash"
          color={energyColor}
          label="ENERGY"
          value={energy}
          format={(n) => `${n}%`}
          meter={energy / 100}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SPACING.base + 4,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: 16, lineHeight: 20, letterSpacing: 0 },
  lvBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lvText: { fontSize: 10, letterSpacing: 0 },
  identity: { flex: 1 },
  chips: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipLive: {
    backgroundColor: withAlpha(COLORS.primary, 0.22),
    borderColor: withAlpha(COLORS.primary, 0.5),
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.positive,
  },
  chipText: { fontSize: 9.5, letterSpacing: 1.1 },
  name: { fontSize: 20, lineHeight: 26 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  pill: {
    flex: 1,
    borderRadius: RADIUS.md + 2,
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
    backgroundColor: 'rgba(20,17,42,0.55)',
  },
  pillTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLabel: { fontSize: 9, letterSpacing: 1.2 },
  pillValue: { fontSize: 18, lineHeight: 24, marginTop: 6 },
  meterTrack: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 5,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  meterFill: { height: 2, borderRadius: 1 },
});
