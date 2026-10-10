import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Exercise } from '@/src/data/exercises';
import { EXERCISES, MUSCLE_GROUPS } from '@/src/data/exercises';
import { muscleLabel, prettify } from '@/src/format';
import { colors, radius, spacing, type } from '@/src/theme';

const MUSCLES = Object.keys(MUSCLE_GROUPS);
const EQUIPMENT = [...new Set(EXERCISES.map((e) => e.equipment))].sort();
const LEVELS = [...new Set(EXERCISES.map((e) => e.level))].sort();

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
    >
      <Text
        style={[
          type.chip,
          active ? styles.chipTextActive : styles.chipTextIdle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function openExercise(id: string) {
  router.push({ pathname: '/exercise/[id]', params: { id } });
}

function ExerciseRow({ item }: { item: Exercise }) {
  return (
    <Pressable style={styles.row} onPress={() => openExercise(item.id)}>
      <View style={styles.rowText}>
        <Text style={type.subtitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={type.caption}>
          {muscleLabel(item.primary)} · {prettify(item.equipment)} ·{' '}
          {prettify(item.level)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );
}

export default function ExercisesScreen() {
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter(
      (e) =>
        (!q || e.name.toLowerCase().includes(q)) &&
        (!muscle || e.primary === muscle) &&
        (!equipment || e.equipment === equipment) &&
        (!level || e.level === level)
    );
  }, [query, muscle, equipment, level]);

  const hasFilters =
    muscle !== null ||
    equipment !== null ||
    level !== null ||
    query.trim() !== '';

  return (
    <View style={styles.root}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ExerciseRow item={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search exercises"
                placeholderTextColor={colors.muted}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.muted}
                  />
                </Pressable>
              )}
            </View>

            <Text style={styles.groupLabel}>Muscle group</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipRow}
            >
              <Chip
                label="All"
                active={muscle === null}
                onPress={() => setMuscle(null)}
              />
              {MUSCLES.map((id) => (
                <Chip
                  key={id}
                  label={muscleLabel(id)}
                  active={muscle === id}
                  onPress={() => setMuscle(muscle === id ? null : id)}
                />
              ))}
            </ScrollView>

            <Text style={styles.groupLabel}>Equipment</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipRow}
            >
              <Chip
                label="All"
                active={equipment === null}
                onPress={() => setEquipment(null)}
              />
              {EQUIPMENT.map((id) => (
                <Chip
                  key={id}
                  label={prettify(id)}
                  active={equipment === id}
                  onPress={() => setEquipment(equipment === id ? null : id)}
                />
              ))}
            </ScrollView>

            <Text style={styles.groupLabel}>Level</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipRow}
            >
              <Chip
                label="All"
                active={level === null}
                onPress={() => setLevel(null)}
              />
              {LEVELS.map((id) => (
                <Chip
                  key={id}
                  label={prettify(id)}
                  active={level === id}
                  onPress={() => setLevel(level === id ? null : id)}
                />
              ))}
            </ScrollView>

            <Text style={styles.count}>
              {filtered.length} of {EXERCISES.length} exercises
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={type.subtitle}>No exercises match</Text>
            <Text style={type.caption}>
              Try a different search or clear the filters.
            </Text>
            {hasFilters && (
              <Pressable
                style={styles.clearButton}
                onPress={() => {
                  setQuery('');
                  setMuscle(null);
                  setEquipment(null);
                  setLevel(null);
                }}
              >
                <Text style={styles.clearText}>Clear all filters</Text>
              </Pressable>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.sm },
  header: { gap: spacing.sm, marginBottom: spacing.sm },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  searchInput: { flex: 1, ...type.body, color: colors.ink },
  groupLabel: { ...type.caption, fontWeight: '600', marginTop: spacing.sm },
  chipRow: { flexDirection: 'row' },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  chipIdle: { backgroundColor: colors.surface, borderColor: colors.line },
  chipActive: { backgroundColor: colors.ember, borderColor: colors.ember },
  chipTextIdle: { color: colors.muted },
  chipTextActive: { color: colors.bg },
  count: { ...type.caption, marginTop: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: spacing.sm,
  },
  rowText: { flex: 1, gap: 2 },
  empty: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xxl },
  clearButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.ember,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  clearText: { ...type.chip, color: colors.bg },
});
