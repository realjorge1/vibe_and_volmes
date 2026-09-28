import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Typography';
import {
  SegmentedControl,
  type Segment,
} from '../../components/ui/SegmentedControl';
import { OverviewSection } from '../../components/empire/OverviewSection';
import { BusinessSection } from '../../components/empire/BusinessSection';
import { BadgesSection } from '../../components/empire/BadgesSection';
import { SPACING } from '../../constants/theme';

type Tab = 'overview' | 'business';

const SEGMENTS: readonly Segment<Tab>[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'business', label: 'Business' },
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
      <Text variant="title" style={styles.title}>
        Empire
      </Text>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: SPACING.base, marginBottom: SPACING.md },
  segment: { marginBottom: SPACING.lg },
});
