/**
 * Modal host for simulation dialogs (chance cards, job offers, the baby
 * question, Reaper pleas). Time pauses while one is open — decisions deserve
 * a stopped clock.
 */

import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLifeSimStore } from '../../store/lifeSimStore';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';

export function DialogHost() {
  const version = useLifeSimStore((s) => s.version);
  const world = useLifeSimStore((s) => s.world);
  const resolve = useLifeSimStore((s) => s.resolveDialog);
  void version;

  const dialog = world?.dialogs[0];
  if (!dialog) return null;

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <Text style={styles.title}>{dialog.title}</Text>
          <Text style={styles.body}>{dialog.body}</Text>
          <View style={styles.options}>
            {dialog.options.map((opt) => (
              <Pressable
                key={opt.id}
                style={styles.optionBtn}
                onPress={() => resolve(dialog.id, opt.id)}
              >
                <Text style={styles.optionText}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.lg,
  },
  title: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    marginBottom: SPACING.sm,
  },
  body: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.base,
    lineHeight: 22,
    marginBottom: SPACING.base,
  },
  options: { gap: 8 },
  optionBtn: {
    backgroundColor: COLORS.surface3,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionText: { color: COLORS.text, fontSize: FONTS.sizes.sm },
});
