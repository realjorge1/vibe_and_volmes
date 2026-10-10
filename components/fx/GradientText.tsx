import React from 'react';
import { View, type ViewStyle } from 'react-native';
import {
  BlurMask,
  Canvas,
  Group,
  LinearGradient,
  Text as SkText,
  useFont,
  vec,
} from '@shopify/react-native-skia';
import { GRADIENTS, withAlpha } from '../../constants/theme';
import { Text } from '../ui/Typography';

const FONT_FILES = {
  '700': require('@expo-google-fonts/unbounded/700Bold/Unbounded_700Bold.ttf'),
  '800': require('@expo-google-fonts/unbounded/800ExtraBold/Unbounded_800ExtraBold.ttf'),
  '900': require('@expo-google-fonts/unbounded/900Black/Unbounded_900Black.ttf'),
} as const;

interface Props {
  text: string;
  size?: number;
  colors?: readonly string[];
  weight?: keyof typeof FONT_FILES;
  /** Soft bloom of the first gradient color behind the letters. */
  glow?: boolean;
  align?: 'left' | 'center' | 'right';
  /** Shrinks the text to fit when it would be wider than this. */
  maxWidth?: number;
  style?: ViewStyle;
}

/**
 * Display text filled with a gradient (Unbounded, drawn in Skia). Until the
 * font file is decoded it renders as plain text at the same size, so the
 * layout never jumps.
 */
export function GradientText({
  text,
  size = 40,
  colors = GRADIENTS.brand,
  weight = '800',
  glow = false,
  align = 'left',
  maxWidth,
  style,
}: Props) {
  const font = useFont(FONT_FILES[weight], size);
  const height = Math.ceil(size * 1.3);
  const baseline = Math.round(size * 1.02);
  const alignSelf = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';

  if (!font) {
    return (
      <View style={[{ height, justifyContent: 'center', alignSelf }, style]}>
        <Text
          variant="display"
          color={colors[0]}
          style={{ fontSize: size, lineHeight: height, fontWeight: weight }}
        >
          {text}
        </Text>
      </View>
    );
  }

  const pad = glow ? Math.round(size * 0.3) : 0;
  const natural = Math.ceil(font.measureText(text).width) + 2;
  const scale = maxWidth && natural > maxWidth ? maxWidth / natural : 1;
  const width = Math.ceil(natural * scale);
  const boxH = Math.ceil(height * scale);

  return (
    <View style={[{ width, height: boxH, alignSelf }, style]}>
      <Canvas
        style={{ position: 'absolute', left: -pad, top: -pad, width: width + pad * 2, height: boxH + pad * 2 }}
      >
        <Group transform={[{ scale }]} origin={vec(pad, pad)}>
          {glow && (
            <SkText x={pad} y={pad + baseline} text={text} font={font} color={withAlpha(colors[1] ?? colors[0], 0.55)}>
              <BlurMask blur={size * 0.22} style="normal" />
            </SkText>
          )}
          <SkText x={pad} y={pad + baseline} text={text} font={font}>
            <LinearGradient
              start={vec(pad, pad)}
              end={vec(pad + natural, pad + height)}
              colors={[...colors]}
            />
          </SkText>
        </Group>
      </Canvas>
    </View>
  );
}
