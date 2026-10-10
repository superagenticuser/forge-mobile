// Progress > Recovery: recovery score, readiness check-in, soreness body
// map, water/protein/supplement trackers, per-muscle recovery grid, and
// coach tips wired to the recovery score. Ports the web app's recovery
// dashboard (js/views.js getRecoveryStats/renderBodyRecovery/recoveryScore,
// js/progress.js check-in + trackers).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import type { WorkoutLog } from '@/src/storage/workout';
import { useTheme } from '@/src/storage/settings';
import { BodyViewer } from '@/src/components/BodyViewer';
import { CheckinModal } from '@/src/components/CheckinModal';
import {
  EmptyNote,
  Muted,
  SectionTitle,
  StatCard,
} from '@/src/components/progress/ui';
import { fmtDateKey } from '@/src/lib/progress';
import {
  cycleSoreness,
  daysAgoLabel,
  getCheckin,
  getRecoveryStats,
  getSoreness,
  recoveryLabel,
  recoveryScore,
  SORE_LABELS,
  type CheckinData,
  type SorenessLevel,
} from '@/src/lib/recovery';
import { radius, spacing } from '@/src/theme';

function statusColor(status: string, accent: string, muted: string): string {
  if (status === 'Fresh') return accent;
  if (status === 'Ready') return muted;
  return '#ff8c1a';
}

export function RecoveryTab({
  logs,
  getEx,
}: {
  logs: WorkoutLog[];
  getEx: (id: string) => { primary: string; secondary?: string[] } | undefined;
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkin, setCheckin] = useState<CheckinData | null>(null);
  const [soreByGroup, setSoreByGroup] = useState<Record<string, SorenessLevel>>(
    {}
  );
  // Guard against rapid concurrent soreness cycles which race the DB
  // read-modify-write and flood the GL thread with material updates.
  const cyclingRef = useRef(false);

  const todayKey = fmtDateKey(new Date());
  const score = useMemo(() => recoveryScore(logs), [logs]);
  const recStats = useMemo(() => getRecoveryStats(logs, getEx), [logs, getEx]);

  const reload = useCallback(async () => {
    setCheckin(await getCheckin(todayKey));
    const sore = await getSoreness();
    setSoreByGroup((sore[todayKey] ?? {}) as Record<string, SorenessLevel>);
  }, [todayKey]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const onSorenessCycle = useCallback(
    async (groupId: string) => {
      // Ignore taps while a cycle is in flight to prevent DB races and
      // GL thread flooding.
      if (cyclingRef.current) return;
      cyclingRef.current = true;
      try {
        const day = await cycleSoreness(todayKey, groupId);
        setSoreByGroup(day as Record<string, SorenessLevel>);
      } finally {
        cyclingRef.current = false;
      }
    },
    [todayKey]
  );

  const soreCount = Object.keys(soreByGroup).length;
  const checkinParts: string[] = [];
  if (checkin?.sleep != null) checkinParts.push(`${checkin.sleep}h sleep`);
  if (checkin?.energy != null) checkinParts.push(`energy ${checkin.energy}/5`);
  if (checkin?.soreness != null)
    checkinParts.push(`soreness ${checkin.soreness}/5`);

  // Coach tips wired to the recovery score, like the web app's deload and
  // readiness guidance.
  const tips: string[] = [];
  if (score < 40)
    tips.push(
      'Recovery is low. Take a rest day or do light mobility work today.'
    );
  else if (score < 60)
    tips.push(
      'Recovery is fair. Keep today moderate and prioritize sleep tonight.'
    );
  if (soreCount >= 3)
    tips.push(
      `${soreCount} muscle groups are sore. Train around them or rest.`
    );
  if (checkin && (checkin.sleep ?? 8) < 6)
    tips.push('Under 6h of sleep hurts performance. Aim for 7-9h tonight.');

  return (
    <View style={styles.root}>
      <SectionTitle>Recovery</SectionTitle>

      <View
        style={[
          styles.hero,
          { backgroundColor: colors.surface, borderColor: colors.line },
        ]}
      >
        <Text style={[styles.score, { color: colors.accent }]}>{score}</Text>
        <Text style={[type.subtitle, { color: colors.ink }]}>
          {recoveryLabel(score)}
        </Text>
        <Muted>
          {logs.length
            ? 'Based on your last session volume and rest days.'
            : 'Log a workout to start tracking recovery.'}
        </Muted>
      </View>

      <View style={styles.statGrid}>
        <StatCard
          value={checkin ? 'Done' : 'Pending'}
          label="today's check-in"
        />
        <StatCard
          value={String(soreCount)}
          label={soreCount === 1 ? 'sore group' : 'sore groups'}
        />
      </View>

      <Pressable
        style={[styles.checkinBtn, { backgroundColor: colors.accent }]}
        onPress={() => setCheckinOpen(true)}
      >
        <Ionicons
          name={checkin ? 'checkmark-circle' : 'sunny'}
          size={20}
          color={colors.bg}
        />
        <Text style={[type.body, { color: colors.bg, fontWeight: '700' }]}>
          {checkin ? 'Update check-in' : 'Morning check-in'}
        </Text>
      </Pressable>
      {checkinParts.length > 0 && (
        <Muted>Today: {checkinParts.join(' · ')}</Muted>
      )}

      <SectionTitle>Soreness map</SectionTitle>
      <Muted>Tap a muscle to cycle its soreness level.</Muted>
      <BodyViewer
        height={320}
        mode="soreness"
        sorenessByGroup={soreByGroup}
        onSorenessCycle={onSorenessCycle}
        autoRotate={false}
      />
      {soreCount > 0 && (
        <View style={styles.soreList}>
          {Object.entries(soreByGroup).map(([g, lvl]) => (
            <View
              key={g}
              style={[
                styles.soreChip,
                { backgroundColor: colors.surface, borderColor: colors.line },
              ]}
            >
              <Text style={[type.caption, { color: colors.ink }]}>
                {g}: {SORE_LABELS[lvl]}
              </Text>
            </View>
          ))}
        </View>
      )}

      {tips.length > 0 && (
        <View>
          <SectionTitle>Coach tips</SectionTitle>
          {tips.map((t) => (
            <View
              key={t}
              style={[
                styles.tip,
                { backgroundColor: colors.surface, borderColor: colors.line },
              ]}
            >
              <Ionicons name="bulb-outline" size={18} color={colors.accent} />
              <Text style={[type.body, { color: colors.ink, flex: 1 }]}>
                {t}
              </Text>
            </View>
          ))}
        </View>
      )}

      <SectionTitle>Muscle recovery</SectionTitle>
      {!recStats ? (
        <EmptyNote
          title="No recovery data yet"
          body="Log workouts and each muscle group's freshness will appear here."
        />
      ) : (
        <View style={styles.recGrid}>
          {recStats.stats.map((s) => (
            <View
              key={s.g}
              style={[
                styles.recItem,
                { backgroundColor: colors.surface, borderColor: colors.line },
              ]}
            >
              <View style={styles.recRow}>
                <Text style={[type.body, { color: colors.ink, flex: 1 }]}>
                  {s.name}
                </Text>
                <Text
                  style={[
                    type.caption,
                    {
                      color: statusColor(s.status, colors.accent, colors.muted),
                      fontWeight: '700',
                    },
                  ]}
                >
                  {s.status}
                </Text>
              </View>
              <View style={[styles.recBar, { backgroundColor: colors.bg }]}>
                <View
                  style={[
                    styles.recFill,
                    {
                      width: `${s.freshness}%`,
                      backgroundColor: statusColor(
                        s.status,
                        colors.accent,
                        colors.muted
                      ),
                    },
                  ]}
                />
              </View>
              <Text style={[type.caption, { color: colors.muted }]}>
                {daysAgoLabel(s.daysAgo)}
              </Text>
            </View>
          ))}
        </View>
      )}

      <CheckinModal
        visible={checkinOpen}
        onClose={() => {
          setCheckinOpen(false);
          reload();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  hero: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  score: { fontSize: 56, fontWeight: '800' },
  statGrid: { flexDirection: 'row', gap: spacing.sm },
  checkinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
  },
  soreList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  soreChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tip: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'flex-start',
  },
  recGrid: { gap: spacing.sm },
  recItem: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  recRow: { flexDirection: 'row', alignItems: 'center' },
  recBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  recFill: { height: 6, borderRadius: 3 },
});
