// Form for creating a custom exercise. Ported from the web app's custom
// exercise modal (js/core.js openCustomModal/saveCustomExercise).
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

import { MUSCLE_GROUPS } from '@/src/data/exercises';
import { muscleLabel, prettify } from '@/src/format';
import { useLibrary, type CustomExerciseInput } from '@/src/storage/library';
import { useTheme } from '@/src/storage/settings';
import { radius, spacing } from '@/src/theme';

const MUSCLES = Object.keys(MUSCLE_GROUPS);
const EQUIPMENT = [
  'bodyweight',
  'barbell',
  'dumbbell',
  'cable',
  'machine',
  'kettlebell',
  'band',
];
const LEVELS = ['beginner', 'intermediate', 'advanced'];

function OptionChips({
  options,
  selected,
  onSelect,
  multi = false,
  format = prettify,
}: {
  options: string[];
  selected: string | string[];
  onSelect: (id: string) => void;
  multi?: boolean;
  format?: (id: string) => string;
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  return (
    <View style={styles.chipWrap}>
      {options.map((id) => {
        const active = multi
          ? (selected as string[]).includes(id)
          : selected === id;
        return (
          <Pressable
            key={id}
            onPress={() => onSelect(id)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.accent : colors.surface,
                borderColor: active ? colors.accent : colors.line,
              },
            ]}
          >
            <Text
              style={[type.chip, { color: active ? colors.bg : colors.muted }]}
            >
              {format(id)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function CustomExerciseModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  const { addCustom } = useLibrary();

  const [name, setName] = useState('');
  const [primary, setPrimary] = useState('chest');
  const [secondary, setSecondary] = useState<string[]>([]);
  const [equipment, setEquipment] = useState('dumbbell');
  const [level, setLevel] = useState('beginner');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setPrimary('chest');
    setSecondary([]);
    setEquipment('dumbbell');
    setLevel('beginner');
  };

  const canSave = name.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const input: CustomExerciseInput = {
        name: name.trim(),
        primary,
        secondary,
        equipment,
        level,
      };
      await addCustom(input);
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  };

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
          <Text style={type.subtitle}>New custom exercise</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={[type.body, { color: colors.accent }]}>Cancel</Text>
          </Pressable>
        </View>
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[type.caption, { color: colors.muted }]}>Name</Text>
          <TextInput
            style={[
              type.body,
              styles.input,
              {
                color: colors.ink,
                backgroundColor: colors.surface,
                borderColor: colors.line,
              },
            ]}
            placeholder="e.g. Banded Face Pull"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <Text style={[type.caption, { color: colors.muted }]}>
            Primary muscle
          </Text>
          <OptionChips
            options={MUSCLES}
            selected={primary}
            onSelect={setPrimary}
            format={muscleLabel}
          />

          <Text style={[type.caption, { color: colors.muted }]}>
            Secondary muscles
          </Text>
          <OptionChips
            options={MUSCLES.filter((m) => m !== primary)}
            selected={secondary}
            multi
            onSelect={(id) =>
              setSecondary((prev) =>
                prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
              )
            }
            format={muscleLabel}
          />

          <Text style={[type.caption, { color: colors.muted }]}>Equipment</Text>
          <OptionChips
            options={EQUIPMENT}
            selected={equipment}
            onSelect={setEquipment}
          />

          <Text style={[type.caption, { color: colors.muted }]}>Level</Text>
          <OptionChips options={LEVELS} selected={level} onSelect={setLevel} />
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
            onPress={save}
            disabled={!canSave}
          >
            <Text style={[type.chip, { color: colors.bg }]}>
              {saving ? 'Saving...' : 'Save exercise'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  body: { flex: 1 },
  bodyContent: { padding: spacing.lg, gap: spacing.sm },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  saveButton: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
