/**
 * Live-mode bottom UI: household portraits, the 8 needs bars, the action
 * queue, and the Skills / Relationships / Job / House info tabs.
 */

import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Sim, World } from '../core/types';
import { MOTIVE_IDS, SKILL_IDS } from '../core/types';
import { OUTFIT_COLORS, zodiacIcon } from '../core/sim';
import { CAREER_TRACKS } from '../data/careers';
import { useLifeSimStore } from '../../store/lifeSimStore';
import { getMusicOccupation } from '../bridge';
import { lotAssetValue } from '../core/grid';
import { activeLot } from '../core/world';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';

const MOTIVE_LABELS: Record<string, string> = {
  hunger: 'Hunger',
  comfort: 'Comfort',
  hygiene: 'Hygiene',
  bladder: 'Bladder',
  energy: 'Energy',
  fun: 'Fun',
  social: 'Social',
  room: 'Room',
};

function barColor(v: number): string {
  if (v >= 20) return COLORS.positive;
  if (v >= -40) return COLORS.warning;
  return COLORS.negative;
}

function Bar({ label, value }: { label: string; value: number }) {
  const pct = (value + 100) / 2; // -100..100 → 0..100
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View
          style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor(value) }]}
        />
      </View>
    </View>
  );
}

function Portraits({ world }: { world: World }) {
  const selectSim = useLifeSimStore((s) => s.selectSim);
  const lot = activeLot(world);
  const hh = lot?.householdId ? world.households[lot.householdId] : null;
  if (!hh) return null;
  return (
    <View style={styles.portraitRow}>
      {hh.simIds.map((id) => {
        const sim = world.sims[id];
        if (!sim || sim.dead || sim.ghost) return null;
        const selected = world.selectedSimId === id;
        return (
          <Pressable
            key={id}
            onPress={() => selectSim(id)}
            style={[
              styles.portrait,
              { backgroundColor: OUTFIT_COLORS[sim.outfit % OUTFIT_COLORS.length] },
              selected && styles.portraitSelected,
              { borderColor: barColor(sim.mood) },
            ]}
          >
            <Text style={styles.portraitText}>
              {sim.age === 'baby' ? '👶' : sim.name.charAt(0)}
            </Text>
            {sim.career?.atWork && <Text style={styles.portraitBadge}>💼</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

function QueueChips({ sim }: { sim: Sim }) {
  const cancel = useLifeSimStore((s) => s.cancelQueuedAction);
  const items = [
    ...(sim.action ? [{ ...sim.action, current: true }] : []),
    ...sim.queue.map((q) => ({ ...q, current: false })),
  ];
  if (items.length === 0) return null;
  return (
    <ScrollView horizontal style={styles.queueRow} showsHorizontalScrollIndicator={false}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => cancel(sim.id, item.id)}
          style={[styles.queueChip, item.current && styles.queueChipCurrent]}
        >
          <Text style={styles.queueIcon}>{item.icon}</Text>
          <Text style={styles.queueLabel} numberOfLines={1}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

type Tab = 'needs' | 'skills' | 'rels' | 'job' | 'house';

export function LivePanel({ world }: { world: World }) {
  const [tab, setTab] = useState<Tab>('needs');
  const sim = world.selectedSimId ? world.sims[world.selectedSimId] : null;
  if (!sim) return null;

  return (
    <View style={styles.panel}>
      <View style={styles.headerRow}>
        <Portraits world={world} />
        <View style={styles.tabRow}>
          {(['needs', 'skills', 'rels', 'job', 'house'] as Tab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'needs' ? '📊' : t === 'skills' ? '⭐' : t === 'rels' ? '❤️' : t === 'job' ? '💼' : '🏠'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.simName}>
        {sim.name} {zodiacIcon(sim.zodiac)} · mood {Math.round(sim.mood)}
      </Text>
      <QueueChips sim={sim} />

      <ScrollView style={styles.tabBody} showsVerticalScrollIndicator={false}>
        {tab === 'needs' && (
          <View style={styles.needsGrid}>
            {MOTIVE_IDS.map((m) => (
              <View key={m} style={styles.needsCell}>
                <Bar label={MOTIVE_LABELS[m]} value={sim.motives[m]} />
              </View>
            ))}
          </View>
        )}
        {tab === 'skills' && (
          <View>
            {SKILL_IDS.map((s) => (
              <Bar
                key={s}
                label={`${s.charAt(0).toUpperCase()}${s.slice(1)} ${Math.floor(sim.skills[s])}`}
                value={sim.skills[s] * 20 - 100}
              />
            ))}
            <Text style={styles.hint}>
              Personality: neat {sim.personality.neat} · outgoing {sim.personality.outgoing} ·
              active {sim.personality.active} · playful {sim.personality.playful} · nice {sim.personality.nice}
            </Text>
          </View>
        )}
        {tab === 'rels' && <RelsTab world={world} sim={sim} />}
        {tab === 'job' && <JobTab world={world} sim={sim} />}
        {tab === 'house' && <HouseTab world={world} />}
      </ScrollView>
    </View>
  );
}

function RelsTab({ world, sim }: { world: World; sim: Sim }) {
  const entries = Object.entries(sim.relationships)
    .map(([id, rel]) => ({ other: world.sims[id], rel }))
    .filter((e) => e.other && !e.other.npc)
    .sort((a, b) => b.rel.daily - a.rel.daily)
    .slice(0, 12);
  if (entries.length === 0) {
    return <Text style={styles.hint}>Nobody yet. Answer the door. Say words.</Text>;
  }
  return (
    <View>
      {entries.map(({ other, rel }) => (
        <View key={other!.id} style={styles.relRow}>
          <Text style={styles.relName} numberOfLines={1}>
            {rel.love ? '❤️' : rel.friend ? '😊' : rel.enemy ? '💢' : '·'} {other!.name}
          </Text>
          <Text style={styles.relScore}>
            {Math.round(rel.daily)} / {Math.round(rel.lifetime)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function JobTab({ world, sim }: { world: World; sim: Sim }) {
  const sendToWork = useLifeSimStore((s) => s.sendToWork);
  const isArtist =
    world.playerHouseholdId !== null &&
    world.households[world.playerHouseholdId]?.simIds[0] === sim.id;

  if (sim.age === 'child') {
    return (
      <View>
        <Text style={styles.jobTitle}>🎒 Student</Text>
        <Bar label={`Grade ${Math.round(sim.grade)}`} value={sim.grade * 2 - 100} />
        <Text style={styles.hint}>School bus on weekdays at 8 AM. Mood at pickup moves the grade.</Text>
      </View>
    );
  }

  if (isArtist) {
    const occupation = getMusicOccupation();
    return (
      <View>
        <Text style={styles.jobTitle}>🎤 {occupation?.title ?? 'Artist'}</Text>
        <Text style={styles.hint}>
          {occupation?.blurb ?? ''} Keep the artist rested and happy at home — a good mood here
          carries into the music grind (shared wallet, shared life).
        </Text>
        {sim.career && <RegularJob world={world} sim={sim} onWork={() => sendToWork(sim.id)} />}
      </View>
    );
  }

  if (!sim.career) {
    return (
      <Text style={styles.hint}>
        Unemployed. Find a job through the newspaper or a computer.
      </Text>
    );
  }
  return <RegularJob world={world} sim={sim} onWork={() => sendToWork(sim.id)} />;
}

function RegularJob({
  world,
  sim,
  onWork,
}: {
  world: World;
  sim: Sim;
  onWork: () => void;
}) {
  const track = sim.career ? CAREER_TRACKS[sim.career.trackId] : null;
  if (!sim.career || !track) return null;
  const level = track.levels[sim.career.level];
  const next = track.levels[sim.career.level + 1];
  const h = (m: number) => `${Math.floor(m / 60)}:${(m % 60).toString().padStart(2, '0')}`;
  return (
    <View>
      <Text style={styles.jobTitle}>
        {track.icon} {level.title} — §{level.salary}/day
      </Text>
      <Text style={styles.hint}>
        Shift {h(level.start)}–{h(level.end)} · performance {Math.round(sim.career.performance)}
        {sim.career.missedDays > 0 ? ` · missed ${sim.career.missedDays} day(s)!` : ''}
      </Text>
      {next && (
        <Text style={styles.hint}>
          Next: {next.title} — needs{' '}
          {Object.entries(next.skills)
            .map(([s, v]) => `${s} ${v}`)
            .join(', ') || 'nothing'}
          {next.friends > 0 ? ` + ${next.friends} friends` : ''}
        </Text>
      )}
      {!sim.career.atWork && (
        <Pressable style={styles.workBtn} onPress={onWork}>
          <Text style={styles.workBtnText}>🚗 Go To Work Now</Text>
        </Pressable>
      )}
    </View>
  );
}

function HouseTab({ world }: { world: World }) {
  const setAutonomy = useLifeSimStore((s) => s.setAutonomy);
  const runCheat = useLifeSimStore((s) => s.runCheat);
  const [cheat, setCheat] = useState('');
  const [cheatMsg, setCheatMsg] = useState<string | null>(null);
  const lot = activeLot(world);
  const hh = lot?.householdId ? world.households[lot.householdId] : null;
  if (!lot || !hh) return null;
  const overdueDays = hh.bills.length
    ? world.day - Math.min(...hh.bills.map((b) => b.issuedDay))
    : 0;
  return (
    <View>
      <Text style={styles.hint}>
        Assets §{lotAssetValue(world, lot)} · Bills:{' '}
        {hh.bills.length === 0
          ? 'none'
          : `§${hh.bills.reduce((a, b) => a + b.amount, 0)} (${overdueDays}d old — repo at 5d)`}
        {lot.maidHired ? ' · 🧹 maid hired' : ''}
      </Text>
      <Text style={styles.hint}>Free will: {world.autonomy}%</Text>
      <View style={styles.autonomyRow}>
        {[0, 25, 50, 75, 100].map((v) => (
          <Pressable
            key={v}
            onPress={() => setAutonomy(v)}
            style={[styles.autonomyBtn, world.autonomy === v && styles.autonomyBtnActive]}
          >
            <Text style={styles.autonomyText}>{v}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.cheatRow}>
        <TextInput
          style={styles.cheatInput}
          value={cheat}
          onChangeText={setCheat}
          placeholder="cheat code…"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
        />
        <Pressable
          style={styles.workBtn}
          onPress={() => {
            setCheatMsg(runCheat(cheat));
            setCheat('');
          }}
        >
          <Text style={styles.workBtnText}>Run</Text>
        </Pressable>
      </View>
      {cheatMsg && <Text style={styles.hint}>{cheatMsg}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    maxHeight: 300,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  portraitRow: { flexDirection: 'row', gap: 6 },
  portrait: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitSelected: { transform: [{ scale: 1.12 }] },
  portraitText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  portraitBadge: { position: 'absolute', bottom: -4, right: -4, fontSize: 10 },
  tabRow: { flexDirection: 'row', gap: 4 },
  tabBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface2,
  },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13 },
  tabTextActive: { fontSize: 13 },
  simName: {
    color: COLORS.text,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    marginTop: 6,
  },
  queueRow: { marginTop: 6, maxHeight: 34 },
  queueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    gap: 4,
  },
  queueChipCurrent: { borderWidth: 1, borderColor: COLORS.primary },
  queueIcon: { fontSize: 12 },
  queueLabel: { color: COLORS.textSecondary, fontSize: 10, maxWidth: 80 },
  tabBody: { marginTop: 8 },
  needsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  needsCell: { width: '50%', paddingRight: 8 },
  barRow: { marginBottom: 6 },
  barLabel: { color: COLORS.textSecondary, fontSize: 10, marginBottom: 2 },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surface3,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4 },
  hint: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 6, lineHeight: 16 },
  relRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  relName: { color: COLORS.text, fontSize: FONTS.sizes.sm, flex: 1 },
  relScore: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
  jobTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.semibold,
  },
  workBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  workBtnText: { color: '#FFF', fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold },
  autonomyRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  autonomyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface2,
  },
  autonomyBtnActive: { backgroundColor: COLORS.primary },
  autonomyText: { color: COLORS.text, fontSize: FONTS.sizes.xs },
  cheatRow: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' },
  cheatInput: {
    flex: 1,
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    color: COLORS.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: FONTS.sizes.sm,
  },
});
