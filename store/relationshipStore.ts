import { create } from 'zustand';
import type { Relationship, RivalArtist } from '../types/relationships';
import { RIVAL_ARTISTS } from '../data/artists/rivalArtists';
import { saveData, loadData } from '../database/gameRepository';
import { clamp } from '../utils/random';

interface RelationshipStoreState {
  relationships: Record<string, Relationship>;
  knownArtists: RivalArtist[];
}

interface RelationshipStoreActions {
  introduceArtist: (artistId: string) => void;
  updateAffinity: (artistId: string, delta: number) => void;
  setRelationshipType: (artistId: string, type: Relationship['type']) => void;
  getRelationship: (artistId: string) => Relationship | null;
  getArtist: (artistId: string) => RivalArtist | null;
  getRivals: () => RivalArtist[];
  isKnown: (artistId: string) => boolean;
  save: () => void;
  load: () => void;
  reset: () => void;
}

type RelationshipStore = RelationshipStoreState & RelationshipStoreActions;

export const useRelationshipStore = create<RelationshipStore>((set, get) => ({
  relationships: {},
  knownArtists: [],

  introduceArtist(artistId) {
    const artist = RIVAL_ARTISTS.find((a) => a.id === artistId);
    if (!artist) return;

    const { relationships, knownArtists } = get();
    if (knownArtists.some((a) => a.id === artistId)) return;

    const defaultAffinity = artist.attitude === 'friendly' ? 20
      : artist.attitude === 'aggressive' ? -30
      : artist.attitude === 'volatile' ? 0
      : 0;

    set({
      knownArtists: [...knownArtists, artist],
      relationships: {
        ...relationships,
        [artistId]: {
          artistId,
          type: artist.defaultRelationship,
          affinity: defaultAffinity,
          eventHistory: [],
          firstMetWeek: 0,
        },
      },
    });
  },

  updateAffinity(artistId, delta) {
    const { relationships } = get();
    const rel = relationships[artistId];
    if (!rel) return;

    const newAffinity = clamp(rel.affinity + delta, -100, 100);
    const newType: Relationship['type'] =
      newAffinity >= 60 ? 'ally'
      : newAffinity >= 20 ? 'collaborator'
      : newAffinity >= -20 ? 'neutral'
      : newAffinity >= -60 ? 'rival'
      : 'enemy';

    set({
      relationships: {
        ...relationships,
        [artistId]: { ...rel, affinity: newAffinity, type: newType },
      },
    });
  },

  setRelationshipType(artistId, type) {
    const { relationships } = get();
    const rel = relationships[artistId];
    if (!rel) return;
    set({ relationships: { ...relationships, [artistId]: { ...rel, type } } });
  },

  getRelationship(artistId) {
    return get().relationships[artistId] ?? null;
  },

  getArtist(artistId) {
    return get().knownArtists.find((a) => a.id === artistId) ?? null;
  },

  getRivals() {
    const { relationships, knownArtists } = get();
    return knownArtists.filter((a) => {
      const rel = relationships[a.id];
      return rel && (rel.type === 'rival' || rel.type === 'enemy');
    });
  },

  isKnown(artistId) {
    return get().knownArtists.some((a) => a.id === artistId);
  },

  save() {
    const { relationships, knownArtists } = get();
    saveData('relationships', { relationships, knownArtists });
  },

  load() {
    const saved = loadData<{ relationships: Record<string, Relationship>; knownArtists: RivalArtist[] }>('relationships');
    if (saved) {
      set({
        relationships: saved.relationships ?? {},
        knownArtists: saved.knownArtists ?? [],
      });
    }
  },

  reset() {
    set({ relationships: {}, knownArtists: [] });
  },
}));
