/**
 * Bundled instrumentals, keyed by beat id.
 *
 * Metro fails the whole bundle on a `require()` of a missing file, so the
 * catalog NEVER requires audio directly — it looks the asset up here by beat
 * id. A beat with no entry is still fully selectable in the simulation; it
 * just plays silently until you add a file.
 *
 * These 8-bar loops are rendered by `scripts/beats/make_beats.py` (beat engine
 * v3): sampled instruments from the GeneralUser GS SoundFont plus synthesized
 * drums, 808s and synths, mixed and mastered, AAC in .m4a. Each file loops
 * seamlessly (reverb and delay tails are folded back onto the start).
 * Re-run the script to regenerate; it rewrites this file.
 */
export const BEAT_ASSETS: Record<string, number> = {
  'trap-midnight-bloom': require('../../assets/beats/trap/trap-midnight-bloom.m4a'),
  'trap-foreign-engine': require('../../assets/beats/trap/trap-foreign-engine.m4a'),
  'trap-glass-tears': require('../../assets/beats/trap/trap-glass-tears.m4a'),
  'trap-velvet-smoke': require('../../assets/beats/trap/trap-velvet-smoke.m4a'),
  'trap-paranoia': require('../../assets/beats/trap/trap-paranoia.m4a'),
  'trap-victory-lap': require('../../assets/beats/trap/trap-victory-lap.m4a'),
  'drill-cold-corner': require('../../assets/beats/drill/drill-cold-corner.m4a'),
  'drill-sliding': require('../../assets/beats/drill/drill-sliding.m4a'),
  'drill-no-hook': require('../../assets/beats/drill/drill-no-hook.m4a'),
  'drill-trenches': require('../../assets/beats/drill/drill-trenches.m4a'),
  'drill-midnight-run': require('../../assets/beats/drill/drill-midnight-run.m4a'),
  'drill-opps-down': require('../../assets/beats/drill/drill-opps-down.m4a'),
  'afro-lagos-nights': require('../../assets/beats/afrobeats/afro-lagos-nights.m4a'),
  'afro-sunlight': require('../../assets/beats/afrobeats/afro-sunlight.m4a'),
  'afro-slow-wind': require('../../assets/beats/afrobeats/afro-slow-wind.m4a'),
  'afro-island-time': require('../../assets/beats/afrobeats/afro-island-time.m4a'),
  'afro-gold-coast': require('../../assets/beats/afrobeats/afro-gold-coast.m4a'),
  'afro-palm-wine': require('../../assets/beats/afrobeats/afro-palm-wine.m4a'),
  'rnb-2am-text': require('../../assets/beats/rnb/rnb-2am-text.m4a'),
  'rnb-afterglow': require('../../assets/beats/rnb/rnb-afterglow.m4a'),
  'rnb-bruised': require('../../assets/beats/rnb/rnb-bruised.m4a'),
  'rnb-silk-sheets': require('../../assets/beats/rnb/rnb-silk-sheets.m4a'),
  'rnb-3am-confession': require('../../assets/beats/rnb/rnb-3am-confession.m4a'),
  'rnb-overrated': require('../../assets/beats/rnb/rnb-overrated.m4a'),
  'pop-neon-rush': require('../../assets/beats/pop/pop-neon-rush.m4a'),
  'pop-paper-hearts': require('../../assets/beats/pop/pop-paper-hearts.m4a'),
  'pop-comeback': require('../../assets/beats/pop/pop-comeback.m4a'),
  'pop-supernova': require('../../assets/beats/pop/pop-supernova.m4a'),
  'pop-daydream': require('../../assets/beats/pop/pop-daydream.m4a'),
  'pop-glow-up': require('../../assets/beats/pop/pop-glow-up.m4a'),
  'indie-old-film': require('../../assets/beats/indie/indie-old-film.m4a'),
  'indie-static': require('../../assets/beats/indie/indie-static.m4a'),
  'indie-rooftops': require('../../assets/beats/indie/indie-rooftops.m4a'),
  'indie-polaroid': require('../../assets/beats/indie/indie-polaroid.m4a'),
  'indie-grey-skies': require('../../assets/beats/indie/indie-grey-skies.m4a'),
  'indie-first-light': require('../../assets/beats/indie/indie-first-light.m4a'),
  'hyper-sugar-crash': require('../../assets/beats/hyperpop/hyper-sugar-crash.m4a'),
  'hyper-melt': require('../../assets/beats/hyperpop/hyper-melt.m4a'),
  'hyper-screwface': require('../../assets/beats/hyperpop/hyper-screwface.m4a'),
  'hyper-glitter-bomb': require('../../assets/beats/hyperpop/hyper-glitter-bomb.m4a'),
  'hyper-feels': require('../../assets/beats/hyperpop/hyper-feels.m4a'),
  'hyper-rage-quit': require('../../assets/beats/hyperpop/hyper-rage-quit.m4a'),
};

/** The bundled asset for a beat, or null when none is registered. */
export function resolveBeatAsset(id: string): number | null {
  return BEAT_ASSETS[id] ?? null;
}
