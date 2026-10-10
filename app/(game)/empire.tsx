import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Orb3D } from '../../components/fx/Orb3D';
import {
  SegmentedControl,
  type Segment,
} from '../../components/ui/SegmentedControl';
import { OverviewSection } from '../../components/empire/OverviewSection';
import { BusinessSection } from '../../components/empire/BusinessSection';
import { BadgesSection } from '../../components/empire/BadgesSection';
import { MogulSection } from '../../components/empire/MogulSection';
import { COLORS, SPACING } from '../../constants/theme';

type Tab = 'overview' | 'business' | 'mogul';

const SEGMENTS: readonly Segment<Tab>[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'business', label: 'Business' },
  { key: 'mogul', label: 'Mogul' },
];

/**
 * Empire — the business side of the career: stage, level, badges, labels,
 * tours and PR. One header, a segmented control, and a single focused
 * section at a time. What the artist owns and where they live is in Life.
 */
export default function Empire() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="YOUR EMPIRE"
        title="Empire"
        subtitle="Stage, legacy, labels, tours and PR."
        accent={COLORS.gold}
        right={<Orb3D size={52} color={COLORS.gold} icon="trophy" />}
      />
      <SegmentedControl
        segments={SEGMENTS}
        value={tab}
        onChange={setTab}
        style={styles.segment}
      />
      {tab === 'overview' && (
        <>
          <OverviewSection />
          <BadgesSection />
        </>
      )}
      {tab === 'business' && <BusinessSection />}
      {tab === 'mogul' && <MogulSection />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: { marginBottom: SPACING.lg },
});
