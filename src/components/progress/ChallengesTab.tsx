// Progress > Challenges: personal challenges with progress bars. Ports
// the web app's challenges tab (js/progress.js renderChallengesTab) with
// the fixed v11.71 logic: pct = min(100, round(cur / target * 100)).
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { WorkoutLog } from '@/src/storage/workout';
import { useTheme } from '@/src/storage/settings';
import { fmtWeight } from '@/src/lib/training';
import { CHALLENGES, challengeProgress } from '@/src/lib/progress';
import { Muted, SectionTitle } from '@/src/components/progress/ui';
import { radius, spacing } from '@/src/theme';

export function ChallengesTab({ logs }: { logs: WorkoutLog[] }) {
  const theme = useTheme();
  const { colors, type, settings } = theme;
  const units = settings.units === 'lb' ? 'lb' : 'kg';

  const prog = useMemo(() => challengeProgress(logs), [logs]);

  const fmtCur = (metric: string, cur: number) =>
    metric === 'volume7'
      ? fmtWeight(cur, units)
      : `${Math.round(cur).toLocaleString()}`;
  const fmtTarget = (metric: string, target: number) =>
    metric === 'volume7' ? fmtWeight(target, units) : target.toLocaleString();

  return (
    <View style={styles.root}>
      <SectionTitle>Challenges</SectionTitle>
      <Muted>Beat your own records.</Muted>
      <View style={styles.grid}>
        {CHALLENGES.map((c) => {
          const cur = prog[c.metric] || 0;
          const pct = Math.min(100, Math.round((cur / c.target) * 100));
          const done = cur >= c.target;
          return (
            <View
              key={c.id}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: done ? colors.accent : colors.line,
                },
              ]}
            >
              <Ionicons
                name={done ? 'trophy' : 'flag'}
                size={28}
                color={done ? colors.accent : colors.muted}
              />
              <Text style={[type.subtitle, { color: colors.ink }]}>
                {c.name}
              </Text>
              <Text
                style={[
                  type.caption,
                  { color: colors.muted, textAlign: 'center' },
                ]}
              >
                {c.desc(units)}
              </Text>
              <View
                style={[styles.bar, { backgroundColor: colors.line }]}
                accessibilityRole="progressbar"
                accessibilityValue={{ now: pct, min: 0, max: 100 }}
              >
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${pct}%`,
                      backgroundColor: done ? colors.accent : colors.muted,
                    },
                  ]}
                />
              </View>
              <Text style={[type.caption, { color: colors.muted }]}>
                {fmtCur(c.metric, cur)} / {fmtTarget(c.metric, c.target)}
              </Text>
              {done && (
                <Text style={[type.chip, { color: colors.accent }]}>
                  Complete
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 150,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    alignItems: 'center',
  },
  bar: { height: 8, borderRadius: 4, overflow: 'hidden', width: '100%' },
  fill: { height: 8, borderRadius: 4 },
});
