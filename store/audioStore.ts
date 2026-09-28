import { create } from 'zustand';
import type {
  SongDraft,
  ProducedSong,
  MixSettings,
  Lyrics,
  VocalRecording,
  CreationStep,
  FeatureCredit,
  ReleaseRollout,
} from '../types/audio';
import { DEFAULT_MIX, withMixDefaults } from '../constants/audioConfig';
import { saveData, loadData } from '../database/gameRepository';
import {
  cleanupOrphanRecordings,
  deleteRecording,
} from '../audio/recording/recorder';
import { deleteExport } from '../audio/export/exporter';

interface AudioStoreState {
  draft: SongDraft | null;
  producedSongs: ProducedSong[];
}

interface AudioStoreActions {
  startDraft: () => void;
  discardDraft: () => void;
  patchDraft: (p: Partial<SongDraft>) => void;
  setStep: (step: CreationStep) => void;
  setBeat: (beatId: string) => void;
  setLyrics: (lyrics: Lyrics | null) => void;
  setRecording: (rec: VocalRecording | null) => void;
  setMix: (mix: MixSettings) => void;
  setTitle: (title: string) => void;
  setCover: (coverArtId: string) => void;
  setRollout: (rollout: ReleaseRollout) => void;
  setMarketingBudget: (amount: number) => void;
  toggleCollaborator: (feature: FeatureCredit) => void;
  commitSong: (song: ProducedSong) => void;
  markExported: (songId: string, path: string) => void;
  getSong: (songId: string) => ProducedSong | null;
  latestSong: () => ProducedSong | null;
  save: () => void;
  load: () => void;
  reset: () => void;
}

type AudioStore = AudioStoreState & AudioStoreActions;

function newDraft(): SongDraft {
  const now = Date.now();
  return {
    id: `draft-${now}`,
    step: 'beat',
    beatId: null,
    lyrics: null,
    recording: null,
    mix: { ...DEFAULT_MIX },
    title: '',
    coverArtId: null,
    collaborators: [],
    rollout: 'standard',
    marketingBudget: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function touch(d: SongDraft, p: Partial<SongDraft>): SongDraft {
  return { ...d, ...p, updatedAt: Date.now() };
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  draft: null,
  producedSongs: [],

  startDraft() {
    // Abandoning a half-finished take shouldn't leak its file.
    const prev = get().draft;
    if (prev?.recording) deleteRecording(prev.recording.uri);
    set({ draft: newDraft() });
  },

  discardDraft() {
    const d = get().draft;
    if (d?.recording) deleteRecording(d.recording.uri);
    set({ draft: null });
  },

  patchDraft(p) {
    set((s) => (s.draft ? { draft: touch(s.draft, p) } : s));
  },

  setStep(step) {
    set((s) => (s.draft ? { draft: touch(s.draft, { step }) } : s));
  },

  setBeat(beatId) {
    set((s) => (s.draft ? { draft: touch(s.draft, { beatId }) } : s));
  },

  setLyrics(lyrics) {
    set((s) => (s.draft ? { draft: touch(s.draft, { lyrics }) } : s));
  },

  setRecording(rec) {
    set((s) => {
      if (!s.draft) return s;
      // Replacing a take deletes the old file immediately.
      const old = s.draft.recording;
      if (old && old.uri !== rec?.uri) deleteRecording(old.uri);
      return { draft: touch(s.draft, { recording: rec }) };
    });
  },

  setMix(mix) {
    set((s) => (s.draft ? { draft: touch(s.draft, { mix }) } : s));
  },

  setTitle(title) {
    set((s) => (s.draft ? { draft: touch(s.draft, { title }) } : s));
  },

  setCover(coverArtId) {
    set((s) => (s.draft ? { draft: touch(s.draft, { coverArtId }) } : s));
  },

  setRollout(rollout) {
    set((s) => (s.draft ? { draft: touch(s.draft, { rollout }) } : s));
  },

  setMarketingBudget(amount) {
    set((s) =>
      s.draft
        ? { draft: touch(s.draft, { marketingBudget: Math.max(0, Math.round(amount)) }) }
        : s
    );
  },

  toggleCollaborator(feature) {
    set((s) => {
      if (!s.draft) return s;
      const has = s.draft.collaborators.some(
        (c) => c.artistId === feature.artistId
      );
      const collaborators = has
        ? s.draft.collaborators.filter((c) => c.artistId !== feature.artistId)
        : [...s.draft.collaborators, feature];
      return { draft: touch(s.draft, { collaborators }) };
    });
  },

  commitSong(song) {
    set((s) => ({
      producedSongs: [song, ...s.producedSongs],
      draft: null, // released — draft consumed, file now owned by the song
    }));
    get().save();
  },

  markExported(songId, path) {
    set((s) => ({
      producedSongs: s.producedSongs.map((x) =>
        x.id === songId ? { ...x, exported: true, exportPath: path } : x
      ),
    }));
    get().save();
  },

  getSong(songId) {
    return get().producedSongs.find((x) => x.id === songId) ?? null;
  },

  latestSong() {
    return get().producedSongs[0] ?? null;
  },

  save() {
    const { producedSongs, draft } = get();
    saveData('audio', { producedSongs, draft });
  },

  load() {
    const saved = loadData<AudioStoreState>('audio');
    const producedSongs = saved?.producedSongs ?? [];
    // Backfill Phase 3 release-plan fields for drafts saved before they existed.
    const draft = saved?.draft
      ? {
          ...saved.draft,
          collaborators: saved.draft.collaborators ?? [],
          rollout: saved.draft.rollout ?? 'standard',
          marketingBudget: saved.draft.marketingBudget ?? 0,
          // Backfill DJ-FX mix fields for drafts saved before they existed.
          mix: withMixDefaults(saved.draft.mix),
        }
      : null;
    set({ producedSongs, draft });

    // Drop any orphaned take files left by abandoned sessions / crashes.
    const keep = [
      ...producedSongs.map((s) => s.recordingUri).filter(Boolean),
      draft?.recording?.uri,
    ].filter(Boolean) as string[];
    cleanupOrphanRecordings(keep);
  },

  reset() {
    const { producedSongs, draft } = get();
    for (const s of producedSongs) {
      deleteRecording(s.recordingUri);
      deleteExport(s);
    }
    if (draft?.recording) deleteRecording(draft.recording.uri);
    cleanupOrphanRecordings([]);
    set({ draft: null, producedSongs: [] });
  },
}));
