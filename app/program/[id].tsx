// Program detail: active-program flow (start/continue/stop), mesocycle week
// view with deload marking, per-day completion marks, ICS calendar export,
// travel-mode day toggle, per-exercise substitution, custom program delete.
// Ported from the web app's renderProgram (js/programs.js).
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { ExercisePickerModal } from '@/src/components/ExercisePickerModal';
import { fmtWeight, travelSub } from '@/src/lib/training';
import { programICS, type MesocycleWeek } from '@/src/lib/programgen';
import { useLibrary } from '@/src/storage/library';
import {
  usePrograms,
  type StoredProgramDayExercise,
} from '@/src/storage/programs';
import { useTheme } from '@/src/storage/settings';
import { useWorkout } from '@/src/storage/workout';
import { prettify } from '@/src/format';
import { radius, spacing } from '@/src/theme';

function MetaChip({ label }: { label: string }) {
  const theme = useTheme();
  const { colors, type } = theme;
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      <Text style={[type.chip, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

export default function ProgramDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { colors, type, settings } = theme;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { startProgramDay } = useWorkout();
  const { exercises } = useLibrary();
  const {
    programById,
    activeProgramId,
    setActiveProgram,
    deleteCustomProgram,
    dayDoneCount,
    nextDayIdx,
    adherence,
  } = usePrograms();

  const [starting, setStarting] = useState<string | null>(null);
  const [travelDays, setTravelDays] = useState<Record<string, boolean>>({});
  const [swapTarget, setSwapTarget] = useState<{
    dayIdx: number;
    exIdx: number;
  } | null>(null);
  const [dayOverrides, setDayOverrides] = useState<
    Record<string, StoredProgramDayExercise[]>
  >({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const program = programById(id ?? '');
  const byId = new Map(exercises.map((e) => [e.id, e]));

  if (!program) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <View style={styles.empty}>
          <Text style={type.subtitle}>Program not found</Text>
          <Pressable
            style={[styles.backButton, { backgroundColor: colors.accent }]}
            onPress={() => router.back()}
          >
            <Text style={[type.chip, { color: colors.bg }]}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isActive = activeProgramId === program.id;
  const ni = nextDayIdx(program);
  const { done: adhDone, total: adhTotal } = adherence(program);
  const adhPct = adhTotal > 0 ? Math.round((adhDone / adhTotal) * 100) : 0;

  // Overview stats: training days, exercises, total sets, est. weekly volume.
  const trainingDays = program.days.filter((d) => !d.rest);
  const totalExercises = trainingDays.reduce(
    (a, d) => a + d.exercises.length,
    0
  );
  const totalSets = trainingDays.reduce(
    (a, d) => a + d.exercises.reduce((b, x) => b + x.sets, 0),
    0
  );

  const startDay = async (
    dayIdx: number,
    dayName: string,
    dayExercises: StoredProgramDayExercise[],
    week?: number
  ) => {
    const key = `${dayIdx}`;
    setStarting(key + (week ? `-w${week}` : ''));
    try {
      const list = travelDays[key]
        ? dayExercises.map((x) => {
            const sub = travelSub(x.id, exercises);
            return sub ? { ...x, id: sub.id } : x;
          })
        : dayExercises;
      await startProgramDay(
        program.id,
        program.name,
        dayName,
        list,
        dayIdx,
        week
      );
      router.push('/workout');
    } finally {
      setStarting(null);
    }
  };

  const exportICS = async () => {
    const ics = programICS(program);
    const uri = `${cacheDirectory}forge-${program.id}.ics`;
    await writeAsStringAsync(uri, ics);
    await Sharing.shareAsync(uri, {
      mimeType: 'text/calendar',
      dialogTitle: 'Export program to calendar',
    });
  };

  const dayList = (dayIdx: number) =>
    dayOverrides[dayIdx] ?? program.days[dayIdx].exercises;

  const renderDay = (
    dayIdx: number,
    dayName: string,
    dayExercises: StoredProgramDayExercise[],
    week?: MesocycleWeek,
    weightLabel?: (x: StoredProgramDayExercise) => string | null
  ) => {
    const key = `${dayIdx}`;
    const baseDay = program.days[dayIdx];
    const mesoDay = week?.days[dayIdx];
    const isRest = !!mesoDay?.rest || !!baseDay?.rest;
    const times = dayDoneCount(program.id, dayIdx);
    const travelOn = !!travelDays[key];
    const busyKey = key + (week ? `-w${week.week}` : '');
    if (isRest) {
      return (
        <View
          key={busyKey + dayName}
          style={[
            styles.day,
            styles.restDay,
            { borderColor: colors.line, backgroundColor: colors.surface },
          ]}
        >
          <Ionicons name="bed-outline" size={18} color={colors.muted} />
          <Text style={[type.body, { color: colors.muted }]}>
            {dayName}: Rest day
          </Text>
        </View>
      );
    }
    return (
      <View key={busyKey + dayName} style={styles.day}>
        <View style={styles.dayHeader}>
          <Text style={[type.subtitle, { color: colors.accent, flex: 1 }]}>
            {dayName}
            {times > 0 && (
              <Text style={[type.caption, { color: theme.colors.volt }]}>
                {' '}
                ✓ {times}x
              </Text>
            )}
          </Text>
          <Pressable
            style={[
              styles.travelToggle,
              {
                backgroundColor: travelOn ? colors.accent : colors.surface,
                borderColor: travelOn ? colors.accent : colors.line,
              },
            ]}
            onPress={() =>
              setTravelDays((prev) => ({ ...prev, [key]: !prev[key] }))
            }
            accessibilityLabel="Toggle travel mode for this day"
          >
            <Ionicons
              name="airplane-outline"
              size={14}
              color={travelOn ? colors.bg : colors.muted}
            />
          </Pressable>
          <Pressable
            style={[styles.startDayButton, { backgroundColor: colors.accent }]}
            disabled={starting !== null}
            onPress={() => startDay(dayIdx, dayName, dayExercises, week?.week)}
            accessibilityLabel={`Start ${dayName}`}
          >
            <Ionicons name="play" size={14} color={colors.bg} />
            <Text style={[styles.startDayText, { color: colors.bg }]}>
              {starting === busyKey ? 'Starting…' : 'Start'}
            </Text>
          </Pressable>
        </View>
        {dayExercises.map((entry, exIdx) => {
          const exercise = byId.get(entry.id);
          const wl = weightLabel?.(entry);
          return (
            <View
              key={`${dayName}-${entry.id}-${exIdx}`}
              style={[
                styles.exerciseRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                },
              ]}
            >
              <Pressable
                style={styles.exerciseText}
                onPress={() =>
                  router.push({
                    pathname: '/exercise/[id]',
                    params: { id: entry.id },
                  })
                }
              >
                <Text style={type.body}>
                  {exercise ? exercise.name : entry.id}
                </Text>
                {!exercise && (
                  <Text style={[type.caption, { color: colors.muted }]}>
                    Unknown exercise id
                  </Text>
                )}
              </Pressable>
              <Text style={[styles.sets, { color: theme.colors.volt }]}>
                {entry.sets} × {entry.reps}
                {wl ? ` @ ${wl}` : ''}
              </Text>
              <Pressable
                onPress={() => setSwapTarget({ dayIdx, exIdx })}
                hitSlop={8}
                accessibilityLabel={`Substitute ${exercise?.name ?? entry.id}`}
              >
                <Ionicons
                  name="swap-horizontal"
                  size={18}
                  color={colors.muted}
                />
              </Pressable>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.bg }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + spacing.lg },
      ]}
    >
      <Stack.Screen options={{ title: program.name }} />

      <Text style={type.title}>{program.name}</Text>
      <Text style={[type.body, { color: colors.muted }]}>
        {program.tagline}
      </Text>

      <View style={styles.chips}>
        <MetaChip label={prettify(program.level)} />
        <MetaChip label={`${program.weeks} weeks`} />
        <MetaChip label={`${program.daysPerWeek} days/week`} />
        <MetaChip label={program.equipment} />
        {program.custom && <MetaChip label="Custom" />}
      </View>

      {/* Overview stats + adherence */}
      <View
        style={[
          styles.stats,
          { backgroundColor: colors.surface, borderColor: colors.line },
        ]}
      >
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={[type.subtitle, { color: colors.accent }]}>
              {trainingDays.length}
            </Text>
            <Text style={[type.caption, { color: colors.muted }]}>
              Training days
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[type.subtitle, { color: colors.accent }]}>
              {totalExercises}
            </Text>
            <Text style={[type.caption, { color: colors.muted }]}>
              Exercises
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[type.subtitle, { color: colors.accent }]}>
              {totalSets}
            </Text>
            <Text style={[type.caption, { color: colors.muted }]}>
              Sets/day
            </Text>
          </View>
        </View>
        {adhTotal > 0 && (
          <View style={styles.adh}>
            <View style={styles.adhHead}>
              <Text style={[type.caption, { color: colors.muted }]}>
                Adherence
              </Text>
              <Text style={[type.caption, { color: theme.colors.volt }]}>
                {adhDone} of {adhTotal} days ({adhPct}%)
              </Text>
            </View>
            <View style={[styles.adhTrack, { backgroundColor: colors.bg }]}>
              <View
                style={[
                  styles.adhFill,
                  {
                    backgroundColor: colors.accent,
                    width: `${adhPct}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {isActive ? (
          <>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: colors.accent }]}
              onPress={async () => {
                const day = program.days[ni];
                if (day) await startDay(ni, day.name, dayList(ni));
              }}
            >
              <Text style={[type.chip, { color: colors.bg }]}>
                Continue: {program.days[ni]?.name ?? ''}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.actionBtn,
                { borderColor: colors.line, borderWidth: 1 },
              ]}
              onPress={() => setActiveProgram(null)}
            >
              <Text style={[type.chip, { color: colors.muted }]}>
                Stop program
              </Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.accent }]}
            onPress={() => setActiveProgram(program.id)}
          >
            <Text style={[type.chip, { color: colors.bg }]}>
              Start this program
            </Text>
          </Pressable>
        )}
        <Pressable
          style={[
            styles.actionBtn,
            { borderColor: colors.line, borderWidth: 1 },
          ]}
          onPress={exportICS}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.muted} />
          <Text style={[type.chip, { color: colors.muted }]}>
            Export to calendar
          </Text>
        </Pressable>
        {program.custom && (
          <Pressable
            style={[
              styles.actionBtn,
              { borderColor: '#f87171', borderWidth: 1 },
            ]}
            onPress={() => setConfirmDelete(true)}
          >
            <Text style={[type.chip, { color: '#f87171' }]}>Delete</Text>
          </Pressable>
        )}
      </View>

      {program.mesocycle ? (
        <>
          <View
            style={[
              styles.mesoNote,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
          >
            <Text style={type.body}>
              <Text style={{ fontWeight: '700' }}>Periodized plan: </Text>
              <Text style={{ color: colors.muted }}>
                Weights increase 2.5% weekly. Week 4 is a deload at 60%.
              </Text>
            </Text>
          </View>
          {program.mesocycle.map((w) => (
            <View key={w.week} style={styles.week}>
              <Text
                style={[
                  type.subtitle,
                  w.deload && { color: theme.colors.volt },
                ]}
              >
                Week {w.week}
                {w.deload ? ' (Deload)' : ''}
              </Text>
              {w.days.map((d, di) =>
                renderDay(di, d.name, d.exercises, w, (x) =>
                  x.weight != null ? fmtWeight(x.weight, settings.units) : null
                )
              )}
            </View>
          ))}
        </>
      ) : (
        program.days.map((day, di) =>
          renderDay(di, day.name, dayList(di), undefined, (x) =>
            x.weight != null ? fmtWeight(x.weight, settings.units) : null
          )
        )
      )}

      <ExercisePickerModal
        visible={swapTarget !== null}
        title="Substitute exercise"
        excludeIds={
          swapTarget
            ? [dayList(swapTarget.dayIdx)[swapTarget.exIdx]?.id].filter(Boolean)
            : []
        }
        onPick={(id) => {
          if (swapTarget) {
            const { dayIdx, exIdx } = swapTarget;
            const list = [...dayList(dayIdx)];
            list[exIdx] = { ...list[exIdx], id };
            setDayOverrides((prev) => ({ ...prev, [dayIdx]: list }));
          }
          setSwapTarget(null);
        }}
        onClose={() => setSwapTarget(null)}
      />

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete program?"
        message={`Delete "${program.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await deleteCustomProgram(program.id);
          setConfirmDelete(false);
          router.replace('/(tabs)/programs');
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  backButton: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  stats: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 2 },
  adh: { gap: spacing.xs },
  adhHead: { flexDirection: 'row', justifyContent: 'space-between' },
  adhTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  adhFill: { height: '100%', borderRadius: 4 },
  mesoNote: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  week: { gap: spacing.sm },
  day: { gap: spacing.sm },
  restDay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  travelToggle: {
    borderWidth: 1,
    borderRadius: radius.pill,
    padding: spacing.xs,
  },
  startDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  startDayText: { fontSize: 13, fontWeight: '800' },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  exerciseText: { flex: 1, gap: 2 },
  sets: { fontSize: 13, fontWeight: '700' },
});
