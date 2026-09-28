import { create } from 'zustand';
import type { SocialPost, TrendingTopic, Platform } from '../types/social';
import { saveData, loadData } from '../database/gameRepository';

interface SocialStoreState {
  feed: SocialPost[];
  trending: TrendingTopic[];
  activePlatform: Platform;
  postHistory: SocialPost[];    // all-time posts for "memory" system
  lastGeneratedWeek: number;
  aiEnhancing: boolean;         // Phase 4: async feed upgrade in flight
  /** Post the thread-modal is focused on (session only). */
  focusedPost: SocialPost | null;
  /** Account id the profile-modal is focused on (session only). */
  focusedAccountId: string | null;
}

interface SocialStoreActions {
  setFeed: (posts: SocialPost[]) => void;
  setTrending: (topics: TrendingTopic[]) => void;
  setActivePlatform: (platform: Platform) => void;
  addToHistory: (posts: SocialPost[]) => void;
  setLastGeneratedWeek: (week: number) => void;
  setAiEnhancing: (v: boolean) => void;
  setFocusedPost: (post: SocialPost | null) => void;
  setFocusedAccountId: (id: string | null) => void;
  getHistoryForEvent: (eventId: string) => SocialPost[];
  save: () => void;
  load: () => void;
  reset: () => void;
}

type SocialStore = SocialStoreState & SocialStoreActions;

export const useSocialStore = create<SocialStore>((set, get) => ({
  feed: [],
  trending: [],
  activePlatform: 'chirper',
  postHistory: [],
  lastGeneratedWeek: 0,
  aiEnhancing: false,
  focusedPost: null,
  focusedAccountId: null,

  setFeed(posts) {
    set({ feed: posts });
  },

  setTrending(topics) {
    set({ trending: topics });
  },

  setActivePlatform(platform) {
    set({ activePlatform: platform });
  },

  addToHistory(posts) {
    const history = [...posts, ...get().postHistory].slice(0, 200);
    set({ postHistory: history });
  },

  setLastGeneratedWeek(week) {
    set({ lastGeneratedWeek: week });
  },

  setAiEnhancing(v) {
    set({ aiEnhancing: v });
  },

  setFocusedPost(post) {
    set({ focusedPost: post });
  },

  setFocusedAccountId(id) {
    set({ focusedAccountId: id });
  },

  getHistoryForEvent(eventId) {
    return get().postHistory.filter((p) => p.relatedEventId === eventId);
  },

  save() {
    const { postHistory, lastGeneratedWeek } = get();
    saveData('social', { postHistory: postHistory.slice(0, 50), lastGeneratedWeek });
  },

  load() {
    const saved = loadData<{ postHistory: SocialPost[]; lastGeneratedWeek: number }>('social');
    if (saved) {
      set({
        postHistory: saved.postHistory ?? [],
        lastGeneratedWeek: saved.lastGeneratedWeek ?? 0,
      });
    }
  },

  reset() {
    set({
      feed: [],
      trending: [],
      postHistory: [],
      lastGeneratedWeek: 0,
      aiEnhancing: false,
      focusedPost: null,
      focusedAccountId: null,
    });
  },
}));
