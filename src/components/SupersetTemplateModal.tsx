// Superset / giant-set template builder: name a template, pick 2+ exercises,
// save it for one-tap use when starting a free workout (exercises are seeded
// pre-linked). This is the native companion to the v0.7 in-player superset
// linking.
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useLibrary } from '@/src/storage/library';
import { usePrograms } from '@/src/storage/programs';
import { useTheme } from '@/src/storage/settings';
import { radius, spacing } from '@/src/theme';

import { ExercisePickerModal } from './ExercisePickerModal';

export function SupersetTemplateModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  const { exercises } = useLibrary();
  const { saveSupersetTemplate } = usePrograms();

  const [name, setName] = useState('');
  const [ids, setIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const canSave = name.trim().length > 0 && ids.length >= 2;

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[index], next[j]] = [next[j], next[index]];
    setIds(next);
  };

  const save = async () => {
    if (!canSave) return;
    await saveSupersetTemplate(name.trim(), ids);
    setName('');
    setIds([]);
    onClose();
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
          <Text style={type.subtitle}>New superset template</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.muted} />
          </Pressable>
        </View>
        <View style={styles.body}>
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
            placeholder="e.g. Push superset"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
          />
          <Text style={[type.caption, { color: colors.muted }]}>
            Exercises ({ids.length}, linked in order)
          </Text>
          <FlatList
            data={ids}
            keyExtractor={(id) => id}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <View
                style={[
                  styles.row,
                  { backgroundColor: colors.surface, borderColor: colors.line },
                ]}
              >
                <Text style={[type.body, { flex: 1 }]}>
                  {byId.get(item)?.name ?? item}
                </Text>
                <Pressable
                  onPress={() => move(index, -1)}
                  disabled={index === 0}
                  hitSlop={8}
                >
                  <Ionicons
                    name="chevron-up"
                    size={20}
                    color={index === 0 ? colors.line : colors.muted}
                  />
                </Pressable>
                <Pressable
                  onPress={() => move(index, 1)}
                  disabled={index === ids.length - 1}
                  hitSlop={8}
                >
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={
                      index === ids.length - 1 ? colors.line : colors.muted
                    }
                  />
                </Pressable>
                <Pressable
                  onPress={() => setIds(ids.filter((x) => x !== item))}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={20} color={colors.muted} />
                </Pressable>
              </View>
            )}
            ListEmptyComponent={
              <Text style={[type.caption, { color: colors.muted }]}>
                No exercises yet. Add at least two to form a superset.
              </Text>
            }
          />
          <Pressable
            style={[styles.addButton, { borderColor: colors.accent }]}
            onPress={() => setPickerOpen(true)}
          >
            <Ionicons name="add" size={18} color={colors.accent} />
            <Text style={[type.chip, { color: colors.accent }]}>
              Add exercises
            </Text>
          </Pressable>
        </View>
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
            <Text style={[type.chip, { color: colors.bg }]}>Save template</Text>
          </Pressable>
        </View>
      </SafeAreaView>
      <ExercisePickerModal
        visible={pickerOpen}
        title="Add to superset"
        excludeIds={ids}
        onPick={(id) => {
          setIds((prev) => [...prev, id]);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
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
  body: { flex: 1, padding: spacing.lg, gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
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
});
