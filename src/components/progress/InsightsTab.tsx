// Progress > Insights: DOTS score, strength ratios, movement radar,
// plateaus, correlations, total volume, RPE trend. Ports the web app's
// insights tab (js/progress.js renderInsightsTab). XP is not ported yet
// (v0.11), so the level card is omitted.
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { WorkoutLog } from '@/src/storage/workout';
import { useTheme } from '@/src/storage/settings';
import { bestEpley1RM, fmtWeight } from '@/src/lib/training';
import {
  correlationInsights,
  detectPlateaus,
  dotsScore,
  loadMeasures,
  muscleBalance,
  patternVolume,
  rpeTrendWeeks,
  totalVolumeKg,
} from '@/src/lib/progress';
import { LineChart } from '@/src/components/progress/LineChart';
import { RadarChart } from '@/src/components/progress/RadarChart';
import {
  EmptyNote,
  Muted,
  SectionTitle,
  StatCard,
} from '@/src/components/progress/ui';
import { radius, spacing } from '@/src/theme';

export function InsightsTab({
  logs,
  nameOf,
  primaryOf,
  getExercise,
}: {
  logs: WorkoutLog[];
  nameOf: (id: string) => string | null;
  primaryOf: (id: string) => string | null;
  getExercise: (id: string) => { name: string; primary: string } | undefined;
}) {
  const theme = useTheme();
  const { colors, type, settings } = theme;
  const [bwKg, setBwKg] = useState<number | null>(null);
  const units = settings.units === 'lb' ? 'lb' : 'kg';

  useEffect(() => {
    (async () => {
      const m = await loadMeasures();
      const last = m.length ? m[m.length - 1] : null;
      setBwKg(
        last && last.weight
          ? units === 'lb'
            ? last.weight * 0.453592
            : last.weight
          : null
      );
    })();
  }, [units, logs]);

  const bestEpleyForName = useMemo(
    () => (part: string) => {
      let best = 0;
      logs.forEach((w) =>
        (w.exercises || []).forEach((x) => {
          const nm = (nameOf(x.id) || '').toLowerCase();
          if (!nm.includes(part)) return;
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
    },
    [logs, nameOf]
  );

  const dots = useMemo(
    () => (bwKg ? dotsScore(logs, bwKg, bestEpleyForName) : null),
    [logs, bwKg, bestEpleyForName]
  );
  const bal = useMemo(() => muscleBalance(logs, primaryOf), [logs, primaryOf]);
  const patterns = useMemo(
    () => patternVolume(logs, 28, getExercise),
    [logs, getExercise]
  );
  const plateaus = useMemo(() => detectPlateaus(logs, nameOf), [logs, nameOf]);
  const corr = useMemo(() => correlationInsights(logs), [logs]);
  const rpeWeeks = useMemo(() => rpeTrendWeeks(logs), [logs]);
  const rpePoints = useMemo(
    () =>
      rpeWeeks
        .filter((w) => w.avg != null)
        .map((w) => ({ label: w.label, value: w.avg as number })),
    [rpeWeeks]
  );
  const hasRpe = rpePoints.length >= 2;
  const patternTotal = useMemo(
    () => Object.values(patterns).reduce((a, b) => a + b, 0),
    [patterns]
  );

  if (!logs.length) {
    return (
      <EmptyNote
        title="No insights yet"
        body="Log a few workouts and your DOTS score, strength ratios, and movement balance will appear here."
      />
    );
  }

  return (
    <View style={styles.root}>
      <SectionTitle>Training insights</SectionTitle>
      <Muted>
        Deep analysis of your training data. Ratios near 1.0 are balanced.
      </Muted>

      <View style={styles.statGrid}>
        {dots != null && <StatCard value={String(dots)} label="DOTS score" />}
        <StatCard
          value={bal.ratio ? bal.ratio.toFixed(2) : '-'}
          label="push/pull ratio"
        />
        <StatCard
          value={bal.legRatio ? bal.legRatio.toFixed(2) : '-'}
          label="quad/ham ratio"
        />
      </View>

      {bal.ratio > 1.3 && (
        <View
          style={[
            styles.warn,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <Ionicons name="warning-outline" size={18} color={colors.accent} />
          <Text style={[type.body, { color: colors.ink, flex: 1 }]}>
            Imbalance: push volume is {Math.round(bal.ratio * 100)}% of pull.
            Add more rows and pull-ups.
          </Text>
        </View>
      )}
      {bal.legRatio > 1.6 && (
        <View
          style={[
            styles.warn,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <Ionicons name="warning-outline" size={18} color={colors.accent} />
          <Text style={[type.body, { color: colors.ink, flex: 1 }]}>
            Imbalance: quads dominate hamstrings. Add Romanian deadlifts and leg
            curls.
          </Text>
        </View>
      )}

      <SectionTitle>Movement balance</SectionTitle>
      {patternTotal > 0 ? (
        <RadarChart vol={patterns} />
      ) : (
        <Muted>Log workouts and your movement balance will appear here.</Muted>
      )}

      {plateaus.length > 0 && (
        <View>
          <SectionTitle>Plateaus detected</SectionTitle>
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
                {p.name} stuck for {p.sessions} sessions. Try: +1 set, swap
                variation, or deload.
              </Text>
            </View>
          ))}
        </View>
      )}

      {corr.length > 0 && (
        <View>
          <SectionTitle>Correlations</SectionTitle>
          {corr.map((c, i) => (
            <Text key={i} style={[type.body, { color: colors.ink }]}>
              💡 {c}
            </Text>
          ))}
        </View>
      )}

      <SectionTitle>Total volume lifted</SectionTitle>
      <Text style={[type.hero, { color: colors.accent }]}>
        {fmtWeight(totalVolumeKg(logs), units)}
      </Text>

      <SectionTitle>RPE trend</SectionTitle>
      <Muted>Average RPE per week, last 12 weeks.</Muted>
      {hasRpe ? (
        <LineChart
          points={rpePoints}
          formatValue={(v) => v.toFixed(1)}
          accessibilityLabel="Average RPE per week"
        />
      ) : (
        <Muted>
          No RPE data yet. Log RPE on your sets and the trend will appear here.
        </Muted>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  warn: {
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
});
