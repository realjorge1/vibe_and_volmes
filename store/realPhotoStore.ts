import { create } from 'zustand';
import { saveData, loadData } from '../database/gameRepository';
import { clearRealPhotos, registerRealPhotos, unregisterRealPhoto, type RealPhoto } from '../systems/social/realPhotos';
import { copyExists, deleteCopy, deleteOrphanCopies } from '../systems/social/deviceGallery';
import { postPhotoKeys } from '../systems/visuals/photoIndex';
import { useSocialStore } from './socialStore';

/**
 * The player's real photos that are in posts (private copies, newest first),
 * and when the artist last posted (any app) for the daily boost cap.
 * Retiring a career deletes the copies: the next artist starts with an
 * empty profile.
 */

interface RealPhotoState {
  photos: RealPhoto[];
  /** When the artist's posts went up (ms), newest first, last two days only. */
  postedAt: number[];
  /** The phone's photo-access dialog was shown once: after a "no", the game's own roll is used. */
  asked: boolean;
}

interface RealPhotoActions {
  add: (photos: RealPhoto[]) => void;
  /** A post went up: the boost cap counts it. */
  notePost: (at: number) => void;
  markAsked: () => void;
  load: () => void;
  save: () => void;
  reset: () => void;
}

const KEY = 'realPhotos';
const KEEP_MS = 2 * 86_400_000;

export const useRealPhotoStore = create<RealPhotoState & RealPhotoActions>((set, get) => ({
  photos: [],
  postedAt: [],
  asked: false,

  add(photos) {
    if (photos.length === 0) return;
    registerRealPhotos(photos);
    set((s) => ({ photos: [...photos, ...s.photos] }));
    get().save();
  },

  notePost(at) {
    set((s) => ({ postedAt: [at, ...s.postedAt.filter((t) => at - t < KEEP_MS)] }));
    get().save();
  },

  markAsked() {
    set({ asked: true });
    get().save();
  },

  /** Call after the social store loads: copies no post uses any more are deleted. */
  load() {
    const saved = loadData<RealPhotoState>(KEY);
    const all = saved?.photos ?? [];
    const used = new Set(useSocialStore.getState().authored.flatMap((p) => postPhotoKeys(p.media)));
    const keep = all.filter((p) => used.has(p.key) && copyExists(p.uri));
    for (const p of all) if (!keep.includes(p)) deleteCopy(p.uri);
    deleteOrphanCopies(keep.map((p) => p.uri));
    clearRealPhotos();
    registerRealPhotos(keep);
    set({ photos: keep, postedAt: saved?.postedAt ?? [], asked: saved?.asked ?? false });
    if (keep.length !== all.length) get().save();
  },

  save() {
    const { photos, postedAt, asked } = get();
    saveData(KEY, { photos, postedAt, asked });
  },

  reset() {
    for (const p of get().photos) {
      unregisterRealPhoto(p.key);
      deleteCopy(p.uri);
    }
    deleteOrphanCopies([]);
    clearRealPhotos();
    // Whether the phone was asked for photo access belongs to the phone, not the career.
    set({ photos: [], postedAt: [] });
    get().save();
  },
}));
