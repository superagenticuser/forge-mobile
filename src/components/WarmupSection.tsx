import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/src/storage/settings';
import { radius, spacing } from '@/src/theme';

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
  const theme = useTheme();
  const { colors, type } = theme;
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
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: colors.line,
              color: colors.ink,
            },
          ]}
          value={weightText}
          onChangeText={setWeightText}
          placeholder="Working weight"
          placeholderTextColor={colors.muted}
          keyboardType="numeric"
          returnKeyType="done"
        />
        <Text style={[type.body, { color: colors.muted }]}>kg</Text>
      </View>
      {sets.length === 0 ? (
        <Text style={[type.caption, { color: colors.muted }]}>
          Enter your working weight to generate warm-up sets.
        </Text>
      ) : (
        <View style={styles.sets}>
          <Text style={[type.caption, { color: colors.muted }]}>
            Warm-up for {workingWeight} kg. Tap each set when done.
          </Text>
          {sets.map((set, i) => {
            const isDone = !!done[i];
            return (
              <Pressable
                key={i}
                style={[
                  styles.setRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.line,
                  },
                  isDone && {
                    borderColor: theme.colors.volt,
                    opacity: 0.75,
                  },
                ]}
                onPress={() => toggleDone(i)}
              >
                <Ionicons
                  name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={isDone ? theme.colors.volt : colors.muted}
                />
                <Text
                  style={[
                    type.body,
                    styles.setText,
                    isDone && { color: colors.muted },
                  ]}
                >
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
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  sets: { gap: spacing.xs },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  setText: { fontWeight: '600' },
});
