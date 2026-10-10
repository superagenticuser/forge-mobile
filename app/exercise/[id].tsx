import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { BodyViewer } from '@/src/components/BodyViewer';
import { ProgressionChart } from '@/src/components/ProgressionChart';
import { ExerciseDemo } from '@/src/components/ExerciseDemo';
import { PyramidModal } from '@/src/components/PyramidModal';
import { CameraModal } from '@/src/components/camera/CameraModal';
import { ClipLibraryModal } from '@/src/components/camera/ClipLibraryModal';
import WarmupSection from '@/src/components/WarmupSection';
import { muscleLabel, prettify } from '@/src/format';
import { fmtWeight } from '@/src/lib/training';
import { useLibrary } from '@/src/storage/library';
import { useTheme } from '@/src/storage/settings';
import { useExerciseHistory, useWorkout } from '@/src/storage/workout';
import { getClipsByExercise } from '@/src/storage/db';
import { radius, spacing } from '@/src/theme';

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

function ExerciseCard({ id }: { id: string }) {
  const theme = useTheme();
  const { colors, type } = theme;
  const { byId } = useLibrary();
  const target = byId.get(id);
  if (!target) return null;
  return (
    <Pressable
      style={[
        styles.exerciseCard,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
      onPress={() =>
        router.push({ pathname: '/exercise/[id]', params: { id } })
      }
    >
      <View style={styles.exerciseCardText}>
        <Text style={[type.body, { fontWeight: '600' }]} numberOfLines={1}>
          {target.name}
        </Text>
        <Text style={[type.caption, { color: colors.muted }]}>
          {prettify(target.equipment)} · {prettify(target.level)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.accent} />
    </Pressable>
  );
}

export default function ExerciseDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { colors, type, settings } = theme;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { byId, exercises, isFav, toggleFav, deleteCustom } = useLibrary();
  const { startFreeWorkout } = useWorkout();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [starting, setStarting] = useState(false);
  const [pyramidOpen, setPyramidOpen] = useState(false);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [clipsOpen, setClipsOpen] = useState(false);
  const [clipCount, setClipCount] = useState(0);

  const exercise = byId.get(id ?? '');
  const history = useExerciseHistory(exercise?.id ?? '');

  const refreshClipCount = useCallback(() => {
    if (!exercise) return;
    getClipsByExercise(exercise.id)
      .then((clips) => setClipCount(clips.length))
      .catch(() => setClipCount(0));
  }, [exercise]);

  useEffect(() => {
    refreshClipCount();
  }, [refreshClipCount]);

  const similar = useMemo(() => {
    if (!exercise) return [];
    return exercises
      .filter((x) => x.id !== exercise.id && x.primary === exercise.primary)
      .slice(0, 4);
  }, [exercises, exercise]);

  const swaps = useMemo(() => {
    if (!exercise) return [];
    const myEq = settings.myEquipment ?? [];
    const pool = exercises.filter(
      (x) =>
        x.id !== exercise.id &&
        x.primary === exercise.primary &&
        x.equipment !== exercise.equipment
    );
    const byEq = new Map<string, typeof pool>();
    for (const x of pool) {
      const list = byEq.get(x.equipment) ?? [];
      list.push(x);
      byEq.set(x.equipment, list);
    }
    return [...byEq.entries()]
      .sort(([a], [b]) => Number(myEq.includes(b)) - Number(myEq.includes(a)))
      .map(([eq, list]) => ({
        equipment: eq,
        yours: myEq.includes(eq),
        items: list.slice(0, 4),
      }));
  }, [exercises, exercise, settings.myEquipment]);

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

  const fav = isFav(exercise.id);
  const easier = exercise.variations?.easier ?? [];
  const harder = exercise.variations?.harder ?? [];

  const onDelete = async () => {
    setConfirmDelete(false);
    await deleteCustom(exercise.id);
    router.back();
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.bg }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + spacing.lg },
      ]}
    >
      <Stack.Screen options={{ title: exercise.name }} />

      <View style={styles.titleRow}>
        <Text style={[type.title, styles.title]}>{exercise.name}</Text>
        <Pressable
          onPress={() => toggleFav(exercise.id)}
          hitSlop={12}
          accessibilityLabel={
            fav ? 'Remove from favorites' : 'Add to favorites'
          }
        >
          <Ionicons
            name={fav ? 'heart' : 'heart-outline'}
            size={26}
            color={fav ? colors.accent : colors.muted}
          />
        </Pressable>
      </View>

      <View style={styles.badges}>
        <Badge label={prettify(exercise.equipment)} />
        <Badge label={prettify(exercise.level)} />
        <Badge label={prettify(exercise.pattern)} />
        {exercise.custom === true && (
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Text style={[type.chip, { color: colors.bg }]}>Custom</Text>
          </View>
        )}
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
        <BodyViewer
          height={300}
          highlightPrimary={[exercise.primary]}
          highlightSecondary={exercise.secondary}
        />
      </Section>

      <Section title="Estimated 1RM">
        {history.ready && history.best1RMKg > 0 ? (
          <View style={styles.oneRmRow}>
            <Text style={[styles.oneRmValue, { color: colors.accent }]}>
              {fmtWeight(history.best1RMKg, settings.units)}
            </Text>
            <Text style={[type.caption, { color: colors.muted }]}>
              Epley estimate from your best logged set
              {history.lastWeightKg != null &&
                ` · last: ${fmtWeight(history.lastWeightKg, settings.units)}`}
              {history.sessionCount > 0 &&
                ` · ${history.sessionCount} logged session${history.sessionCount > 1 ? 's' : ''}`}
            </Text>
          </View>
        ) : (
          <Text style={[type.body, { color: colors.muted }]}>
            Log a workout to see your estimated max, calculated with the Epley
            formula from your best logged set.
          </Text>
        )}
      </Section>

      <Pressable
        style={[styles.startWorkoutButton, { backgroundColor: colors.accent }]}
        disabled={starting}
        onPress={async () => {
          setStarting(true);
          try {
            await startFreeWorkout([exercise.id]);
            router.push('/workout');
          } finally {
            setStarting(false);
          }
        }}
        accessibilityLabel={`Start a workout with ${exercise.name}`}
      >
        <Ionicons name="play" size={18} color={colors.bg} />
        <Text style={[type.chip, { color: colors.bg }]}>
          {starting ? 'Starting…' : 'Start workout with this exercise'}
        </Text>
      </Pressable>

      <Pressable
        style={[
          styles.startWorkoutButton,
          { borderColor: colors.line, borderWidth: 1 },
        ]}
        onPress={() => setPyramidOpen(true)}
        accessibilityLabel={`Build a pyramid workout for ${exercise.name}`}
      >
        <Ionicons name="triangle-outline" size={18} color={colors.accent} />
        <Text style={[type.chip, { color: colors.accent }]}>
          Pyramid builder
        </Text>
      </Pressable>

      <View style={styles.cameraRow}>
        <Pressable
          style={[
            styles.cameraButton,
            { borderColor: colors.line, borderWidth: 1 },
          ]}
          onPress={() => setRecorderOpen(true)}
          accessibilityLabel={`Record a form clip for ${exercise.name}`}
        >
          <Ionicons name="videocam-outline" size={18} color={colors.accent} />
          <Text style={[type.chip, { color: colors.accent }]}>Record form</Text>
        </Pressable>
        <Pressable
          style={[
            styles.cameraButton,
            { borderColor: colors.line, borderWidth: 1 },
          ]}
          onPress={() => setClipsOpen(true)}
          accessibilityLabel={`View form clips for ${exercise.name}`}
        >
          <Ionicons name="film-outline" size={18} color={colors.accent} />
          <Text style={[type.chip, { color: colors.accent }]}>
            Clips{clipCount > 0 ? ` (${clipCount})` : ''}
          </Text>
        </Pressable>
      </View>

      <CameraModal
        visible={recorderOpen}
        mode="recorder"
        title={exercise.name}
        exId={exercise.id}
        exName={exercise.name}
        onClose={() => {
          setRecorderOpen(false);
          refreshClipCount();
        }}
      />
      <ClipLibraryModal
        visible={clipsOpen}
        exId={exercise.id}
        exName={exercise.name}
        onClose={() => {
          setClipsOpen(false);
          refreshClipCount();
        }}
      />

      {exercise.equipment !== 'bodyweight' && (
        <Section title="Warm-up sets">
          <WarmupSection />
        </Section>
      )}

      {exercise.steps.length > 0 && (
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
      )}

      {exercise.cues.length > 0 && (
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
      )}

      {exercise.mistakes.length > 0 && (
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
              <Text style={[type.caption, styles.fixText]}>
                Fix: {item.fix}
              </Text>
            </View>
          ))}
        </Section>
      )}

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
                <ExerciseCard key={vid} id={vid} />
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
                <ExerciseCard key={vid} id={vid} />
              ))}
            </View>
          )}
        </Section>
      )}

      {similar.length > 0 && (
        <Section title="Similar exercises">
          {similar.map((s) => (
            <ExerciseCard key={s.id} id={s.id} />
          ))}
        </Section>
      )}

      <Section title="Equipment swaps">
        {swaps.length > 0 ? (
          swaps.map((g) => (
            <View key={g.equipment} style={styles.swapGroup}>
              <View style={styles.swapHeader}>
                <Text style={[type.body, { fontWeight: '700' }]}>
                  {prettify(g.equipment)}
                </Text>
                {g.yours && (
                  <View
                    style={[
                      styles.yoursTag,
                      { backgroundColor: colors.accent },
                    ]}
                  >
                    <Text style={[styles.yoursText, { color: colors.bg }]}>
                      yours
                    </Text>
                  </View>
                )}
              </View>
              {g.items.map((s) => (
                <ExerciseCard key={s.id} id={s.id} />
              ))}
            </View>
          ))
        ) : (
          <Text style={[type.body, { color: colors.muted }]}>
            No swaps needed, this one covers it.
          </Text>
        )}
      </Section>

      <Section title="Progression">
        <ProgressionChart exerciseId={exercise.id} />
      </Section>

      <Section title="Exercise demo">
        <ExerciseDemo pattern={exercise.pattern} />
      </Section>

      {exercise.custom === true && (
        <Pressable
          style={[styles.deleteButton, { borderColor: colors.ember }]}
          onPress={() => setConfirmDelete(true)}
        >
          <Ionicons name="trash-outline" size={18} color={colors.ember} />
          <Text style={[type.chip, { color: colors.ember }]}>
            Delete custom exercise
          </Text>
        </Pressable>
      )}

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete custom exercise"
        message={`Delete "${exercise.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      <PyramidModal
        visible={pyramidOpen}
        exercise={exercise}
        onClose={() => setPyramidOpen(false)}
        onStart={async () => {
          router.push('/workout');
        }}
      />
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  title: { flex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  section: { gap: spacing.sm },
  oneRmRow: { gap: 2 },
  oneRmValue: { fontSize: 26, fontWeight: '800' },
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
  },
  cameraRow: { flexDirection: 'row', gap: spacing.sm },
  cameraButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
  },
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
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  exerciseCardText: { flex: 1, gap: 2 },
  swapGroup: { gap: spacing.xs },
  swapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  yoursTag: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  yoursText: { fontSize: 10, fontWeight: '800' },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
});
