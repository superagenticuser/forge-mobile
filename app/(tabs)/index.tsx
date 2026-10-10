import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EXERCISES, MUSCLE_GROUPS } from '@/src/data/exercises';
import { PROGRAMS } from '@/src/data/programs';
import { colors, radius, spacing, type } from '@/src/theme';

const stats = [
  { value: String(EXERCISES.length), label: 'Exercises' },
  { value: String(Object.keys(MUSCLE_GROUPS).length), label: 'Muscle Groups' },
  { value: String(PROGRAMS.length), label: 'Programs' },
];

const links = [
  {
    href: '/(tabs)/exercises' as const,
    icon: 'barbell' as const,
    title: 'Browse Exercises',
    blurb: 'Search and filter the full library.',
  },
  {
    href: '/(tabs)/programs' as const,
    icon: 'calendar' as const,
    title: 'Browse Programs',
    blurb: 'Ready-to-use training plans.',
  },
];

export default function HomeScreen() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={type.hero}>
          FORGE<Text style={styles.dot}>.</Text>
        </Text>
        <Text style={styles.tagline}>Train with intent.</Text>
        <View style={styles.otaBadge}>
          <Ionicons name="flash" size={14} color={colors.bg} />
          <Text style={styles.otaBadgeText}>Updated over the air · v0.3</Text>
        </View>
      </View>

      <View style={styles.stats}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {links.map((link) => (
        <Link key={link.title} href={link.href} asChild>
          <Pressable style={styles.linkCard}>
            <View style={styles.linkIcon}>
              <Ionicons name={link.icon} size={24} color={colors.ember} />
            </View>
            <View style={styles.linkText}>
              <Text style={type.subtitle}>{link.title}</Text>
              <Text style={type.caption}>{link.blurb}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        </Link>
      ))}

      <View style={styles.note}>
        <Ionicons name="flask" size={16} color={colors.volt} />
        <Text style={styles.noteText}>
          React Native experiment v0.1. The web app remains the production app.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  hero: { paddingTop: spacing.xl, paddingBottom: spacing.sm },
  dot: { color: colors.ember },
  tagline: { ...type.body, color: colors.muted, marginTop: spacing.xs },
  otaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.volt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
  },
  otaBadgeText: { fontSize: 12, fontWeight: '800', color: colors.bg },
  stats: { flexDirection: 'row', gap: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statValue: { fontSize: 26, fontWeight: '800', color: colors.ember },
  statLabel: { ...type.caption, marginTop: spacing.xs, textAlign: 'center' },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.md,
  },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: { flex: 1, gap: 2 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
  },
  noteText: { ...type.caption, flex: 1 },
});
