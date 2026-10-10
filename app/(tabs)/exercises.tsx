import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CustomExerciseModal } from '@/src/components/CustomExerciseModal';
import { MUSCLE_GROUPS } from '@/src/data/exercises';
import { muscleLabel, prettify } from '@/src/format';
import { useLibrary, type StoredExercise } from '@/src/storage/library';
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

function openExercise(id: string) {
  router.push({ pathname: '/exercise/[id]', params: { id } });
}

function ExerciseRow({ item }: { item: StoredExercise }) {
  const theme = useTheme();
  const { colors, type } = theme;
  const { isFav, toggleFav } = useLibrary();
  const fav = isFav(item.id);
  return (
    <Pressable
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
      onPress={() => openExercise(item.id)}
    >
      <View style={styles.rowText}>
        <View style={styles.rowTitle}>
          <Text style={type.subtitle} numberOfLines={1}>
            {item.name}
          </Text>
          {item.custom === true && (
            <View
              style={[styles.customBadge, { backgroundColor: colors.accent }]}
            >
              <Text style={[styles.customBadgeText, { color: colors.bg }]}>
                Custom
              </Text>
            </View>
          )}
        </View>
        <Text style={[type.caption, { color: colors.muted }]}>
          {muscleLabel(item.primary)} · {prettify(item.equipment)} ·{' '}
          {prettify(item.level)}
        </Text>
      </View>
      <Pressable
        onPress={() => toggleFav(item.id)}
        hitSlop={10}
        accessibilityLabel={fav ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Ionicons
          name={fav ? 'heart' : 'heart-outline'}
          size={22}
          color={fav ? colors.accent : colors.muted}
        />
      </Pressable>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );
}

export default function ExercisesScreen() {
  const theme = useTheme();
  const { colors, type, settings } = theme;
  const { exercises, favs } = useLibrary();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [favOnly, setFavOnly] = useState(false);
  const [myEqOnly, setMyEqOnly] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);

  const myEquipment = settings.myEquipment;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter(
      (e) =>
        (!q || e.name.toLowerCase().includes(q)) &&
        (!muscle || e.primary === muscle) &&
        (!equipment || e.equipment === equipment) &&
        (!level || e.level === level) &&
        (!favOnly || favs.includes(e.id)) &&
        (!myEqOnly ||
          e.equipment === 'bodyweight' ||
          myEquipment.includes(e.equipment))
    );
  }, [
    exercises,
    query,
    muscle,
    equipment,
    level,
    favOnly,
    favs,
    myEqOnly,
    myEquipment,
  ]);

  const hasFilters =
    muscle !== null ||
    equipment !== null ||
    level !== null ||
    query.trim() !== '' ||
    favOnly ||
    myEqOnly;

  const clearAll = () => {
    setQuery('');
    setMuscle(null);
    setEquipment(null);
    setLevel(null);
    setFavOnly(false);
    setMyEqOnly(false);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ExerciseRow item={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
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

            <View style={styles.toolbar}>
              <Chip
                label={`Favorites (${favs.length})`}
                active={favOnly}
                onPress={() => setFavOnly((v) => !v)}
              />
              <View style={styles.myEqRow}>
                <Text style={[type.caption, { color: colors.muted }]}>
                  My equipment only
                </Text>
                <Switch
                  value={myEqOnly}
                  onValueChange={setMyEqOnly}
                  trackColor={{ true: colors.accent, false: colors.line }}
                  thumbColor={colors.ink}
                />
              </View>
              <Pressable
                style={[styles.addButton, { backgroundColor: colors.accent }]}
                onPress={() => setCustomOpen(true)}
                accessibilityLabel="Add custom exercise"
              >
                <Ionicons name="add" size={20} color={colors.bg} />
              </Pressable>
            </View>
            {myEqOnly && myEquipment.length === 0 && (
              <Text style={[type.caption, { color: colors.muted }]}>
                You have not set your equipment yet.{' '}
                <Link href="/settings" style={{ color: colors.accent }}>
                  Set it in Settings
                </Link>
              </Text>
            )}

            <Text
              style={[type.caption, styles.groupLabel, { color: colors.muted }]}
            >
              Muscle group
            </Text>
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

            <Text
              style={[type.caption, styles.groupLabel, { color: colors.muted }]}
            >
              Equipment
            </Text>
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

            <Text
              style={[type.caption, styles.groupLabel, { color: colors.muted }]}
            >
              Level
            </Text>
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

            <Text style={[type.caption, { color: colors.muted }]}>
              {filtered.length} of {exercises.length} exercises
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={type.subtitle}>
              {favOnly && favs.length === 0
                ? 'No favorites yet'
                : 'No exercises match'}
            </Text>
            <Text style={[type.caption, { color: colors.muted }]}>
              {favOnly && favs.length === 0
                ? 'Tap the heart on any exercise to save it here.'
                : 'Try a different search or clear the filters.'}
            </Text>
            {hasFilters && (
              <Pressable
                style={[styles.clearButton, { backgroundColor: colors.accent }]}
                onPress={clearAll}
              >
                <Text style={[type.chip, { color: colors.bg }]}>
                  Clear all filters
                </Text>
              </Pressable>
            )}
          </View>
        }
      />
      <CustomExerciseModal
        visible={customOpen}
        onClose={() => setCustomOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.sm },
  header: { gap: spacing.sm, marginBottom: spacing.sm },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  searchInput: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  myEqRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupLabel: { fontWeight: '600', marginTop: spacing.sm },
  chipRow: { flexDirection: 'row' },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  customBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  customBadgeText: { fontSize: 10, fontWeight: '800' },
  empty: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xxl },
  clearButton: {
    marginTop: spacing.sm,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
