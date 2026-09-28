import type { CareerDossier } from '../../types/legacy';
import type { ChronicleArticle } from '../../types/ai';
import { getEra } from '../../data/culture/eras';
import type { EraId } from '../../types/culture';

/**
 * Builds the "rise and fall" career documentary narration. Fully
 * DETERMINISTIC and offline — string composition over the dossier the
 * chronicle projector already assembled. Always works, costs $0, never
 * blocks. The Phase 4 AI gateway can OPTIONALLY rewrite this richer via
 * `documentaryWriter` (ai/pipelines/stubs) — purely cosmetic, same
 * decorator contract; the deterministic text below is the source of truth.
 */

function tierSentence(d: CareerDossier): string {
  switch (d.legacy.tier) {
    case 'immortal':
      return `History does not record ${d.artistName} — it is measured by them.`;
    case 'legend':
      return `${d.artistName} did not have a career. ${d.artistName} had an era.`;
    case 'icon':
      return `When people talk about that sound, they are really talking about ${d.artistName}.`;
    case 'star':
      return `${d.artistName} reached the heights most artists only get to imagine.`;
    case 'respected':
      return `${d.artistName} earned something rarer than fame: respect.`;
    case 'footnote':
      return `${d.artistName} was there. Most people never even get that far.`;
    default:
      return `The world barely learned the name ${d.artistName}. But the story was real.`;
  }
}

function eraLine(eras: EraId[]): string {
  if (eras.length <= 1) {
    return `It all happened inside ${getEra(eras[0] ?? 'blog-era').label} — a single chapter of music history.`;
  }
  const first = getEra(eras[0]).label;
  const last = getEra(eras[eras.length - 1]).label;
  return `The journey ran from ${first} all the way through to ${last} — ${eras.length} cultural eras, each one trying to leave them behind.`;
}

export function buildDocumentary(d: CareerDossier): string[] {
  const paras: string[] = [];

  // Act I — the origin.
  paras.push(
    `It started the way it always does: nobody watching. A ${d.archetype.replace(/-/g, ' ')} out of nowhere, ${d.genre} in their blood and nothing to lose. ${eraLine(d.erasLived)}`
  );

  // Act II — the climb / the shape of the career.
  const peakStr = d.peakFans.toLocaleString('en-US');
  paras.push(
    `At the peak there were ${peakStr} people who would have followed ${d.artistName} anywhere${
      d.comebackCount > 0
        ? `. The career died and clawed its way back ${d.comebackCount} ${d.comebackCount === 1 ? 'time' : 'times'} — each comeback louder than the funeral the press had already written`
        : ''
    }.`
  );

  // Act III — the defining moments.
  const top = d.moments
    .filter((m) => m.kind !== 'debut')
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);
  if (top.length) {
    paras.push(
      `The footage everyone replays: ${top
        .map((m) => `${m.headline.toLowerCase()} (week ${m.week})`)
        .join('; ')}. That is the part they could not look away from.`
    );
  }

  // Act IV — the verdict / identity.
  paras.push(`${d.identity.blurb} ${tierSentence(d)}`);

  // Coda — retirement vs still going.
  if (d.retiredWeek !== null) {
    paras.push(
      `${d.artistName} walked away in week ${d.retiredWeek}, a ${d.identity.title.toLowerCase()} with a legacy score of ${d.legacy.total}. The mic went quiet. The story did not.`
    );
  } else {
    paras.push(
      `And it is not over. Week ${d.weeksActive}, legacy ${d.legacy.total}, pen still moving. The last chapter of ${d.artistName} has not been written yet.`
    );
  }

  return paras;
}

/**
 * Deterministic career BIOGRAPHY — a factual life-story register, distinct
 * from the cinematic documentary. Same offline-truth contract: always works,
 * costs $0; the Phase 4 gateway can optionally re-voice it via
 * `enhanceBiography` (ai/pipelines), purely cosmetic.
 */
export function buildBiography(d: CareerDossier): ChronicleArticle {
  const peak = d.peakFans.toLocaleString('en-US');
  const paras: string[] = [
    `${d.artistName} emerged as a ${d.archetype.replace(/-/g, ' ')} working in ${d.genre} — one more unknown in a genre that rarely waits for anyone.`,
    `Across ${d.weeksActive} weeks the name traveled further than the odds allowed, reaching a peak of ${peak} fans${
      d.comebackCount > 0
        ? ` and surviving ${d.comebackCount} comeback${d.comebackCount === 1 ? '' : 's'} the press had already written off`
        : ''
    }.`,
  ];

  const defining = [...d.moments]
    .filter((m) => m.kind !== 'debut')
    .sort((a, b) => b.weight - a.weight)[0];
  if (defining) {
    paras.push(
      `If a single moment fixed ${d.artistName} in the public record, it was ${defining.headline.toLowerCase()} (week ${defining.week}) — the kind of thing a career is measured against ever after.`
    );
  }

  paras.push(d.identity.blurb);
  paras.push(
    d.retiredWeek !== null
      ? `${d.artistName} retired in week ${d.retiredWeek} as ${d.identity.title.toLowerCase()}, with a final legacy of ${d.legacy.total} out of 1000.`
      : `Still active in week ${d.weeksActive}, ${d.identity.title.toLowerCase()} carrying a legacy score of ${d.legacy.total} — and a chapter that refuses to close.`
  );

  return { title: `${d.artistName}: A Biography`, paragraphs: paras };
}

/**
 * Deterministic "Top Moments" article — the career's most legendary/infamous
 * beats, ranked. No line numbering (so an AI re-voice via `enhanceTopMoments`
 * swaps in cleanly); the UI supplies the ranking affordance.
 */
export function buildTopMoments(d: CareerDossier, limit = 5): ChronicleArticle {
  const ranked = [...d.moments]
    .filter((m) => m.kind !== 'debut')
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);

  const paragraphs = ranked.length
    ? ranked.map((m) => `${m.headline} — ${m.detail}.`)
    : [
        `The story of ${d.artistName} is still quieter than the headlines — the defining moment may not have landed yet.`,
      ];

  return { title: `${d.artistName}: Top Moments`, paragraphs };
}
