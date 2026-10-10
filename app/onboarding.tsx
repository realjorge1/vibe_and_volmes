import { useState } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import type {
  Gender,
  MusicGenre,
  PlayerArchetype,
} from '../types/player';
import { ARCHETYPES } from '../data/archetypes';
import { STARTING_AGES } from '../data/life/lifeStages';
import { GENRES } from '../data/genres';
import { CITIES, REGION_GROUPS } from '../data/cities';
import { usePlayerStore } from '../store/playerStore';
import { useGameStore } from '../store/gameStore';
import { useMetaStore } from '../store/metaStore';
import { STARTING_PERKS } from '../data/meta/perks';
import { BLOODLINES, getBloodline } from '../data/meta/bloodlines';
import { applyPendingInheritance } from '../systems/meta/applyInheritance';
import { applyHeir } from '../systems/meta/applyHeir';
import { formatMoney } from '../utils/formatters';
import { initializeFirstWeek } from '../systems/weekEngine';
import { saveAll } from '../systems/persistence';
import { SCENARIOS, getScenario } from '../data/meta/scenarios';
import { STARTER_TRAITS, STARTER_TRAIT_COUNT } from '../data/identity/traits';
import { applyScenario, finishScenario } from '../systems/meta/applyScenario';
import { featuredChallenge, startRun } from '../systems/meta/challengeEngine';
import { grantTrait } from '../systems/identity/traits';
import { useIdentityStore } from '../store/identityStore';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING, ifAnimated, withAlpha } from '../constants/theme';
import { Text } from '../components/ui/Typography';
import { Button } from '../components/ui/Button';
import { PressableScale } from '../components/ui/PressableScale';
import { AmbientBackground } from '../components/fx/AmbientBackground';
import { Vinyl3D } from '../components/fx/Vinyl3D';
import { GradientText } from '../components/fx/GradientText';
import { Orb3D } from '../components/fx/Orb3D';

type Glyph = keyof typeof Ionicons.glyphMap;

const GENDERS: Gender[] = ['male', 'female'];

/** Each step's orb glyph and stage-light color. */
const STEP_META: { icon: string; color: string; eyebrow: string }[] = [
  { icon: 'person', color: COLORS.primary, eyebrow: 'WHO ARE YOU' },
  { icon: 'people', color: COLORS.accent, eyebrow: 'IDENTITY' },
  { icon: 'map', color: '#FF7EBD', eyebrow: 'YOUR START' },
  { icon: 'hourglass', color: COLORS.gold, eyebrow: 'YOUR AGE' },
  { icon: 'musical-notes', color: COLORS.secondary, eyebrow: 'YOUR SOUND' },
  { icon: 'location', color: '#4DA8FF', eyebrow: 'YOUR CITY' },
  { icon: 'flame', color: '#FF8A3D', eyebrow: 'YOUR STORY' },
  { icon: 'sparkles', color: '#A08BFF', eyebrow: 'PERSONALITY' },
  { icon: 'infinite', color: COLORS.gold, eyebrow: 'LEGACY' },
];

export default function Onboarding() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const [focused, setFocused] = useState<'real' | 'artist' | null>(null);

  // Continuing as the last artist's child: the family name, city, genre
  // leaning and age come pre-filled (all but the age can still be changed).
  const [heir] = useState(() => useMetaStore.getState().pendingHeir);

  const [realName, setRealName] = useState(heir ? `${heir.childName} ${heir.surname}` : '');
  const [artistName, setArtistName] = useState('');
  const [gender, setGender] = useState<Gender | null>(
    heir && heir.gender !== 'nonbinary' ? heir.gender : null
  );
  const [genre, setGenre] = useState<MusicGenre | null>(heir?.genre ?? null);
  const [city, setCity] = useState<string | null>(heir?.city ?? null);
  const [archetype, setArchetype] = useState<PlayerArchetype | null>(null);
  const [startAge, setStartAge] = useState<number | null>(heir?.startAge ?? null);
  const [scenarioId, setScenarioId] = useState<string>('classic');
  const [traits, setTraits] = useState<string[]>([]);
  const [takeChallenge, setTakeChallenge] = useState(false);
  const challenge = featuredChallenge();
  const scenario = getScenario(scenarioId);
  const ageOptions = heir
    ? [
        {
          age: heir.startAge,
          label: `${heir.startAge} · ${heir.parent.artistName}'s kid`,
          backstory: 'You grew up backstage. Now it is your name on the poster.',
        },
      ]
    : scenario?.age !== undefined
      ? [{ age: scenario.age, label: `${scenario.age} · ${scenario.label}`, backstory: scenario.blurb }]
      : STARTING_AGES;
  const pickScenario = (id: string) => {
    setScenarioId(id);
    const def = getScenario(id);
    if (def?.age !== undefined) setStartAge(def.age);
    else if (startAge !== null && !STARTING_AGES.some((a) => a.age === startAge)) setStartAge(null);
  };
  const toggleTrait = (id: string) =>
    setTraits((cur) =>
      cur.includes(id) ? cur.filter((t) => t !== id) : cur.length >= STARTER_TRAIT_COUNT ? [...cur.slice(1), id] : [...cur, id]
    );
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
    availablePerks.length > 0 || availableBloodlines.length > 0 || heir !== null;
  const lastStep = 8;

  const [selectedPerks, setSelectedPerks] = useState<string[]>([]);
  const [selectedBloodline, setSelectedBloodline] = useState<string | null>(
    null
  );

  const canProceed = [
    realName.trim().length > 0 && artistName.trim().length > 0,
    gender !== null,
    true, // a start is always picked (From Nothing by default)
    startAge !== null,
    genre !== null,
    city !== null,
    archetype !== null,
    traits.length === STARTER_TRAIT_COUNT,
    true, // legacy step is entirely optional
  ][step];

  const finish = () => {
    if (!gender || !genre || !city || !archetype || startAge === null) return;
    usePlayerStore.getState().createPlayer({
      artistName: artistName.trim(),
      realName: realName.trim(),
      gender,
      genre,
      city,
      archetype,
      startAge,
    });
    const def = ARCHETYPES.find((a) => a.id === archetype);
    const game = useGameStore.getState();
    for (const tag of def?.startingTags ?? []) game.addTag(tag);

    // The situation this life starts in (an heir's start is their parent).
    applyScenario(heir ? 'classic' : scenarioId);

    // A child run takes what the last career left (and its bloodline).
    const inherited = heir ? useMetaStore.getState().consumeHeir() : null;
    if (inherited) applyHeir(inherited);

    // Phase 5: layer the chosen cross-save inheritance on top of the
    // archetype before the first week is generated.
    if (hasInheritance) {
      const meta = useMetaStore.getState();
      meta.setPendingPerks(selectedPerks);
      if (!inherited) meta.setPendingBloodline(selectedBloodline);
      applyPendingInheritance();
    }

    // Who they are, and what they are trying to do with this life.
    for (const t of traits) grantTrait(t);
    if (takeChallenge) useIdentityStore.getState().setChallenge(startRun(challenge, 1));

    game.startGame();
    initializeFirstWeek();
    finishScenario();
    saveAll();
    router.replace('/(game)');
  };

  const next = () => {
    if (!canProceed) return;
    step < lastStep ? setStep(step + 1) : finish();
  };

  const meta = STEP_META[step] ?? STEP_META[0];

  const header = (title: string, sub?: string) => (
    <View style={styles.stepHead}>
      <View style={styles.flex}>
        <Text variant="label" color={meta.color}>
          {meta.eyebrow}
        </Text>
        <Text variant="title" style={styles.stepTitle}>
          {title}
        </Text>
        {sub ? (
          <Text variant="body" muted style={styles.sub}>
            {sub}
          </Text>
        ) : null}
      </View>
      {step > 0 && <Orb3D size={56} color={meta.color} icon={meta.icon} />}
    </View>
  );

  return (
    <View style={styles.root}>
      <AmbientBackground tint={meta.color} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.progressWrap}>
          <View style={styles.progress}>
            {Array.from({ length: lastStep + 1 }, (_, i) => i).map((i) => (
              <View key={i} style={styles.dot}>
                {i <= step && (
                  <LinearGradient
                    colors={GRADIENTS.brand}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={[StyleSheet.absoluteFill, styles.dotRound]}
                  />
                )}
              </View>
            ))}
          </View>
          <Text variant="label" muted style={styles.stepCount}>
            {`STEP ${step + 1} / ${lastStep + 1}`}
          </Text>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View key={step} entering={ifAnimated(FadeInRight.duration(380).springify().damping(18))}>
            {step === 0 && (
              <>
                <View style={styles.hero}>
                  <Vinyl3D size={Math.min(210, width * 0.55)} label="V&V" />
                  <GradientText text="VIBE &" size={34} align="center" maxWidth={width - 48} style={styles.logo} />
                  <GradientText text="VOLUMES" size={34} align="center" maxWidth={width - 48} />
                  <Text variant="caption" muted center style={styles.tagline}>
                    From bedroom demos to stadium legend. Every week, a choice.
                  </Text>
                </View>
                {header(
                  heir ? `The ${heir.surname} name` : 'Introduce yourself to the world',
                  heir
                    ? `Child of ${heir.parent.artistName}. Everyone already knows your last name. Pick the one they will know you by.`
                    : 'Every legend has a real name and a stage name.'
                )}
                <Field
                  label="REAL NAME"
                  icon="person-circle"
                  value={realName}
                  onChangeText={setRealName}
                  placeholder="Jordan Carter"
                  focused={focused === 'real'}
                  onFocus={() => setFocused('real')}
                  onBlur={() => setFocused(null)}
                />
                <Field
                  label="ARTIST NAME"
                  icon="mic-circle"
                  value={artistName}
                  onChangeText={setArtistName}
                  placeholder="LIL VIBE"
                  focused={focused === 'artist'}
                  onFocus={() => setFocused('artist')}
                  onBlur={() => setFocused(null)}
                />
              </>
            )}

            {step === 1 && (
              <>
                {header('How do you identify?')}
                <View style={styles.options}>
                  {GENDERS.map((g, i) => (
                    <SelectRow
                      key={g}
                      index={i}
                      icon={g === 'male' ? 'male' : 'female'}
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
                {header(
                  heir ? `${heir.parent.artistName}'s kid` : 'How does your story start?',
                  heir
                    ? 'Your start is already written: a famous last name, and everything that comes with it.'
                    : 'Where you come from is your origin. This is the situation you start in. Some unlock as your legacy grows.'
                )}
                {!heir && (
                  <View style={styles.options}>
                    {SCENARIOS.map((sc, i) => {
                      const locked = lifetimeLegacy < sc.unlockLegacy;
                      return (
                        <SelectRow
                          key={sc.id}
                          index={i}
                          icon={locked ? 'lock-closed' : sc.icon}
                          label={locked ? `${sc.label} · ${sc.unlockLegacy} legacy` : sc.label}
                          desc={sc.blurb}
                          selected={scenarioId === sc.id}
                          onPress={() => (locked ? undefined : pickScenario(sc.id))}
                        />
                      );
                    })}
                  </View>
                )}
              </>
            )}

            {step === 3 && (
              <>
                {header(
                  'How old are you?',
                  'You age a year every few weeks. Some doors only open at certain ages, and some close.'
                )}
                <View style={styles.options}>
                  {ageOptions.map((a, i) => (
                    <SelectRow
                      key={a.age}
                      index={i}
                      icon="calendar"
                      label={a.label}
                      desc={a.backstory}
                      selected={startAge === a.age}
                      onPress={() => setStartAge(a.age)}
                    />
                  ))}
                </View>
              </>
            )}

            {step === 4 && (
              <>
                {header('Your sound')}
                <View style={styles.options}>
                  {GENRES.map((g, i) => (
                    <SelectRow
                      key={g.id}
                      index={i}
                      icon="musical-note"
                      label={g.label}
                      desc={g.description}
                      selected={genre === g.id}
                      onPress={() => setGenre(g.id)}
                    />
                  ))}
                </View>
              </>
            )}

            {step === 5 && (
              <>
                {header('Where’s home?')}
                <View style={styles.options}>
                  {CITIES.map((c, i) => (
                    <SelectRow
                      key={c.id}
                      index={i}
                      icon="location"
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
                          icon={open ? 'chevron-down-circle' : 'globe'}
                          label={region.label}
                          desc={region.description}
                          selected={region.cities.some((c) => c.id === city)}
                          onPress={() =>
                            setExpandedRegion(open ? null : region.id)
                          }
                        />
                        {open ? (
                          <Animated.View entering={ifAnimated(FadeInDown.duration(260))} style={styles.regionCities}>
                            {region.cities.map((c) => (
                              <SelectRow
                                key={c.id}
                                icon="location"
                                label={`${c.name}, ${c.state}`}
                                desc={c.description}
                                selected={city === c.id}
                                onPress={() => setCity(c.id)}
                              />
                            ))}
                          </Animated.View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {step === 6 && (
              <>
                {header('Your origin')}
                <View style={styles.options}>
                  {ARCHETYPES.map((a, i) => (
                    <SelectRow
                      key={a.id}
                      index={i}
                      icon="flame"
                      label={a.label}
                      desc={a.flavor}
                      selected={archetype === a.id}
                      onPress={() => setArchetype(a.id)}
                    />
                  ))}
                </View>
              </>
            )}

            {step === 7 && (
              <>
                {header(
                  'Who are you, really?',
                  `Pick ${STARTER_TRAIT_COUNT}. Traits open choices only you would make, bend your luck, and decide what you want. You will earn more by living.`
                )}
                <View style={styles.options}>
                  {STARTER_TRAITS.map((t, i) => (
                    <SelectRow
                      key={t.id}
                      index={i}
                      icon={t.icon}
                      multi
                      label={t.label}
                      desc={`${t.blurb}\n${t.perks.join(' · ')}`}
                      selected={traits.includes(t.id)}
                      onPress={() => toggleTrait(t.id)}
                    />
                  ))}
                </View>
              </>
            )}

            {step === 8 && (
              <>
                <Text variant="label" muted style={styles.fieldLabel}>
                  THIS WEEK’S CHALLENGE
                </Text>
                <SelectRow
                  icon={challenge.icon}
                  multi
                  label={`${challenge.title} · +${challenge.legacy} legacy`}
                  desc={challenge.blurb}
                  selected={takeChallenge}
                  onPress={() => setTakeChallenge(!takeChallenge)}
                />
                {header(
                  hasInheritance ? 'Your inheritance' : 'A clean slate',
                  hasInheritance
                    ? `${lifetimeLegacy.toLocaleString('en-US')} lifetime legacy. The legends you built before opened these doors — take what you want into this life, or start from nothing.`
                    : 'Nothing inherited yet. Every life you finish leaves something for the next one.'
                )}

                {heir && (
                  <View style={styles.heirCard}>
                    <LinearGradient
                      colors={[withAlpha(COLORS.gold, 0.2), 'rgba(255,255,255,0.02)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text variant="label" color={COLORS.gold}>
                      FROM {heir.parent.artistName.toUpperCase()} ·{' '}
                      {heir.parent.identityTitle.toUpperCase()}
                    </Text>
                    <Text variant="body" style={styles.selectDesc}>
                      {formatMoney(heir.money)} · {heir.fans.toLocaleString('en-US')} fans who
                      followed the name
                      {heir.rivalIds.length > 0
                        ? ` · ${heir.rivalIds.length} rival${heir.rivalIds.length > 1 ? 's' : ''} who remember`
                        : ''}
                    </Text>
                    {heir.bloodlineId && (
                      <Text variant="caption" muted style={styles.selectDesc}>
                        Bloodline: {getBloodline(heir.bloodlineId)?.label}.{' '}
                        {getBloodline(heir.bloodlineId)?.lore}
                      </Text>
                    )}
                  </View>
                )}

                {!heir && availableBloodlines.length > 0 && (
                  <>
                    <Text variant="label" muted style={styles.fieldLabel}>
                      BLOODLINE
                    </Text>
                    <View style={styles.options}>
                      <SelectRow
                        icon="leaf"
                        label="No bloodline"
                        desc="Start with a clean name. No expectations, no ghosts."
                        selected={selectedBloodline === null}
                        onPress={() => setSelectedBloodline(null)}
                      />
                      {availableBloodlines.map((b) => (
                        <SelectRow
                          key={b.id}
                          icon="git-branch"
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
                          icon="sparkles"
                          multi
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
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          {step > 0 && (
            <Button
              label="Back"
              icon="chevron-back"
              variant="ghost"
              onPress={() => setStep(step - 1)}
            />
          )}
          <View style={styles.flex}>
            <Button
              label={step === lastStep ? 'Start Career' : 'Continue'}
              icon={step === lastStep ? 'rocket' : 'arrow-forward'}
              variant="brand"
              size="lg"
              disabled={!canProceed}
              onPress={next}
              fullWidth
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function Field({
  label,
  icon,
  focused,
  ...input
}: {
  label: string;
  icon: string;
  focused: boolean;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  onFocus: () => void;
  onBlur: () => void;
}) {
  return (
    <>
      <Text variant="label" color={focused ? COLORS.primary : COLORS.textSecondary} style={styles.fieldLabel}>
        {label}
      </Text>
      <View
        style={[
          styles.inputWrap,
          focused && { borderColor: withAlpha(COLORS.primary, 0.8) },
        ]}
      >
        <Ionicons name={icon as Glyph} size={20} color={focused ? COLORS.primary : COLORS.textMuted} />
        <TextInput
          {...input}
          placeholderTextColor={COLORS.textMuted}
          selectionColor={COLORS.primary}
          style={styles.input}
        />
      </View>
    </>
  );
}

function SelectRow({
  label,
  desc,
  icon,
  selected,
  multi,
  index,
  onPress,
}: {
  label: string;
  desc?: string;
  icon?: string;
  selected: boolean;
  multi?: boolean;
  index?: number;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={index !== undefined ? ifAnimated(FadeInDown.delay(index * 45).duration(320)) : undefined}>
      <PressableScale
        onPress={onPress}
        scaleTo={0.97}
        style={[styles.selectRow, selected && styles.selectRowActive]}
      >
        {selected && (
          <LinearGradient
            colors={[withAlpha(COLORS.primary, 0.28), withAlpha(COLORS.secondary, 0.08)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        {icon ? (
          <View style={[styles.selectIcon, selected && styles.selectIconOn]}>
            <Ionicons name={icon as Glyph} size={17} color={selected ? '#FFFFFF' : COLORS.textSecondary} />
          </View>
        ) : null}
        <View style={styles.flex}>
          <Text variant="subheading" color={selected ? COLORS.text : COLORS.text}>
            {label}
          </Text>
          {desc ? (
            <Text variant="caption" muted style={styles.selectDesc}>
              {desc}
            </Text>
          ) : null}
        </View>
        <View style={[styles.check, multi && styles.checkSquare, selected && styles.checkOn]}>
          {selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  progressWrap: {
    paddingHorizontal: SPACING.lg - 4,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  progress: { flexDirection: 'row', gap: 6 },
  dot: {
    flex: 1,
    height: 5,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dotRound: { borderRadius: RADIUS.full },
  stepCount: { marginTop: SPACING.sm, fontSize: 9.5 },
  content: { paddingHorizontal: SPACING.lg - 4, paddingTop: SPACING.sm, paddingBottom: SPACING['3xl'] },
  hero: { alignItems: 'center', marginTop: SPACING.sm, marginBottom: SPACING.lg },
  logo: { marginTop: SPACING.sm },
  tagline: { marginTop: SPACING.sm, maxWidth: 280 },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.sm },
  stepTitle: { marginTop: 6, fontSize: 26, lineHeight: 33 },
  sub: { marginTop: SPACING.sm },
  fieldLabel: { marginTop: SPACING.lg, marginBottom: SPACING.sm },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.base,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.base,
    color: COLORS.text,
    fontSize: 16,
    fontFamily: FONTS.families.body['600'],
  },
  options: { marginTop: SPACING.lg, gap: SPACING.sm + 2 },
  regionCities: {
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    marginLeft: SPACING.base,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  selectRowActive: {
    borderColor: withAlpha(COLORS.primary, 0.85),
  },
  selectIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  selectIconOn: { backgroundColor: COLORS.primary },
  selectDesc: { marginTop: SPACING.xs, lineHeight: 18 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSquare: { borderRadius: 6 },
  checkOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  heirCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: withAlpha(COLORS.gold, 0.6),
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg - 4,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
});
