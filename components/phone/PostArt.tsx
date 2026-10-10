import React, { useState } from 'react';
import { View, StyleSheet, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { SocialPost } from '../../types/social';
import { Text } from '../ui/Typography';
import { shade } from '../../constants/theme';
import { artGlyph, artPalette, hashOf, mediaCaption } from './kit';

type Glyph = keyof typeof Ionicons.glyphMap;

interface Props {
  post: SocialPost;
  /**
   * `photo`: a feed image with its scene written small along the bottom.
   * `clip`: a full-screen short, the scene under the subject.
   * `thumb`: art only (grids, thumbnails).
   * `backdrop`: just the lit gradient (profile banners).
   * `cover`: art only, with the subject even on a text post (news photos).
   */
  variant?: 'photo' | 'clip' | 'thumb' | 'backdrop' | 'cover';
  style?: StyleProp<ViewStyle>;
}

/**
 * The picture a post carries. The sim describes its media in words, so the
 * image is painted from the post itself: a lit gradient in the post's mood,
 * soft stage lights placed by its id, and the subject as a clay glyph. Posts
 * with no media become a text card, the way people post words as images.
 */
export function PostArt({ post, variant = 'photo', style }: Props) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0 && (width !== box.w || height !== box.h)) setBox({ w: width, h: height });
  };

  const [a, b, c] = artPalette(post);
  const h = hashOf(post.id);
  const side = Math.min(box.w, box.h);
  const glyphSize = Math.round(side * (variant === 'clip' ? 0.24 : 0.3));
  const depth = Math.max(1, Math.round(glyphSize * 0.06));
  const bare = variant === 'backdrop';
  const words = !post.media && !bare && variant !== 'cover';
  const scene = post.media ? mediaCaption(post.media.description).text : '';

  // Two soft lights, placed per post.
  const l1 = { left: `${(h % 50) - 10}%`, top: `${((h >> 5) % 40) - 15}%` } as const;
  const l2 = { right: `${((h >> 9) % 40) - 20}%`, bottom: `${((h >> 13) % 30) - 10}%` } as const;

  return (
    <View style={[styles.frame, style]} onLayout={onLayout}>
      <LinearGradient
        colors={[a, b, c]}
        start={{ x: (h % 10) / 10, y: 0 }}
        end={{ x: 1 - ((h >> 4) % 10) / 10, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.light, l1, { width: side * 0.9, height: side * 0.9, borderRadius: side }]} />
      <View style={[styles.shadow, l2, { width: side * 0.8, height: side * 0.8, borderRadius: side }]} />
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.42)']}
        start={{ x: 0.5, y: 0.45 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {box.w > 0 && words ? (
        <View style={[StyleSheet.absoluteFill, styles.center, { padding: side * 0.1 }]}>
          <Text
            variant="heading"
            weight="black"
            color="#FFFFFF"
            center
            numberOfLines={variant === 'thumb' ? 4 : 7}
            style={[
              styles.words,
              {
                fontSize: Math.max(10, side * (variant === 'thumb' ? 0.085 : 0.066)),
                lineHeight: Math.max(13, side * (variant === 'thumb' ? 0.11 : 0.088)),
              },
            ]}
          >
            {post.content}
          </Text>
        </View>
      ) : null}

      {box.w > 0 && !words && !bare ? (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <View style={styles.center}>
            {Array.from({ length: depth }, (_, i) => (
              <Ionicons
                key={i}
                name={artGlyph(post) as Glyph}
                size={glyphSize}
                color={shade(c, -0.3)}
                style={[styles.layer, { transform: [{ translateY: i + 1 }] }]}
              />
            ))}
            <Ionicons name={artGlyph(post) as Glyph} size={glyphSize} color="rgba(255,255,255,0.94)" />
          </View>
          {variant === 'clip' && scene ? (
            <Text variant="caption" color="rgba(255,255,255,0.72)" center style={styles.clipScene}>
              {scene}
            </Text>
          ) : null}
        </View>
      ) : null}

      {variant === 'photo' && scene ? (
        <Text
          variant="caption"
          color="rgba(255,255,255,0.8)"
          numberOfLines={2}
          style={styles.photoScene}
        >
          {scene}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: '#111' },
  light: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.16)' },
  shadow: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.22)' },
  center: { alignItems: 'center', justifyContent: 'center' },
  layer: { position: 'absolute' },
  words: {
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  clipScene: { marginTop: 18, paddingHorizontal: 36, lineHeight: 19 },
  photoScene: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
    fontSize: 12,
    lineHeight: 16,
  },
});
