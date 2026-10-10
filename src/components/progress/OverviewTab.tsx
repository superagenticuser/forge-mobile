// Progress > Overview: stat grid, deload/plateau banners, 16-week
// heatmap, tappable session-volume chart. Ports the web app's overview
// tab (js/progress.js paintOverview).
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { WorkoutLog } from '@/src/storage/workout';
import { useTheme } from '@/src/storage/settings';
import { fmtWeight } from '@/src/lib/training';
import {
  checkDeload,
  detectPlateaus,
  fmtDateKey,
  longDateLabel,
  sessionVolumeKg,
  shortDateLabel,
  thisWeekVolumeKg,
  totalSets,
  totalVolumeKg,
  workoutCountsByDate,
  workoutStreak,
} from '@/src/lib/progress';
import { LineChart } from '@/src/components/progress/LineChart';
import {
  EmptyNote,
  Muted,
  SectionTitle,
  StatCard,
} from '@/src/components/progress/ui';
import { radius, spacing } from '@/src/theme';

const HEATMAP_WEEKS = 16;

function Heatmap({ logs }: { logs: WorkoutLog[] }) {
  const theme = useTheme();
  const { colors, type } = theme;
  const counts = useMemo(() => workoutCountsByDate(logs), [logs]);
  const weeks = useMemo(() => {
    const out: Array<Array<{ key: string; count: number; label: string }>> = [];
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    // Align the last column to the current week (Monday-first).
    const endOffset = (today.getDay() + 6) % 7;
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - endOffset);
    for (let w = HEATMAP_WEEKS - 1; w >= 0; w--) {
      const col: Array<{ key: string; count: number; label: string }> = [];
      for (let d = 0; d < 7; d++) {
        const dt = new Date(lastMonday);
        dt.setDate(lastMonday.getDate() - w * 7 + d);
        const key = fmtDateKey(dt);
        const count = counts[key] || 0;
        col.push({
          key,
          count,
          label: `${longDateLabel(key)}: ${count ? `${count} workout${count > 1 ? 's' : ''}` : 'rest day'}`,
        });
      }
      out.push(col);
    }
    return out;
  }, [counts]);

  const cellColor = (count: number) => {
    if (!count) return colors.line;
    const a = count === 1 ? 0.35 : count === 2 ? 0.55 : count <= 4 ? 0.8 : 1;
    return (
      colors.accent +
      Math.round(a * 255)
        .toString(16)
        .padStart(2, '0')
    );
  };

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View
          style={styles.heatmap}
          accessibilityRole="image"
          accessibilityLabel={`Workout activity, last ${HEATMAP_WEEKS} weeks`}
        >
          {weeks.map((col, wi) => (
            <View key={wi} style={styles.hmCol}>
              {col.map((cell) => (
                <View
                  key={cell.key}
                  style={[
                    styles.hmDay,
                    { backgroundColor: cellColor(cell.count) },
                  ]}
                  accessibilityLabel={cell.label}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.legend}>
        <Muted>Less</Muted>
        {[0, 1, 2, 4].map((c) => (
          <View
            key={c}
            style={[styles.hmDay, { backgroundColor: cellColor(c) }]}
          />
        ))}
        <Muted>More</Muted>
      </View>
    </View>
  );
}

export function OverviewTab({
  logs,
  nameOf,
}: {
  logs: WorkoutLog[];
  nameOf: (id: string) => string | null;
}) {
  const theme = useTheme();
  const { colors, type, settings } = theme;
  const [selected, setSelected] = useState<number | null>(null);

  const units = settings.units === 'lb' ? 'lb' : 'kg';
  const stats = useMemo(() => {
    const vol = totalVolumeKg(logs);
    return [
      { value: String(logs.length), label: 'workouts logged' },
      { value: String(workoutStreak(logs)), label: 'day streak' },
      { value: String(totalSets(logs)), label: 'total sets' },
      { value: fmtWeight(vol, units), label: 'total volume' },
      { value: fmtWeight(thisWeekVolumeKg(logs), units), label: 'this week' },
    ];
  }, [logs, units]);

  const deload = useMemo(() => checkDeload(logs), [logs]);
  const plateaus = useMemo(() => detectPlateaus(logs, nameOf), [logs, nameOf]);

  const recent = useMemo(() => logs.slice(-20), [logs]);
  const chartPoints = useMemo(
    () =>
      recent.map((w) => ({
        label: shortDateLabel(w.date),
        value: sessionVolumeKg(w),
      })),
    [recent]
  );
  const selectedWorkout = selected != null ? recent[selected] : null;

  if (!logs.length) {
    return (
      <EmptyNote
        title="No workouts logged yet"
        body="Finish a workout and it will show up here with your history, records and volume."
      />
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.statGrid}>
        {stats.map((s) => (
          <StatCard key={s.label} value={s.value} label={s.label} />
        ))}
      </View>

      {deload && (
        <View
          style={[
            styles.banner,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <Ionicons name="warning-outline" size={18} color={colors.accent} />
          <Text style={[type.body, { color: colors.ink, flex: 1 }]}>
            Deload suggested: volume is dropping, consider a light week.
          </Text>
        </View>
      )}

      {plateaus.length > 0 && (
        <View>
          <SectionTitle>Plateau watch</SectionTitle>
          <Muted>
            No weight progress in the last {plateaus[0].sessions} sessions.
          </Muted>
          {plateaus.map((p) => (
            <View
              key={p.id}
              style={[
                styles.row,
                { backgroundColor: colors.surface, borderColor: colors.line },
              ]}
            >
              <Ionicons
                name="trending-down-outline"
                size={18}
                color={colors.accent}
              />
              <Text style={[type.body, { color: colors.ink, flex: 1 }]}>
                {p.name}
              </Text>
            </View>
          ))}
        </View>
      )}

      <SectionTitle>Last {HEATMAP_WEEKS} weeks</SectionTitle>
      <Heatmap logs={logs} />
      <Muted>Volume = weight x reps across every logged set.</Muted>

      <SectionTitle>Session volume</SectionTitle>
      <Muted>
        Volume per workout, most recent last. Tap any point for details.
      </Muted>
      {chartPoints.length >= 2 ? (
        <LineChart
          points={chartPoints}
          formatValue={(v) => fmtWeight(v, units)}
          selectedIndex={selected}
          onSelect={setSelected}
          accessibilityLabel="Session volume chart"
        />
      ) : (
        <Muted>Log two workouts to see your session volume trend.</Muted>
      )}
      {selectedWorkout && (
        <Pressable
          onPress={() => setSelected(null)}
          style={[
            styles.detail,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <Text style={[type.subtitle, { color: colors.ink }]}>
            {longDateLabel(selectedWorkout.date)}
          </Text>
          <Text style={[type.body, { color: colors.muted }]}>
            {selectedWorkout.programName || 'Free workout'}
            {selectedWorkout.dayName ? ` - ${selectedWorkout.dayName}` : ''}
          </Text>
          <Text style={[type.body, { color: colors.ink }]}>
            {fmtWeight(sessionVolumeKg(selectedWorkout), units)} volume -{' '}
            {selectedWorkout.exercises.reduce((a, x) => a + x.sets.length, 0)}{' '}
            sets
            {selectedWorkout.durationMin
              ? ` - ${selectedWorkout.durationMin} min`
              : ''}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  heatmap: { flexDirection: 'row', gap: 3, paddingVertical: spacing.sm },
  hmCol: { gap: 3 },
  hmDay: { width: 14, height: 14, borderRadius: 3 },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  detail: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 2,
  },
});
