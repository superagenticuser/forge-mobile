// Progress > Records: current records, volume records, PR timeline with
// exercise filter, and per-exercise 1RM progression chart. Ports the web
// app's records tab (js/progress.js, tab === "records").
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { WorkoutLog } from '@/src/storage/workout';
import { useTheme } from '@/src/storage/settings';
import { fmtWeight } from '@/src/lib/training';
import { MUSCLE_GROUPS } from '@/src/data/exercises';
import {
  exercisePR,
  groupOfMuscle,
  oneRmProgression,
  prTimelineEvents,
  shortDateLabel,
  volumeRecords,
} from '@/src/lib/progress';
import { LineChart } from '@/src/components/progress/LineChart';
import { EmptyNote, Muted, SectionTitle } from '@/src/components/progress/ui';
import { radius, spacing } from '@/src/theme';

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.accent : colors.surface,
          borderColor: active ? colors.accent : colors.line,
        },
      ]}
    >
      <Text
        style={[type.chip, { color: active ? colors.accentInk : colors.muted }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function RecordsTab({
  logs,
  nameOf,
  musclesOf,
}: {
  logs: WorkoutLog[];
  nameOf: (id: string) => string | null;
  musclesOf: (id: string) => string[];
}) {
  const theme = useTheme();
  const { colors, type, settings } = theme;
  const units = settings.units === 'lb' ? 'lb' : 'kg';
  const [prFilter, setPrFilter] = useState<string | null>(null);
  const [chartEx, setChartEx] = useState<string | null>(null);

  const records = useMemo(() => {
    const ids = new Set<string>();
    logs.forEach((w) =>
      (w.exercises || []).forEach((x) => {
        if ((x.sets || []).length) ids.add(x.id);
      })
    );
    return [...ids]
      .map((id) => ({ id, pr: exercisePR(id, logs), name: nameOf(id) || id }))
      .filter((r) => r.pr && (r.pr.weight > 0 || r.pr.reps > 0))
      .sort((a, b) => b.pr!.weight - a.pr!.weight || b.pr!.reps - a.pr!.reps);
  }, [logs, nameOf]);

  const events = useMemo(() => prTimelineEvents(logs, nameOf), [logs, nameOf]);
  const prExIds = useMemo(
    () =>
      [...new Set(events.map((e) => e.id))].sort((a, b) =>
        (nameOf(a) || a).localeCompare(nameOf(b) || b)
      ),
    [events, nameOf]
  );
  const feed = prFilter ? events.filter((e) => e.id === prFilter) : events;

  const volRecs = useMemo(
    () => volumeRecords(logs, musclesOf),
    [logs, musclesOf]
  );
  const volGroups = useMemo(
    () =>
      [
        ...new Set([
          ...Object.keys(volRecs.daily),
          ...Object.keys(volRecs.weekly),
        ]),
      ].sort(),
    [volRecs]
  );

  const chartIds = useMemo(
    () =>
      [
        ...new Set(logs.flatMap((w) => (w.exercises || []).map((x) => x.id))),
      ].sort((a, b) => (nameOf(a) || a).localeCompare(nameOf(b) || b)),
    [logs, nameOf]
  );
  const activeChartEx =
    chartEx && chartIds.includes(chartEx) ? chartEx : chartIds[0] || null;
  const rmPoints = useMemo(
    () => (activeChartEx ? oneRmProgression(activeChartEx, logs) : []),
    [activeChartEx, logs]
  );

  if (!logs.length) {
    return (
      <EmptyNote
        title="No records yet"
        body="Log a workout to set your first record. Your PR milestones will appear here as you train."
      />
    );
  }

  return (
    <View style={styles.root}>
      <SectionTitle>Current records</SectionTitle>
      {records.length ? (
        records.map((r) => (
          <View
            key={r.id}
            style={[
              styles.row,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
          >
            <Ionicons name="trophy-outline" size={18} color={colors.accent} />
            <Text style={[type.body, { color: colors.ink, flex: 1 }]}>
              {r.name}
            </Text>
            <Text style={[type.body, { color: colors.muted }]}>
              {r.pr!.weight > 0
                ? `${fmtWeight(r.pr!.weight, units)} x ${r.pr!.reps}`
                : `${r.pr!.reps} reps`}
            </Text>
          </View>
        ))
      ) : (
        <Muted>No records yet.</Muted>
      )}

      {volGroups.length > 0 && (
        <View style={styles.volList}>
          <SectionTitle>Volume records</SectionTitle>
          <Muted>
            Best single-day and single-week volume per muscle group.
          </Muted>
          {volGroups.map((g) => {
            const d = volRecs.daily[g];
            const wk = volRecs.weekly[g];
            return (
              <View
                key={g}
                style={[
                  styles.row,
                  { backgroundColor: colors.surface, borderColor: colors.line },
                ]}
              >
                <Text
                  style={[type.body, { color: colors.ink }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit={false}
                >
                  {MUSCLE_GROUPS[groupOfMuscle(g)] || g}
                </Text>
                <Text
                  style={[
                    type.caption,
                    {
                      color: colors.muted,
                      textAlign: 'right',
                      flexShrink: 1,
                      marginLeft: spacing.md,
                    },
                  ]}
                >
                  {d
                    ? `Day ${fmtWeight(d.vol, units)} (${shortDateLabel(d.date)})`
                    : ''}
                  {d && wk ? '  -  ' : ''}
                  {wk
                    ? `Week ${fmtWeight(wk.vol, units)} (w/c ${shortDateLabel(wk.date)})`
                    : ''}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <SectionTitle>1RM progression</SectionTitle>
      <Muted>Estimated one-rep max (Epley) over time.</Muted>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chips}
      >
        {chartIds.map((id) => (
          <Chip
            key={id}
            label={nameOf(id) || id}
            active={id === activeChartEx}
            onPress={() => setChartEx(id)}
          />
        ))}
      </ScrollView>
      {rmPoints.length >= 2 ? (
        <LineChart
          points={rmPoints.map((p) => ({ label: p.label, value: p.value }))}
          formatValue={(v) => fmtWeight(v, units)}
          accessibilityLabel={`Estimated one-rep max progression for ${nameOf(activeChartEx!) || activeChartEx}`}
        />
      ) : (
        <Muted>Log this exercise in two sessions to see its progression.</Muted>
      )}

      <SectionTitle>PR timeline</SectionTitle>
      {events.length ? (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chips}
          >
            <Chip
              label="All"
              active={!prFilter}
              onPress={() => setPrFilter(null)}
            />
            {prExIds.map((id) => (
              <Chip
                key={id}
                label={nameOf(id) || id}
                active={prFilter === id}
                onPress={() => setPrFilter(prFilter === id ? null : id)}
              />
            ))}
          </ScrollView>
          <View style={styles.prFeed}>
            {feed.map((e, i) => (
              <View
                key={i}
                style={[
                  styles.row,
                  { backgroundColor: colors.surface, borderColor: colors.line },
                ]}
              >
                <Ionicons name="trophy" size={18} color={colors.accent} />
                <View style={styles.feedText}>
                  <Text style={[type.body, { color: colors.ink }]}>
                    {e.name} - {fmtWeight(e.weight, units)} x {e.reps}
                  </Text>
                  <Muted>{shortDateLabel(e.date)}</Muted>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Muted>No PR history yet.</Muted>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  chips: { flexDirection: 'row', marginVertical: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  feedText: { flex: 1, gap: 2 },
  volList: { gap: spacing.sm },
  prFeed: { gap: spacing.sm, marginTop: spacing.sm },
});
