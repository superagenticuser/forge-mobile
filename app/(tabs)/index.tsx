import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EXERCISES, MUSCLE_GROUPS } from '@/src/data/exercises';
import { PROGRAMS } from '@/src/data/programs';
import { BodyViewer } from '@/src/components/BodyViewer';
import { useTheme } from '@/src/storage/settings';
import { useWorkout } from '@/src/storage/workout';
import { radius, spacing, type as typeBase } from '@/src/theme';

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
  const theme = useTheme();
  const { colors, type } = theme;
  const { workout, startFreeWorkout } = useWorkout();

  const onStartWorkout = async () => {
    await startFreeWorkout();
    router.push('/workout');
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.hero}>
        <Text style={type.hero}>
          FORGE<Text style={{ color: colors.accent }}>.</Text>
        </Text>
        <Text style={[styles.tagline, { color: colors.muted }]}>
          Train with intent.
        </Text>
        <Pressable
          style={[styles.startButton, { backgroundColor: colors.accent }]}
          onPress={() => {
            if (workout) {
              router.push('/workout');
            } else {
              onStartWorkout();
            }
          }}
          accessibilityLabel={
            workout ? 'Resume the active workout' : 'Start a free workout'
          }
        >
          <Ionicons
            name={workout ? 'refresh' : 'play'}
            size={20}
            color={colors.bg}
          />
          <Text style={[styles.startButtonText, { color: colors.bg }]}>
            {workout ? 'Resume workout' : 'Start workout'}
          </Text>
        </Pressable>
        <View style={[styles.otaBadge, { backgroundColor: theme.colors.volt }]}>
          <Ionicons name="flash" size={14} color={colors.bg} />
          <Text style={[styles.otaBadgeText, { color: colors.bg }]}>
            Updated over the air · v0.3
          </Text>
        </View>
      </View>

      <View style={styles.stats}>
        {stats.map((s) => (
          <View
            key={s.label}
            style={[
              styles.statCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.line,
              },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {s.value}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.bodySection}>
        <View style={styles.bodyHeader}>
          <Text style={type.subtitle}>3D Body</Text>
          <Text style={[type.caption, { color: colors.muted }]}>
            Tap a muscle to explore
          </Text>
        </View>
        <BodyViewer height={380} />
      </View>

      {links.map((link) => (
        <Link key={link.title} href={link.href} asChild>
          <Pressable
            // Flattened: expo-router's asChild Slot cannot merge style arrays.
            style={StyleSheet.flatten([
              styles.linkCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.line,
              },
            ])}
          >
            <View style={[styles.linkIcon, { backgroundColor: colors.bg }]}>
              <Ionicons name={link.icon} size={24} color={colors.accent} />
            </View>
            <View style={styles.linkText}>
              <Text style={type.subtitle}>{link.title}</Text>
              <Text style={[type.caption, { color: colors.muted }]}>
                {link.blurb}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        </Link>
      ))}

      <View
        style={[
          styles.note,
          { backgroundColor: colors.surface, borderColor: colors.line },
        ]}
      >
        <Ionicons name="flask" size={16} color={theme.colors.volt} />
        <Text style={[styles.noteText, { color: colors.muted }]}>
          React Native experiment v0.1. The web app remains the production app.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  hero: { paddingTop: spacing.xl, paddingBottom: spacing.sm },
  tagline: { ...typeBase.body, marginTop: spacing.xs },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
  startButtonText: { fontSize: 17, fontWeight: '800' },
  otaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
  },
  otaBadgeText: { fontSize: 12, fontWeight: '800' },
  stats: { flexDirection: 'row', gap: spacing.md },
  bodySection: { gap: spacing.sm },
  bodyHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statValue: { fontSize: 26, fontWeight: '800' },
  statLabel: {
    ...typeBase.caption,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: { flex: 1, gap: 2 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  noteText: { ...typeBase.caption, flex: 1 },
});
