import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EXERCISES } from '@/src/data/exercises';
import { PROGRAMS } from '@/src/data/programs';
import { prettify } from '@/src/format';
import { useTheme } from '@/src/storage/settings';
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
  const { colors, type } = theme;
  const { id } = useLocalSearchParams<{ id: string }>();
  const program = programById.get(id ?? '');

  if (!program) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <View style={styles.empty}>
          <Text style={type.subtitle}>Program not found</Text>
          <Pressable
            style={[styles.backButton, { backgroundColor: colors.ember }]}
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
      contentContainerStyle={styles.content}
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
          <Text style={[type.subtitle, { color: colors.ember }]}>
            {day.name}
          </Text>
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
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
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
