import type { PhotoRead } from '../../../types/social';
import { PhotoSense } from '../../../modules/photo-sense';
import { fileParts, readPhoto, readStock, type PhotoSignals } from './classify';

/**
 * READING THE PLAYER'S PHOTOS (native glue).
 *
 * When the player posts, each photo is read on the phone (ML Kit: labels,
 * faces, text layout) so the comments fit what it shows. It runs on the
 * private 1080px copy, takes well under a second, and keeps only the
 * reading (a kind like "pet" and a word like "dog"): never the picture, never
 * the words in it. Builds without the native module (or a phone without Play
 * services, or a model that hasn't downloaded yet) fall back to the file's
 * details and the caption.
 */

export { readPhoto, readStock };

let prepared = false;

/** Ask Play services for the models early (once a session), so the first post can be read. */
export function prepareSense(): void {
  if (prepared || !PhotoSense) return;
  prepared = true;
  PhotoSense.prepare().catch(() => {
    prepared = false;
  });
}

export function senseAvailable(): boolean {
  return PhotoSense !== null;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      () => {
        clearTimeout(t);
        resolve(null);
      }
    );
  });
}

/**
 * What a real photo shows. `copyUri` is the private copy (what gets
 * analyzed), `originalUri` the gallery file (its name, folder and EXIF tell
 * a screenshot or a WhatsApp meme from a camera shot).
 */
export async function readDevicePhoto(
  copyUri: string,
  original: { uri: string; w: number; h: number } | null,
  caption: string
): Promise<PhotoRead> {
  const parts = original ? fileParts(original.uri) : { name: '', folder: '' };
  const sig: PhotoSignals = {
    file: { name: parts.name, folder: parts.folder, w: original?.w, h: original?.h },
  };
  if (PhotoSense) {
    const [seen, cam] = await Promise.all([
      withTimeout(PhotoSense.analyze(copyUri), 5000),
      original ? withTimeout(PhotoSense.camera(original.uri), 1500) : Promise.resolve(null),
    ]);
    if (seen?.ok) {
      sig.labels = seen.labels ?? null;
      sig.faces = seen.faces ?? null;
      sig.text = seen.text ?? null;
    }
    if (cam?.ok) {
      sig.file = { ...sig.file, camera: cam.camera, front: cam.front };
    }
  }
  try {
    return readPhoto(sig, caption);
  } catch {
    return { kind: 'other', confidence: 0.1, via: 'none' };
  }
}
