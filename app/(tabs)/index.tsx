import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EXERCISES, MUSCLE_GROUPS } from '@/src/data/exercises';
import { PROGRAMS } from '@/src/data/programs';
import { BodyViewer } from '@/src/components/BodyViewer';
import { CheckinModal } from '@/src/components/CheckinModal';
import { useTheme } from '@/src/storage/settings';
import { useWorkout } from '@/src/storage/workout';
import { fmtDateKey, useWorkoutLogs } from '@/src/lib/progress';
import {
  getCheckin,
  recoveryLabel,
  recoveryScore,
  type CheckinData,
} from '@/src/lib/recovery';
import { useGamification, xpLevel } from '@/src/lib/xp';
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
  const { logs } = useWorkoutLogs();
  const { xp, streak } = useGamification(logs);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkin, setCheckin] = useState<CheckinData | null>(null);

  useEffect(() => {
    (async () => {
      setCheckin(await getCheckin(fmtDateKey(new Date())));
    })();
  }, [checkinOpen]);

  const score = useMemo(() => recoveryScore(logs), [logs]);

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
          <Text style={type.subtitle}>Recovery</Text>
          <Pressable
            onPress={() => router.push('/(tabs)/progress')}
            hitSlop={8}
          >
            <Text style={[type.caption, { color: colors.accent }]}>
              Open dashboard
            </Text>
          </Pressable>
        </View>
        <View
          style={[
            styles.recCard,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <View style={styles.recRow}>
            <View style={styles.recScore}>
              <Text style={[styles.recScoreNum, { color: colors.accent }]}>
                {score}
              </Text>
              <Text style={[type.caption, { color: colors.muted }]}>
                {recoveryLabel(score)}
              </Text>
            </View>
            <View style={styles.recMeta}>
              <Text style={[type.body, { color: colors.ink }]}>
                Level {xpLevel(xp.xp)} · {xp.xp.toLocaleString()} XP
              </Text>
              <Text style={[type.caption, { color: colors.muted }]}>
                {streak}-day streak · {xp.freeze}{' '}
                {xp.freeze === 1 ? 'freeze' : 'freezes'}
              </Text>
            </View>
            <Pressable
              style={[styles.checkinBtn, { backgroundColor: colors.accent }]}
              onPress={() => setCheckinOpen(true)}
            >
              <Ionicons
                name={checkin ? 'checkmark' : 'sunny'}
                size={16}
                color={colors.bg}
              />
              <Text
                style={[type.caption, { color: colors.bg, fontWeight: '700' }]}
              >
                {checkin ? 'Checked in' : 'Check in'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <CheckinModal
        visible={checkinOpen}
        onClose={() => setCheckinOpen(false)}
      />

      <View style={styles.bodySection}>
        <View style={styles.bodyHeader}>
          <Text style={type.subtitle}>3D Body</Text>
          <Text style={[type.caption, { color: colors.muted }]}>
            Tap a muscle to explore
          </Text>
        </View>
        <View style={styles.bodyFullBleed}>
          <BodyViewer height={520} />
        </View>
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
  stats: { flexDirection: 'row', gap: spacing.md },
  bodySection: { gap: spacing.sm },
  bodyFullBleed: {
    marginHorizontal: -spacing.lg,
  },
  bodyHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  recCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  recScore: { alignItems: 'center', minWidth: 64 },
  recScoreNum: { fontSize: 32, fontWeight: '800' },
  recMeta: { flex: 1, gap: 2 },
  checkinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
});
