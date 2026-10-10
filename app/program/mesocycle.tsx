// Mesocycle planner: pick a base program, preview the 4-week periodized
// block (+2.5%/week, deload week 4 at 60%), save it as a custom program.
// Ported from the web app's generatePeriodized (js/progress.js).
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { fmtWeight } from '@/src/lib/training';
import { generateMesocycle, type MesocycleWeek } from '@/src/lib/programgen';
import { useLibrary } from '@/src/storage/library';
import { usePrograms, type StoredProgram } from '@/src/storage/programs';
import { useTheme } from '@/src/storage/settings';
import { loadWorkoutLogs } from '@/src/storage/workout';
import { radius, spacing } from '@/src/theme';

export default function MesocycleScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { colors, type, settings } = theme;
  const { exercises } = useLibrary();
  const { allPrograms, addCustomProgram } = usePrograms();

  const [baseId, setBaseId] = useState<string | null>(null);
  const [preview, setPreview] = useState<StoredProgram | null>(null);
  const [generating, setGenerating] = useState(false);

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const bases = allPrograms.filter((p) => !p.mesocycle && p.days.length > 0);

  const generate = async () => {
    const base = allPrograms.find((p) => p.id === baseId);
    if (!base || generating) return;
    setGenerating(true);
    try {
      const logs = await loadWorkoutLogs();
      setPreview(generateMesocycle(base, logs));
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!preview) return;
    await addCustomProgram(preview);
    router.replace({ pathname: '/program/[id]', params: { id: preview.id } });
  };

  const renderWeek = (w: MesocycleWeek) => (
    <View key={w.week} style={styles.week}>
      <Text style={[type.subtitle, w.deload && { color: theme.colors.volt }]}>
        Week {w.week}
        {w.deload ? ' (Deload)' : ''}
      </Text>
      {w.days.map((d) => (
        <View key={d.name} style={styles.day}>
          <Text style={[type.body, { fontWeight: '700' }]}>{d.name}</Text>
          {d.exercises.map((x) => (
            <View key={x.id} style={styles.exRow}>
              <Text style={[type.body, { flex: 1 }]} numberOfLines={1}>
                {byId.get(x.id)?.name ?? x.id}
              </Text>
              <Text style={[type.caption, { color: colors.muted }]}>
                {x.sets} x {x.reps} @ {fmtWeight(x.weight, settings.units)}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.bg }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + spacing.lg },
      ]}
    >
      <Stack.Screen options={{ title: 'Mesocycle planner' }} />
      <Text style={[type.caption, { color: colors.muted }]}>
        4-week block: progressive overload weeks 1-3 (+2.5%/week), deload week 4
        at 60%. Starting weights come from your logged history.
      </Text>

      <Text style={[type.subtitle, { marginTop: spacing.sm }]}>
        Base program
      </Text>
      {bases.map((p) => (
        <Pressable
          key={p.id}
          style={[
            styles.progRow,
            {
              backgroundColor: baseId === p.id ? colors.accent : colors.surface,
              borderColor: baseId === p.id ? colors.accent : colors.line,
            },
          ]}
          onPress={() => {
            setBaseId(p.id);
            setPreview(null);
          }}
        >
          <Text
            style={[
              type.body,
              { color: baseId === p.id ? colors.bg : colors.ink, flex: 1 },
            ]}
          >
            {p.name}
            {p.custom ? ' (Custom)' : ''}
          </Text>
          {baseId === p.id && (
            <Ionicons name="checkmark" size={18} color={colors.bg} />
          )}
        </Pressable>
      ))}

      <Pressable
        style={[
          styles.generate,
          {
            backgroundColor:
              baseId && !generating ? colors.accent : colors.line,
          },
        ]}
        disabled={!baseId || generating}
        onPress={generate}
      >
        <Text style={[type.chip, { color: colors.bg }]}>
          {generating ? 'Generating…' : 'Preview mesocycle'}
        </Text>
      </Pressable>

      {preview && (
        <>
          {preview.mesocycle!.map(renderWeek)}
          <Pressable
            style={[styles.generate, { backgroundColor: colors.accent }]}
            onPress={save}
          >
            <Text style={[type.chip, { color: colors.bg }]}>
              Save mesocycle
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.sm },
  progRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  generate: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  week: { gap: spacing.sm, marginTop: spacing.md },
  day: {
    gap: 4,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: '#333',
  },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
