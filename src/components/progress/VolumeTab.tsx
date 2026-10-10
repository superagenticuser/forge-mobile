// Progress > Volume: sets per muscle group over the last 28 days, as a
// bar list. Ports the web app's volume tab (js/progress.js, the final
// else branch of paintOverview).
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { WorkoutLog } from '@/src/storage/workout';
import { useTheme } from '@/src/storage/settings';
import { MUSCLE_GROUPS } from '@/src/data/exercises';
import { groupOfMuscle, volumeByMuscle } from '@/src/lib/progress';
import { EmptyNote, Muted, SectionTitle } from '@/src/components/progress/ui';
import { radius, spacing } from '@/src/theme';

export function VolumeTab({
  logs,
  primaryOf,
}: {
  logs: WorkoutLog[];
  primaryOf: (id: string) => string | null;
}) {
  const theme = useTheme();
  const { colors, type } = theme;

  const entries = useMemo(
    () => volumeByMuscle(logs, 28, primaryOf),
    [logs, primaryOf]
  );
  const max = entries.length ? entries[0].sets : 1;

  return (
    <View style={styles.root}>
      <SectionTitle>Volume by muscle</SectionTitle>
      {entries.length ? (
        <View>
          <Muted>Sets per muscle group, last 28 days.</Muted>
          {entries.map(({ group, sets }) => (
            <View
              key={group}
              style={[
                styles.row,
                { backgroundColor: colors.surface, borderColor: colors.line },
              ]}
              accessibilityLabel={`${MUSCLE_GROUPS[groupOfMuscle(group)] || group}: ${sets} sets`}
            >
              <Text style={[type.body, styles.name, { color: colors.ink }]}>
                {MUSCLE_GROUPS[groupOfMuscle(group)] || group}
              </Text>
              <View style={[styles.track, { backgroundColor: colors.line }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      backgroundColor: colors.accent,
                      width: `${Math.round((sets / max) * 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text
                style={[type.caption, styles.count, { color: colors.muted }]}
              >
                {sets}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <EmptyNote
          title="Nothing in the last 28 days"
          body="Log a workout and your volume will show up here."
        />
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
    marginTop: spacing.sm,
  },
  name: { width: 96 },
  track: {
    flex: 1,
    height: 10,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  bar: { height: 10, borderRadius: radius.pill },
  count: { width: 40, textAlign: 'right' },
});
