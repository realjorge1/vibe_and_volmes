import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { locationOptions, searchLocations } from '../../../data/social/locations';
import { T } from '../T';
import { KeyboardSpacer } from '../KeyboardSpacer';

export interface PickerTheme {
  bg: string;
  text: string;
  muted: string;
  line: string;
  field: string;
  accent: string;
}

type Row = { kind: 'custom'; label: string } | { kind: 'place'; label: string } | { kind: 'remove' };

/**
 * "Add location": the artist's city, real places, made-up ones, or whatever
 * they type ("Use 'my auntie's rooftop'"). Nothing is checked: it's a game.
 */
export function LocationPicker({
  theme,
  home,
  value,
  onPick,
  onClose,
  title = 'Add location',
}: {
  theme: PickerTheme;
  home: string | null;
  value?: string | null;
  onPick: (location: string | null) => void;
  onClose: () => void;
  title?: string;
}) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const options = useMemo(() => locationOptions(home), [home]);
  const rows = useMemo<Row[]>(() => {
    const typed = q.trim();
    const found = searchLocations(options, typed).map((label): Row => ({ kind: 'place', label }));
    const exact = found.some((r) => r.kind === 'place' && r.label.toLowerCase() === typed.toLowerCase());
    return [
      ...(value && !typed ? [{ kind: 'remove' } as Row] : []),
      ...(typed && !exact ? [{ kind: 'custom', label: typed.slice(0, 60) } as Row] : []),
      ...found,
    ];
  }, [q, options, value]);

  return (
    <View style={[styles.fill, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={26} color={theme.text} />
        </Pressable>
        <T size={19} weight="700" color={theme.text}>
          {title}
        </T>
      </View>
      <View style={[styles.search, { backgroundColor: theme.field }]}>
        <Ionicons name="search" size={17} color={theme.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Find a location"
          placeholderTextColor={theme.muted}
          style={[styles.input, { color: theme.text }]}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => {
            const typed = q.trim();
            if (typed) onPick(typed.slice(0, 60));
          }}
        />
        {q ? (
          <Pressable onPress={() => setQ('')} hitSlop={8}>
            <Ionicons name="close-circle" size={17} color={theme.muted} />
          </Pressable>
        ) : null}
      </View>
      <FlatList
        data={rows}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(r, i) => (r.kind === 'remove' ? 'remove' : `${r.kind}:${r.label}:${i}`)}
        renderItem={({ item }) => {
          if (item.kind === 'remove') {
            return (
              <Pressable onPress={() => onPick(null)} style={[styles.row, { borderBottomColor: theme.line }]}>
                <Ionicons name="close" size={20} color={theme.text} />
                <T size={15} color={theme.text}>
                  Remove location
                </T>
              </Pressable>
            );
          }
          const [name, ...rest] = item.label.split(',');
          return (
            <Pressable onPress={() => onPick(item.label)} style={[styles.row, { borderBottomColor: theme.line }]}>
              <View style={[styles.pin, { borderColor: theme.line }]}>
                <Ionicons name={item.kind === 'custom' ? 'add' : 'location-outline'} size={18} color={theme.text} />
              </View>
              <View style={styles.flex}>
                <T size={15} weight="600" color={theme.text} numberOfLines={1}>
                  {item.kind === 'custom' ? `Use “${item.label}”` : name.trim()}
                </T>
                {item.kind === 'place' && rest.length > 0 ? (
                  <T size={13} color={theme.muted} numberOfLines={1}>
                    {rest.join(',').trim()}
                  </T>
                ) : null}
              </View>
              {value === item.label ? <Ionicons name="checkmark" size={20} color={theme.accent} /> : null}
            </Pressable>
          );
        }}
      />
      <KeyboardSpacer />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 14, height: 54 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 14, marginBottom: 6, paddingHorizontal: 12, height: 38, borderRadius: 10 },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  pin: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
