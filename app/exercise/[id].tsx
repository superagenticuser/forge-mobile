import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EXERCISES } from '@/src/data/exercises';
import { muscleLabel, prettify } from '@/src/format';
import { colors, radius, spacing, type } from '@/src/theme';
import WarmupSection from '@/src/components/WarmupSection';

const byId = new Map(EXERCISES.map((e) => [e.id, e]));

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function VariationLink({ id }: { id: string }) {
  const target = byId.get(id);
  if (!target) return null;
  return (
    <Pressable
      style={styles.variationLink}
      onPress={() =>
        router.push({ pathname: '/exercise/[id]', params: { id } })
      }
    >
      <Text style={styles.variationText}>{target.name}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.ember} />
    </Pressable>
  );
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = byId.get(id ?? '');

  if (!exercise) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <View style={styles.empty}>
          <Text style={type.subtitle}>Exercise not found</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const easier = exercise.variations?.easier ?? [];
  const harder = exercise.variations?.harder ?? [];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: exercise.name }} />

      <Text style={type.title}>{exercise.name}</Text>

      <View style={styles.badges}>
        <Badge label={prettify(exercise.equipment)} />
        <Badge label={prettify(exercise.level)} />
        <Badge label={prettify(exercise.pattern)} />
      </View>

      <Section title="Muscles">
        <Text style={type.body}>
          <Text style={styles.musclePrimary}>
            {muscleLabel(exercise.primary)}
          </Text>
          {exercise.secondary.length > 0 && (
            <Text style={styles.muscleSecondary}>
              {'  ·  '}
              {exercise.secondary.map(muscleLabel).join(', ')}
            </Text>
          )}
        </Text>
      </Section>

      {exercise.equipment !== 'bodyweight' && (
        <Section title="Warm-up sets">
          <WarmupSection />
        </Section>
      )}

      <Section title="Steps">
        {exercise.steps.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </Section>

      <Section title="Form cues">
        {exercise.cues.map((cue, i) => (
          <View key={i} style={styles.bulletRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.volt} />
            <Text style={styles.bulletText}>{cue}</Text>
          </View>
        ))}
      </Section>

      <Section title="Common mistakes">
        {exercise.mistakes.map((item, i) => (
          <View key={i} style={styles.mistakeCard}>
            <View style={styles.bulletRow}>
              <Ionicons name="alert-circle" size={18} color={colors.warn} />
              <Text style={styles.mistakeText}>{item.m}</Text>
            </View>
            <Text style={styles.fixText}>Fix: {item.fix}</Text>
          </View>
        ))}
      </Section>

      {(easier.length > 0 || harder.length > 0) && (
        <Section title="Variations">
          {easier.length > 0 && (
            <View style={styles.variationGroup}>
              <Text style={styles.variationLabel}>Easier</Text>
              {easier.map((vid) => (
                <VariationLink key={vid} id={vid} />
              ))}
            </View>
          )}
          {harder.length > 0 && (
            <View style={styles.variationGroup}>
              <Text style={styles.variationLabel}>Harder</Text>
              {harder.map((vid) => (
                <VariationLink key={vid} id={vid} />
              ))}
            </View>
          )}
        </Section>
      )}
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
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeText: { ...type.chip, color: colors.muted },
  section: { gap: spacing.sm },
  sectionTitle: { ...type.subtitle, color: colors.ember },
  musclePrimary: { fontWeight: '700', color: colors.ink },
  muscleSecondary: { color: colors.muted },
  stepRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { fontSize: 13, fontWeight: '700', color: colors.ember },
  stepText: { ...type.body, flex: 1 },
  bulletRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  bulletText: { ...type.body, flex: 1 },
  mistakeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: spacing.xs,
  },
  mistakeText: { ...type.body, flex: 1, fontWeight: '600' },
  fixText: { ...type.caption, paddingLeft: 26 },
  variationGroup: { gap: spacing.xs },
  variationLabel: { ...type.caption, fontWeight: '600' },
  variationLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
  },
  variationText: { ...type.body, color: colors.ember, fontWeight: '600' },
});
