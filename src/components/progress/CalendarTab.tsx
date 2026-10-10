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
        {cells.map((cell, i) => {
          if (!cell) {
            return <View key={`b${i}`} style={styles.dayBlank} />;
          }
          const count = counts[cell.key] || 0;
          const isSelected = selected === cell.key;
          const isToday = cell.key === todayKey;
          return (
            <Pressable
              key={cell.key}
              onPress={() =>
                setSelected(selected === cell.key ? null : cell.key)
              }
              style={[
                styles.day,
                {
                  backgroundColor: isSelected
                    ? colors.accent
                    : isToday
                      ? colors.surface
                      : 'transparent',
                  borderColor: isToday && !isSelected ? colors.accent : 'transparent',
                },
              ]}
              accessibilityLabel={`${longDateLabel(cell.key)}${count ? `, ${count} workouts` : ', rest day'}`}
            >
              <Text
                style={[
                  type.body,
                  {
                    color: isSelected
                      ? colors.bg
                      : isToday
                        ? colors.accent
                        : colors.ink,
                    fontWeight: isToday || isSelected ? '700' : '400',
                  },
                ]}
              >
                {cell.day}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isSelected
                        ? colors.bg
                        : colors.accent,
                    },
                  ]}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      {selected &&
        (dayLogs.length ? (
          <View style={styles.detail}>
            <Text style={[type.subtitle, { color: colors.ink }]}>
              {longDateLabel(selected)}
            </Text>
            {dayLogs.map((w, wi) => {
              const vol = sessionVolumeKg(w);
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
                  <View style={styles.woHeader}>
                    <Text
                      style={[
                        type.body,
                        { color: colors.ink, fontWeight: '700', flex: 1 },
                      ]}
                      numberOfLines={1}
                    >
                      {w.programName || 'Free workout'}
                    </Text>
                    <Text style={[type.caption, { color: colors.accent }]}>
                      {fmtWeight(vol, units)}
                    </Text>
                  </View>
                  {w.dayName ? (
                    <Text style={[type.caption, { color: colors.muted }]}>
                      {w.dayName}
                      {w.durationMin ? `  -  ${w.durationMin} min` : ''}
                    </Text>
                  ) : null}
                  {w.exercises.map((x, xi) => (
                    <Text
                      key={xi}
                      style={[type.caption, { color: colors.muted }]}
                      numberOfLines={2}
                    >
                      <Text style={{ color: colors.ink, fontWeight: '600' }}>
                        {nameOf(x.id) || x.id}
                      </Text>
                      {'  -  '}
                      {x.sets
                        .map(
                          (s) =>
                            `${s.reps}${s.weight ? ' x ' + fmtWeight(s.weight, units) : ''}`
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
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 1,
  },
  dayBlank: {
    width: '14.28%',
    height: 44,
    marginVertical: 1,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 2,
  },
  detail: { gap: spacing.sm },
  wo: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: 4 },
  woHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
