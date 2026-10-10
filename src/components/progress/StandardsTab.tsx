// Progress > Standards: strength standards per main lift. Estimated 1RM
// vs bodyweight ratios with level bars (Beginner to Elite). Ports the web
// app's standards tab (js/progress.js renderStandards) verbatim.
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { WorkoutLog } from '@/src/storage/workout';
import { useTheme } from '@/src/storage/settings';
import { bestEpley1RM, fmtWeight } from '@/src/lib/training';
import {
  loadMeasures,
  standardLevel,
  STD_LEVELS,
  STD_LIFTS,
} from '@/src/lib/progress';
import { EmptyNote, Muted, SectionTitle } from '@/src/components/progress/ui';
import { radius, spacing } from '@/src/theme';

function bestEpleyForExercise(logs: WorkoutLog[], exId: string): number {
  let best = 0;
  logs.forEach((w) =>
    (w.exercises || []).forEach((x) => {
      if (x.id !== exId) return;
      const b = bestEpley1RM(
        (x.sets || []).map((s) => ({
          weight: s.weight || 0,
          reps: s.reps || 0,
        }))
      );
      if (b > best) best = b;
    })
  );
  return best;
}

export function StandardsTab({
  logs,
  resolveLiftId,
}: {
  logs: WorkoutLog[];
  /** Map a standard lift to a library exercise id (byId or name match). */
  resolveLiftId: (lift: { id: string; name: string }) => string | null;
}) {
  const theme = useTheme();
  const { colors, type, settings } = theme;
  const [bwKg, setBwKg] = useState<number | null>(null);
  const units = settings.units === 'lb' ? 'lb' : 'kg';

  useEffect(() => {
    (async () => {
      const m = await loadMeasures();
      const last = m.length ? m[m.length - 1] : null;
      if (last && last.weight) {
        setBwKg(units === 'lb' ? last.weight * 0.453592 : last.weight);
      } else {
        setBwKg(null);
      }
    })();
  }, [units, logs]);

  const rows = useMemo(() => {
    if (!bwKg) return null;
    return STD_LIFTS.map((lift) => {
      const exId = resolveLiftId(lift);
      const est = exId ? bestEpleyForExercise(logs, exId) : 0;
      const ratio = est / bwKg;
      const level = standardLevel(ratio, lift.ratios);
      const lvlName = level === 0 ? 'Untrained' : STD_LEVELS[level - 1];
      const nextR = level < 5 ? lift.ratios[level] : null;
      const nextW = nextR ? nextR * bwKg : null;
      return { lift, est, level, lvlName, nextW };
    });
  }, [bwKg, logs, resolveLiftId]);

  if (!logs.length) {
    return (
      <EmptyNote
        title="No data yet"
        body="Log workouts and your strength standards will appear here."
      />
    );
  }

  if (bwKg == null) {
    return (
      <EmptyNote
        title="Log your bodyweight first"
        body="Standards compare your estimated 1RM against bodyweight ratios. Add a weight in Progress > Body."
      />
    );
  }

  return (
    <View style={styles.root}>
      <SectionTitle>Strength standards</SectionTitle>
      <Muted>
        Estimated 1RM vs bodyweight ({fmtWeight(bwKg, units)}). Based on the
        Epley formula from your best logged set.
      </Muted>
      {rows!.map(({ lift, est, level, lvlName, nextW }) => (
        <View
          key={lift.id}
          style={[
            styles.row,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <View style={styles.head}>
            <Text style={[type.subtitle, { color: colors.ink }]}>
              {lift.name}
            </Text>
            <Text style={[type.caption, { color: colors.muted }]}>
              {est > 0 ? `${fmtWeight(est, units)} est. 1RM` : 'No data'}
            </Text>
          </View>
          <View style={styles.bars}>
            {STD_LEVELS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.bar,
                  {
                    backgroundColor: i < level ? colors.accent : colors.line,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={[type.caption, { color: colors.muted }]}>
            {lvlName}
            {nextW
              ? ` - next: ${fmtWeight(nextW, units)} (${STD_LEVELS[level]})`
              : ' - top level'}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  row: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 8, borderRadius: 4 },
});
