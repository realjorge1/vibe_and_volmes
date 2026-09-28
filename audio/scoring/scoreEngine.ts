import type { Player } from '../../types/player';
import type {
  Beat,
  Lyrics,
  MixSettings,
  VocalRecording,
  SongScore,
  SongScoreBreakdown,
} from '../../types/audio';
import { getGenre } from '../../data/genres';
import { getCultureBias } from '../../systems/culture/cultureEngine';
import {
  SCORE_PILLAR_WEIGHTS,
  SCORE_PILLAR_JITTER,
  MIX_SCORE_SWING,
  DEFAULT_MIX,
  VERDICTS,
} from '../../constants/audioConfig';
import { clamp, gaussRand, chance } from '../../utils/random';
import { meteringToAmplitude, estimateTimingStability } from '../waveform/waveform';

/**
 * The "simulated AI evaluation". There is no model here — it's a layered
 * rules engine that blends performance, songwriting, production, star power
 * and zeitgeist with deliberate randomness so the verdict *feels* like a
 * smart critic listened, even though it's deterministic-ish math.
 *
 * Keep this pure: same-ish inputs, plausibly varied outputs. The simulation
 * (charts, social, reputation) consumes the numbers via songEngine.
 */

export interface EvaluateInput {
  player: Player;
  beat: Beat | null;
  lyrics: Lyrics | null;
  recording: VocalRecording | null;
  mix: MixSettings;
}

/** Fans → 0-100 fame curve (log so early growth feels meaningful). */
function fameScore(fans: number): number {
  if (fans <= 0) return 0;
  return clamp(Math.round((Math.log10(fans + 1) / Math.log10(200_000_000)) * 100), 0, 100);
}

/** How close the mix is to something tasteful. Centered ~70, ±swing. */
function mixQuality(mix: MixSettings): number {
  const ideal = DEFAULT_MIX;
  const vocalMiss = Math.abs(mix.vocalVolume - ideal.vocalVolume);
  const beatMiss = Math.abs(mix.beatVolume - ideal.beatVolume);
  // Vocal totally buried or beat inaudible is a real, audible problem.
  const buried = mix.vocalVolume < 0.35 || mix.beatVolume < 0.2 ? 0.35 : 0;
  const balance = mix.vocalVolume - mix.beatVolume; // want vocal slightly up
  const balanceBonus = balance > 0.05 && balance < 0.4 ? 0.12 : 0;
  const presetBonus =
    (mix.reverb !== 'none' ? 0.06 : 0) + (mix.compression !== 'none' ? 0.06 : 0);
  // Live DJ FX read as production taste: a little space + grit helps, but a
  // nearly-closed filter (mix buried behind the sweep) or runaway echo hurt.
  const space = mix.space ?? 0;
  const drive = mix.drive ?? 0;
  const echo = mix.echo ?? 0;
  const filter = mix.filter ?? 0.5;
  const fxBonus =
    (space > 0.05 && space < 0.6 ? 0.06 : space >= 0.6 ? -0.05 : 0) +
    (drive > 0.03 && drive < 0.5 ? 0.05 : drive >= 0.5 ? -0.04 : 0) +
    (echo > 0.6 ? -0.06 : 0);
  const filterMiss = Math.abs(filter - 0.5) > 0.4 ? 0.18 : 0;
  const miss = vocalMiss + beatMiss + buried + filterMiss;
  const norm = clamp(1 - miss + balanceBonus + presetBonus + fxBonus, 0, 1);
  return 70 - MIX_SCORE_SWING + norm * (MIX_SCORE_SWING * 2);
}

function performancePillar(p: Player, rec: VocalRecording | null): number {
  const s = p.stats;
  const skill = s.vocalSkill * 0.5 + s.charisma * 0.2 + s.discipline * 0.1;
  if (!rec) {
    // No real take (e.g. simulated path) — fall back to pure stat read.
    return clamp(skill + s.talent * 0.2, 1, 100);
  }
  const confidence = meteringToAmplitude(rec.meteringAvg) * 100; // loud + present
  const timing = estimateTimingStability(rec.peaks);
  const lengthFit = clamp((rec.durationSec / 45) * 100, 25, 100); // ~45s+ feels full
  return clamp(
    skill * 0.45 + confidence * 0.22 + timing * 0.22 + lengthFit * 0.11,
    1,
    100
  );
}

function songwritingPillar(p: Player, lyrics: Lyrics | null): number {
  const s = p.stats;
  const base = s.writing * 0.55 + s.creativity * 0.3 + s.authenticity * 0.15;
  if (!lyrics) return clamp(base * 0.85, 1, 100);
  const written = lyrics.source === 'written' ? 8 : 0; // your own words read realer
  const depth = clamp((lyrics.wordCount / 90) * 14, 0, 16); // enough to say something
  return clamp(base + written + depth, 1, 100);
}

function productionPillar(p: Player, beat: Beat | null, mix: MixSettings): number {
  const mq = mixQuality(mix);
  if (!beat) return clamp(mq * 0.6 + p.stats.talent * 0.2, 1, 100);
  const fits = beat.flattersGenres.includes(p.genre);
  const fitBonus = fits ? 16 : -8;
  // The instrumental itself sets a production ceiling: a great beat from a
  // respected producer carries the record, a weak one caps it.
  return clamp(
    mq * 0.45 + beat.quality * 0.35 + fitBonus + p.stats.talent * 0.05,
    1,
    100
  );
}

function starPowerPillar(p: Player): number {
  const s = p.stats;
  return clamp(
    fameScore(s.fans) * 0.45 +
      s.charisma * 0.25 +
      s.reputation * 0.15 +
      s.industryRespect * 0.15,
    1,
    100
  );
}

function zeitgeistPillar(p: Player): number {
  const g = getGenre(p.genre);
  const base = g.viralPotential * 5 + g.mainstreamScore * 3 + gaussRand(20, 12);

  // Phase 5: the cultural era + live genre climate decide how "of the moment"
  // this sounds. Pure read — the deterministic sim still owns the outcome.
  const c = getCultureBias();
  const heatPull = (c.playerGenreHeat - 50) * 0.3; // ±15 around neutral
  // In high-authenticity eras the public rewards realness over spectacle.
  const authPull =
    (c.authenticityWeight - 0.6) * (p.stats.authenticity - 50) * 0.18;

  return clamp(base * c.playerGenreFit + heatPull + authPull, 1, 100);
}

function jitter(v: number): number {
  return clamp(Math.round(gaussRand(v, SCORE_PILLAR_JITTER)), 1, 100);
}

function verdictFor(overall: number): string {
  return (VERDICTS.find((v) => overall >= v.min) ?? VERDICTS[VERDICTS.length - 1])
    .label;
}

export function evaluateSong(input: EvaluateInput): SongScore {
  const { player, beat, lyrics, recording, mix } = input;

  const breakdown: SongScoreBreakdown = {
    performance: jitter(performancePillar(player, recording)),
    songwriting: jitter(songwritingPillar(player, lyrics)),
    production: jitter(productionPillar(player, beat, mix)),
    starPower: jitter(starPowerPillar(player)),
    zeitgeist: jitter(zeitgeistPillar(player)),
  };

  const w = SCORE_PILLAR_WEIGHTS;
  const overall = clamp(
    Math.round(
      breakdown.performance * w.performance +
        breakdown.songwriting * w.songwriting +
        breakdown.production * w.production +
        breakdown.starPower * w.starPower +
        breakdown.zeitgeist * w.zeitgeist
    ),
    1,
    100
  );

  // Critics weight craft; fans weight vibe + who you are.
  const critic = clamp(
    Math.round(
      breakdown.songwriting * 0.38 +
        breakdown.production * 0.32 +
        breakdown.performance * 0.22 +
        breakdown.starPower * 0.08
    ),
    1,
    100
  );
  const fan = clamp(
    Math.round(
      breakdown.performance * 0.3 +
        breakdown.starPower * 0.28 +
        breakdown.zeitgeist * 0.24 +
        breakdown.production * 0.18
    ),
    1,
    100
  );
  const replayability = clamp(
    Math.round(
      breakdown.production * 0.34 +
        breakdown.performance * 0.3 +
        breakdown.zeitgeist * 0.24 +
        gaussRand(0, 7) +
        breakdown.songwriting * 0.12
    ),
    1,
    100
  );
  const viralPotential = clamp(
    Math.round(
      breakdown.zeitgeist * 0.42 +
        breakdown.starPower * 0.28 +
        breakdown.performance * 0.16 +
        (chance(0.15) ? 22 : 0) + // the random "it just hit" spike
        gaussRand(0, 9)
    ),
    1,
    100
  );
  // Authenticity drops when you're very mainstream / didn't write it.
  const g = getGenre(player.genre);
  const authenticity = clamp(
    Math.round(
      player.stats.authenticity * 0.5 +
        breakdown.songwriting * 0.3 +
        (lyrics?.source === 'written' ? 10 : -4) +
        (10 - g.mainstreamScore) * 1.5 +
        gaussRand(0, 6)
    ),
    1,
    100
  );

  return {
    critic,
    fan,
    replayability,
    viralPotential,
    authenticity,
    overall,
    verdict: verdictFor(overall),
    breakdown,
  };
}
