import type { MediaHeadlineTemplate, MediaOutletKind } from '../../types/industry';

/**
 * Headlines are generated from the interview net outcome. "Misleading"
 * templates fire even on neutral interviews — the media distorts. Tokens:
 * {artist} {outlet} {topic}.
 */
export const HEADLINE_TEMPLATES: MediaHeadlineTemplate[] = [
  {
    id: 'h-pos-1',
    kind: 'positive',
    template: '{artist} wins over fans with candid {outlet} appearance',
    weight: 10,
  },
  {
    id: 'h-pos-2',
    kind: 'positive',
    template: '"Most honest interview in years": {artist} opens up on {outlet}',
    weight: 8,
  },
  {
    id: 'h-viral-1',
    kind: 'viral',
    template: '{artist}’s {outlet} moment is all anyone is talking about',
    weight: 9,
  },
  {
    id: 'h-viral-2',
    kind: 'viral',
    template: 'The internet cannot stop replaying {artist} on {outlet}',
    weight: 7,
  },
  {
    id: 'h-neg-1',
    kind: 'negative',
    template: '{artist} faces backlash after tense {outlet} interview',
    weight: 10,
  },
  {
    id: 'h-neg-2',
    kind: 'negative',
    template: 'Fans turn on {artist} over {topic} comments',
    weight: 8,
  },
  {
    id: 'h-mis-1',
    kind: 'misleading',
    template: '{artist} "SLAMS" peers in {outlet} sit-down (out of context)',
    weight: 9,
  },
  {
    id: 'h-mis-2',
    kind: 'misleading',
    template: 'Did {artist} just confirm the rumors on {outlet}?',
    weight: 8,
  },
  {
    id: 'h-neu-1',
    kind: 'neutral',
    template: '{artist} sits down with {outlet} to discuss {topic}',
    weight: 6,
  },
];

export const OUTLET_NAMES: Record<MediaOutletKind, string[]> = {
  podcast: ['The Greenroom', 'No Skips', 'Off The Record', 'Frequency'],
  radio: ['Hot 105 Drive', 'Morning Static', 'The City FM'],
  livestream: ['Live w/ Vexx', 'Unfiltered Stream', 'The Couch'],
  'award-show': ['the Crown Awards red carpet', 'the Pulse Awards backstage'],
  'press-conference': ['the press conference', 'the label presser'],
};

export function headlinesByKind(
  kind: MediaHeadlineTemplate['kind']
): MediaHeadlineTemplate[] {
  return HEADLINE_TEMPLATES.filter((h) => h.kind === kind);
}
