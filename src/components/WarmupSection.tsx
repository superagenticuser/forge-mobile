import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, type } from '@/src/theme';

export interface WarmupSet {
  weight: number;
  reps: number;
}

// Ported from the FORGE web app (warmupSets in js/progress.js).
// Given a working weight in kg, returns the ramp-up sets.
export function warmupSets(workingWeight: number): WarmupSet[] {
  const w = workingWeight || 0;
  if (w <= 0) return [];
  const steps: WarmupSet[] = [];
  if (w > 60) steps.push({ weight: 20, reps: 10 });
  if (w > 40) steps.push({ weight: Math.round(w * 0.4), reps: 8 });
  if (w > 30) steps.push({ weight: Math.round(w * 0.6), reps: 5 });
  steps.push({ weight: Math.round(w * 0.8), reps: 3 });
  return steps;
}

export default function WarmupSection() {
  const [weightText, setWeightText] = useState('');
  const [done, setDone] = useState<boolean[]>([]);
  const workingWeight = parseFloat(weightText) || 0;
  const sets = warmupSets(workingWeight);

  useEffect(() => {
    setDone([]);
  }, [weightText]);

  const toggleDone = (index: number) => {
    setDone((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  return (
    <View style={styles.root}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={weightText}
          onChangeText={setWeightText}
          placeholder="Working weight"
          placeholderTextColor={colors.muted}
          keyboardType="numeric"
          returnKeyType="done"
        />
        <Text style={styles.unit}>kg</Text>
      </View>
      {sets.length === 0 ? (
        <Text style={styles.hint}>
          Enter your working weight to generate warm-up sets.
        </Text>
      ) : (
        <View style={styles.sets}>
          <Text style={styles.hint}>
            Warm-up for {workingWeight} kg. Tap each set when done.
          </Text>
          {sets.map((set, i) => {
            const isDone = !!done[i];
            return (
              <Pressable
                key={i}
                style={[styles.setRow, isDone && styles.setRowDone]}
                onPress={() => toggleDone(i)}
              >
                <Ionicons
                  name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={isDone ? colors.volt : colors.muted}
                />
                <Text style={[styles.setText, isDone && styles.setTextDone]}>
                  {set.weight} kg x {set.reps} reps
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.ink,
    fontSize: 16,
  },
  unit: { ...type.body, color: colors.muted },
  hint: { ...type.caption, color: colors.muted },
  sets: { gap: spacing.xs },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  setRowDone: { borderColor: colors.volt, opacity: 0.75 },
  setText: { ...type.body, fontWeight: '600' },
  setTextDone: { textDecorationLine: 'line-through', color: colors.muted },
});
