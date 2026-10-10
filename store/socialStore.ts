import { create } from 'zustand';
import type { MyComment, SocialPost, TrendingTopic, Platform } from '../types/social';
import { saveData, loadData } from '../database/gameRepository';

interface SocialStoreState {
  feed: SocialPost[];
  trending: TrendingTopic[];
  activePlatform: Platform;
  postHistory: SocialPost[];    // all-time posts for "memory" system
  lastGeneratedWeek: number;
  aiEnhancing: boolean;         // Phase 4: async feed upgrade in flight
  /**
   * Newest post id each phone app showed when it was last opened. The feed is
   * newest-first, so everything above it is unread — the icon's badge.
   */
  seenTop: Partial<Record<Platform, string>>;
  /** What the artist posted themselves from the phone apps, newest first. */
  authored: SocialPost[];
  /** Named artist id -> the world engine artist whose life they live (systems/social/celebFeed). */
  castLinks: Record<string, string>;
  /** What the artist wrote in comment sections, newest first (people answer them). */
  myComments: MyComment[];
}

interface SocialStoreActions {
  setFeed: (posts: SocialPost[]) => void;
  setTrending: (topics: TrendingTopic[]) => void;
  setActivePlatform: (platform: Platform) => void;
  addToHistory: (posts: SocialPost[]) => void;
  setLastGeneratedWeek: (week: number) => void;
  setAiEnhancing: (v: boolean) => void;
  /** Opening an app reads this week's posts on it, clearing its badge. */
  markSeen: (platform: Platform) => void;
  addAuthored: (post: SocialPost) => void;
  setCastLinks: (links: Record<string, string>) => void;
  addMyComment: (c: MyComment) => void;
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
  seenTop: {},
  authored: [],
  castLinks: {},
  myComments: [],

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

  markSeen(platform) {
    const top = get().feed.find((p) => p.platform === platform)?.id;
    if (!top || get().seenTop[platform] === top) return;
    set((s) => ({ seenTop: { ...s.seenTop, [platform]: top } }));
    get().save();
  },

  addAuthored(post) {
    set((s) => ({ authored: [post, ...s.authored].slice(0, 80) }));
    get().save();
  },

  setCastLinks(links) {
    set({ castLinks: links });
    get().save();
  },

  addMyComment(c) {
    // Keep the post along only while it's needed: the artist's own posts are always findable.
    set((s) => ({ myComments: [c, ...s.myComments].slice(0, 300) }));
    get().save();
  },

  getHistoryForEvent(eventId) {
    return get().postHistory.filter((p) => p.relatedEventId === eventId);
  },

  save() {
    const { postHistory, lastGeneratedWeek, seenTop, authored, castLinks, myComments } = get();
    saveData('social', { postHistory: postHistory.slice(0, 50), lastGeneratedWeek, seenTop, authored, castLinks, myComments });
  },

  load() {
    const saved = loadData<{
      postHistory: SocialPost[];
      lastGeneratedWeek: number;
      seenTop?: Partial<Record<Platform, string>>;
      authored?: SocialPost[];
      castLinks?: Record<string, string>;
      myComments?: MyComment[];
    }>('social');
    if (saved) {
      set({
        postHistory: saved.postHistory ?? [],
        lastGeneratedWeek: saved.lastGeneratedWeek ?? 0,
        seenTop: saved.seenTop ?? {},
        authored: saved.authored ?? [],
        castLinks: saved.castLinks ?? {},
        myComments: saved.myComments ?? [],
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
      seenTop: {},
      authored: [],
      castLinks: {},
      myComments: [],
    });
  },
}));
