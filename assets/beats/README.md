# Bundled beats

The beat catalog is a typed manifest in [`data/beats/beatCatalog.ts`](../../data/beats/beatCatalog.ts).

## Generated beats (default)

The 42 **stereo** `.wav` loops in the genre folders are **procedurally
generated** — original, royalty-free full instrumentals (drums + bass + chords
+ topline + texture) synthesized from each beat's BPM / key / mood / quality by
[`scripts/generate-beats.mjs`](../../scripts/generate-beats.mjs). Each beat
seeds its own instrument + drum-pattern + arrangement pick, so the 6 beats in a
genre genuinely differ in sound and groove (not the same loop transposed). They
belong to no musician and ship with the app. To (re)generate them:

```sh
node scripts/generate-beats.mjs
```

The script also prints the `BEAT_ASSETS` map to paste into
[`data/beats/beatAssets.ts`](../../data/beats/beatAssets.ts). If you add or
rename a catalog beat, mirror it in the script's `BEATS` list and re-run.

## Replacing a beat with your own file

1. Put a royalty-free / CC0 / self-produced loop under the matching genre
   folder, e.g. `assets/beats/trap/midnight-bloom.m4a`.
   - Prefer `.m4a` (AAC) or `.mp3`, mono or stereo, ≤ ~2 min, < ~2 MB.
   - The file should loop cleanly — playback loops it under the vocal.
2. Register it in [`data/beats/beatAssets.ts`](../../data/beats/beatAssets.ts)
   keyed by the beat `id` from the catalog:

   ```ts
   export const BEAT_ASSETS: Record<string, number> = {
     'trap-midnight-bloom': require('../../assets/beats/trap/midnight-bloom.m4a'),
   };
   ```

## Behaviour with no file

A beat with no registered asset is **still fully selectable**. It drives genre
fit, scoring, and the simulation exactly the same — it simply plays no audio in
the studio preview (the UI labels it "audio pending"). This keeps the game
playable before any audio is sourced.

## Licensing

Only commit audio you have the right to redistribute. Good sources: your own
productions, CC0 packs, or royalty-free licenses that allow app bundling.
Keep a `LICENSE.txt` next to the files documenting their origin.

Folders: `trap/ drill/ afrobeats/ rnb/ pop/ indie/ hyperpop/`
