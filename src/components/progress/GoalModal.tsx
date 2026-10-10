// Add-goal form. Ports the web app's goal form (js/views.js goalDash):
// strength goal (exercise + target weight + deadline) or frequency goal
// (sessions per week + number of weeks). Targets are stored in kg.
import { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useLibrary } from '@/src/storage/library';
import { useTheme } from '@/src/storage/settings';
import { fmtDateKey } from '@/src/lib/progress';
import { parseNum, toKgFromDisplay } from '@/src/lib/training';
import { loadGoals, saveGoals, type Goal } from '@/src/lib/goals';
import { radius, spacing } from '@/src/theme';

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.accent : colors.surface,
          borderColor: active ? colors.accent : colors.line,
        },
      ]}
    >
      <Text style={[type.chip, { color: active ? colors.bg : colors.muted }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function defaultDeadline(): string {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return fmtDateKey(d);
}

export function GoalModal({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const theme = useTheme();
  const { colors, type, settings } = theme;
  const { exercises } = useLibrary();
  const units = settings.units === 'lb' ? 'lb' : 'kg';

  const [goalType, setGoalType] = useState<'weight' | 'frequency'>('weight');
  const [query, setQuery] = useState('');
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [target, setTarget] = useState('');
  const [date, setDate] = useState(defaultDeadline());
  const [weeks, setWeeks] = useState('8');
  const [saving, setSaving] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = exercises.filter((e) => e.equipment !== 'bodyweight');
    if (!q) return list.slice(0, 60);
    return list.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 60);
  }, [exercises, query]);

  const selectedName = exerciseId
    ? exercises.find((e) => e.id === exerciseId)?.name
    : null;

  const canSave =
    !saving &&
    (parseNum(target) ?? 0) > 0 &&
    (goalType === 'frequency' || exerciseId != null);

  const save = async () => {
    const t = parseNum(target);
    if (!t || t <= 0 || saving) return;
    setSaving(true);
    try {
      const goal: Goal = {
        id: `g${Date.now().toString(36)}`,
        type: goalType,
        target:
          goalType === 'weight' ? toKgFromDisplay(t, units) : Math.round(t),
        created: fmtDateKey(new Date()),
      };
      if (goalType === 'weight') {
        goal.exerciseId = exerciseId!;
        goal.targetDate = /^\d{4}-\d{2}-\d{2}$/.test(date.trim())
          ? date.trim()
          : defaultDeadline();
      } else {
        goal.weeks = Math.min(
          52,
          Math.max(1, Math.round(parseNum(weeks) ?? 8))
        );
      }
      const all = await loadGoals();
      all.push(goal);
      await saveGoals(all);
      setTarget('');
      setQuery('');
      setExerciseId(null);
      setDate(defaultDeadline());
      setWeeks('8');
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [
    type.body,
    styles.input,
    {
      color: colors.ink,
      backgroundColor: colors.surface,
      borderColor: colors.line,
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.root, { backgroundColor: colors.bg }]}
        edges={['top', 'bottom']}
      >
        <View style={[styles.header, { borderBottomColor: colors.line }]}>
          <Text style={type.subtitle}>New goal</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={[type.body, { color: colors.accent }]}>Cancel</Text>
          </Pressable>
        </View>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[type.caption, { color: colors.muted }]}>Goal type</Text>
          <View style={styles.row}>
            <Chip
              label="Strength goal"
              active={goalType === 'weight'}
              onPress={() => setGoalType('weight')}
            />
            <Chip
              label="Frequency goal"
              active={goalType === 'frequency'}
              onPress={() => setGoalType('frequency')}
            />
          </View>

          {goalType === 'weight' ? (
            <>
              <Text style={[type.caption, { color: colors.muted }]}>
                Exercise{selectedName ? `: ${selectedName}` : ''}
              </Text>
              <View
                style={[
                  styles.searchBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.line,
                  },
                ]}
              >
                <Ionicons name="search" size={18} color={colors.muted} />
                <TextInput
                  style={[type.body, styles.searchInput, { color: colors.ink }]}
                  placeholder="Search exercises"
                  placeholderTextColor={colors.muted}
                  value={query}
                  onChangeText={setQuery}
                  autoCorrect={false}
                />
              </View>
              <FlatList
                data={matches}
                keyExtractor={(e) => e.id}
                style={styles.list}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const active = item.id === exerciseId;
                  return (
                    <Pressable
                      onPress={() => setExerciseId(item.id)}
                      style={[
                        styles.exRow,
                        {
                          backgroundColor: active
                            ? colors.accent
                            : colors.surface,
                          borderColor: active ? colors.accent : colors.line,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          type.body,
                          { color: active ? colors.bg : colors.ink },
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                    </Pressable>
                  );
                }}
              />
              <Text style={[type.caption, { color: colors.muted }]}>
                Target weight ({units})
              </Text>
              <TextInput
                style={inputStyle}
                keyboardType="decimal-pad"
                placeholder={`e.g. ${units === 'lb' ? '225' : '100'}`}
                placeholderTextColor={colors.muted}
                value={target}
                onChangeText={setTarget}
              />
              <Text style={[type.caption, { color: colors.muted }]}>
                Target date (YYYY-MM-DD)
              </Text>
              <TextInput
                style={inputStyle}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                value={date}
                onChangeText={setDate}
                autoCorrect={false}
              />
            </>
          ) : (
            <>
              <Text style={[type.caption, { color: colors.muted }]}>
                Sessions per week
              </Text>
              <TextInput
                style={inputStyle}
                keyboardType="number-pad"
                placeholder="e.g. 4"
                placeholderTextColor={colors.muted}
                value={target}
                onChangeText={setTarget}
              />
              <Text style={[type.caption, { color: colors.muted }]}>
                Number of weeks
              </Text>
              <TextInput
                style={inputStyle}
                keyboardType="number-pad"
                placeholder="8"
                placeholderTextColor={colors.muted}
                value={weeks}
                onChangeText={setWeeks}
              />
            </>
          )}
          </ScrollView>
        </KeyboardAvoidingView>
        <View
          style={[
            styles.footer,
            { borderTopColor: colors.line, backgroundColor: colors.bg },
          ]}
        >
          <Pressable
            style={[
              styles.saveButton,
              { backgroundColor: canSave ? colors.accent : colors.line },
            ]}
            onPress={save}
            disabled={!canSave}
          >
            <Text style={[type.chip, { color: colors.bg }]}>
              {saving ? 'Saving...' : 'Save goal'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  body: { flex: 1 },
  bodyContent: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: { flex: 1 },
  list: { maxHeight: 220 },
  exRow: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  saveButton: {
    borderRadius: 999,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
