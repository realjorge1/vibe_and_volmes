import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../constants/theme';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  style,
  contentStyle,
}: Props) {
  const inner = (
    <View style={[padded && styles.padded, !scroll && styles.flex, contentStyle]}>
      {children}
    </View>
  );

  return (
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
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  padded: { paddingHorizontal: SPACING.lg },
  // Clearance for the flat bottom tab bar plus breathing room.
  scrollContent: { paddingBottom: SPACING['3xl'] * 1.8 },
});
