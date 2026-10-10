// Program quiz matcher. Ported from the web app (js/views.js QUIZ_QUESTIONS,
// quizScore): 3 questions, scored recommendations with reasons.
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  QUIZ_QUESTIONS,
  quizScore,
  type QuizAnswers,
} from '@/src/lib/programgen';
import { usePrograms } from '@/src/storage/programs';
import { useTheme } from '@/src/storage/settings';
import { prettify } from '@/src/format';
import { radius, spacing } from '@/src/theme';

export default function QuizScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { colors, type } = theme;
  const { allPrograms } = usePrograms();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});

  const done = step >= QUIZ_QUESTIONS.length;
  const ranked = done
    ? allPrograms
        .filter((p) => !p.custom)
        .map((p) => ({ p, ...quizScore(p, answers as QuizAnswers) }))
        .sort((a, b) => b.score - a.score)
    : [];
  const top = ranked[0];

  const answer = (key: 'days' | 'equip' | 'goal', v: string | number) => {
    const next = { ...answers, [key]: key === 'days' ? Number(v) : v };
    setAnswers(next);
    setStep(step + 1);
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.bg }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + spacing.lg },
      ]}
    >
      <Stack.Screen options={{ title: 'Find your program' }} />

      {!done ? (
        <>
          <Text style={[type.caption, { color: colors.muted }]}>
            Question {step + 1} of {QUIZ_QUESTIONS.length}
          </Text>
          <Text style={type.title}>{QUIZ_QUESTIONS[step].title}</Text>
          {QUIZ_QUESTIONS[step].options.map((o) => (
            <Pressable
              key={String(o.v)}
              style={[
                styles.option,
                { backgroundColor: colors.surface, borderColor: colors.line },
              ]}
              onPress={() => answer(QUIZ_QUESTIONS[step].key, o.v)}
            >
              <Text style={type.body}>{o.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
          {step > 0 && (
            <Pressable onPress={() => setStep(step - 1)} hitSlop={8}>
              <Text style={[type.body, { color: colors.accent }]}>Back</Text>
            </Pressable>
          )}
        </>
      ) : (
        top && (
          <>
            <Text style={[type.caption, { color: colors.muted }]}>
              Your match
            </Text>
            <Text style={type.title}>{top.p.name}</Text>
            <Text style={[type.body, { color: colors.muted }]}>
              {top.p.tagline}
            </Text>
            {top.reasons.map((r) => (
              <View key={r} style={styles.reason}>
                <Ionicons
                  name="checkmark"
                  size={18}
                  color={theme.colors.volt}
                />
                <Text style={type.body}>{r}</Text>
              </View>
            ))}
            <View style={styles.chips}>
              <View
                style={[
                  styles.chip,
                  { backgroundColor: colors.surface, borderColor: colors.line },
                ]}
              >
                <Text style={[type.chip, { color: colors.muted }]}>
                  {prettify(top.p.level)}
                </Text>
              </View>
              <View
                style={[
                  styles.chip,
                  { backgroundColor: colors.surface, borderColor: colors.line },
                ]}
              >
                <Text style={[type.chip, { color: colors.muted }]}>
                  {top.p.daysPerWeek} days/wk
                </Text>
              </View>
              <View
                style={[
                  styles.chip,
                  { backgroundColor: colors.surface, borderColor: colors.line },
                ]}
              >
                <Text style={[type.chip, { color: colors.muted }]}>
                  {top.p.weeks} weeks
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              <Pressable
                style={[styles.primary, { backgroundColor: colors.accent }]}
                onPress={() =>
                  router.replace({
                    pathname: '/program/[id]',
                    params: { id: top.p.id },
                  })
                }
              >
                <Text style={[type.chip, { color: colors.bg }]}>
                  View program
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.primary,
                  { borderColor: colors.line, borderWidth: 1 },
                ]}
                onPress={() => {
                  setAnswers({});
                  setStep(0);
                }}
              >
                <Text style={[type.chip, { color: colors.muted }]}>
                  Retake quiz
                </Text>
              </Pressable>
            </View>
            {ranked[1] && (
              <Pressable
                onPress={() =>
                  router.replace({
                    pathname: '/program/[id]',
                    params: { id: ranked[1].p.id },
                  })
                }
              >
                <Text style={[type.body, { color: colors.muted }]}>
                  Runner-up:{' '}
                  <Text style={{ color: colors.accent }}>
                    {ranked[1].p.name}
                  </Text>
                </Text>
              </Pressable>
            )}
          </>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  reason: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  primary: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
