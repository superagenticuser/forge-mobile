// Active workout player, ported from the web app's workout view
// (js/workout.js renderWorkout). Full-screen flow outside the tab bar.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { ExercisePickerModal } from '@/src/components/ExercisePickerModal';
import { PlateCalculatorModal } from '@/src/components/PlateCalculatorModal';
import { SetTypeModal } from '@/src/components/SetTypeModal';
import { CameraModal } from '@/src/components/camera/CameraModal';
import { warmupSets } from '@/src/components/WarmupSection';
import {
  fmtDuration,
  fromKgToDisplay,
  SET_TYPE_SHORT,
  toKgFromDisplay,
  type SetType,
} from '@/src/lib/training';
import { useLibrary } from '@/src/storage/library';
import { useTheme } from '@/src/storage/settings';
import {
  getTempo,
  saveTempo,
  supersetBadge,
  useWorkout,
  type SessionExercise,
  type SessionSet,
  type Tempo,
} from '@/src/storage/workout';
import { radius, spacing } from '@/src/theme';

function SetRow({
  exKey,
  set,
  index,
  isSub,
  onTypePress,
}: {
  exKey: string;
  set: SessionSet;
  index: number;
  isSub?: boolean;
  onTypePress: (setKey: string) => void;
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

  const advanced = set.type !== 'std' && set.type !== 'warmup';

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
        {isSub ? '↳' : set.warmup ? 'W' : index + 1}
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
      {isSub ? (
        <View style={[styles.typeBadge, { borderColor: colors.line }]}>
          <Text style={[styles.typeBadgeText, { color: colors.muted }]}>
            Drop
          </Text>
        </View>
      ) : (
        <Pressable
          style={[
            styles.typeBadge,
            {
              borderColor: advanced ? colors.accent : colors.line,
              backgroundColor: advanced ? colors.accent : 'transparent',
            },
          ]}
          onPress={() => onTypePress(set.key)}
          hitSlop={4}
          accessibilityLabel={`Set type: ${SET_TYPE_SHORT[set.type]}. Tap to change.`}
        >
          <Text
            style={[
              styles.typeBadgeText,
              { color: advanced ? colors.bg : colors.muted },
            ]}
          >
            {SET_TYPE_SHORT[set.type]}
          </Text>
        </Pressable>
      )}
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

/** Expandable form guide: the exercise's steps (web: guide-toggle). */
function FormGuidePanel({ exerciseId }: { exerciseId: string }) {
  const theme = useTheme();
  const { colors, type } = theme;
  const { byId } = useLibrary();
  const ex = byId.get(exerciseId);
  if (!ex || !ex.steps.length) {
    return (
      <Text style={[type.caption, { color: colors.muted }]}>
        No form guide for this exercise yet.
      </Text>
    );
  }
  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: colors.bg, borderColor: colors.line },
      ]}
    >
      <View style={styles.panelHeader}>
        <Ionicons name="book-outline" size={16} color={colors.accent} />
        <Text style={[type.chip, { color: colors.muted }]}>Form guide</Text>
      </View>
      {ex.steps.map((s, i) => (
        <View key={i} style={styles.stepRow}>
          <Text
            style={[type.body, { color: colors.accent, fontWeight: '700' }]}
          >
            {i + 1}.
          </Text>
          <Text style={[type.body, { color: colors.ink, flex: 1 }]}>{s}</Text>
        </View>
      ))}
    </View>
  );
}

/** Tempo coach: paces each rep through eccentric / pause / concentric phases
 * (web: tempo-toggle + startTempo). Tempo persists per exercise. */
function TempoPanel({ exerciseId }: { exerciseId: string }) {
  const theme = useTheme();
  const { colors, type } = theme;
  const voice = theme.settings.voiceCues;
  const [tempo, setTempo] = useState<Tempo>([3, 1, 1]);
  const [running, setRunning] = useState(false);
  const [display, setDisplay] = useState('Ready');
  const intRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  useEffect(() => {
    let cancelled = false;
    getTempo(exerciseId).then((t) => {
      if (!cancelled) setTempo(t);
    });
    return () => {
      cancelled = true;
      if (intRef.current) clearInterval(intRef.current);
    };
  }, [exerciseId]);

  const stop = () => {
    if (intRef.current) {
      clearInterval(intRef.current);
      intRef.current = null;
    }
    setRunning(false);
    setDisplay('Ready');
  };

  const start = async () => {
    if (intRef.current) clearInterval(intRef.current);
    const clean: Tempo = [
      Math.max(1, Math.round(tempo[0])),
      Math.max(0, Math.round(tempo[1])),
      Math.max(1, Math.round(tempo[2])),
    ];
    setTempo(clean);
    await saveTempo(exerciseId, clean);
    const phases = [
      { label: 'Lower', secs: clean[0] },
      { label: 'Hold', secs: clean[1] },
      { label: 'Lift', secs: clean[2] },
    ].filter((p) => p.secs > 0);
    if (!phases.length) return;
    setRunning(true);
    let pi = 0;
    let left = phases[0].secs;
    let rep = 1;
    const cuePhase = (label: string, r: number, first: boolean) => {
      Haptics.selectionAsync().catch(() => {});
      if (voiceRef.current) {
        try {
          Speech.speak(first ? `${label}, rep ${r}` : label);
        } catch {
          // Speech engine unavailable; haptics already fired.
        }
      }
    };
    setDisplay(`${phases[0].label} ${left} · rep ${rep}`);
    cuePhase(phases[0].label, rep, true);
    intRef.current = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        pi += 1;
        if (pi >= phases.length) {
          pi = 0;
          rep += 1;
        }
        left = phases[pi].secs;
        cuePhase(phases[pi].label, rep, pi === 0);
      }
      setDisplay(`${phases[pi].label} ${left} · rep ${rep}`);
    }, 1000);
  };

  const setPart = (i: number, v: string) => {
    const n = Math.max(0, parseInt(v) || 0);
    setTempo((prev) => {
      const next: Tempo = [prev[0], prev[1], prev[2]];
      next[i] = n;
      return next;
    });
  };

  const labels = ['Eccentric', 'Pause', 'Concentric'];

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: colors.bg, borderColor: colors.line },
      ]}
    >
      <View style={styles.panelHeader}>
        <Ionicons name="timer-outline" size={16} color={colors.accent} />
        <Text style={[type.chip, { color: colors.muted }]}>
          Tempo coach: pace each rep
        </Text>
      </View>
      <View style={styles.tempoInputs}>
        {labels.map((label, i) => (
          <View key={label} style={styles.tempoField}>
            <Text style={[type.caption, { color: colors.muted }]}>{label}</Text>
            <TextInput
              style={[
                styles.tempoInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                  color: colors.ink,
                },
              ]}
              value={String(tempo[i])}
              onChangeText={(v) => setPart(i, v)}
              keyboardType="number-pad"
              returnKeyType="done"
              editable={!running}
              accessibilityLabel={`${label} seconds`}
            />
          </View>
        ))}
      </View>
      <View style={styles.tempoActions}>
        {!running ? (
          <Pressable
            style={[styles.tempoButton, { backgroundColor: colors.accent }]}
            onPress={start}
          >
            <Text style={[type.chip, { color: colors.bg }]}>Start</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.tempoButton, { borderColor: colors.line }]}
            onPress={stop}
          >
            <Text style={[type.chip, { color: colors.ink }]}>Stop</Text>
          </Pressable>
        )}
        <Text
          style={[
            type.subtitle,
            { color: running ? colors.accent : colors.muted },
          ]}
        >
          {display}
        </Text>
      </View>
    </View>
  );
}

function ExerciseCard({
  exercise,
  index,
}: {
  exercise: SessionExercise;
  index: number;
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  const { byId } = useLibrary();
  const units = theme.settings.units;
  const {
    workout,
    toggleExerciseExpanded,
    removeExercise,
    moveExercise,
    swapExercise,
    setExerciseNote,
    addSet,
    updateSet,
    setSetType,
    addDropSet,
    toggleLink,
  } = useWorkout();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [typeFor, setTypeFor] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showTempo, setShowTempo] = useState(false);
  const [platesOpen, setPlatesOpen] = useState(false);
  const [recorderOpen, setRecorderOpen] = useState(false);

  const ex = byId.get(exercise.exerciseId);
  const doneCount = exercise.sets.filter((s) => s.done).length;
  const badge = workout
    ? supersetBadge(index, workout.exercises, workout.linkedAfter)
    : null;
  const linked =
    !!workout &&
    (workout.linkedAfter.includes(exercise.key) ||
      (index > 0 &&
        workout.linkedAfter.includes(workout.exercises[index - 1].key)));
  const isLast = !!workout && index >= workout.exercises.length - 1;
  const firstWorking = exercise.sets.find((s) => !s.warmup);
  const firstDisplay = firstWorking ? parseFloat(firstWorking.weight) || 0 : 0;
  const topSets = exercise.sets.filter((s) => !s.parentKey);

  const pickType = (setKey: string, t: SetType) => {
    setSetType(exercise.key, setKey, t);
    // A fresh drop set starts with one linked sub-row right away.
    if (t === 'drop') addDropSet(exercise.key, setKey);
    setTypeFor(null);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: badge ? colors.accent : colors.line,
        },
      ]}
    >
      <Pressable
        style={styles.cardHeader}
        onPress={() => toggleExerciseExpanded(exercise.key)}
      >
        <View style={styles.cardTitle}>
          <View style={styles.titleRow}>
            <Text
              style={[type.subtitle, { fontWeight: '700', flex: 1 }]}
              numberOfLines={1}
            >
              {ex ? ex.name : exercise.exerciseId}
            </Text>
            {badge && (
              <View
                style={[styles.groupBadge, { backgroundColor: colors.accent }]}
              >
                <Text style={[styles.groupBadgeText, { color: colors.bg }]}>
                  {badge}
                </Text>
              </View>
            )}
          </View>
          <Text style={[type.caption, { color: colors.muted }]}>
            {doneCount}/{exercise.sets.length} sets
            {exercise.targetReps ? ` · target ${exercise.targetReps}` : ''}
            {exercise.swapped ? ' · swapped' : ''}
            {exercise.travelSwap ? ' · travel swap' : ''}
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

          <View style={styles.cardActions}>
            <Pressable
              style={styles.actionButton}
              onPress={() => setShowGuide((v) => !v)}
              hitSlop={8}
              accessibilityLabel="Form guide"
            >
              <Ionicons
                name="book-outline"
                size={18}
                color={showGuide ? colors.accent : colors.muted}
              />
              <Text
                style={[
                  styles.actionLabel,
                  { color: showGuide ? colors.accent : colors.muted },
                ]}
              >
                Guide
              </Text>
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => setShowTempo((v) => !v)}
              hitSlop={8}
              accessibilityLabel="Tempo coach"
            >
              <Ionicons
                name="timer-outline"
                size={18}
                color={showTempo ? colors.accent : colors.muted}
              />
              <Text
                style={[
                  styles.actionLabel,
                  { color: showTempo ? colors.accent : colors.muted },
                ]}
              >
                Tempo
              </Text>
            </Pressable>
            {ex?.equipment === 'barbell' && (
              <Pressable
                style={styles.actionButton}
                onPress={() => setPlatesOpen(true)}
                hitSlop={8}
                accessibilityLabel="Plate calculator"
              >
                <Ionicons
                  name="barbell-outline"
                  size={18}
                  color={colors.muted}
                />
                <Text style={[styles.actionLabel, { color: colors.muted }]}>
                  Plates
                </Text>
              </Pressable>
            )}
            {!isLast && (
              <Pressable
                style={styles.actionButton}
                onPress={() => toggleLink(exercise.key)}
                hitSlop={8}
                accessibilityLabel={
                  linked
                    ? 'Unlink from next exercise'
                    : 'Link with next exercise'
                }
              >
                <Ionicons
                  name="link-outline"
                  size={18}
                  color={linked ? colors.accent : colors.muted}
                />
                <Text
                  style={[
                    styles.actionLabel,
                    { color: linked ? colors.accent : colors.muted },
                  ]}
                >
                  {linked ? 'Unlink' : 'Link next'}
                </Text>
              </Pressable>
            )}
          </View>

          {showGuide && <FormGuidePanel exerciseId={exercise.exerciseId} />}
          {showTempo && <TempoPanel exerciseId={exercise.exerciseId} />}

          <Pressable
            style={styles.actionButton}
            onPress={() => setRecorderOpen(true)}
            hitSlop={8}
            accessibilityLabel="Record a form clip"
          >
            <Ionicons name="videocam-outline" size={18} color={colors.muted} />
            <Text style={[styles.actionLabel, { color: colors.muted }]}>
              Record
            </Text>
          </Pressable>

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
                { width: 44, textAlign: 'center' },
                styles.headerText,
                { color: colors.muted },
              ]}
            >
              TYPE
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

          {topSets.map((s, i) => {
            const drops = exercise.sets.filter((d) => d.parentKey === s.key);
            return (
              <View key={s.key}>
                <SetRow
                  exKey={exercise.key}
                  set={s}
                  index={i}
                  onTypePress={setTypeFor}
                />
                {drops.map((d) => (
                  <View key={d.key} style={styles.dropRow}>
                    <SetRow
                      exKey={exercise.key}
                      set={d}
                      index={-1}
                      isSub
                      onTypePress={setTypeFor}
                    />
                  </View>
                ))}
                {s.type === 'drop' && !s.done && (
                  <Pressable
                    style={styles.addDropButton}
                    onPress={() => addDropSet(exercise.key, s.key)}
                    hitSlop={8}
                  >
                    <Ionicons name="add" size={14} color={colors.accent} />
                    <Text
                      style={[styles.addDropLabel, { color: colors.accent }]}
                    >
                      Add drop
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}

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

      <SetTypeModal
        visible={typeFor !== null}
        current={exercise.sets.find((s) => s.key === typeFor)?.type ?? 'std'}
        onClose={() => setTypeFor(null)}
        onPick={(t) => typeFor && pickType(typeFor, t)}
      />
      <PlateCalculatorModal
        visible={platesOpen}
        onClose={() => setPlatesOpen(false)}
        initialTarget={firstDisplay}
      />
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
      <CameraModal
        visible={recorderOpen}
        mode="recorder"
        title={ex ? ex.name : exercise.exerciseId}
        exId={exercise.exerciseId}
        exName={ex ? ex.name : exercise.exerciseId}
        onClose={() => setRecorderOpen(false)}
        onClipSaved={(reps) => {
          // If reps were counted, pre-fill the next unfinished set's reps.
          if (reps > 0) {
            const next = exercise.sets.find((s) => !s.done && !s.parentKey);
            if (next && !next.reps) {
              updateSet(exercise.key, next.key, { reps: String(reps) });
            }
          }
        }}
      />
    </View>
  );
}

/** Mirror mode: front-camera preview with a workout HUD overlay. */
function MirrorModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors, type } = useTheme();
  const { workout, toggleSetDone, rest } = useWorkout();
  const { byId } = useLibrary();

  // Find the first exercise with an unfinished set.
  let hudEx: {
    name: string;
    setNum: number;
    setTotal: number;
    reps: string;
  } | null = null;
  let doneTarget: { exKey: string; setKey: string } | null = null;
  if (workout) {
    for (const e of workout.exercises) {
      const topSets = e.sets.filter((s) => !s.parentKey);
      const done = topSets.filter((s) => s.done).length;
      if (done < topSets.length) {
        const ex = byId.get(e.exerciseId);
        const next = topSets[done];
        hudEx = {
          name: ex ? ex.name : e.exerciseId,
          setNum: done + 1,
          setTotal: topSets.length,
          reps: next.reps || '?',
        };
        doneTarget = { exKey: e.key, setKey: next.key };
        break;
      }
    }
  }

  const hud = (
    <View style={{ gap: 2 }}>
      {hudEx ? (
        <>
          <Text style={[type.subtitle, { color: '#fff' }]}>{hudEx.name}</Text>
          <Text style={[type.body, { color: 'rgba(255,255,255,0.85)' }]}>
            Set {hudEx.setNum} of {hudEx.setTotal} · {hudEx.reps} reps
          </Text>
        </>
      ) : (
        <>
          <Text style={[type.subtitle, { color: '#fff' }]}>
            Workout complete
          </Text>
          <Text style={[type.body, { color: 'rgba(255,255,255,0.85)' }]}>
            Nice work.
          </Text>
        </>
      )}
      {rest && rest.left > 0 && (
        <Text style={[type.chip, { color: colors.accent }]}>
          Rest {fmtDuration(rest.left)}
        </Text>
      )}
    </View>
  );

  return (
    <CameraModal
      visible={visible}
      mode="mirror"
      title={workout?.programName || workout?.dayName || 'Workout'}
      onClose={onClose}
      hud={hud}
      onMirrorSetDone={
        doneTarget
          ? () => toggleSetDone(doneTarget.exKey, doneTarget.setKey)
          : undefined
      }
    />
  );
}

function RestBar() {
  const theme = useTheme();
  const { colors, type } = theme;
  const { rest, skipRest, extendRest, advanceRestCue } = useWorkout();
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
      {!!rest.cue && (
        <Pressable onPress={advanceRestCue} accessibilityLabel="Next form cue">
          <Text style={[type.caption, { color: colors.muted }]}>
            <Text style={{ color: colors.accent, fontWeight: '700' }}>
              Form cue:{' '}
            </Text>
            {rest.cue}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default function WorkoutScreen() {
  const theme = useTheme();
  const { colors, type } = theme;
  useKeepAwake();

  const {
    workout,
    buildSummary,
    cancelWorkout,
    addExercise,
    toggleTravelMode,
  } = useWorkout();
  const [elapsed, setElapsed] = useState(0);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [mirrorOpen, setMirrorOpen] = useState(false);

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

      <View
        style={[
          styles.subHeader,
          { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        ]}
      >
        <Text
          style={[type.caption, { color: colors.muted, flex: 1 }]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
        <Pressable
          style={[styles.mirrorBtn, { borderColor: colors.line }]}
          onPress={() => setMirrorOpen(true)}
          hitSlop={8}
          accessibilityLabel="Open mirror mode"
        >
          <Ionicons name="person-outline" size={16} color={colors.accent} />
          <Text style={[type.chip, { color: colors.accent }]}>Mirror</Text>
        </Pressable>
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
        <View
          style={[
            styles.travelRow,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <View style={styles.travelText}>
            <Text style={type.subtitle}>Travel mode</Text>
            <Text style={[type.caption, { color: colors.muted }]}>
              Swap barbell and machine work for bodyweight, dumbbell, or band
              alternatives.
            </Text>
          </View>
          <Switch
            value={workout.travelMode}
            onValueChange={() => {
              const n = toggleTravelMode();
              if (n > 0) {
                setNotice(
                  `Travel mode on: ${n} exercise${n > 1 ? 's' : ''} swapped to travel-friendly alternatives.`
                );
              }
            }}
            trackColor={{ true: colors.accent }}
            accessibilityLabel="Travel mode"
          />
        </View>

        {workout.exercises.map((e, i) => (
          <ExerciseCard key={e.key} exercise={e} index={i} />
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
          Tip: tap the circle to log a set, the type badge to change set type.
          Warm-up sets do not count toward volume or PRs.
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
      <MirrorModal visible={mirrorOpen} onClose={() => setMirrorOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  subHeader: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  mirrorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
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
  dropRow: { paddingLeft: spacing.lg, opacity: 0.92 },
  addDropButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingLeft: spacing.lg,
  },
  addDropLabel: { fontSize: 13, fontWeight: '600' },
  typeBadge: {
    width: 44,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: 6,
    alignItems: 'center',
  },
  typeBadgeText: { fontSize: 11, fontWeight: '800' },
  groupBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  groupBadgeText: { fontSize: 11, fontWeight: '800' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  panel: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stepRow: { flexDirection: 'row', gap: spacing.sm },
  tempoInputs: { flexDirection: 'row', gap: spacing.md },
  tempoField: { flex: 1, gap: 4 },
  tempoInput: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    fontSize: 16,
    textAlign: 'center',
  },
  tempoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tempoButton: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  travelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  travelText: { flex: 1, gap: 2 },
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
  rpeInput: { width: 40 },
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
