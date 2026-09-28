/**
 * Drop-in slots for bundled instrumentals.
 *
 * Metro fails the whole bundle on a `require()` of a missing file, so the
 * catalog NEVER requires audio directly — it looks the asset up here by beat
 * id. A beat with no entry is still fully selectable in the simulation; it
 * just plays silently until you add a file.
 *
 * The .wav loops below are PROCEDURALLY GENERATED full instrumentals — drums +
 * bass + chords + topline melody, synthesized from each beat's BPM / key / mood
 * by `scripts/generate-beats.mjs`. They're original, royalty-free, and belong
 * to no musician. Re-run `node scripts/generate-beats.mjs` to regenerate.
 *
 * To replace one with your own audio, drop a file under
 * `assets/beats/<genre>/` and point its line here at the new path.
 */
export const BEAT_ASSETS: Record<string, number> = {
  'trap-midnight-bloom': require('../../assets/beats/trap/trap-midnight-bloom.wav'),
  'trap-foreign-engine': require('../../assets/beats/trap/trap-foreign-engine.wav'),
  'trap-glass-tears': require('../../assets/beats/trap/trap-glass-tears.wav'),
  'trap-velvet-smoke': require('../../assets/beats/trap/trap-velvet-smoke.wav'),
  'trap-paranoia': require('../../assets/beats/trap/trap-paranoia.wav'),
  'trap-victory-lap': require('../../assets/beats/trap/trap-victory-lap.wav'),
  'drill-cold-corner': require('../../assets/beats/drill/drill-cold-corner.wav'),
  'drill-sliding': require('../../assets/beats/drill/drill-sliding.wav'),
  'drill-no-hook': require('../../assets/beats/drill/drill-no-hook.wav'),
  'drill-trenches': require('../../assets/beats/drill/drill-trenches.wav'),
  'drill-midnight-run': require('../../assets/beats/drill/drill-midnight-run.wav'),
  'drill-opps-down': require('../../assets/beats/drill/drill-opps-down.wav'),
  'afro-lagos-nights': require('../../assets/beats/afrobeats/afro-lagos-nights.wav'),
  'afro-sunlight': require('../../assets/beats/afrobeats/afro-sunlight.wav'),
  'afro-slow-wind': require('../../assets/beats/afrobeats/afro-slow-wind.wav'),
  'afro-island-time': require('../../assets/beats/afrobeats/afro-island-time.wav'),
  'afro-gold-coast': require('../../assets/beats/afrobeats/afro-gold-coast.wav'),
  'afro-palm-wine': require('../../assets/beats/afrobeats/afro-palm-wine.wav'),
  'rnb-2am-text': require('../../assets/beats/rnb/rnb-2am-text.wav'),
  'rnb-afterglow': require('../../assets/beats/rnb/rnb-afterglow.wav'),
  'rnb-bruised': require('../../assets/beats/rnb/rnb-bruised.wav'),
  'rnb-silk-sheets': require('../../assets/beats/rnb/rnb-silk-sheets.wav'),
  'rnb-3am-confession': require('../../assets/beats/rnb/rnb-3am-confession.wav'),
  'rnb-overrated': require('../../assets/beats/rnb/rnb-overrated.wav'),
  'pop-neon-rush': require('../../assets/beats/pop/pop-neon-rush.wav'),
  'pop-paper-hearts': require('../../assets/beats/pop/pop-paper-hearts.wav'),
  'pop-comeback': require('../../assets/beats/pop/pop-comeback.wav'),
  'pop-supernova': require('../../assets/beats/pop/pop-supernova.wav'),
  'pop-daydream': require('../../assets/beats/pop/pop-daydream.wav'),
  'pop-glow-up': require('../../assets/beats/pop/pop-glow-up.wav'),
  'indie-old-film': require('../../assets/beats/indie/indie-old-film.wav'),
  'indie-static': require('../../assets/beats/indie/indie-static.wav'),
  'indie-rooftops': require('../../assets/beats/indie/indie-rooftops.wav'),
  'indie-polaroid': require('../../assets/beats/indie/indie-polaroid.wav'),
  'indie-grey-skies': require('../../assets/beats/indie/indie-grey-skies.wav'),
  'indie-first-light': require('../../assets/beats/indie/indie-first-light.wav'),
  'hyper-sugar-crash': require('../../assets/beats/hyperpop/hyper-sugar-crash.wav'),
  'hyper-melt': require('../../assets/beats/hyperpop/hyper-melt.wav'),
  'hyper-screwface': require('../../assets/beats/hyperpop/hyper-screwface.wav'),
  'hyper-glitter-bomb': require('../../assets/beats/hyperpop/hyper-glitter-bomb.wav'),
  'hyper-feels': require('../../assets/beats/hyperpop/hyper-feels.wav'),
  'hyper-rage-quit': require('../../assets/beats/hyperpop/hyper-rage-quit.wav'),
};

export function resolveBeatAsset(beatId: string): number | null {
  return BEAT_ASSETS[beatId] ?? null;
}
