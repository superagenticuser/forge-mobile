// Workout share card. Native port of the web app's share card
// (js/views.js generateShareCard): 1080x1350 portrait, FORGE brand,
// date, program/day, stats row, top 4 lifts by volume, footer.
import { StyleSheet, Text, View } from 'react-native';

import type { WorkoutLog } from '@/src/storage/workout';
import { useTheme } from '@/src/storage/settings';
import { fmtWeight } from '@/src/lib/training';
import { longDateLabel, sessionVolumeKg } from '@/src/lib/progress';

const INK = '#f2f4f8';
const MUTED = '#9aa3b5';
const VOLT = '#d4ff3f';
const BG = '#0b0d12';

export function ShareCard({
  workout,
  nameOf,
}: {
  workout: WorkoutLog;
  nameOf: (id: string) => string | null;
}) {
  const theme = useTheme();
  const units = theme.settings.units === 'lb' ? 'lb' : 'kg';

  const totalSets = workout.exercises.reduce(
    (a, x) => a + (x.sets || []).length,
    0
  );
  const totalVol = sessionVolumeKg(workout);
  const sub =
    [workout.programName, workout.dayName].filter(Boolean).join(' - ') ||
    'Workout';

  const ranked = workout.exercises
    .map((x) => ({
      x,
      vol: (x.sets || []).reduce(
        (b, s) => b + (s.weight || 0) * (s.reps || 0),
        0
      ),
      reps: (x.sets || []).reduce((b, s) => b + (s.reps || 0), 0),
    }))
    .sort((a, b) => b.vol - a.vol)
    .slice(0, 4);

  return (
    <View style={styles.card}>
      <View style={styles.accentBar} />
      <Text style={styles.brand}>FORGE</Text>
      <Text style={styles.date}>{longDateLabel(workout.date)}</Text>
      <Text style={styles.sub} numberOfLines={1}>
        {sub}
      </Text>
      <View style={styles.divider} />
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{workout.exercises.length}</Text>
          <Text style={styles.statLabel}>exercises</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{totalSets}</Text>
          <Text style={styles.statLabel}>sets</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{fmtWeight(totalVol, units)}</Text>
          <Text style={styles.statLabel}>total volume</Text>
        </View>
      </View>
      <Text style={styles.topTitle}>TOP LIFTS</Text>
      {ranked.map((r) => (
        <View key={r.x.id} style={styles.lift}>
          <Text style={styles.liftName} numberOfLines={1}>
            {nameOf(r.x.id) || r.x.id}
          </Text>
          <Text style={styles.liftMeta}>
            {r.x.sets.length} sets - {r.reps} reps - {fmtWeight(r.vol, units)}
          </Text>
        </View>
      ))}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Trained with FORGE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 360,
    aspectRatio: 1080 / 1350,
    backgroundColor: BG,
    alignItems: 'center',
    paddingTop: 0,
  },
  accentBar: { width: '100%', height: 4, backgroundColor: VOLT },
  brand: {
    color: VOLT,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 6,
    marginTop: 28,
  },
  date: { color: MUTED, fontSize: 15, marginTop: 8 },
  sub: { color: INK, fontSize: 19, fontWeight: '700', marginTop: 8 },
  divider: {
    width: '70%',
    height: 1,
    backgroundColor: '#232936',
    marginVertical: 20,
  },
  stats: { flexDirection: 'row', width: '100%', marginBottom: 8 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: INK, fontSize: 24, fontWeight: '800' },
  statLabel: { color: MUTED, fontSize: 12, marginTop: 2 },
  topTitle: {
    color: VOLT,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 18,
    marginBottom: 12,
  },
  lift: { width: '100%', paddingHorizontal: 36, marginBottom: 14 },
  liftName: { color: INK, fontSize: 16, fontWeight: '600' },
  liftMeta: { color: MUTED, fontSize: 13, marginTop: 2 },
  footer: {
    position: 'absolute',
    bottom: 26,
    width: '100%',
    alignItems: 'center',
  },
  footerText: { color: '#5b6472', fontSize: 12 },
});
