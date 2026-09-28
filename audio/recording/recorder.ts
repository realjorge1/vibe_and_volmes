import { AudioModule, setAudioModeAsync } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import { MAX_RECORDING_SEC, MIN_RECORDING_SEC } from '../../constants/audioConfig';

/**
 * Pure (non-hook) side of the recording engine: permissions, audio session,
 * and moving finished takes out of the OS temp dir into a stable sandbox
 * folder we own and clean up ourselves. The actual record/stop/pause lives in
 * `hooks/useVocalRecorder` because expo-audio's recorder is hook-based.
 */

const RECORDINGS_DIRNAME = 'recordings';

export async function requestMicPermission(): Promise<boolean> {
  try {
    const res = await AudioModule.requestRecordingPermissionsAsync();
    return res.granted;
  } catch {
    return false;
  }
}

export async function getMicPermission(): Promise<boolean> {
  try {
    const res = await AudioModule.getRecordingPermissionsAsync();
    return res.granted;
  } catch {
    return false;
  }
}

/** Route audio so recording works and playback isn't muted by silent mode. */
export async function enterRecordingMode(): Promise<void> {
  try {
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'doNotMix',
    });
  } catch {
    /* non-fatal — recorder still works with defaults */
  }
}

/** Back to playback-only after a take so the beat plays at full volume. */
export async function exitRecordingMode(): Promise<void> {
  try {
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });
  } catch {
    /* non-fatal */
  }
}

function recordingsDir(): Directory {
  const dir = new Directory(Paths.document, RECORDINGS_DIRNAME);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/**
 * Copy a freshly-stopped take from its temp uri into our sandbox. Returns the
 * stable uri + id, or null if the file is unusable / too short.
 */
export function persistRecording(
  tempUri: string,
  id: string
): { id: string; uri: string } | null {
  try {
    const src = new File(tempUri);
    if (!src.exists) return null;
    const dir = recordingsDir();
    const dest = new File(dir, `${id}.m4a`);
    if (dest.exists) dest.delete();
    src.copy(dest);
    return { id, uri: dest.uri };
  } catch {
    return null;
  }
}

export function deleteRecording(uri: string | null | undefined): void {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    /* best effort */
  }
}

/**
 * Remove any take files no longer referenced by a draft or a saved song.
 * Called on store hydration so abandoned recordings don't pile up.
 */
export function cleanupOrphanRecordings(keepUris: string[]): void {
  try {
    const dir = recordingsDir();
    const keep = new Set(keepUris.filter(Boolean));
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

export function isUsableTake(durationSec: number): boolean {
  return durationSec >= MIN_RECORDING_SEC && durationSec <= MAX_RECORDING_SEC + 1;
}
