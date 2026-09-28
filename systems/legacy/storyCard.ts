import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { CareerDossier, StoryCard } from '../../types/legacy';
import { getEra } from '../../data/culture/eras';

/**
 * Offline story-card export. Turns a dossier into a compact, shareable
 * block and hands it to the OS share sheet via expo-sharing — exactly the
 * pattern audio/export/exporter.ts already uses. No network, no backend.
 * Players sharing these organically IS the growth engine (Phase 5 brief).
 */

const CARD_DIR = 'story_cards';

const TIER_LABEL: Record<string, string> = {
  immortal: 'IMMORTAL',
  legend: 'LEGEND',
  icon: 'ICON',
  star: 'STAR',
  respected: 'RESPECTED',
  footnote: 'FOOTNOTE',
  forgotten: 'FORGOTTEN',
};

export function toStoryCard(d: CareerDossier): StoryCard {
  const tier = TIER_LABEL[d.legacy.tier] ?? d.legacy.tier.toUpperCase();
  const signature =
    [...d.moments]
      .filter((m) => m.kind !== 'debut')
      .sort((a, b) => b.weight - a.weight)[0]?.headline ??
    'A career that refused to be ignored';

  const erasLabel =
    d.erasLived.length > 1
      ? `${getEra(d.erasLived[0]).label} → ${getEra(d.erasLived[d.erasLived.length - 1]).label}`
      : getEra(d.erasLived[0] ?? 'blog-era').label;

  const statLines = [
    `Peak fans: ${d.peakFans.toLocaleString('en-US')}`,
    `Lifetime earnings: $${Math.round(d.lifetimeEarnings).toLocaleString('en-US')}`,
    `Weeks active: ${d.weeksActive}${d.comebackCount ? ` · ${d.comebackCount} comeback${d.comebackCount === 1 ? '' : 's'}` : ''}`,
    `Eras survived: ${erasLabel}`,
  ];

  const tagline = `${d.identity.title} · ${tier} (${d.legacy.total}/1000)`;

  const shareText = [
    `🎤 ${d.artistName.toUpperCase()}`,
    tagline,
    '',
    ...statLines.map((l) => `• ${l}`),
    '',
    `“${signature}”`,
    '',
    d.documentary[d.documentary.length - 1] ?? '',
    '',
    '— built in Vibe & Volumes',
  ].join('\n');

  return {
    artistName: d.artistName,
    tagline,
    statLines,
    signatureMoment: signature,
    legacyTier: d.legacy.tier,
    legacyTotal: d.legacy.total,
    shareText,
  };
}

/** Write the card to a temp .txt and open the native share sheet. */
export async function shareStoryCard(card: StoryCard): Promise<boolean> {
  try {
    const dir = new Directory(Paths.document, CARD_DIR);
    if (!dir.exists) dir.create({ intermediates: true });
    const safe = card.artistName.replace(/[^a-z0-9]/gi, '_').slice(0, 40) || 'career';
    const f = new File(dir, `${safe}_legacy.txt`);
    if (f.exists) f.delete();
    f.create();
    f.write(card.shareText);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(f.uri, {
        mimeType: 'text/plain',
        dialogTitle: `${card.artistName} — career legacy`,
      });
      return true;
    }
    return false;
  } catch {
    // Sharing is a nice-to-have; never let it break the game.
    return false;
  }
}
