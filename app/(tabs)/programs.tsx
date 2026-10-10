import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Program } from '@/src/data/programs';
import { PROGRAMS } from '@/src/data/programs';
import { prettify } from '@/src/format';
import { colors, radius, spacing, type } from '@/src/theme';

function ProgramRow({ item }: { item: Program }) {
  return (
    <Pressable
      style={styles.row}
      onPress={() =>
        router.push({ pathname: '/program/[id]', params: { id: item.id } })
      }
    >
      <View style={styles.rowText}>
        <Text style={type.subtitle}>{item.name}</Text>
        <Text style={type.caption} numberOfLines={2}>
          {item.tagline}
        </Text>
        <View style={styles.meta}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{prettify(item.level)}</Text>
          </View>
          <Text style={styles.metaText}>
            {item.weeks} weeks · {item.daysPerWeek} days/week
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );
}

export default function ProgramsScreen() {
  return (
    <View style={styles.root}>
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
  root: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
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
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  levelText: { fontSize: 11, fontWeight: '700', color: colors.volt },
  metaText: { ...type.caption },
});
