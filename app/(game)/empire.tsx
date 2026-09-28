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
import { LifestyleSection } from '../../components/empire/LifestyleSection';
import { SPACING } from '../../constants/theme';

type Tab = 'overview' | 'business' | 'lifestyle';

const SEGMENTS: readonly Segment<Tab>[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'business', label: 'Business' },
  { key: 'lifestyle', label: 'Lifestyle' },
];

/**
 * Empire — the merged Career + Industry + Status hub. One header, a segmented
 * control, and a single focused section at a time so the dense business data
 * never becomes an overwhelming mega-scroll.
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
      {tab === 'overview' && <OverviewSection />}
      {tab === 'business' && <BusinessSection />}
      {tab === 'lifestyle' && <LifestyleSection />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: SPACING.base, marginBottom: SPACING.md },
  segment: { marginBottom: SPACING.lg },
});
