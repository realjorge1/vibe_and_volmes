import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { ProducedSong, ExportResult, Lyrics } from '../../types/audio';
import { SONGS_DIR, EXPORT_MANIFEST } from '../../constants/audioConfig';

/**
 * Local-first export. We can't render a single mixed file without a heavy
 * native DSP module, so an "export" is a self-contained song folder:
 *
 *   <documents>/songs/<slug>-<id>/
 *     ├── vocal.m4a      (the recorded take, if any)
 *     ├── song.json      (full metadata + mix + score + lyrics + beat ref)
 *     └── lyrics.txt     (human-readable, if lyrics exist)
 *
 * The beat stays a bundled asset (referenced by id/title in song.json) rather
 * than copied — keeps exports tiny and avoids the Asset download dance.
 * Optionally hands the vocal file to the OS share sheet so the player can
 * replay / keep it outside the game.
 */

function slug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40) || 'song'
  );
}

function songsRoot(): Directory {
  const dir = new Directory(Paths.document, SONGS_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

function lyricsToText(lyrics: Lyrics): string {
  return lyrics.sections
    .map((s) => `[${s.type.toUpperCase()}]\n${s.lines.join('\n')}`)
    .join('\n\n');
}

export function exportedSongDir(song: ProducedSong): Directory {
  return new Directory(songsRoot(), `${slug(song.title)}-${song.id}`);
}

export function isExported(song: ProducedSong): boolean {
  try {
    return exportedSongDir(song).exists;
  } catch {
    return false;
  }
}

export async function exportSong(
  song: ProducedSong,
  lyrics: Lyrics | null,
  opts: { share?: boolean } = {}
): Promise<ExportResult> {
  try {
    const dir = exportedSongDir(song);
    // Duplicate prevention: a re-export replaces the previous folder cleanly.
    if (dir.exists) dir.delete();
    dir.create({ intermediates: true });

    let vocalPath: string | null = null;
    if (song.recordingUri) {
      try {
        const src = new File(song.recordingUri);
        if (src.exists) {
          const dest = new File(dir, 'vocal.m4a');
          src.copy(dest);
          vocalPath = dest.uri;
        }
      } catch {
        /* vocal optional — manifest still exports */
      }
    }

    const manifest = {
      app: 'vibe_and_volumes',
      exportedAt: new Date().toISOString(),
      song: {
        id: song.id,
        title: song.title,
        genre: song.genre,
        durationSec: song.durationSec,
        emotionalTone: song.emotionalTone,
        lyricsTheme: song.lyricsTheme,
        beat: { id: song.beatId, title: song.beatTitle },
        mix: song.mix,
        score: song.score,
        releasedAtWeek: song.releasedAtWeek,
        popularity: song.popularity,
        controversial: song.controversial,
      },
      files: { vocal: vocalPath ? 'vocal.m4a' : null },
      note:
        'Beat is a bundled in-game instrumental, referenced by id/title. ' +
        'Play the vocal alongside it in-game for the full mix.',
    };

    const manifestFile = new File(dir, EXPORT_MANIFEST);
    manifestFile.create();
    manifestFile.write(JSON.stringify(manifest, null, 2));

    if (lyrics) {
      const lf = new File(dir, 'lyrics.txt');
      lf.create();
      lf.write(`${song.title}\n\n${lyricsToText(lyrics)}`);
    }

    let shared = false;
    if (opts.share) {
      try {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(vocalPath ?? manifestFile.uri);
          shared = true;
        }
      } catch {
        /* sharing is best-effort; the files are still saved locally */
      }
    }

    return { ok: true, path: dir.uri, shared };
  } catch (e) {
    return {
      ok: false,
      path: null,
      shared: false,
      error: e instanceof Error ? e.message : 'Export failed',
    };
  }
}

export function deleteExport(song: ProducedSong): void {
  try {
    const dir = exportedSongDir(song);
    if (dir.exists) dir.delete();
  } catch {
    /* best effort */
  }
}
