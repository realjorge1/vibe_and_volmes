import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import type { StockPhoto } from '../../../data/photos/photoPack';
import { PHOTOS } from '../../../data/photos/photoPack';
import { hashOf } from '../../../systems/visuals/photoIndex';
import { checkAccess, pickMoreAllowed, recentPhotos, requestAccess, type DeviceAsset, type GalleryAccess } from '../../../systems/social/deviceGallery';
import { pickKey, type PhotoPick } from '../../../systems/social/postFromPhone';
import { useRealPhotoStore } from '../../../store/realPhotoStore';

/** The game's own camera roll (the artist's kind of life): used when the phone's gallery isn't shared. */
export function cameraRoll(seed: string): StockPhoto[] {
  const wanted = new Set(['player', 'studio', 'stage', 'crowd', 'fashion', 'sneakers', 'car', 'jet', 'city', 'money', 'food', 'coffee', 'pool', 'travel', 'vinyl', 'mic', 'party']);
  return PHOTOS.filter((p) => p.tags.some((t) => wanted.has(t)))
    .map((p) => ({ p, k: hashOf(`${seed}:${p.key}`) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, 48)
    .map((x) => x.p);
}

const granted = (a: GalleryAccess) => a === 'all' || a === 'limited';

/**
 * The create flows' "Recents": the phone's real photos when the player shares
 * them, otherwise the game's camera roll. The phone's permission dialog shows
 * once; after a "no" the game's roll is used and a quiet row offers access again.
 * `ask: false` never prompts (Chirp's composer strip only shows photos already shared).
 */
export function useGallery(seed: string, opts: { ask?: boolean } = {}) {
  const ask = opts.ask ?? true;
  const fallback = useMemo<PhotoPick[]>(() => cameraRoll(seed).map((photo) => ({ kind: 'stock', photo })), [seed]);
  const [access, setAccess] = useState<GalleryAccess>('checking');
  const [assets, setAssets] = useState<DeviceAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const next = useRef<string | undefined>(undefined);
  const more = useRef(true);
  const busy = useRef(false);
  const alive = useRef(true);
  const accessRef = useRef<GalleryAccess>('checking');
  const setBoth = useCallback((a: GalleryAccess) => {
    accessRef.current = a;
    setAccess(a);
  }, []);

  const loadMore = useCallback(async () => {
    if (busy.current || !more.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const page = await recentPhotos(next.current);
      if (!alive.current) return;
      next.current = page.next;
      more.current = page.more;
      setAssets((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        return [...prev, ...page.assets.filter((a) => !seen.has(a.id))];
      });
    } catch {
      more.current = false;
    } finally {
      busy.current = false;
      if (alive.current) setLoading(false);
    }
  }, []);

  const reload = useCallback(() => {
    next.current = undefined;
    more.current = true;
    setAssets([]);
    void loadMore();
  }, [loadMore]);

  useEffect(() => {
    alive.current = true;
    void (async () => {
      let a = await checkAccess();
      if (ask && a === 'denied' && !useRealPhotoStore.getState().asked) {
        useRealPhotoStore.getState().markAsked();
        a = await requestAccess();
      }
      if (!alive.current) return;
      setBoth(a);
      if (granted(a)) reload();
    })();
    // Back from the phone's settings (or its photo picker): pick up the change.
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void checkAccess().then((a) => {
        if (!alive.current) return;
        const prev = accessRef.current;
        setBoth(a);
        if (granted(a) && prev !== a) reload();
      });
    });
    return () => {
      alive.current = false;
      sub.remove();
    };
  }, [reload, setBoth, ask]);

  /** The "allow access" row: ask again, open settings, or pick more photos (Android 14 limited access). */
  const allow = useCallback(async () => {
    if (access === 'blocked') {
      void Linking.openSettings();
      return;
    }
    if (access === 'limited') {
      await pickMoreAllowed();
      reload();
      return;
    }
    const a = await requestAccess();
    setBoth(a);
    if (granted(a)) reload();
  }, [access, reload, setBoth]);

  const real = granted(access) && assets.length > 0;
  const waiting = access === 'checking' || (granted(access) && assets.length === 0 && loading);
  const items = useMemo<PhotoPick[]>(
    () => (real ? assets.map((asset) => ({ kind: 'device', asset })) : waiting ? [] : fallback),
    [real, waiting, assets, fallback]
  );
  return { access, items, real, waiting, loadMore, allow };
}

/**
 * Which photos are picked, the way Instagram does it: one at a time, or a
 * numbered multi-select (up to `max`) where tapping the one in view unpicks it.
 */
export function usePickSelection(
  items: readonly PhotoPick[],
  max: number,
  opts: { multi?: boolean; autoFirst?: boolean; toggle?: boolean } = {}
) {
  const autoFirst = opts.autoFirst ?? true;
  const toggle = opts.toggle ?? false;
  const [multi, setMulti] = useState(opts.multi ?? false);
  const [picked, setPicked] = useState<PhotoPick[]>([]);
  const [focus, setFocus] = useState<PhotoPick | null>(null);

  // The first photo is picked as soon as the roll shows up.
  useEffect(() => {
    if (!autoFirst || focus || items.length === 0) return;
    setFocus(items[0]);
    setPicked([items[0]]);
  }, [items, focus, autoFirst]);

  const press = useCallback(
    (item: PhotoPick) => {
      const k = pickKey(item);
      if (!multi) {
        setFocus(item);
        setPicked([item]);
        return;
      }
      const at = picked.findIndex((p) => pickKey(p) === k);
      if (at < 0) {
        if (picked.length >= max) return;
        setPicked([...picked, item]);
        setFocus(item);
        return;
      }
      if ((toggle || (focus && pickKey(focus) === k)) && (picked.length > 1 || !autoFirst)) {
        const rest = picked.filter((p) => pickKey(p) !== k);
        setPicked(rest);
        setFocus(rest[rest.length - 1] ?? null);
        return;
      }
      setFocus(item);
    },
    [multi, max, focus, picked, toggle, autoFirst]
  );

  const toggleMulti = useCallback(() => {
    if (multi && focus) setPicked([focus]);
    setMulti(!multi);
  }, [multi, focus]);

  const order = useCallback((item: PhotoPick) => picked.findIndex((p) => pickKey(p) === pickKey(item)), [picked]);

  return { multi, toggleMulti, picked, focus, press, order };
}
