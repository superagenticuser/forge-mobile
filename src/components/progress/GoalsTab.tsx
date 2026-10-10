// Progress > Goals: goal tracker with progress bars and pace. Ports the
// web app's goal tracker (js/views.js goalDash): strength goals (target
// 1RM on an exercise by a date) and frequency goals (sessions per week
// for N weeks), with delete and an add form.
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { WorkoutLog } from '@/src/storage/workout';
import { useTheme } from '@/src/storage/settings';
import { fmtWeight } from '@/src/lib/training';
import { goalProgress, loadGoals, saveGoals, type Goal } from '@/src/lib/goals';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { GoalModal } from '@/src/components/progress/GoalModal';
import { EmptyNote, Muted, SectionTitle } from '@/src/components/progress/ui';
import { radius, spacing } from '@/src/theme';

function GoalCard({
  goal,
  logs,
  nameOf,
  onDelete,
}: {
  goal: Goal;
  logs: WorkoutLog[];
  nameOf: (id: string) => string | null;
  onDelete: (id: string) => void;
}) {
  const theme = useTheme();
  const { colors, type, settings } = theme;
  const units = settings.units === 'lb' ? 'lb' : 'kg';
  const fmtW = (kg: number) => fmtWeight(kg, units);
  const p = goalProgress(goal, logs, nameOf, fmtW);
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      <Pressable
        onPress={() => onDelete(goal.id)}
        hitSlop={10}
        style={styles.delete}
        accessibilityLabel="Delete goal"
      >
        <Ionicons name="close" size={16} color={colors.muted} />
      </Pressable>
      <Text style={[type.subtitle, { color: colors.ink }]}>{p.title}</Text>
      <Text style={[type.caption, { color: colors.muted }]}>{p.sub}</Text>
      <View
        style={[styles.bar, { backgroundColor: colors.line }]}
        accessibilityRole="progressbar"
        accessibilityValue={{ now: p.pct, min: 0, max: 100 }}
      >
        <View
          style={[
            styles.fill,
            { width: `${p.pct}%`, backgroundColor: colors.accent },
          ]}
        />
      </View>
      <View style={styles.meta}>
        <Text style={[type.chip, { color: colors.accent }]}>{p.pct}%</Text>
        <Text
          style={[
            type.caption,
            { color: p.onPace ? colors.accent : colors.muted },
          ]}
        >
          {p.paceTxt}
        </Text>
      </View>
    </View>
  );
}

export function GoalsTab({
  logs,
  nameOf,
}: {
  logs: WorkoutLog[];
  nameOf: (id: string) => string | null;
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  const [goals, setGoals] = useState<Goal[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setGoals(await loadGoals());
  }, []);
  useEffect(() => {
    reload();
  }, [reload, logs]);

  const remove = useCallback(async (id: string) => {
    const next = (await loadGoals()).filter((g) => g.id !== id);
    await saveGoals(next);
    setGoals(next);
    setDeleteId(null);
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <SectionTitle>Goals</SectionTitle>
        <Pressable
          onPress={() => setFormOpen(true)}
          style={[styles.add, { backgroundColor: colors.accent }]}
          accessibilityLabel="Add goal"
        >
          <Ionicons name="add" size={16} color={colors.bg} />
          <Text style={[type.chip, { color: colors.bg }]}>Add goal</Text>
        </Pressable>
      </View>
      {goals.length === 0 ? (
        <EmptyNote
          title="No goals yet"
          body="Set a strength target or a training frequency goal."
        />
      ) : (
        goals.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            logs={logs}
            nameOf={nameOf}
            onDelete={(id) => setDeleteId(id)}
          />
        ))
      )}
      <Muted>
        Strength goals track your best logged set against the target. Frequency
        goals count weeks where you hit the session target.
      </Muted>
      <GoalModal
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
      />
      <ConfirmDialog
        visible={deleteId != null}
        title="Delete goal"
        message="This goal will be removed. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteId && remove(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  delete: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
  },
  bar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  fill: { height: 8, borderRadius: 4 },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
