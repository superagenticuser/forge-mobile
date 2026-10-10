// Create Program builder. Ported from the web app's program builder
// (js/views.js PROGRAM BUILDER): day blocks, exercise rows with sets/reps/
// weight inputs, exercise picker, save-as-template, from-template, autofill
// 75% 1RM. Drag-to-reorder becomes up/down buttons (reliable without a live
// device to test drag gestures).
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ExercisePickerModal } from '@/src/components/ExercisePickerModal';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { autofillWeightKg } from '@/src/lib/programgen';
import { useLibrary } from '@/src/storage/library';
import {
  usePrograms,
  type StoredProgram,
  type StoredProgramDayExercise,
} from '@/src/storage/programs';
import { useTheme, type Units } from '@/src/storage/settings';
import { loadWorkoutLogs } from '@/src/storage/workout';
import { radius, spacing } from '@/src/theme';

interface BuilderDay {
  key: string;
  name: string;
  exercises: StoredProgramDayExercise[];
  rest: boolean;
}

let keyN = 0;
const nextKey = () => `bday-${Date.now().toString(36)}-${keyN++}`;

function toKg(v: number, units: Units): number {
  return units === 'lb' ? v / 2.20462 : v;
}

function fromKg(kg: number, units: Units): string {
  const v = units === 'lb' ? kg * 2.20462 : kg;
  return String(Math.round(v * 10) / 10);
}

export default function BuilderScreen() {
  const theme = useTheme();
  const { colors, type, settings } = theme;
  const { exercises } = useLibrary();
  const { addCustomProgram, templates, saveTemplate, deleteTemplate } =
    usePrograms();

  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [days, setDays] = useState<BuilderDay[]>([
    { key: nextKey(), name: 'Day 1', exercises: [], rest: false },
  ]);
  const [pickerDay, setPickerDay] = useState<string | null>(null);
  const [tplDay, setTplDay] = useState<string | null>(null);
  const [tplNameOpen, setTplNameOpen] = useState<string | null>(null);
  const [tplName, setTplName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const inputColors = {
    color: colors.ink,
    backgroundColor: colors.surface,
    borderColor: colors.line,
  };

  const updateDay = (key: string, patch: Partial<BuilderDay>) =>
    setDays((prev) =>
      prev.map((d) => (d.key === key ? { ...d, ...patch } : d))
    );

  const updateExercise = (
    dayKey: string,
    index: number,
    patch: Partial<StoredProgramDayExercise>
  ) =>
    setDays((prev) =>
      prev.map((d) =>
        d.key === dayKey
          ? {
              ...d,
              exercises: d.exercises.map((x, i) =>
                i === index ? { ...x, ...patch } : x
              ),
            }
          : d
      )
    );

  const moveExercise = (dayKey: string, index: number, dir: -1 | 1) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.key !== dayKey) return d;
        const j = index + dir;
        if (j < 0 || j >= d.exercises.length) return d;
        const next = [...d.exercises];
        [next[index], next[j]] = [next[j], next[index]];
        return { ...d, exercises: next };
      })
    );
  };

  const removeExercise = (dayKey: string, index: number) =>
    setDays((prev) =>
      prev.map((d) =>
        d.key === dayKey
          ? { ...d, exercises: d.exercises.filter((_, i) => i !== index) }
          : d
      )
    );

  const autofillDay = async (dayKey: string) => {
    const logs = await loadWorkoutLogs();
    setDays((prev) =>
      prev.map((d) =>
        d.key === dayKey
          ? {
              ...d,
              exercises: d.exercises.map((x) => ({
                ...x,
                weight: autofillWeightKg(x.id, logs) ?? x.weight ?? null,
              })),
            }
          : d
      )
    );
  };

  const canSave =
    name.trim().length > 0 &&
    days.some((d) => d.rest || d.exercises.length > 0) &&
    !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const prog: StoredProgram = {
        id: 'custom-' + Date.now().toString(36),
        name: name.trim(),
        tagline: tagline.trim() || 'Custom program',
        custom: true,
        level: 'custom',
        daysPerWeek: days.filter((d) => d.rest || d.exercises.length > 0)
          .length,
        weeks: 4,
        equipment: 'Mixed',
        days: days
          .filter((d) => d.rest || d.exercises.length > 0)
          .map((d) => ({
            name: d.name.trim() || 'Day',
            rest: d.rest,
            exercises: d.rest
              ? []
              : d.exercises.map((x) => ({
                  id: x.id,
                  sets: Math.max(1, Math.round(x.sets) || 3),
                  reps: x.reps.trim() || '10',
                  weight: x.weight ?? null,
                })),
          })),
      };
      await addCustomProgram(prog);
      router.replace({ pathname: '/program/[id]', params: { id: prog.id } });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.bg }]}
      edges={['top', 'bottom']}
    >
      <Stack.Screen options={{ title: 'Create program' }} />
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[type.caption, { color: colors.muted }]}>
          Program name
        </Text>
        <TextInput
          style={[type.body, styles.input, inputColors]}
          value={name}
          onChangeText={setName}
          placeholder="e.g. My Push Day"
          placeholderTextColor={colors.muted}
        />
        <Text style={[type.caption, { color: colors.muted }]}>Tagline</Text>
        <TextInput
          style={[type.body, styles.input, inputColors]}
          value={tagline}
          onChangeText={setTagline}
          placeholder="What is this program for?"
          placeholderTextColor={colors.muted}
        />

        {days.map((day) => (
          <View
            key={day.key}
            style={[
              styles.dayBlock,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
          >
            <View style={styles.dayHead}>
              <TextInput
                style={[type.subtitle, styles.dayName, { color: colors.ink }]}
                value={day.name}
                onChangeText={(v) => updateDay(day.key, { name: v })}
                maxLength={40}
              />
              <Pressable
                style={[
                  styles.restToggle,
                  {
                    backgroundColor: day.rest ? colors.accent : 'transparent',
                    borderColor: day.rest ? colors.accent : colors.line,
                  },
                ]}
                onPress={() =>
                  updateDay(day.key, {
                    rest: !day.rest,
                    exercises: !day.rest ? [] : day.exercises,
                  })
                }
                accessibilityLabel="Toggle rest day"
              >
                <Text
                  style={[
                    type.chip,
                    { color: day.rest ? colors.bg : colors.muted },
                  ]}
                >
                  Rest
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  setDays((prev) => prev.filter((d) => d.key !== day.key))
                }
                hitSlop={8}
                accessibilityLabel="Delete day"
              >
                <Ionicons name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>

            {day.rest ? (
              <Text style={[type.caption, { color: colors.muted }]}>
                Rest day. No exercises.
              </Text>
            ) : (
              <>
                {day.exercises.map((x, xi) => (
                  <View key={`${x.id}-${xi}`} style={styles.exRow}>
                    <View style={styles.exMove}>
                      <Pressable
                        onPress={() => moveExercise(day.key, xi, -1)}
                        disabled={xi === 0}
                        hitSlop={6}
                      >
                        <Ionicons
                          name="chevron-up"
                          size={18}
                          color={xi === 0 ? colors.line : colors.muted}
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => moveExercise(day.key, xi, 1)}
                        disabled={xi === day.exercises.length - 1}
                        hitSlop={6}
                      >
                        <Ionicons
                          name="chevron-down"
                          size={18}
                          color={
                            xi === day.exercises.length - 1
                              ? colors.line
                              : colors.muted
                          }
                        />
                      </Pressable>
                    </View>
                    <View style={styles.exMain}>
                      <Text
                        style={[type.body, { fontWeight: '700' }]}
                        numberOfLines={1}
                      >
                        {byId.get(x.id)?.name ?? x.id}
                      </Text>
                      <View style={styles.exFields}>
                        <TextInput
                          style={[styles.numInput, inputColors, type.body]}
                          keyboardType="number-pad"
                          value={String(x.sets)}
                          onChangeText={(v) =>
                            updateExercise(day.key, xi, {
                              sets: Math.max(1, Math.min(20, parseInt(v) || 1)),
                            })
                          }
                          accessibilityLabel="Sets"
                        />
                        <Text style={[type.caption, { color: colors.muted }]}>
                          sets
                        </Text>
                        <TextInput
                          style={[styles.repInput, inputColors, type.body]}
                          value={x.reps}
                          onChangeText={(v) =>
                            updateExercise(day.key, xi, { reps: v })
                          }
                          maxLength={12}
                          accessibilityLabel="Reps"
                        />
                        <Text style={[type.caption, { color: colors.muted }]}>
                          reps
                        </Text>
                        <TextInput
                          style={[styles.wtInput, inputColors, type.body]}
                          keyboardType="decimal-pad"
                          value={
                            x.weight != null
                              ? fromKg(x.weight, settings.units)
                              : ''
                          }
                          onChangeText={(v) => {
                            const n = parseFloat(v);
                            updateExercise(day.key, xi, {
                              weight:
                                v.trim() === '' || !Number.isFinite(n)
                                  ? null
                                  : toKg(n, settings.units),
                            });
                          }}
                          placeholder="-"
                          placeholderTextColor={colors.muted}
                          accessibilityLabel="Target weight"
                        />
                        <Text style={[type.caption, { color: colors.muted }]}>
                          {settings.units}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => removeExercise(day.key, xi)}
                      hitSlop={8}
                      accessibilityLabel="Remove exercise"
                    >
                      <Ionicons name="close" size={18} color={colors.muted} />
                    </Pressable>
                  </View>
                ))}
              </>
            )}

            {!day.rest && (
              <View style={styles.dayActions}>
                <Pressable
                  style={[styles.smallBtn, { borderColor: colors.line }]}
                  onPress={() => setPickerDay(day.key)}
                >
                  <Text style={[type.chip, { color: colors.accent }]}>
                    Add exercises
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.smallBtn, { borderColor: colors.line }]}
                  onPress={() => {
                    setTplName('');
                    setTplNameOpen(day.key);
                  }}
                >
                  <Text style={[type.chip, { color: colors.muted }]}>
                    Save as template
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.smallBtn, { borderColor: colors.line }]}
                  onPress={() => setTplDay(day.key)}
                >
                  <Text style={[type.chip, { color: colors.muted }]}>
                    From template
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.smallBtn, { borderColor: colors.line }]}
                  onPress={() => autofillDay(day.key)}
                >
                  <Text style={[type.chip, { color: colors.muted }]}>
                    Autofill 75% 1RM
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}

        <Pressable
          style={[styles.addDay, { borderColor: colors.accent }]}
          onPress={() =>
            setDays((prev) => [
              ...prev,
              {
                key: nextKey(),
                name: `Day ${prev.length + 1}`,
                exercises: [],
                rest: false,
              },
            ])
          }
        >
          <Ionicons name="add" size={18} color={colors.accent} />
          <Text style={[type.chip, { color: colors.accent }]}>Add day</Text>
        </Pressable>
      </ScrollView>

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
          disabled={!canSave}
          onPress={save}
        >
          <Text style={[type.chip, { color: colors.bg }]}>
            {saving ? 'Saving…' : 'Save program'}
          </Text>
        </Pressable>
      </View>

      <ExercisePickerModal
        visible={pickerDay !== null}
        title="Add exercises"
        excludeIds={
          pickerDay
            ? (days
                .find((d) => d.key === pickerDay)
                ?.exercises.map((x) => x.id) ?? [])
            : []
        }
        onPick={(id) => {
          if (pickerDay) {
            setDays((prev) =>
              prev.map((d) =>
                d.key === pickerDay
                  ? {
                      ...d,
                      exercises: [
                        ...d.exercises,
                        { id, sets: 3, reps: '10', weight: null },
                      ],
                    }
                  : d
              )
            );
          }
          setPickerDay(null);
        }}
        onClose={() => setPickerDay(null)}
      />

      {/* Apply template */}
      <Modal
        visible={tplDay !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setTplDay(null)}
      >
        <Pressable style={styles.veil} onPress={() => setTplDay(null)}>
          <Pressable
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={type.subtitle}>Apply template</Text>
            {templates.length === 0 && (
              <Text style={[type.caption, { color: colors.muted }]}>
                No templates yet. Build a day and tap "Save as template".
              </Text>
            )}
            {templates.map((t) => (
              <View key={t.id} style={styles.tplRow}>
                <View style={{ flex: 1 }}>
                  <Text style={type.body}>{t.name}</Text>
                  <Text style={[type.caption, { color: colors.muted }]}>
                    {t.exercises.length} exercises
                  </Text>
                </View>
                <Pressable
                  style={[styles.smallBtn, { backgroundColor: colors.accent }]}
                  onPress={() => {
                    if (tplDay) {
                      const key = tplDay;
                      setDays((prev) =>
                        prev.map((d) =>
                          d.key === key
                            ? {
                                ...d,
                                exercises: [
                                  ...d.exercises,
                                  ...t.exercises.map((x) => ({ ...x })),
                                ],
                              }
                            : d
                        )
                      );
                    }
                    setTplDay(null);
                  }}
                >
                  <Text style={[type.chip, { color: colors.bg }]}>Apply</Text>
                </Pressable>
                <Pressable onPress={() => setConfirmDelete(t.id)} hitSlop={8}>
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={colors.muted}
                  />
                </Pressable>
              </View>
            ))}
            <Pressable
              style={[styles.smallBtn, { borderColor: colors.line }]}
              onPress={() => setTplDay(null)}
            >
              <Text style={[type.chip, { color: colors.muted }]}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Save template name */}
      <Modal
        visible={tplNameOpen !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setTplNameOpen(null)}
      >
        <Pressable style={styles.veil} onPress={() => setTplNameOpen(null)}>
          <Pressable
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={type.subtitle}>Template name</Text>
            <TextInput
              style={[type.body, styles.input, inputColors]}
              value={tplName}
              onChangeText={setTplName}
              placeholder="e.g. Push day"
              placeholderTextColor={colors.muted}
              autoFocus
            />
            <Pressable
              style={[
                styles.saveButton,
                {
                  backgroundColor: tplName.trim() ? colors.accent : colors.line,
                },
              ]}
              disabled={!tplName.trim()}
              onPress={async () => {
                const key = tplNameOpen;
                const day = days.find((d) => d.key === key);
                if (day && tplName.trim()) {
                  await saveTemplate(tplName.trim(), day.exercises);
                }
                setTplNameOpen(null);
              }}
            >
              <Text style={[type.chip, { color: colors.bg }]}>Save</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={confirmDelete !== null}
        title="Delete template?"
        message="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (confirmDelete) await deleteTemplate(confirmDelete);
          setConfirmDelete(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
  bodyContent: { padding: spacing.lg, gap: spacing.md },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dayBlock: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  dayName: { flex: 1, fontWeight: '700' },
  restToggle: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  exMove: { gap: 2 },
  exMain: { flex: 1, gap: 4 },
  exFields: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  numInput: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: 52,
    textAlign: 'center',
  },
  repInput: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: 64,
    textAlign: 'center',
  },
  wtInput: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: 76,
    textAlign: 'center',
  },
  dayActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  smallBtn: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  addDay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  saveButton: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
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
  tplRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
