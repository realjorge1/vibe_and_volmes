import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING } from '../../constants/theme';
import { ScreenBackdrop } from '../fx/Backdrop';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  /** Color of the stage light when this screen paints its own backdrop. */
  tint?: string;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

/**
 * A screen on the stage: transparent over the ambient light the tabs share,
 * or painting its own when it stands alone (modals, the song flow).
 */
export function Screen({
  children,
  scroll = false,
  padded = true,
  tint,
  style,
  contentStyle,
}: Props) {
  const inner = (
    <View style={[padded && styles.padded, !scroll && styles.flex, contentStyle]}>
      {children}
    </View>
  );

  return (
    <View style={styles.flex}>
      <ScreenBackdrop tint={tint} />
      <SafeAreaView style={[styles.safe, style]} edges={['top']}>
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {inner}
          </ScrollView>
        ) : (
          inner
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  padded: { paddingHorizontal: SPACING.lg - 4 },
  scrollContent: { paddingBottom: SPACING['3xl'] },
});
