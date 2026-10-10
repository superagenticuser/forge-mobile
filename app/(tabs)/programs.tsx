import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Program } from '@/src/data/programs';
import { PROGRAMS } from '@/src/data/programs';
import { prettify } from '@/src/format';
import { useTheme } from '@/src/storage/settings';
import { radius, spacing } from '@/src/theme';

function ProgramRow({ item }: { item: Program }) {
  const theme = useTheme();
  const { colors, type } = theme;
  return (
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
        <Text style={type.subtitle}>{item.name}</Text>
        <Text style={[type.caption, { color: colors.muted }]} numberOfLines={2}>
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
  );
}

export default function ProgramsScreen() {
  const theme = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      <FlatList
        data={PROGRAMS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProgramRow item={item} />}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  rowText: { flex: 1, gap: spacing.xs },
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
});
