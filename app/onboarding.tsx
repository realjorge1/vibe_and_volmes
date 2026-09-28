import { useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type {
  Gender,
  MusicGenre,
  PlayerArchetype,
} from '../types/player';
import { ARCHETYPES } from '../data/archetypes';
import { GENRES } from '../data/genres';
import { CITIES, REGION_GROUPS } from '../data/cities';
import { usePlayerStore } from '../store/playerStore';
import { useGameStore } from '../store/gameStore';
import { useMetaStore } from '../store/metaStore';
import { STARTING_PERKS } from '../data/meta/perks';
import { BLOODLINES } from '../data/meta/bloodlines';
import { applyPendingInheritance } from '../systems/meta/applyInheritance';
import { initializeFirstWeek } from '../systems/weekEngine';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { Text } from '../components/ui/Typography';

const GENDERS: Gender[] = ['male', 'female'];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [realName, setRealName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [genre, setGenre] = useState<MusicGenre | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [archetype, setArchetype] = useState<PlayerArchetype | null>(null);
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

  const unlockedPerkIds = useMetaStore((s) => s.unlockedPerkIds);
  const unlockedBloodlineIds = useMetaStore((s) => s.unlockedBloodlineIds);
  const lifetimeLegacy = useMetaStore((s) => s.lifetimeLegacy);
  const availablePerks = STARTING_PERKS.filter((p) =>
    unlockedPerkIds.includes(p.id)
  );
  const availableBloodlines = BLOODLINES.filter((b) =>
    unlockedBloodlineIds.includes(b.id)
  );
  const hasInheritance =
    availablePerks.length > 0 || availableBloodlines.length > 0;
  const lastStep = hasInheritance ? 5 : 4;

  const [selectedPerks, setSelectedPerks] = useState<string[]>([]);
  const [selectedBloodline, setSelectedBloodline] = useState<string | null>(
    null
  );

  const canProceed = [
    realName.trim().length > 0 && artistName.trim().length > 0,
    gender !== null,
    genre !== null,
    city !== null,
    archetype !== null,
    true, // inheritance step is entirely optional
  ][step];

  const finish = () => {
    if (!gender || !genre || !city || !archetype) return;
    usePlayerStore.getState().createPlayer({
      artistName: artistName.trim(),
      realName: realName.trim(),
      gender,
      genre,
      city,
      archetype,
    });
    const def = ARCHETYPES.find((a) => a.id === archetype);
    const game = useGameStore.getState();
    for (const tag of def?.startingTags ?? []) game.addTag(tag);

    // Phase 5: layer the chosen cross-save inheritance on top of the
    // archetype before the first week is generated.
    if (hasInheritance) {
      const meta = useMetaStore.getState();
      meta.setPendingPerks(selectedPerks);
      meta.setPendingBloodline(selectedBloodline);
      applyPendingInheritance();
    }

    game.startGame();
    initializeFirstWeek();
    router.replace('/(game)');
  };

  const next = () => {
    if (!canProceed) return;
    step < lastStep ? setStep(step + 1) : finish();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.progress}>
        {Array.from({ length: lastStep + 1 }, (_, i) => i).map((i) => (
          <View
            key={i}
            style={[styles.dot, i <= step && styles.dotActive]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && (
          <>
            <Text variant="title">Introduce yourself to the world</Text>
            <Text variant="body" muted style={styles.sub}>
              Every legend has a real name and a stage name.
            </Text>
            <Text variant="label" muted style={styles.fieldLabel}>
              REAL NAME
            </Text>
            <TextInput
              value={realName}
              onChangeText={setRealName}
              placeholder="Jordan Carter"
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
            />
            <Text variant="label" muted style={styles.fieldLabel}>
              ARTIST NAME
            </Text>
            <TextInput
              value={artistName}
              onChangeText={setArtistName}
              placeholder="LIL VIBE"
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
            />
          </>
        )}

        {step === 1 && (
          <>
            <Text variant="title">How do you identify?</Text>
            <View style={styles.options}>
              {GENDERS.map((g) => (
                <SelectRow
                  key={g}
                  label={g[0].toUpperCase() + g.slice(1)}
                  selected={gender === g}
                  onPress={() => setGender(g)}
                />
              ))}
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text variant="title">Your sound</Text>
            <View style={styles.options}>
              {GENRES.map((g) => (
                <SelectRow
                  key={g.id}
                  label={g.label}
                  desc={g.description}
                  selected={genre === g.id}
                  onPress={() => setGenre(g.id)}
                />
              ))}
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text variant="title">Where&apos;s home?</Text>
            <View style={styles.options}>
              {CITIES.map((c) => (
                <SelectRow
                  key={c.id}
                  label={`${c.name}, ${c.state}`}
                  desc={c.description}
                  selected={city === c.id}
                  onPress={() => setCity(c.id)}
                />
              ))}
              {REGION_GROUPS.map((region) => {
                const open = expandedRegion === region.id;
                return (
                  <View key={region.id}>
                    <SelectRow
                      label={`${region.label} ${open ? '▾' : '▸'}`}
                      desc={region.description}
                      selected={region.cities.some((c) => c.id === city)}
                      onPress={() =>
                        setExpandedRegion(open ? null : region.id)
                      }
                    />
                    {open ? (
                      <View style={styles.regionCities}>
                        {region.cities.map((c) => (
                          <SelectRow
                            key={c.id}
                            label={`${c.name}, ${c.state}`}
                            desc={c.description}
                            selected={city === c.id}
                            onPress={() => setCity(c.id)}
                          />
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {step === 4 && (
          <>
            <Text variant="title">Your origin</Text>
            <View style={styles.options}>
              {ARCHETYPES.map((a) => (
                <SelectRow
                  key={a.id}
                  label={a.label}
                  desc={a.flavor}
                  selected={archetype === a.id}
                  onPress={() => setArchetype(a.id)}
                />
              ))}
            </View>
          </>
        )}

        {step === 5 && hasInheritance && (
          <>
            <Text variant="title">Your inheritance</Text>
            <Text variant="body" muted style={styles.sub}>
              {lifetimeLegacy.toLocaleString('en-US')} lifetime legacy. The
              legends you built before opened these doors — take what you want
              into this life, or start from nothing.
            </Text>

            {availableBloodlines.length > 0 && (
              <>
                <Text variant="label" muted style={styles.fieldLabel}>
                  BLOODLINE
                </Text>
                <View style={styles.options}>
                  <SelectRow
                    label="No bloodline"
                    desc="Start with a clean name. No expectations, no ghosts."
                    selected={selectedBloodline === null}
                    onPress={() => setSelectedBloodline(null)}
                  />
                  {availableBloodlines.map((b) => (
                    <SelectRow
                      key={b.id}
                      label={b.label}
                      desc={b.lore}
                      selected={selectedBloodline === b.id}
                      onPress={() => setSelectedBloodline(b.id)}
                    />
                  ))}
                </View>
              </>
            )}

            {availablePerks.length > 0 && (
              <>
                <Text variant="label" muted style={styles.fieldLabel}>
                  STARTING PERKS (TAP TO TOGGLE)
                </Text>
                <View style={styles.options}>
                  {availablePerks.map((p) => (
                    <SelectRow
                      key={p.id}
                      label={p.label}
                      desc={p.description}
                      selected={selectedPerks.includes(p.id)}
                      onPress={() =>
                        setSelectedPerks((cur) =>
                          cur.includes(p.id)
                            ? cur.filter((x) => x !== p.id)
                            : [...cur, p.id]
                        )
                      }
                    />
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && (
          <Pressable
            onPress={() => setStep(step - 1)}
            style={({ pressed }) => [
              styles.btn,
              styles.btnGhost,
              pressed && styles.btnPressed,
            ]}
          >
            <Text variant="subheading" weight="semibold" color={COLORS.textSecondary}>
              Back
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={next}
          style={({ pressed }) => [
            styles.btn,
            styles.btnPrimary,
            pressed && styles.btnPressed,
          ]}
        >
          <Text variant="subheading" weight="semibold" color={COLORS.bg} center>
            {step === lastStep ? 'Start Career' : 'Continue'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function SelectRow({
  label,
  desc,
  selected,
  onPress,
}: {
  label: string;
  desc?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.selectRow, selected && styles.selectRowActive]}
    >
      <Text variant="subheading" color={selected ? COLORS.primary : COLORS.text}>
        {label}
      </Text>
      {desc ? (
        <Text variant="caption" muted style={styles.selectDesc}>
          {desc}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  progress: {
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.base,
  },
  dot: {
    flex: 1,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface3,
  },
  dotActive: { backgroundColor: COLORS.primary },
  content: { padding: SPACING.base, paddingBottom: SPACING['3xl'] },
  sub: { marginTop: SPACING.xs, marginBottom: SPACING.lg },
  fieldLabel: { marginTop: SPACING.lg, marginBottom: SPACING.sm },
  input: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    padding: SPACING.base,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  options: { marginTop: SPACING.lg, gap: SPACING.md },
  regionCities: {
    gap: SPACING.md,
    marginTop: SPACING.md,
    marginLeft: SPACING.base,
  },
  selectRow: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectRowActive: { borderColor: COLORS.primary },
  selectDesc: { marginTop: SPACING.xs, lineHeight: 18 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.base,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  btn: {
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { flex: 1, backgroundColor: COLORS.primary },
  btnGhost: { backgroundColor: 'transparent' },
  btnPressed: { opacity: 0.85 },
});
