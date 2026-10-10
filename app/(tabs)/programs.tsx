// Programs tab: built-in + custom programs, active-program banner,
// quiz matcher, program builder, mesocycle planner, workout generators,
// and superset templates.
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PyramidModal } from '@/src/components/PyramidModal';
import { ExercisePickerModal } from '@/src/components/ExercisePickerModal';
import { SupersetTemplateModal } from '@/src/components/SupersetTemplateModal';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import {
  generateCoachProgram,
  generateDungeon,
  generateExpress,
} from '@/src/lib/programgen';
import { useLibrary } from '@/src/storage/library';
import { usePrograms, type StoredProgram } from '@/src/storage/programs';
import { useSettings, useTheme } from '@/src/storage/settings';
import { loadWorkoutLogs, useWorkout } from '@/src/storage/workout';
import { prettify } from '@/src/format';
import { radius, spacing } from '@/src/theme';

function ProgramRow({ item }: { item: StoredProgram }) {
  const theme = useTheme();
  const { colors, type } = theme;
  const { activeProgramId, deleteCustomProgram } = usePrograms();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isActive = activeProgramId === item.id;
  return (
    <View>
      <Pressable
        style={[
          styles.row,
          { backgroundColor: colors.surface, borderColor: colors.line },
        ]}
        onPress={() =>
          router.push({ pathname: '/program/[id]', params: { id: item.id } })
        }
      >
        <View style={styles.rowText}>
          <View style={styles.titleRow}>
            <Text style={[type.subtitle, { flex: 1 }]} numberOfLines={1}>
              {item.name}
            </Text>
            {isActive && (
              <View style={[styles.tag, { backgroundColor: colors.accent }]}>
                <Text style={[styles.tagText, { color: colors.bg }]}>
                  Active
                </Text>
              </View>
            )}
            {item.custom && (
              <View
                style={[
                  styles.tag,
                  {
                    backgroundColor: colors.bg,
                    borderColor: colors.line,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text style={[styles.tagText, { color: colors.muted }]}>
                  Custom
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[type.caption, { color: colors.muted }]}
            numberOfLines={2}
          >
            {item.tagline}
          </Text>
          <View style={styles.meta}>
            <View
              style={[
                styles.levelBadge,
                { backgroundColor: colors.bg, borderColor: colors.line },
              ]}
            >
              <Text style={[styles.levelText, { color: theme.colors.volt }]}>
                {prettify(item.level)}
              </Text>
            </View>
            <Text style={[type.caption, { color: colors.muted }]}>
              {item.weeks} weeks · {item.daysPerWeek} days/week
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </Pressable>
      {item.custom && (
        <Pressable
          style={styles.deleteRow}
          onPress={() => setConfirmDelete(true)}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={16} color={colors.muted} />
          <Text style={[type.caption, { color: colors.muted }]}>Delete</Text>
        </Pressable>
      )}
      <ConfirmDialog
        visible={confirmDelete}
        title="Delete program?"
        message={`Delete "${item.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          try {
            await deleteCustomProgram(item.id);
          } catch (e) {
            console.warn('deleteCustomProgram failed', e);
          } finally {
            setConfirmDelete(false);
          }
        }}
      />
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  return (
    <Pressable
      style={[
        styles.action,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={colors.accent} />
      <Text style={[type.chip, { color: colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

export default function ProgramsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { colors, type } = theme;
  const { settings } = useSettings();
  const { exercises } = useLibrary();
  const {
    ready,
    allPrograms,
    customPrograms,
    activeProgramId,
    programById,
    nextDayIdx,
    addCustomProgram,
    supersetTemplates,
    deleteSupersetTemplate,
    refreshDone,
    adherence,
  } = usePrograms();
  const { startProgramDay, startFreeWorkout } = useWorkout();

  const [pyramidOpen, setPyramidOpen] = useState(false);
  const [pyramidPickOpen, setPyramidPickOpen] = useState(false);
  const [pyramidExId, setPyramidExId] = useState<string | null>(null);
  const [generatorsOpen, setGeneratorsOpen] = useState(false);
  const [ssOpen, setSsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Refresh done-marks when returning to this tab (workout finish writes
  // them directly to storage).
  useFocusEffect(
    useCallback(() => {
      if (ready) refreshDone();
    }, [ready, refreshDone])
  );

  const active = activeProgramId ? programById(activeProgramId) : undefined;
  const activeNext = active ? nextDayIdx(active) : 0;
  const activeAdh = active ? adherence(active) : null;
  const builtins = allPrograms.filter((p) => !p.custom);

  const runGenerator = async (
    gen: () => StoredProgram,
    startWorkout: boolean
  ) => {
    if (busy) return;
    setBusy(true);
    try {
      const prog = gen();
      await addCustomProgram(prog);
      setGeneratorsOpen(false);
      if (startWorkout) {
        const day = prog.days[0];
        await startProgramDay(prog.id, prog.name, day.name, day.exercises, 0);
        router.push('/workout');
      } else {
        router.push({ pathname: '/program/[id]', params: { id: prog.id } });
      }
    } finally {
      setBusy(false);
    }
  };

  const runCoach = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const logs = await loadWorkoutLogs();
      const prog = generateCoachProgram(logs, settings.myEquipment ?? []);
      await addCustomProgram(prog);
      setGeneratorsOpen(false);
      router.push({ pathname: '/program/[id]', params: { id: prog.id } });
    } finally {
      setBusy(false);
    }
  };

  const applySuperset = async (ids: string[]) => {
    await startFreeWorkout(ids, true);
    router.push('/workout');
  };

  const pyramidExercise = exercises.find((e) => e.id === pyramidExId) ?? null;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <FlatList
        data={builtins}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + spacing.lg },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            {active && (
              <View
                style={[
                  styles.banner,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.accent,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={type.subtitle}>
                    Active program: {active.name}
                  </Text>
                  <Text style={[type.caption, { color: colors.muted }]}>
                    Up next: {active.days[activeNext]?.name ?? 'Done'}
                    {activeAdh && activeAdh.total > 0
                      ? ` · ${activeAdh.done}/${activeAdh.total} days`
                      : ''}
                  </Text>
                </View>
                <View style={styles.bannerActions}>
                  <Pressable
                    style={[
                      styles.bannerBtn,
                      { backgroundColor: colors.accent },
                    ]}
                    onPress={async () => {
                      const day = active.days[activeNext];
                      if (!day) return;
                      await startProgramDay(
                        active.id,
                        active.name,
                        day.name,
                        day.exercises,
                        activeNext
                      );
                      router.push('/workout');
                    }}
                  >
                    <Text style={[type.chip, { color: colors.bg }]}>
                      Continue
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.bannerBtn,
                      { borderColor: colors.line, borderWidth: 1 },
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: '/program/[id]',
                        params: { id: active.id },
                      })
                    }
                  >
                    <Text style={[type.chip, { color: colors.muted }]}>
                      View
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            <Text style={type.subtitle}>Build and plan</Text>
            <View style={styles.actionGrid}>
              <ActionButton
                icon="help-circle-outline"
                label="Quiz"
                onPress={() => router.push('/program/quiz')}
              />
              <ActionButton
                icon="add-circle-outline"
                label="Create program"
                onPress={() => router.push('/program/builder')}
              />
              <ActionButton
                icon="calendar-outline"
                label="Mesocycle"
                onPress={() => router.push('/program/mesocycle')}
              />
              <ActionButton
                icon="flash-outline"
                label="Generators"
                onPress={() => setGeneratorsOpen(true)}
              />
            </View>

            <Text style={type.subtitle}>Superset templates</Text>
            {supersetTemplates.length === 0 ? (
              <Text style={[type.caption, { color: colors.muted }]}>
                Save exercise pairings to start them pre-linked in a free
                workout.
              </Text>
            ) : (
              supersetTemplates.map((t) => (
                <View
                  key={t.id}
                  style={[
                    styles.tplRow,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.line,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={type.body}>{t.name}</Text>
                    <Text style={[type.caption, { color: colors.muted }]}>
                      {t.exerciseIds.length} exercises
                    </Text>
                  </View>
                  <Pressable
                    style={[
                      styles.bannerBtn,
                      { backgroundColor: colors.accent },
                    ]}
                    onPress={() => applySuperset(t.exerciseIds)}
                  >
                    <Text style={[type.chip, { color: colors.bg }]}>Start</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => deleteSupersetTemplate(t.id)}
                    hitSlop={8}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={colors.muted}
                    />
                  </Pressable>
                </View>
              ))
            )}
            <Pressable
              style={[styles.addTpl, { borderColor: colors.accent }]}
              onPress={() => setSsOpen(true)}
            >
              <Ionicons name="add" size={18} color={colors.accent} />
              <Text style={[type.chip, { color: colors.accent }]}>
                New superset template
              </Text>
            </Pressable>

            <Text style={type.subtitle}>Programs</Text>
          </View>
        }
        renderItem={({ item }) => <ProgramRow item={item} />}
        ListFooterComponent={
          customPrograms.length > 0 ? (
            <View style={styles.customSection}>
              <Text style={type.subtitle}>Custom programs</Text>
              {customPrograms.map((p) => (
                <ProgramRow key={p.id} item={p} />
              ))}
            </View>
          ) : null
        }
      />

      {/* Generators sheet */}
      <Modal
        visible={generatorsOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setGeneratorsOpen(false)}
      >
        <Pressable style={styles.veil} onPress={() => setGeneratorsOpen(false)}>
          <Pressable
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={type.subtitle}>Workout generators</Text>
            {(
              [
                {
                  icon: 'triangle-outline',
                  label: 'Pyramid builder',
                  desc: 'Ramp weights up or down across 3-6 steps',
                  run: () => {
                    setGeneratorsOpen(false);
                    setPyramidPickOpen(true);
                  },
                },
                {
                  icon: 'timer-outline',
                  label: '20-min Express',
                  desc: 'Condensed full-body session',
                  run: () => runGenerator(generateExpress, true),
                },
                {
                  icon: 'game-controller-outline',
                  label: 'Dungeon',
                  desc: 'Random 5-exercise encounter',
                  run: () => runGenerator(generateDungeon, false),
                },
                {
                  icon: 'sparkles-outline',
                  label: 'AI Coach plan',
                  desc: 'Targets your least-trained muscles',
                  run: runCoach,
                },
              ] as const
            ).map((g) => (
              <Pressable
                key={g.label}
                style={[styles.genRow, { borderColor: colors.line }]}
                onPress={g.run}
                disabled={busy}
              >
                <Ionicons
                  name={g.icon as keyof typeof Ionicons.glyphMap}
                  size={22}
                  color={colors.accent}
                />
                <View style={{ flex: 1 }}>
                  <Text style={type.body}>{g.label}</Text>
                  <Text style={[type.caption, { color: colors.muted }]}>
                    {g.desc}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.muted}
                />
              </Pressable>
            ))}
            <Pressable
              style={[styles.closeBtn, { borderColor: colors.line }]}
              onPress={() => setGeneratorsOpen(false)}
            >
              <Text style={[type.chip, { color: colors.muted }]}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <ExercisePickerModal
        visible={pyramidPickOpen}
        title="Pyramid for…"
        onPick={(id) => {
          setPyramidPickOpen(false);
          setPyramidExId(id);
          setPyramidOpen(true);
        }}
        onClose={() => setPyramidPickOpen(false)}
      />

      <PyramidModal
        visible={pyramidOpen}
        exercise={pyramidExercise}
        onClose={() => setPyramidOpen(false)}
        onStart={async () => {
          router.push('/workout');
        }}
      />

      <SupersetTemplateModal
        visible={ssOpen}
        onClose={() => setSsOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.md },
  header: { gap: spacing.md, marginBottom: spacing.sm },
  banner: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  bannerActions: { flexDirection: 'row', gap: spacing.sm },
  bannerBtn: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minWidth: '47%',
    flex: 1,
  },
  tplRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  addTpl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
  },
  customSection: { gap: spacing.md, marginTop: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  rowText: { flex: 1, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tag: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tagText: { fontSize: 11, fontWeight: '700' },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  levelBadge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  levelText: { fontSize: 11, fontWeight: '700' },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
  },
  veil: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: spacing.lg,
    gap: spacing.md,
    maxHeight: '80%',
  },
  genRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  closeBtn: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
});
