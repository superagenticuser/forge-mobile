// Searchable exercise picker modal, used by the workout player to add or
// swap exercises. Follows the CustomExerciseModal safe-area pattern: the
// header and footer sit inside SafeAreaView so nothing is clipped.
import { useMemo, useState } from 'react';
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

import { muscleLabel, prettify } from '@/src/format';
import { useLibrary } from '@/src/storage/library';
import { useTheme } from '@/src/storage/settings';
import { radius, spacing } from '@/src/theme';

export function ExercisePickerModal({
  visible,
  title,
  excludeIds = [],
  onPick,
  onClose,
}: {
  visible: boolean;
  title: string;
  excludeIds?: string[];
  onPick: (exerciseId: string) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  const { exercises, ready } = useLibrary();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const excluded = new Set(excludeIds);
    return exercises.filter(
      (e) => !excluded.has(e.id) && (!q || e.name.toLowerCase().includes(q))
    );
  }, [exercises, excludeIds, query]);

  const pick = (id: string) => {
    setQuery('');
    onPick(id);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView
        style={[styles.root, { backgroundColor: colors.bg }]}
        edges={['top', 'bottom']}
      >
        <View style={styles.header}>
          <Text style={type.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color={colors.muted} />
          </Pressable>
        </View>

        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.surface, borderColor: colors.line },
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
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>

        {!ready ? (
          <View style={styles.empty}>
            <Text style={[type.body, { color: colors.muted }]}>Loading…</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={type.subtitle}>No exercises match</Text>
                <Text style={[type.caption, { color: colors.muted }]}>
                  Try a different search.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.row,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.line,
                  },
                ]}
                onPress={() => pick(item.id)}
              >
                <View style={styles.rowText}>
                  <Text style={type.body} numberOfLines={1}>
                    {item.name}
                    {item.custom === true && (
                      <Text style={{ color: colors.accent }}> · Custom</Text>
                    )}
                  </Text>
                  <Text style={[type.caption, { color: colors.muted }]}>
                    {muscleLabel(item.primary)} · {prettify(item.equipment)}
                  </Text>
                </View>
                <Ionicons name="add-circle" size={22} color={colors.accent} />
              </Pressable>
            )}
          />
        )}
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
    paddingHorizontal: spacing.lg,
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
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1 },
  list: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  rowText: { flex: 1, gap: 2 },
  empty: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xxl },
});
