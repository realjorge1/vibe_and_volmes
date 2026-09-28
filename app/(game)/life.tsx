import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Typography';
import {
  SegmentedControl,
  type Segment,
} from '../../components/ui/SegmentedControl';
import { ActivitiesSection } from '../../components/life/ActivitiesSection';
import { PeopleSection } from '../../components/life/PeopleSection';
import { SPACING } from '../../constants/theme';

type Tab = 'activities' | 'people';

const SEGMENTS: readonly Segment<Tab>[] = [
  { key: 'activities', label: 'Activities' },
  { key: 'people', label: 'People' },
];

/**
 * Life — everything outside the business: what the artist does this week,
 * the people in their life, and what they own. Empire keeps the business
 * (labels, tours, PR, level). Every result here is also written to the Deck.
 */
export default function Life() {
  const [tab, setTab] = useState<Tab>('activities');

  return (
    <Screen scroll>
      <Text variant="title" style={styles.title}>
        Life
      </Text>
      <SegmentedControl
        segments={SEGMENTS}
        value={tab}
        onChange={setTab}
        style={styles.segment}
      />
      {tab === 'activities' && <ActivitiesSection />}
      {tab === 'people' && <PeopleSection />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: SPACING.base, marginBottom: SPACING.md },
  segment: { marginBottom: SPACING.lg },
});
