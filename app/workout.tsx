// Active workout player, ported from the web app's workout view
// (js/workout.js renderWorkout). Full-screen flow outside the tab bar.
import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { ExercisePickerModal } from '@/src/components/ExercisePickerModal';
import { warmupSets } from '@/src/components/WarmupSection';
import {
  fmtDuration,
  fromKgToDisplay,
  toKgFromDisplay,
} from '@/src/lib/training';
import { useLibrary } from '@/src/storage/library';
import { useTheme } from '@/src/storage/settings';
import {
  useWorkout,
  type SessionExercise,
  type SessionSet,
} from '@/src/storage/workout';
import { radius, spacing } from '@/src/theme';

function SetRow({
  exKey,
  set,
  index,
}: {
  exKey: string;
  set: SessionSet;
  index: number;
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  const { updateSet, toggleSetDone, deleteSet } = useWorkout();
  const units = theme.settings.units;

  const inputStyle = [
    styles.cellInput,
    {
      backgroundColor: colors.bg,
      borderColor: set.done ? colors.accent : colors.line,
      color: set.done ? colors.muted : colors.ink,
    },
  ];

  return (
    <View style={styles.setRow}>
      <Pressable
        onPress={() => toggleSetDone(exKey, set.key)}
        hitSlop={8}
        accessibilityLabel={set.done ? 'Mark set not done' : 'Mark set done'}
      >
        <Ionicons
          name={set.done ? 'checkmark-circle' : 'ellipse-outline'}
          size={26}
          color={set.done ? colors.accent : colors.muted}
        />
      </Pressable>
      <Text
        style={[
          styles.setNum,
          { color: set.warmup ? colors.accent : colors.muted },
        ]}
      >
        {set.warmup ? 'W' : index + 1}
      </Text>
      <TextInput
        style={[inputStyle, styles.weightInput]}
        value={set.weight}
        onChangeText={(v) => updateSet(exKey, set.key, { weight: v })}
        placeholder="0"
        placeholderTextColor={colors.muted}
        keyboardType="decimal-pad"
        returnKeyType="done"
        editable={!set.done}
        accessibilityLabel={`Weight in ${units}`}
      />
      <TextInput
        style={[inputStyle, styles.repsInput]}
        value={set.reps}
        onChangeText={(v) => updateSet(exKey, set.key, { reps: v })}
        placeholder="0"
        placeholderTextColor={colors.muted}
        keyboardType="number-pad"
        returnKeyType="done"
        editable={!set.done}
        accessibilityLabel="Reps"
      />
      <TextInput
        style={[inputStyle, styles.rpeInput]}
        value={set.rpe}
        onChangeText={(v) => updateSet(exKey, set.key, { rpe: v })}
        placeholder="-"
        placeholderTextColor={colors.muted}
        keyboardType="decimal-pad"
        returnKeyType="done"
        editable={!set.done}
        accessibilityLabel="RPE"
      />
      <Pressable
        onPress={() => deleteSet(exKey, set.key)}
        hitSlop={8}
        accessibilityLabel="Delete set"
      >
        <Ionicons name="trash-outline" size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}

function PlayerWarmup({
  exercise,
  units,
}: {
  exercise: SessionExercise;
  units: 'kg' | 'lb';
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  const { byId } = useLibrary();
  const { addWarmupSets } = useWorkout();
  const [added, setAdded] = useState(false);

  const ex = byId.get(exercise.exerciseId);
  const firstWorking = exercise.sets.find((s) => !s.warmup);
  const firstKg = firstWorking
    ? toKgFromDisplay(parseFloat(firstWorking.weight) || 0, units)
    : 0;
  const suggestions = useMemo(() => warmupSets(firstKg), [firstKg]);

  if (!ex || (ex.equipment !== 'barbell' && ex.equipment !== 'dumbbell')) {
    return null;
  }
  if (!suggestions.length || added) return null;

  return (
    <View
      style={[
        styles.warmupBox,
        { backgroundColor: colors.bg, borderColor: colors.line },
      ]}
    >
      <View style={styles.warmupHeader}>
        <Ionicons name="flame-outline" size={16} color={colors.accent} />
        <Text style={[type.chip, { color: colors.muted }]}>
          Warm-up suggestion
        </Text>
      </View>
      <Text style={[type.caption, { color: colors.muted }]}>
        {suggestions
          .map(
            (s) =>
              `${Math.round(fromKgToDisplay(s.weight, units) * 10) / 10} ${units} x ${s.reps}`
          )
          .join('  ·  ')}
      </Text>
      <Pressable
        style={[styles.warmupButton, { borderColor: colors.accent }]}
        onPress={() => {
          addWarmupSets(exercise.key, suggestions);
          setAdded(true);
        }}
      >
        <Text style={[type.chip, { color: colors.accent }]}>
          Add warm-up sets
        </Text>
      </Pressable>
    </View>
  );
}

function ExerciseCard({ exercise }: { exercise: SessionExercise }) {
  const theme = useTheme();
  const { colors, type } = theme;
  const { byId } = useLibrary();
  const units = theme.settings.units;
  const {
    toggleExerciseExpanded,
    removeExercise,
    moveExercise,
    swapExercise,
    setExerciseNote,
    addSet,
  } = useWorkout();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);

  const ex = byId.get(exercise.exerciseId);
  const doneCount = exercise.sets.filter((s) => s.done).length;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      <Pressable
        style={styles.cardHeader}
        onPress={() => toggleExerciseExpanded(exercise.key)}
      >
        <View style={styles.cardTitle}>
          <Text
            style={[type.subtitle, { fontWeight: '700' }]}
            numberOfLines={1}
          >
            {ex ? ex.name : exercise.exerciseId}
          </Text>
          <Text style={[type.caption, { color: colors.muted }]}>
            {doneCount}/{exercise.sets.length} sets
            {exercise.targetReps ? ` · target ${exercise.targetReps}` : ''}
            {exercise.swapped ? ' · swapped' : ''}
          </Text>
        </View>
        <Ionicons
          name={exercise.expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.muted}
        />
      </Pressable>

      {exercise.expanded && (
        <View style={styles.cardBody}>
          <View style={styles.cardActions}>
            <Pressable
              style={styles.actionButton}
              onPress={() => setSwapOpen(true)}
              hitSlop={8}
              accessibilityLabel="Swap exercise"
            >
              <Ionicons
                name="swap-horizontal"
                size={18}
                color={colors.accent}
              />
              <Text style={[styles.actionLabel, { color: colors.accent }]}>
                Swap
              </Text>
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => moveExercise(exercise.key, -1)}
              hitSlop={8}
              accessibilityLabel="Move exercise up"
            >
              <Ionicons name="arrow-up" size={18} color={colors.muted} />
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => moveExercise(exercise.key, 1)}
              hitSlop={8}
              accessibilityLabel="Move exercise down"
            >
              <Ionicons name="arrow-down" size={18} color={colors.muted} />
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => setConfirmRemove(true)}
              hitSlop={8}
              accessibilityLabel="Remove exercise"
            >
              <Ionicons name="trash-outline" size={18} color={colors.ember} />
            </Pressable>
          </View>

          <View style={styles.setHeader}>
            <View style={styles.doneCol} />
            <Text style={[styles.setNum, styles.headerText]}> </Text>
            <Text
              style={[
                styles.weightInput,
                styles.headerText,
                { color: colors.muted },
              ]}
            >
              {units.toUpperCase()}
            </Text>
            <Text
              style={[
                styles.repsInput,
                styles.headerText,
                { color: colors.muted },
              ]}
            >
              REPS
            </Text>
            <Text
              style={[
                styles.rpeInput,
                styles.headerText,
                { color: colors.muted },
              ]}
            >
              RPE
            </Text>
            <View style={styles.delCol} />
          </View>

          {exercise.sets.map((s, i) => (
            <SetRow key={s.key} exKey={exercise.key} set={s} index={i} />
          ))}

          <Pressable
            style={[
              styles.addSetButton,
              { borderColor: colors.line, backgroundColor: colors.bg },
            ]}
            onPress={() => addSet(exercise.key)}
          >
            <Ionicons name="add" size={18} color={colors.accent} />
            <Text style={[type.chip, { color: colors.accent }]}>Add set</Text>
          </Pressable>

          <PlayerWarmup exercise={exercise} units={units} />

          <TextInput
            style={[
              styles.noteInput,
              {
                backgroundColor: colors.bg,
                borderColor: colors.line,
                color: colors.ink,
              },
            ]}
            value={exercise.note}
            onChangeText={(v) => setExerciseNote(exercise.key, v)}
            placeholder="Exercise note (optional)"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
          />
        </View>
      )}

      <ConfirmDialog
        visible={confirmRemove}
        title="Remove exercise"
        message={`Remove "${ex ? ex.name : exercise.exerciseId}" from this workout? Logged sets for it will be lost.`}
        confirmLabel="Remove"
        onConfirm={() => {
          setConfirmRemove(false);
          removeExercise(exercise.key);
        }}
        onCancel={() => setConfirmRemove(false)}
      />
      <ExercisePickerModal
        visible={swapOpen}
        title="Swap exercise"
        excludeIds={[exercise.exerciseId]}
        onClose={() => setSwapOpen(false)}
        onPick={(id) => {
          setSwapOpen(false);
          swapExercise(exercise.key, id);
        }}
      />
    </View>
  );
}

function RestBar() {
  const theme = useTheme();
  const { colors, type } = theme;
  const { rest, skipRest, extendRest } = useWorkout();
  if (!rest) return null;
  const progress = rest.total > 0 ? rest.left / rest.total : 0;
  return (
    <View
      style={[
        styles.restBar,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      <View style={styles.restTop}>
        <Ionicons name="timer-outline" size={20} color={colors.accent} />
        <Text style={[type.subtitle, { color: colors.accent }]}>
          {fmtDuration(rest.left)}
        </Text>
        <Text
          style={[type.caption, { color: colors.muted, flex: 1 }]}
          numberOfLines={1}
        >
          {rest.label}
        </Text>
        <Pressable
          style={[styles.restButton, { borderColor: colors.line }]}
          onPress={() => extendRest(30)}
          accessibilityLabel="Add 30 seconds"
        >
          <Text style={[type.chip, { color: colors.ink }]}>+30s</Text>
        </Pressable>
        <Pressable
          style={[styles.restButton, { backgroundColor: colors.accent }]}
          onPress={skipRest}
          accessibilityLabel="Skip rest"
        >
          <Text style={[type.chip, { color: colors.bg }]}>Skip</Text>
        </Pressable>
      </View>
      <View style={[styles.restTrack, { backgroundColor: colors.bg }]}>
        <View
          style={[
            styles.restFill,
            { backgroundColor: colors.accent, width: `${progress * 100}%` },
          ]}
        />
      </View>
    </View>
  );
}

export default function WorkoutScreen() {
  const theme = useTheme();
  const { colors, type } = theme;
  useKeepAwake();

  const { workout, buildSummary, cancelWorkout, addExercise } = useWorkout();
  const [elapsed, setElapsed] = useState(0);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Tick the elapsed timer off startedAt only, so typing in set inputs
  // does not recreate the interval.
  const startedAt = workout?.startedAt;
  useEffect(() => {
    if (!startedAt) {
      router.replace('/(tabs)');
      return;
    }
    setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    const int = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(int);
  }, [startedAt]);

  if (!workout) return null;

  const onFinish = async () => {
    const summary = await buildSummary();
    if (!summary) {
      setNotice('Mark at least one set as done to finish the workout.');
      return;
    }
    router.push('/workout-summary');
  };

  const subtitle = workout.programName
    ? `${workout.programName} · ${workout.dayName}`
    : workout.dayName;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.bg }]}
      edges={['bottom']}
    >
      <Stack.Screen
        options={{
          title: `Workout · ${fmtDuration(elapsed)}`,
          gestureEnabled: false,
          headerLeft: () => (
            <Pressable onPress={() => setConfirmCancel(true)} hitSlop={8}>
              <Text style={{ color: colors.ember, fontWeight: '600' }}>
                Cancel
              </Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={onFinish} hitSlop={8}>
              <Text style={{ color: colors.accent, fontWeight: '700' }}>
                Finish
              </Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.subHeader}>
        <Text style={[type.caption, { color: colors.muted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      {notice && (
        <Pressable
          style={[
            styles.notice,
            { backgroundColor: colors.surface, borderColor: colors.warn },
          ]}
          onPress={() => setNotice(null)}
        >
          <Ionicons name="alert-circle" size={18} color={colors.warn} />
          <Text style={[type.body, { color: colors.ink, flex: 1 }]}>
            {notice}
          </Text>
          <Ionicons name="close" size={18} color={colors.muted} />
        </Pressable>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {workout.exercises.map((e) => (
          <ExerciseCard key={e.key} exercise={e} />
        ))}

        <Pressable
          style={[
            styles.addExercise,
            { borderColor: colors.accent, backgroundColor: colors.surface },
          ]}
          onPress={() => setPickerOpen(true)}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
          <Text style={[type.subtitle, { color: colors.accent }]}>
            Add exercise
          </Text>
        </Pressable>

        <Text
          style={[type.caption, { color: colors.muted, textAlign: 'center' }]}
        >
          Tip: tap the circle to log a set. Warm-up sets do not count toward
          volume or PRs.
        </Text>
      </ScrollView>

      <RestBar />

      <ConfirmDialog
        visible={confirmCancel}
        title="Cancel workout"
        message="Discard this workout? None of the sets will be saved."
        confirmLabel="Discard"
        onConfirm={() => {
          setConfirmCancel(false);
          cancelWorkout();
          router.replace('/(tabs)');
        }}
        onCancel={() => setConfirmCancel(false)}
      />
      <ExercisePickerModal
        visible={pickerOpen}
        title="Add exercise"
        onClose={() => setPickerOpen(false)}
        onPick={(id) => {
          setPickerOpen(false);
          addExercise(id);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  subHeader: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: { flex: 1, gap: 2 },
  cardBody: { padding: spacing.md, paddingTop: 0, gap: spacing.sm },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
  },
  actionLabel: { fontSize: 13, fontWeight: '600' },
  setHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerText: { fontSize: 10, fontWeight: '700' },
  doneCol: { width: 26 },
  delCol: { width: 26 },
  setNum: { width: 24, textAlign: 'center', fontSize: 12, fontWeight: '700' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cellInput: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    fontSize: 15,
    textAlign: 'center',
  },
  weightInput: { flex: 1 },
  repsInput: { flex: 1 },
  rpeInput: { width: 48 },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  warmupBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  warmupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  warmupButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
  },
  addExercise: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  restBar: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  restTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  restButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  restTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  restFill: { height: '100%', borderRadius: 3 },
});
