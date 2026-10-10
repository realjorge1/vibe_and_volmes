import { requireOptionalNativeModule } from 'expo';
import { Directory, File, Paths } from 'expo-file-system';
import { fitSize, realKey, REAL_MAX_SIDE, type RealPhoto } from './realPhotos';
import { prepareSense } from './sense';

/**
 * THE PHONE'S REAL GALLERY (native glue).
 *
 * Reads the player's recent photos for the in-app picker, and copies the ones
 * they post into the app's private folder at Instagram size. Both native
 * modules are optional: a build from before they were added (or a player who
 * says no to photo access) gets the game's own camera roll instead.
 */

type MediaLibraryModule = typeof import('expo-media-library');
type ManipulatorModule = typeof import('expo-image-manipulator');

// Required only when the native side is in the build: importing them in an older build would crash.
const MediaLibrary: MediaLibraryModule | null = requireOptionalNativeModule('ExpoMediaLibrary')
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('expo-media-library') as MediaLibraryModule)
  : null;
const Manipulator: ManipulatorModule | null = requireOptionalNativeModule('ExpoImageManipulator')
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('expo-image-manipulator') as ManipulatorModule)
  : null;

/** Photo access, the way the phone grants it. */
export type GalleryAccess = 'checking' | 'all' | 'limited' | 'denied' | 'blocked' | 'unavailable';

export interface DeviceAsset {
  id: string;
  uri: string;
  w: number;
  h: number;
  at: number;
}

export function galleryAvailable(): boolean {
  return MediaLibrary !== null && Manipulator !== null;
}

function accessOf(p: { granted: boolean; canAskAgain: boolean; accessPrivileges?: 'all' | 'limited' | 'none' }): GalleryAccess {
  if (p.granted) {
    // The player shares photos: get the photo-reading models onto the phone before the first post.
    prepareSense();
    return p.accessPrivileges === 'limited' ? 'limited' : 'all';
  }
  return p.canAskAgain ? 'denied' : 'blocked';
}

/** Where access stands now, without asking. */
export async function checkAccess(): Promise<GalleryAccess> {
  if (!galleryAvailable() || !MediaLibrary) return 'unavailable';
  try {
    return accessOf(await MediaLibrary.getPermissionsAsync(false, ['photo']));
  } catch {
    return 'unavailable';
  }
}

/** Ask the phone (the system dialog; Android 14 offers "select photos"). */
export async function requestAccess(): Promise<GalleryAccess> {
  if (!galleryAvailable() || !MediaLibrary) return 'unavailable';
  try {
    return accessOf(await MediaLibrary.requestPermissionsAsync(false, ['photo']));
  } catch {
    return 'unavailable';
  }
}

/** Android 14+ "limited" access: let the player pick more photos to share with the game. */
export async function pickMoreAllowed(): Promise<void> {
  try {
    await MediaLibrary?.presentPermissionsPickerAsync(['photo']);
  } catch {
    /* older Android: nothing to show */
  }
}

/** A page of the newest photos on the phone. */
export async function recentPhotos(after?: string, first = 60): Promise<{ assets: DeviceAsset[]; next?: string; more: boolean }> {
  if (!MediaLibrary) return { assets: [], more: false };
  const page = await MediaLibrary.getAssetsAsync({
    first,
    after,
    mediaType: MediaLibrary.MediaType.photo,
    sortBy: [[MediaLibrary.SortBy.creationTime, false]],
  });
  return {
    assets: page.assets.map((a) => ({ id: a.id, uri: a.uri, w: a.width, h: a.height, at: a.creationTime })),
    next: page.endCursor,
    more: page.hasNextPage,
  };
}

const DIRNAME = 'real-photos';

function photosDir(): Directory {
  const dir = new Directory(Paths.document, DIRNAME);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/**
 * Copy a photo the player is posting into the private folder, at most
 * 1080px on its long side. Returns null if the phone wouldn't give it up.
 */
export async function importPhoto(asset: DeviceAsset, now = Date.now()): Promise<RealPhoto | null> {
  if (!Manipulator || !MediaLibrary) return null;
  try {
    let src = asset.uri;
    if (!/^(file|content):/.test(src)) {
      const info = await MediaLibrary.getAssetInfoAsync(asset.id);
      src = info.localUri ?? src;
    }
    const { ImageManipulator, SaveFormat } = Manipulator;
    const ctx = ImageManipulator.manipulate(src);
    const fit = fitSize(asset.w, asset.h);
    if (fit) ctx.resize(fit);
    let img = await ctx.renderAsync();
    // The gallery reports some sizes before rotation: shrink again if it is still too big.
    const again = fitSize(img.width, img.height, Math.round(REAL_MAX_SIDE * 1.25));
    if (again) {
      const second = ImageManipulator.manipulate(img);
      second.resize(fitSize(img.width, img.height) ?? again);
      img = await second.renderAsync();
    }
    const saved = await img.saveAsync({ compress: 0.86, format: SaveFormat.JPEG });
    const key = realKey(now);
    const dest = new File(photosDir(), `${key}.jpg`);
    if (dest.exists) dest.delete();
    new File(saved.uri).move(dest);
    return { key, uri: dest.uri, w: saved.width, h: saved.height, at: now };
  } catch {
    return null;
  }
}

/** Delete one private copy. */
export function deleteCopy(uri: string): void {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    /* best effort */
  }
}

/** True when the private copy is still there. */
export function copyExists(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

/** Remove every private copy the game no longer uses. */
export function deleteOrphanCopies(keepUris: readonly string[]): void {
  try {
    const keep = new Set(keepUris);
    const dir = new Directory(Paths.document, DIRNAME);
    if (!dir.exists) return;
    for (const entry of dir.list()) {
      if (entry instanceof File && !keep.has(entry.uri)) {
        try {
          entry.delete();
        } catch {
          /* skip */
        }
      }
    }
  } catch {
    /* best effort */
  }
}
