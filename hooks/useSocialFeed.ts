import { useMemo } from 'react';
import type { Platform } from '../types/social';
import { useSocialStore } from '../store/socialStore';

export function useSocialFeed() {
  const feed = useSocialStore((s) => s.feed);
  const trending = useSocialStore((s) => s.trending);
  const activePlatform = useSocialStore((s) => s.activePlatform);
  const setActivePlatform = useSocialStore((s) => s.setActivePlatform);
  const aiEnhancing = useSocialStore((s) => s.aiEnhancing);

  const visiblePosts = useMemo(
    () => feed.filter((p) => p.platform === activePlatform),
    [feed, activePlatform]
  );

  const setPlatform = (p: Platform) => setActivePlatform(p);

  return {
    visiblePosts,
    trending,
    activePlatform,
    setPlatform,
    aiEnhancing,
    totalPosts: feed.length,
  };
}
