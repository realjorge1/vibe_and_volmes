import React, { useCallback, useRef, useState } from 'react';
import { FlatList, StyleSheet, View, type LayoutChangeEvent, type ViewToken } from 'react-native';
import type { SocialPost } from '../../types/social';

interface Props {
  posts: SocialPost[];
  start?: number;
  /** False while the pager's tab is hidden: nothing plays. */
  visible: boolean;
  renderItem: (post: SocialPost, active: boolean, height: number) => React.ReactNode;
  onEndReached?: () => void;
  empty?: React.ReactNode;
}

/**
 * One short video per screen, snapping like TikTok or Reels. Only the one in
 * view is active (playing, with sound); the rest rest on their first frame.
 */
export function ShortsPager({ posts, start = 0, visible, renderItem, onEndReached, empty }: Props) {
  const [height, setHeight] = useState(0);
  const [index, setIndex] = useState(start);

  const onLayout = (e: LayoutChangeEvent) => {
    // A hidden tab can report 0; keep the last real height so the scroll survives.
    const h = Math.round(e.nativeEvent.layout.height);
    if (h > 0 && h !== height) setHeight(h);
  };

  // FlatList needs one stable callback for its whole life.
  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((v) => v.isViewable);
    if (first?.index != null) setIndex(first.index);
  }).current;
  const config = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const render = useCallback(
    ({ item, index: i }: { item: SocialPost; index: number }) => (
      <View style={{ height }}>{renderItem(item, visible && i === index, height)}</View>
    ),
    [renderItem, visible, index, height]
  );

  return (
    <View style={styles.fill} onLayout={onLayout}>
      {height > 0 ? (
        posts.length === 0 ? (
          empty ?? null
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(p) => p.id}
            renderItem={render}
            pagingEnabled
            snapToInterval={height}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
            initialScrollIndex={Math.min(start, Math.max(0, posts.length - 1))}
            onViewableItemsChanged={onViewable}
            viewabilityConfig={config}
            onEndReached={onEndReached}
            onEndReachedThreshold={2}
            extraData={`${index}:${visible}`}
            initialNumToRender={2}
            maxToRenderPerBatch={3}
            windowSize={5}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
});
