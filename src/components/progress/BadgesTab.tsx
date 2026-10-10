// Progress > Badges: 20-achievement grid with locked/unlocked states and
// earned dates. Ports the web app's badges tab (js/progress.js
// renderBadgesTab + js/badges.js). Badge evaluation runs on tab focus
// and after each saved workout (see workout-summary); newly earned
// badges celebrate once via BadgeCelebration.
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/src/storage/settings';
import { BADGES, badgeEarnedOn, getEarnedBadges } from '@/src/lib/badges';
import { EmptyNote, Muted, SectionTitle } from '@/src/components/progress/ui';
import { radius, spacing } from '@/src/theme';

export function BadgesTab() {
  const theme = useTheme();
  const { colors, type } = theme;
  const [earned, setEarned] = useState<Record<string, number>>({});
  const [dates, setDates] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    const e = await getEarnedBadges();
    setEarned(e);
    const d: Record<string, string> = {};
    for (const b of BADGES) {
      if (e[b.id]) {
        const on = await badgeEarnedOn(b.id);
        if (on) d[b.id] = on;
      }
    }
    setDates(d);
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);

  const earnedCount = BADGES.filter((b) => earned[b.id]).length;

  return (
    <View style={styles.root}>
      <SectionTitle>Achievements</SectionTitle>
      <Muted>
        {earnedCount} of {BADGES.length} earned. Keep training to unlock the
        rest.
      </Muted>
      {earnedCount === 0 && (
        <EmptyNote
          title="No badges yet"
          body="Badges are awarded automatically as you train: log workouts, build streaks, and hit milestones."
        />
      )}
      <View style={styles.grid}>
        {BADGES.map((b) => {
          const has = !!earned[b.id];
          return (
            <View
              key={b.id}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: has ? colors.accent : colors.line,
                  opacity: has ? 1 : 0.55,
                },
              ]}
            >
              <Text style={styles.icon}>{has ? b.icon : '🔒'}</Text>
              <Text
                style={[type.chip, { color: colors.ink, textAlign: 'center' }]}
              >
                {b.name}
              </Text>
              <Text
                style={[
                  type.caption,
                  { color: colors.muted, textAlign: 'center' },
                ]}
              >
                {b.desc}
              </Text>
              {has && dates[b.id] && (
                <Text style={[type.caption, { color: colors.accent }]}>
                  Earned {dates[b.id]}
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
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 100,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
    alignItems: 'center',
  },
  icon: { fontSize: 30, lineHeight: 36 },
});
