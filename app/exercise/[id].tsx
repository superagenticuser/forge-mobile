import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EXERCISES } from '@/src/data/exercises';
import { muscleLabel, prettify } from '@/src/format';
import { useTheme } from '@/src/storage/settings';
import { radius, spacing } from '@/src/theme';
import WarmupSection from '@/src/components/WarmupSection';

const byId = new Map(EXERCISES.map((e) => [e.id, e]));

function Badge({ label }: { label: string }) {
  const theme = useTheme();
  const { colors, type } = theme;
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      <Text style={[type.chip, { color: colors.muted }]}>{label}</Text>
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
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[theme.type.subtitle, { color: theme.colors.accent }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function VariationLink({ id }: { id: string }) {
  const theme = useTheme();
  const { colors, type } = theme;
  const target = byId.get(id);
  if (!target) return null;
  return (
    <Pressable
      style={[
        styles.variationLink,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
      onPress={() =>
        router.push({ pathname: '/exercise/[id]', params: { id } })
      }
    >
      <Text style={[type.body, { color: colors.accent, fontWeight: '600' }]}>
        {target.name}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.accent} />
    </Pressable>
  );
}

export default function ExerciseDetailScreen() {
  const theme = useTheme();
  const { colors, type } = theme;
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = byId.get(id ?? '');

  if (!exercise) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <View style={styles.empty}>
          <Text style={type.subtitle}>Exercise not found</Text>
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

  const easier = exercise.variations?.easier ?? [];
  const harder = exercise.variations?.harder ?? [];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
    >
      <Stack.Screen options={{ title: exercise.name }} />

      <Text style={type.title}>{exercise.name}</Text>

      <View style={styles.badges}>
        <Badge label={prettify(exercise.equipment)} />
        <Badge label={prettify(exercise.level)} />
        <Badge label={prettify(exercise.pattern)} />
      </View>

      <Section title="Muscles">
        <Text style={type.body}>
          <Text style={{ fontWeight: '700', color: colors.ink }}>
            {muscleLabel(exercise.primary)}
          </Text>
          {exercise.secondary.length > 0 && (
            <Text style={{ color: colors.muted }}>
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
            <View
              style={[
                styles.stepNumber,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                },
              ]}
            >
              <Text style={[styles.stepNumberText, { color: colors.accent }]}>
                {i + 1}
              </Text>
            </View>
            <Text style={[type.body, styles.stepText]}>{step}</Text>
          </View>
        ))}
      </Section>

      <Section title="Form cues">
        {exercise.cues.map((cue, i) => (
          <View key={i} style={styles.bulletRow}>
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={theme.colors.volt}
            />
            <Text style={[type.body, styles.bulletText]}>{cue}</Text>
          </View>
        ))}
      </Section>

      <Section title="Common mistakes">
        {exercise.mistakes.map((item, i) => (
          <View
            key={i}
            style={[
              styles.mistakeCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.line,
              },
            ]}
          >
            <View style={styles.bulletRow}>
              <Ionicons name="alert-circle" size={18} color={colors.warn} />
              <Text style={[type.body, styles.mistakeText]}>{item.m}</Text>
            </View>
            <Text style={[type.caption, styles.fixText]}>Fix: {item.fix}</Text>
          </View>
        ))}
      </Section>

      {(easier.length > 0 || harder.length > 0) && (
        <Section title="Variations">
          {easier.length > 0 && (
            <View style={styles.variationGroup}>
              <Text
                style={[
                  type.caption,
                  styles.variationLabel,
                  { color: colors.muted },
                ]}
              >
                Easier
              </Text>
              {easier.map((vid) => (
                <VariationLink key={vid} id={vid} />
              ))}
            </View>
          )}
          {harder.length > 0 && (
            <View style={styles.variationGroup}>
              <Text
                style={[
                  type.caption,
                  styles.variationLabel,
                  { color: colors.muted },
                ]}
              >
                Harder
              </Text>
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
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  section: { gap: spacing.sm },
  stepRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { fontSize: 13, fontWeight: '700' },
  stepText: { flex: 1 },
  bulletRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  bulletText: { flex: 1 },
  mistakeCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  mistakeText: { flex: 1, fontWeight: '600' },
  fixText: { paddingLeft: 26 },
  variationGroup: { gap: spacing.xs },
  variationLabel: { fontWeight: '600' },
  variationLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
});
