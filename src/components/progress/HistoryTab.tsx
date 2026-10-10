// Progress > History: reverse-chronological log with expandable day
// detail. Ports the web app's history tab (js/progress.js paintOverview,
// tab === "history").
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { WorkoutLog } from '@/src/storage/workout';
import { useTheme } from '@/src/storage/settings';
import { fmtWeight } from '@/src/lib/training';
import { longDateLabel, sessionVolumeKg } from '@/src/lib/progress';
import { EmptyNote, Muted } from '@/src/components/progress/ui';
import { radius, spacing } from '@/src/theme';

const TYPE_NAMES: Record<string, string> = {
  std: 'Standard',
  drop: 'Drop set',
  rp: 'Rest-pause',
  cluster: 'Cluster',
  myo: 'Myo-rep',
};

export function HistoryTab({
  logs,
  nameOf,
}: {
  logs: WorkoutLog[];
  nameOf: (id: string) => string | null;
}) {
  const theme = useTheme();
  const { colors, type, settings } = theme;
  const [open, setOpen] = useState<string | null>(null);
  const units = settings.units === 'lb' ? 'lb' : 'kg';

  const byDate = useMemo(() => {
    const map = new Map<string, WorkoutLog[]>();
    logs
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .forEach((w) => {
        const arr = map.get(w.date) || [];
        arr.push(w);
        map.set(w.date, arr);
      });
    return [...map.entries()];
  }, [logs]);

  if (!logs.length) {
    return (
      <EmptyNote
        title="No history yet"
        body="Your completed workouts will appear here, newest first."
      />
    );
  }

  return (
    <View style={styles.root}>
      {byDate.map(([date, ws]) => {
        const sets = ws.reduce(
          (a, w) => a + w.exercises.reduce((b, x) => b + x.sets.length, 0),
          0
        );
        const vol = ws.reduce((a, w) => a + sessionVolumeKg(w), 0);
        const isOpen = open === date;
        return (
          <View
            key={date}
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
          >
            <Pressable
              onPress={() => setOpen(isOpen ? null : date)}
              style={styles.head}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
            >
              <View style={styles.headText}>
                <Text style={[type.subtitle, { color: colors.ink }]}>
                  {longDateLabel(date)}
                </Text>
                <Muted>
                  {ws.length} workout{ws.length > 1 ? 's' : ''} - {sets} sets -{' '}
                  {fmtWeight(vol, units)}
                </Muted>
              </View>
              <Ionicons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.muted}
              />
            </Pressable>
            {isOpen &&
              ws.map((w, wi) => (
                <View
                  key={wi}
                  style={[styles.wo, { borderTopColor: colors.line }]}
                >
                  <Text
                    style={[
                      type.body,
                      { color: colors.ink, fontWeight: '700' },
                    ]}
                  >
                    {w.programName || 'Free workout'}
                    {w.dayName ? (
                      <Text style={{ color: colors.muted, fontWeight: '400' }}>
                        {'  -  '}
                        {w.dayName}
                      </Text>
                    ) : null}
                  </Text>
                  {w.exercises.map((x, xi) => (
                    <View key={xi} style={styles.exRow}>
                      <Text style={[type.body, { color: colors.ink }]}>
                        {nameOf(x.id) || x.id}
                      </Text>
                      {x.sets.map((s, si) => (
                        <Text
                          key={si}
                          style={[type.caption, { color: colors.muted }]}
                        >
                          {s.reps} reps
                          {s.weight ? ` @ ${fmtWeight(s.weight, units)}` : ''}
                          {s.added ? ` +${fmtWeight(s.added, units)}` : ''}
                          {s.rpe ? ` - RPE ${s.rpe}` : ''}
                          {s.failed ? ' - failed' : ''}
                          {s.type && s.type !== 'std'
                            ? ` - ${TYPE_NAMES[s.type] || s.type}`
                            : ''}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  card: { borderWidth: 1, borderRadius: radius.lg },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  headText: { flex: 1, gap: 2 },
  wo: { borderTopWidth: 1, padding: spacing.md, gap: spacing.sm },
  exRow: { gap: 2, marginTop: spacing.xs },
});
