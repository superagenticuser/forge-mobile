// Pyramid set builder. Ported from the web app's openPyramid (js/programs.js):
// weights ramp linearly between a top and bottom weight. Starting creates a
// one-day custom program and begins the workout, like the web app.
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import type { Exercise } from '@/src/data/exercises';
import { fmtWeight } from '@/src/lib/training';
import { pyramidProgram, pyramidWeightsKg } from '@/src/lib/programgen';
import { usePrograms } from '@/src/storage/programs';
import { useTheme, type Units } from '@/src/storage/settings';
import {
  useWorkout,
  lastWeightKg,
  loadWorkoutLogs,
} from '@/src/storage/workout';
import { radius, spacing } from '@/src/theme';

function toKg(v: number, units: Units): number {
  return units === 'lb' ? v / 2.20462 : v;
}

function fromKg(kg: number, units: Units): number {
  return Math.round((units === 'lb' ? kg * 2.20462 : kg) * 10) / 10;
}

export function PyramidModal({
  visible,
  exercise,
  onClose,
  onStart,
}: {
  visible: boolean;
  exercise: Exercise | null;
  onClose: () => void;
  onStart: (programId: string) => Promise<void>;
}) {
  const theme = useTheme();
  const { colors, type, settings } = theme;
  const { addCustomProgram } = usePrograms();
  const { startProgramDay } = useWorkout();

  const [top, setTop] = useState('');
  const [bottom, setBottom] = useState('');
  const [steps, setSteps] = useState('4');
  const [reps, setReps] = useState('8');
  const [dir, setDir] = useState<'desc' | 'asc'>('desc');

  // Prefill from the last logged weight, like the web app.
  useEffect(() => {
    if (!visible || !exercise) return;
    let cancelled = false;
    loadWorkoutLogs().then((logs) => {
      if (cancelled) return;
      const lw = lastWeightKg(exercise.id, logs);
      if (lw != null) {
        setTop(String(fromKg(lw, settings.units)));
        setBottom(String(fromKg(Math.round(lw * 0.6 * 2) / 2, settings.units)));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, exercise, settings.units]);

  const plan = useMemo(() => {
    const t = parseFloat(top);
    const b = parseFloat(bottom);
    const s = Math.round(parseFloat(steps) || 4);
    const r = Math.max(1, Math.round(parseFloat(reps) || 8));
    const weights = pyramidWeightsKg(t, b, s, dir, (v) =>
      toKg(v, settings.units)
    );
    if (!weights) return null;
    return { weights, reps: r, steps: Math.min(6, Math.max(3, s)) };
  }, [top, bottom, steps, reps, dir, settings.units]);

  const start = async () => {
    if (!exercise || !plan) return;
    const prog = pyramidProgram(
      exercise.id,
      exercise.name,
      exercise.equipment,
      plan.weights,
      plan.reps
    );
    await addCustomProgram(prog);
    const day = prog.days[0];
    await startProgramDay(prog.id, prog.name, day.name, day.exercises, 0);
    onClose();
    await onStart(prog.id);
  };

  const unitLabel = settings.units === 'lb' ? 'lb' : 'kg';
  const isBW = exercise?.equipment === 'bodyweight';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.root, { backgroundColor: colors.bg }]}
        edges={['top', 'bottom']}
      >
        <View style={[styles.header, { borderBottomColor: colors.line }]}>
          <Text style={type.subtitle}>
            Pyramid{exercise ? `: ${exercise.name}` : ''}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.muted} />
          </Pressable>
        </View>
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[type.caption, { color: colors.muted }]}>
            Weights ramp linearly between top and bottom
            {isBW ? ' (added weight)' : ''}.
          </Text>

          <Text style={[type.caption, { color: colors.muted }]}>
            Top weight ({unitLabel})
          </Text>
          <TextInput
            style={[type.body, styles.input, inputStyle(colors)]}
            keyboardType="decimal-pad"
            value={top}
            onChangeText={setTop}
            placeholder="e.g. 40"
            placeholderTextColor={colors.muted}
          />

          <Text style={[type.caption, { color: colors.muted }]}>
            Bottom weight ({unitLabel})
          </Text>
          <TextInput
            style={[type.body, styles.input, inputStyle(colors)]}
            keyboardType="decimal-pad"
            value={bottom}
            onChangeText={setBottom}
            placeholder="e.g. 25"
            placeholderTextColor={colors.muted}
          />

          <Text style={[type.caption, { color: colors.muted }]}>
            Steps (3-6)
          </Text>
          <TextInput
            style={[type.body, styles.input, inputStyle(colors)]}
            keyboardType="number-pad"
            value={steps}
            onChangeText={setSteps}
          />

          <Text style={[type.caption, { color: colors.muted }]}>
            Reps per step
          </Text>
          <TextInput
            style={[type.body, styles.input, inputStyle(colors)]}
            keyboardType="number-pad"
            value={reps}
            onChangeText={setReps}
          />

          <Text style={[type.caption, { color: colors.muted }]}>Direction</Text>
          <View style={styles.dirRow}>
            {(
              [
                { v: 'desc', label: 'Descending (heavy to light)' },
                { v: 'asc', label: 'Ascending (light to heavy)' },
              ] as const
            ).map((o) => (
              <Pressable
                key={o.v}
                style={[
                  styles.dirChip,
                  {
                    backgroundColor:
                      dir === o.v ? colors.accent : colors.surface,
                    borderColor: dir === o.v ? colors.accent : colors.line,
                  },
                ]}
                onPress={() => setDir(o.v)}
              >
                <Text
                  style={[
                    type.chip,
                    { color: dir === o.v ? colors.bg : colors.muted },
                  ]}
                >
                  {o.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {plan ? (
            <View
              style={[
                styles.preview,
                { backgroundColor: colors.surface, borderColor: colors.line },
              ]}
            >
              {plan.weights.map((w, i) => (
                <View key={i} style={styles.previewRow}>
                  <Text style={[type.body, { color: colors.muted }]}>
                    Step {i + 1}
                  </Text>
                  <Text style={type.body}>{fmtWeight(w, settings.units)}</Text>
                  <Text style={[type.body, { color: colors.muted }]}>
                    {plan.reps} reps
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[type.caption, { color: colors.muted }]}>
              Enter top and bottom weights to preview the pyramid.
            </Text>
          )}
        </ScrollView>
        <View
          style={[
            styles.footer,
            { borderTopColor: colors.line, backgroundColor: colors.bg },
          ]}
        >
          <Pressable
            style={[
              styles.startButton,
              { backgroundColor: plan ? colors.accent : colors.line },
            ]}
            disabled={!plan}
            onPress={start}
          >
            <Text style={[type.chip, { color: colors.bg }]}>
              Start workout with these sets
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function inputStyle(colors: { ink: string; surface: string; line: string }) {
  return {
    color: colors.ink,
    backgroundColor: colors.surface,
    borderColor: colors.line,
  };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  body: { flex: 1 },
  bodyContent: { padding: spacing.lg, gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dirRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  dirChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  preview: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  startButton: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
