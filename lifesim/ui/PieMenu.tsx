/**
 * The classic click-anything pie menu, rendered as a centered radial-ish
 * option sheet (touch-friendly). Options come pre-filtered from the store.
 */

import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLifeSimStore } from '../../store/lifeSimStore';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';

export function PieMenu() {
  const pie = useLifeSimStore((s) => s.pie);
  const choose = useLifeSimStore((s) => s.choosePieOption);
  const close = useLifeSimStore((s) => s.closePie);

  if (!pie) return null;
  return (
    <Modal transparent animationType="fade" visible onRequestClose={close}>
      <Pressable style={styles.scrim} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.title}>
            {pie.icon} {pie.title}
          </Text>
          <ScrollView style={{ maxHeight: 320 }}>
            <View style={styles.grid}>
              {pie.options.map((opt) => (
                <Pressable
                  key={opt.id}
                  disabled={!!opt.disabled}
                  onPress={() => choose(opt.id)}
                  style={[styles.option, opt.disabled ? styles.optionDisabled : null]}
                >
                  <Text style={styles.optionIcon}>{opt.icon}</Text>
                  <Text
                    style={[styles.optionLabel, opt.disabled ? styles.optionLabelDisabled : null]}
                    numberOfLines={2}
                  >
                    {opt.label}
                  </Text>
                  {opt.disabled && <Text style={styles.reason}>{opt.disabled}</Text>}
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: COLORS.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    width: '84%',
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.base,
  },
  title: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  option: {
    width: '30%',
    minWidth: 92,
    backgroundColor: COLORS.surface3,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  optionDisabled: { opacity: 0.45 },
  optionIcon: { fontSize: 22, marginBottom: 4 },
  optionLabel: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xs,
    textAlign: 'center',
  },
  optionLabelDisabled: { color: COLORS.textMuted },
  reason: { color: COLORS.negative, fontSize: 9, marginTop: 2 },
});
