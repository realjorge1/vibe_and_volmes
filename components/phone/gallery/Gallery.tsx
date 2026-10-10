import React from 'react';
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions, type ImageStyle, type StyleProp } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { GalleryAccess } from '../../../systems/social/deviceGallery';
import { pickKey, type PhotoPick } from '../../../systems/social/postFromPhone';
import { ANIMATIONS_ENABLED } from '../../../constants/theme';
import { Photo } from '../../visuals/Photo';
import { T } from '../T';

/** A picked photo: one of the game's, or a real one straight from the phone's gallery. */
export function PickImage({ pick, style, fit = 'cover' }: { pick: PhotoPick; style?: StyleProp<ImageStyle>; fit?: 'cover' | 'contain' }) {
  if (pick.kind === 'stock') return <Photo photo={pick.photo} style={style} fit={fit} />;
  return (
    <Image
      source={{ uri: pick.asset.uri }}
      style={[styles.dark, style]}
      contentFit={fit}
      recyclingKey={pick.asset.id}
      cachePolicy="memory-disk"
      transition={ANIMATIONS_ENABLED ? 100 : null}
      accessibilityIgnoresInvertColors
    />
  );
}

export function pickSize(p: PhotoPick): { w: number; h: number } {
  return p.kind === 'stock' ? { w: p.photo.w, h: p.photo.h } : { w: p.asset.w, h: p.asset.h };
}

interface GridProps {
  items: readonly PhotoPick[];
  /** Numbered badges (multi-select) or a veil on the one in view. */
  multi: boolean;
  order: (item: PhotoPick) => number;
  focus: PhotoPick | null;
  onPress: (item: PhotoPick) => void;
  onEndReached?: () => void;
  columns?: number;
  /** Cell height / width (TikTok's picker is taller than square). */
  aspect?: number;
  accent: string;
  header?: React.ReactElement | null;
}

/** The camera-roll grid every create flow uses. */
export function GalleryGrid({ items, multi, order, focus, onPress, onEndReached, columns = 4, aspect = 1, accent, header }: GridProps) {
  const { width } = useWindowDimensions();
  const cell = (width - (columns - 1)) / columns;
  const focusKey = focus ? pickKey(focus) : null;
  return (
    <FlatList
      data={items as PhotoPick[]}
      keyExtractor={pickKey}
      extraData={[focusKey, multi, order]}
      numColumns={columns}
      columnWrapperStyle={styles.row}
      ListHeaderComponent={header}
      onEndReached={onEndReached}
      onEndReachedThreshold={1.5}
      initialNumToRender={24}
      windowSize={7}
      renderItem={({ item }) => {
        const n = order(item);
        const inView = pickKey(item) === focusKey;
        return (
          <Pressable onPress={() => onPress(item)}>
            <PickImage pick={item} style={{ width: cell, height: cell * aspect }} />
            {inView ? <View style={styles.veil} /> : null}
            {multi ? (
              <View style={[styles.badge, n >= 0 && { backgroundColor: accent, borderColor: '#FFFFFF' }]}>
                {n >= 0 ? (
                  <T size={12} weight="700" color="#FFFFFF">
                    {n + 1}
                  </T>
                ) : null}
              </View>
            ) : null}
          </Pressable>
        );
      }}
      showsVerticalScrollIndicator={false}
    />
  );
}

/**
 * The quiet row above the grid when the phone's photos aren't shared: the
 * game's own roll shows, and one tap asks again (or opens settings).
 */
export function AccessBanner({
  access,
  app,
  text,
  muted,
  accent,
  onAllow,
}: {
  access: GalleryAccess;
  app: string;
  text: string;
  muted: string;
  accent: string;
  onAllow: () => void;
}) {
  if (access === 'checking' || access === 'all' || access === 'unavailable') return null;
  const limited = access === 'limited';
  return (
    <Pressable onPress={onAllow} style={styles.banner}>
      <Ionicons name={limited ? 'images-outline' : 'lock-closed-outline'} size={20} color={text} />
      <View style={styles.bannerText}>
        <T size={14} weight="600" color={text}>
          {limited ? 'You’ve shared some of your photos' : 'Allow access to your photos'}
        </T>
        <T size={12} color={muted} numberOfLines={2}>
          {limited ? `Pick more photos ${app} can use.` : `${app} is showing its own photos. Your real ones only stay on this phone.`}
        </T>
      </View>
      <T size={14} weight="700" color={accent}>
        {limited ? 'Manage' : access === 'blocked' ? 'Settings' : 'Allow'}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dark: { backgroundColor: '#1C1C1E' },
  row: { gap: 1, marginBottom: 1 },
  veil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.4)' },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  bannerText: { flex: 1, gap: 2 },
});
