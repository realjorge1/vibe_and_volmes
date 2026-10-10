import React from 'react';
import { type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING } from '../../constants/theme';

interface Props {
  /** Vertical margin around the rule. */
  spacing?: number;
  style?: ViewStyle;
}

/** A hairline that fades out at both ends. */
export function Divider({ spacing = SPACING.base, style }: Props) {
  return (
    <LinearGradient
      colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={[{ height: 1, marginVertical: spacing }, style]}
    />
  );
}
