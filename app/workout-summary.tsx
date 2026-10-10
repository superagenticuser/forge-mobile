// Workout summary shown after finishing a session. Saves the workout to
// the logs table (web app's log shape) and returns to the tabs.
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fmtDuration, fmtWeight } from '@/src/lib/training';
import { useTheme } from '@/src/storage/settings';
import { useWorkout } from '@/src/storage/workout';
import { radius, spacing } from '@/src/theme';

function StatCard({ value, label }: { value: string; label: string }) {
  const theme = useTheme();
  const { colors, type } = theme;
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      <Text style={[styles.statValue, { color: colors.accent }]}>{value}</Text>
      <Text style={[type.caption, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

export default function WorkoutSummaryScreen() {
  const theme = useTheme();
  const { colors, type, settings } = theme;
  const { lastSummary, saveWorkout, clearSummary } = useWorkout();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  if (!lastSummary) {
    return (
      <SafeAreaView
        style={[styles.root, { backgroundColor: colors.bg }]}
        edges={['bottom']}
      >
        <Stack.Screen options={{ title: 'Summary' }} />
        <View style={styles.empty}>
          <Text style={type.subtitle}>No workout to summarize</Text>
          <Pressable
            style={[styles.saveButton, { backgroundColor: colors.accent }]}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={[type.chip, { color: colors.bg }]}>Back home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveWorkout(notes);
      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  };

  const onDiscard = () => {
    clearSummary();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.bg }]}
      edges={['bottom']}
    >
      <Stack.Screen
        options={{ title: 'Workout complete', gestureEnabled: false }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Ionicons name="trophy" size={40} color={colors.accent} />
          <Text style={type.hero}>Nice work.</Text>
          <Text style={[type.body, { color: colors.muted }]}>
            {lastSummary.exerciseCount} exercises · {lastSummary.totalSets} sets
            · {lastSummary.totalReps} reps
          </Text>
        </View>

        <View style={styles.stats}>
          <StatCard
            value={fmtDuration(lastSummary.durationMin * 60)}
            label="Duration"
          />
          <StatCard
            value={fmtWeight(lastSummary.volumeKg, settings.units)}
            label="Volume"
          />
          <StatCard value={String(lastSummary.totalSets)} label="Sets" />
        </View>

        {lastSummary.prs.length > 0 && (
          <View
            style={[
              styles.prCard,
              { backgroundColor: colors.surface, borderColor: colors.accent },
            ]}
          >
            <View style={styles.prHeader}>
              <Ionicons name="medal" size={20} color={colors.accent} />
              <Text style={[type.subtitle, { color: colors.accent }]}>
                New PR{lastSummary.prs.length > 1 ? 's' : ''}
              </Text>
            </View>
            {lastSummary.prs.map((pr) => (
              <Text key={pr.id} style={type.body}>
                {pr.name} ·{' '}
                <Text style={{ fontWeight: '700' }}>
                  {pr.weight > 0
                    ? `${fmtWeight(pr.weight, settings.units)} x ${pr.reps}`
                    : `${pr.reps} reps`}
                </Text>
              </Text>
            ))}
          </View>
        )}

        <View style={styles.notesBlock}>
          <Text style={[type.subtitle, { color: colors.accent }]}>
            Workout notes
          </Text>
          <TextInput
            style={[
              styles.notesInput,
              {
                backgroundColor: colors.surface,
                borderColor: colors.line,
                color: colors.ink,
              },
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder="How did it feel? (optional)"
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.bg, borderColor: colors.line },
        ]}
      >
        <Pressable
          style={[styles.saveButton, { backgroundColor: colors.accent }]}
          onPress={onSave}
          disabled={saving}
        >
          <Text style={[type.subtitle, { color: colors.bg }]}>
            {saving ? 'Saving…' : 'Save workout'}
          </Text>
        </Pressable>
        <Pressable onPress={onDiscard} hitSlop={8}>
          <Text style={[type.body, { color: colors.ember }]}>
            Discard instead
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  hero: { alignItems: 'center', gap: spacing.xs, paddingTop: spacing.md },
  stats: { flexDirection: 'row', gap: spacing.md },
  statCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  prCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  prHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  notesBlock: { gap: spacing.sm },
  notesInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    minHeight: 88,
  },
  footer: {
    borderTopWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  saveButton: {
    width: '100%',
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
