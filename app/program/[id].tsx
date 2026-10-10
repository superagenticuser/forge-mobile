import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EXERCISES } from '@/src/data/exercises';
import { PROGRAMS } from '@/src/data/programs';
import { prettify } from '@/src/format';
import { colors, radius, spacing, type } from '@/src/theme';

const byId = new Map(EXERCISES.map((e) => [e.id, e]));
const programById = new Map(PROGRAMS.map((p) => [p.id, p]));

function MetaChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const program = programById.get(id ?? '');

  if (!program) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <View style={styles.empty}>
          <Text style={type.subtitle}>Program not found</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: program.name }} />

      <Text style={type.title}>{program.name}</Text>
      <Text style={styles.tagline}>{program.tagline}</Text>

      <View style={styles.chips}>
        <MetaChip label={prettify(program.level)} />
        <MetaChip label={`${program.weeks} weeks`} />
        <MetaChip label={`${program.daysPerWeek} days/week`} />
        <MetaChip label={program.equipment} />
      </View>

      {program.days.map((day) => (
        <View key={day.name} style={styles.day}>
          <Text style={styles.dayName}>{day.name}</Text>
          {day.exercises.map((entry) => {
            const exercise = byId.get(entry.id);
            return (
              <Pressable
                key={`${day.name}-${entry.id}`}
                style={styles.exerciseRow}
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
                    <Text style={type.caption}>Unknown exercise id</Text>
                  )}
                </View>
                <Text style={styles.sets}>
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
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  backButton: {
    backgroundColor: colors.ember,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backText: { ...type.chip, color: colors.bg },
  tagline: { ...type.body, color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipText: { ...type.chip, color: colors.muted },
  day: { gap: spacing.sm },
  dayName: { ...type.subtitle, color: colors.ember },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: spacing.sm,
  },
  exerciseText: { flex: 1, gap: 2 },
  sets: { fontSize: 13, fontWeight: '700', color: colors.volt },
});
