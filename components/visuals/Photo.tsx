import React from 'react';
import type { StyleProp, ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import type { StockPhoto } from '../../data/photos/photoPack';
import { ANIMATIONS_ENABLED } from '../../constants/theme';

interface Props {
  photo: StockPhoto;
  style?: StyleProp<ImageStyle>;
  /** Blur radius, for backdrops and "blurry screenshot" posts. */
  blur?: number;
  fit?: 'cover' | 'contain';
  priority?: 'low' | 'normal' | 'high';
}

/**
 * A photo from the pack, cropped around its subject (cover crops aim at the
 * photo's focus point) with its average color showing while it decodes.
 */
export function Photo({ photo, style, blur, fit = 'cover', priority }: Props) {
  return (
    <Image
      source={photo.src}
      style={[{ backgroundColor: photo.tint }, style]}
      contentFit={fit}
      contentPosition={{ left: `${Math.round(photo.focus[0] * 100)}%`, top: `${Math.round(photo.focus[1] * 100)}%` }}
      blurRadius={blur}
      transition={ANIMATIONS_ENABLED ? 100 : null}
      recyclingKey={photo.key}
      cachePolicy="memory-disk"
      priority={priority}
      accessibilityIgnoresInvertColors
    />
  );
}
