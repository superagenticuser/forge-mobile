// Progress > Calendar: month view with trained days marked; tap a day
// for that session's detail. Ports the web app's calendar tab
// (js/progress.js renderCalendarTab / renderCalDetail).
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { WorkoutLog } from '@/src/storage/workout';
import { useTheme } from '@/src/storage/settings';
import { fmtWeight } from '@/src/lib/training';
import {
  fmtDateKey,
  longDateLabel,
  sessionVolumeKg,
  workoutCountsByDate,
} from '@/src/lib/progress';
import { EmptyNote } from '@/src/components/progress/ui';
import { radius, spacing } from '@/src/theme';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function intensityColor(
  count: number,
  colors: { accent: string; line: string }
) {
  if (!count) return colors.line;
  const a = count === 1 ? 0.35 : count === 2 ? 0.55 : count <= 4 ? 0.8 : 1;
  return (
    colors.accent +
    Math.round(a * 255)
      .toString(16)
      .padStart(2, '0')
  );
}

export function CalendarTab({
  logs,
  nameOf,
}: {
  logs: WorkoutLog[];
  nameOf: (id: string) => string | null;
}) {
  const theme = useTheme();
  const { colors, type, settings } = theme;
  const units = settings.units === 'lb' ? 'lb' : 'kg';
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const counts = useMemo(() => workoutCountsByDate(logs), [logs]);
  const todayKey = fmtDateKey(now);

  const cells = useMemo(() => {
    const first = (new Date(year, month, 1).getDay() + 6) % 7;
    const dim = new Date(year, month + 1, 0).getDate();
    const out: Array<{ key: string; day: number } | null> = [];
    for (let i = 0; i < first; i++) out.push(null);
    for (let d = 1; d <= dim; d++) {
      out.push({
        key: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
      });
    }
    return out;
  }, [year, month]);

  const title = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const shift = (dir: -1 | 1) => {
    let m = month + dir;
    let y = year;
    if (m < 0) {
      m = 11;
      y--;
    } else if (m > 11) {
      m = 0;
      y++;
    }
    setMonth(m);
    setYear(y);
    setSelected(null);
  };

  const dayLogs = selected ? logs.filter((w) => w.date === selected) : [];

  return (
    <View style={styles.root}>
      <View style={styles.nav}>
        <Pressable
          onPress={() => shift(-1)}
          hitSlop={12}
          style={[styles.navBtn, { borderColor: colors.line }]}
          accessibilityLabel="Previous month"
        >
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <Text style={[type.subtitle, { color: colors.ink }]}>{title}</Text>
        <Pressable
          onPress={() => shift(1)}
          hitSlop={12}
          style={[styles.navBtn, { borderColor: colors.line }]}
          accessibilityLabel="Next month"
        >
          <Ionicons name="chevron-forward" size={20} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.grid} accessibilityLabel={title}>
        {WEEKDAYS.map((wd) => (
          <Text
            key={wd}
            style={[type.caption, styles.wd, { color: colors.muted }]}
          >
            {wd}
          </Text>
        ))}
        {cells.map((cell, i) =>
          cell ? (
            <Pressable
              key={cell.key}
              onPress={() =>
                setSelected(selected === cell.key ? null : cell.key)
              }
              style={[
                styles.day,
                {
                  backgroundColor: intensityColor(
                    counts[cell.key] || 0,
                    colors
                  ),
                  borderColor:
                    selected === cell.key ? colors.accent : 'transparent',
                },
              ]}
              accessibilityLabel={`${longDateLabel(cell.key)}${counts[cell.key] ? `, ${counts[cell.key]} workouts` : ', rest day'}`}
            >
              <Text
                style={[
                  type.caption,
                  {
                    color: cell.key === todayKey ? colors.accent : colors.ink,
                    fontWeight: cell.key === todayKey ? '800' : '400',
                  },
                ]}
              >
                {cell.day}
              </Text>
            </Pressable>
          ) : (
            <View key={`b${i}`} style={styles.day} />
          )
        )}
      </View>

      {selected &&
        (dayLogs.length ? (
          <View style={styles.detail}>
            <Text style={[type.subtitle, { color: colors.ink }]}>
              {longDateLabel(selected)}
            </Text>
            {dayLogs.map((w, wi) => {
              const sets = w.exercises.reduce((a, x) => a + x.sets.length, 0);
              return (
                <View
                  key={wi}
                  style={[
                    styles.wo,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.line,
                    },
                  ]}
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
                  <Text style={[type.caption, { color: colors.muted }]}>
                    {sets} sets - {fmtWeight(sessionVolumeKg(w), units)}
                    {w.durationMin ? ` - ${w.durationMin} min` : ''}
                  </Text>
                  {w.exercises.map((x, xi) => (
                    <Text
                      key={xi}
                      style={[type.caption, { color: colors.muted }]}
                    >
                      {nameOf(x.id) || x.id} -{' '}
                      {x.sets
                        .map(
                          (s) =>
                            `${s.reps}${s.weight ? ' x ' + fmtWeight(s.weight, units) : ''}${s.rpe ? ` @ RPE ${s.rpe}` : ''}${s.failed ? ' (failed)' : ''}`
                        )
                        .join(', ')}
                    </Text>
                  ))}
                </View>
              );
            })}
          </View>
        ) : (
          <EmptyNote
            title="Rest day"
            body={`No workouts logged on ${longDateLabel(selected)}.`}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    borderWidth: 1,
    borderRadius: radius.pill,
    padding: spacing.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  wd: { width: '14.28%', textAlign: 'center', paddingVertical: spacing.xs },
  day: {
    width: '14.28%',
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  detail: { gap: spacing.sm },
  wo: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: 2 },
});
