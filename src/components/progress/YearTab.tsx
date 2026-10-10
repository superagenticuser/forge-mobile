// Progress > Year: annual review. Ports the web app's year tab
// (js/progress.js renderYearTab): this year's workouts, volume, sets,
// active days, best streak, muscle groups, and top 3 lifts by est. 1RM.
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { WorkoutLog } from '@/src/storage/workout';
import { useTheme } from '@/src/storage/settings';
import { fmtWeight } from '@/src/lib/training';
import { yearStats } from '@/src/lib/progress';
import {
  EmptyNote,
  Muted,
  SectionTitle,
  StatCard,
} from '@/src/components/progress/ui';
import { radius, spacing } from '@/src/theme';

export function YearTab({
  logs,
  nameOf,
  primaryOf,
}: {
  logs: WorkoutLog[];
  nameOf: (id: string) => string | null;
  primaryOf: (id: string) => string | null;
}) {
  const theme = useTheme();
  const { colors, type, settings } = theme;
  const units = settings.units === 'lb' ? 'lb' : 'kg';

  const stats = useMemo(() => yearStats(logs, primaryOf), [logs, primaryOf]);

  if (!stats) {
    const yr = new Date().getFullYear();
    return (
      <EmptyNote
        title={`No workouts in ${yr} yet`}
        body="Your annual review will build itself as you train."
      />
    );
  }

  return (
    <View style={styles.root}>
      <SectionTitle>{stats.year} in review</SectionTitle>
      <View style={styles.statGrid}>
        <StatCard value={String(stats.workouts)} label="workouts" />
        <StatCard
          value={fmtWeight(stats.volume, units)}
          label="volume lifted"
        />
        <StatCard value={String(stats.sets)} label="sets" />
        <StatCard value={String(stats.days)} label="active days" />
        <StatCard value={String(stats.bestStreak)} label="best streak" />
        <StatCard value={String(stats.groups)} label="muscle groups" />
      </View>

      <SectionTitle>Top lifts this year</SectionTitle>
      {stats.topLifts.length ? (
        stats.topLifts.map(({ id, value }) => (
          <View
            key={id}
            style={[
              styles.row,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
          >
            <Ionicons name="trophy" size={18} color={colors.accent} />
            <Text style={[type.body, { color: colors.ink, flex: 1 }]}>
              {nameOf(id) || id}
            </Text>
            <Text style={[type.body, { color: colors.muted }]}>
              est. 1RM {fmtWeight(value, units)}
            </Text>
          </View>
        ))
      ) : (
        <Muted>Log weighted sets to rank your lifts.</Muted>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
