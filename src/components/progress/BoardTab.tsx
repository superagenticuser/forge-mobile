// Progress > Board: personal monthly leaderboard ranked by XP.
// Ports the web app's renderBoardTab (js/progress.js).
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { WorkoutLog } from '@/src/storage/workout';
import { useTheme } from '@/src/storage/settings';
import { fmtWeight } from '@/src/lib/training';
import { monthLabel, monthlyBoard, type BoardRow } from '@/src/lib/xp';
import { EmptyNote, Muted, SectionTitle } from '@/src/components/progress/ui';
import { radius, spacing } from '@/src/theme';

const MEDALS = ['1st', '2nd', '3rd'];

export function BoardTab({ logs }: { logs: WorkoutLog[] }) {
  const theme = useTheme();
  const { colors, type, settings } = theme;
  const [rows, setRows] = useState<BoardRow[] | null>(null);

  useEffect(() => {
    (async () => {
      setRows(await monthlyBoard(logs));
    })();
  }, [logs]);

  if (!logs.length) {
    return (
      <EmptyNote
        title="No months ranked yet"
        body="Log workouts to climb your own leaderboard."
      />
    );
  }

  return (
    <View style={styles.root}>
      <SectionTitle>Your monthly leaderboard</SectionTitle>
      <Muted>Your personal best months, ranked by XP.</Muted>
      {rows === null ? (
        <Muted>Loading...</Muted>
      ) : (
        rows.map((r, i) => (
          <View
            key={r.month}
            style={[
              styles.row,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
          >
            <Text
              style={[type.subtitle, { color: colors.accent, minWidth: 40 }]}
            >
              {MEDALS[i] ?? `${i + 1}.`}
            </Text>
            <View style={styles.rowText}>
              <Text style={[type.body, { fontWeight: '700' }]}>
                {monthLabel(r.month)}
              </Text>
              <Text style={[type.caption, { color: colors.muted }]}>
                {r.workouts} workouts · {fmtWeight(r.vol, settings.units)} ·{' '}
                {r.xp} XP
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  rowText: { flex: 1, gap: 2 },
});
