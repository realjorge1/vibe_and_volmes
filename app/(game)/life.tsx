import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Orb3D } from '../../components/fx/Orb3D';
import {
  SegmentedControl,
  type Segment,
} from '../../components/ui/SegmentedControl';
import { ActivitiesSection } from '../../components/life/ActivitiesSection';
import { PeopleSection } from '../../components/life/PeopleSection';
import { AssetsSection } from '../../components/life/AssetsSection';
import { SPACING } from '../../constants/theme';

type Tab = 'activities' | 'people' | 'assets';

const SEGMENTS: readonly Segment<Tab>[] = [
  { key: 'activities', label: 'Activities' },
  { key: 'people', label: 'People' },
  { key: 'assets', label: 'Assets' },
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
      <ScreenHeader
        eyebrow="YOUR LIFE"
        title="Life"
        subtitle="What you do, who you love, what you own."
        accent={'#FF7EBD'}
        right={<Orb3D size={52} color={'#FF7EBD'} icon="heart" />}
      />
      <SegmentedControl
        segments={SEGMENTS}
        value={tab}
        onChange={setTab}
        style={styles.segment}
      />
      {tab === 'activities' && <ActivitiesSection />}
      {tab === 'people' && <PeopleSection />}
      {tab === 'assets' && <AssetsSection />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: { marginBottom: SPACING.lg },
});
