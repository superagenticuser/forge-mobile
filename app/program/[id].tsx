import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EXERCISES } from '@/src/data/exercises';
import { PROGRAMS } from '@/src/data/programs';
import { prettify } from '@/src/format';
import { useTheme } from '@/src/storage/settings';
import { useWorkout } from '@/src/storage/workout';
import { radius, spacing } from '@/src/theme';

const byId = new Map(EXERCISES.map((e) => [e.id, e]));
const programById = new Map(PROGRAMS.map((p) => [p.id, p]));

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
  const { colors, type } = theme;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { startProgramDay } = useWorkout();
  const [starting, setStarting] = useState<string | null>(null);
  const program = programById.get(id ?? '');

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
      </View>

      {program.days.map((day) => (
        <View key={day.name} style={styles.day}>
          <View style={styles.dayHeader}>
            <Text style={[type.subtitle, { color: colors.accent, flex: 1 }]}>
              {day.name}
            </Text>
            <Pressable
              style={[
                styles.startDayButton,
                { backgroundColor: colors.accent },
              ]}
              disabled={starting !== null}
              onPress={async () => {
                setStarting(day.name);
                try {
                  await startProgramDay(
                    program.id,
                    program.name,
                    day.name,
                    day.exercises
                  );
                  router.push('/workout');
                } finally {
                  setStarting(null);
                }
              }}
              accessibilityLabel={`Start ${day.name}`}
            >
              <Ionicons name="play" size={14} color={colors.bg} />
              <Text style={[styles.startDayText, { color: colors.bg }]}>
                {starting === day.name ? 'Starting…' : 'Start'}
              </Text>
            </Pressable>
          </View>
          {day.exercises.map((entry) => {
            const exercise = byId.get(entry.id);
            return (
              <Pressable
                key={`${day.name}-${entry.id}`}
                style={[
                  styles.exerciseRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.line,
                  },
                ]}
                onPress={() =>
                  router.push({
                    pathname: '/exercise/[id]',
                    params: { id: entry.id },
                  })
                }
              >
                <View style={styles.exerciseText}>
                  <Text style={type.body}>
                    {exercise ? exercise.name : entry.id}
                  </Text>
                  {!exercise && (
                    <Text style={[type.caption, { color: colors.muted }]}>
                      Unknown exercise id
                    </Text>
                  )}
                </View>
                <Text style={[styles.sets, { color: theme.colors.volt }]}>
                  {entry.sets} × {entry.reps}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.muted}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
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
  day: { gap: spacing.sm },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
