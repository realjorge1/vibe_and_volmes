import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PhotoPick } from '../../../systems/social/postFromPhone';
import { T } from '../T';
import { useGallery, usePickSelection } from './useGallery';
import { AccessBanner, GalleryGrid } from './Gallery';
import type { PickerTheme } from './LocationPicker';

/**
 * A full-screen "Recents" picker with numbered multi-select: tap to add,
 * tap again to remove, then Add. The phone's real photos when they're
 * shared, the game's own roll otherwise.
 */
export function GalleryPage({
  seed,
  app,
  theme,
  max,
  onDone,
  onClose,
  doneLabel = 'Add',
}: {
  seed: string;
  app: string;
  theme: PickerTheme;
  max: number;
  onDone: (picks: PhotoPick[]) => void;
  onClose: () => void;
  doneLabel?: string;
}) {
  const insets = useSafeAreaInsets();
  const gallery = useGallery(seed);
  const sel = usePickSelection(gallery.items, max, { multi: true, autoFirst: false, toggle: true });
  const n = sel.picked.length;
  return (
    <View style={[styles.fill, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={theme.text} />
        </Pressable>
        <View style={styles.title}>
          <T size={17} weight="700" color={theme.text}>
            Recents
          </T>
          <Ionicons name="chevron-down" size={15} color={theme.text} />
        </View>
        <Pressable
          onPress={() => onDone(sel.picked)}
          disabled={n === 0}
          style={[styles.done, { backgroundColor: theme.accent }, n === 0 && styles.dim]}
        >
          <T size={14} weight="700" color="#FFFFFF">
            {n > 0 ? `${doneLabel} (${n})` : doneLabel}
          </T>
        </Pressable>
      </View>
      <AccessBanner access={gallery.access} app={app} text={theme.text} muted={theme.muted} accent={theme.accent} onAllow={gallery.allow} />
      <GalleryGrid
        items={gallery.items}
        multi
        order={sel.order}
        focus={null}
        onPress={sel.press}
        onEndReached={gallery.real ? gallery.loadMore : undefined}
        accent={theme.accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, height: 54 },
  title: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  done: { paddingHorizontal: 16, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.5 },
});
