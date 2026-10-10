// Progress tab: overview, history, records, volume, calendar, body,
// goals, badges, insights, standards, year, challenges, coach, export.
// Ports the web app's Progress view (js/progress.js renderProgress).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { useTheme } from '@/src/storage/settings';
import { useLibrary } from '@/src/storage/library';
import { kvGet, kvSet } from '@/src/storage/db';
import { useWorkoutLogs, groupOfMuscle } from '@/src/lib/progress';
import {
  badgeContext,
  checkBadges,
  getNewBadges,
  type BadgeDef,
} from '@/src/lib/badges';
import { OverviewTab } from '@/src/components/progress/OverviewTab';
import { RecoveryTab } from '@/src/components/progress/RecoveryTab';
import { BoardTab } from '@/src/components/progress/BoardTab';
import { HistoryTab } from '@/src/components/progress/HistoryTab';
import { RecordsTab } from '@/src/components/progress/RecordsTab';
import { VolumeTab } from '@/src/components/progress/VolumeTab';
import { CalendarTab } from '@/src/components/progress/CalendarTab';
import { BodyTab } from '@/src/components/progress/BodyTab';
import { GoalsTab } from '@/src/components/progress/GoalsTab';
import { BadgesTab } from '@/src/components/progress/BadgesTab';
import { BadgeCelebration } from '@/src/components/progress/BadgeCelebration';
import { InsightsTab } from '@/src/components/progress/InsightsTab';
import { StandardsTab } from '@/src/components/progress/StandardsTab';
import { YearTab } from '@/src/components/progress/YearTab';
import { ChallengesTab } from '@/src/components/progress/ChallengesTab';
import { CoachTab } from '@/src/components/progress/CoachTab';
import { ExportTab } from '@/src/components/progress/ExportTab';
import { spacing } from '@/src/theme';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'recovery', label: 'Recovery' },
  { id: 'history', label: 'History' },
  { id: 'records', label: 'Records' },
  { id: 'volume', label: 'Volume' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'body', label: 'Body' },
  { id: 'goals', label: 'Goals' },
  { id: 'badges', label: 'Badges' },
  { id: 'board', label: 'Board' },
  { id: 'insights', label: 'Insights' },
  { id: 'standards', label: 'Standards' },
  { id: 'year', label: 'Year' },
  { id: 'challenges', label: 'Challenges' },
  { id: 'coach', label: 'Coach' },
  { id: 'export', label: 'Export' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ProgressScreen() {
  const theme = useTheme();
  const { colors, type } = theme;
  const { ready, logs, refresh } = useWorkoutLogs();
  const { byId, exercises } = useLibrary();
  const [tab, setTab] = useState<TabId>('overview');
  const [celebration, setCelebration] = useState<
    Array<BadgeDef & { earnedAt: number }>
  >([]);

  // Remember the sub-tab like the web app (forge-progress-tab).
  useEffect(() => {
    (async () => {
      const saved = await kvGet('progress-tab');
      if (saved && TABS.some((t) => t.id === saved)) setTab(saved as TabId);
    })();
  }, []);
  const selectTab = useCallback((t: TabId) => {
    setTab(t);
    kvSet('progress-tab', t);
  }, []);

  const nameOf = useCallback(
    (id: string) => byId.get(id)?.name ?? null,
    [byId]
  );
  const primaryOf = useCallback(
    (id: string) => byId.get(id)?.primary ?? null,
    [byId]
  );
  const musclesOf = useCallback(
    (id: string) => {
      const ex = byId.get(id);
      if (!ex) return [];
      return [ex.primary, ...(ex.secondary || [])]
        .filter(Boolean)
        .map(groupOfMuscle);
    },
    [byId]
  );
  const getExercise = useCallback(
    (id: string) => {
      const ex = byId.get(id);
      return ex ? { name: ex.name, primary: ex.primary } : undefined;
    },
    [byId]
  );
  const getExDetail = useCallback(
    (id: string) => {
      const ex = byId.get(id);
      return ex
        ? { primary: ex.primary, secondary: ex.secondary ?? [] }
        : undefined;
    },
    [byId]
  );
  const resolveLiftId = useCallback(
    (lift: { id: string; name: string }) => {
      const direct = byId.get(lift.id);
      if (direct) return direct.id;
      const part = lift.name.toLowerCase().split(' ')[0];
      const found = exercises.find((e) => e.name.toLowerCase().includes(part));
      return found ? found.id : null;
    },
    [byId, exercises]
  );

  // Re-read logs whenever the tab regains focus (e.g. after a workout),
  // then evaluate badges and celebrate newly earned ones.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        await refresh();
        const { loadWorkoutLogs } = await import('@/src/storage/workout');
        const fresh = await loadWorkoutLogs();
        if (cancelled) return;
        await checkBadges(
          fresh,
          badgeContext(fresh, (id) => byId.get(id)?.name ?? null)
        );
        const unseen = await getNewBadges();
        if (!cancelled && unseen.length) setCelebration(unseen);
      })();
      return () => {
        cancelled = true;
      };
    }, [refresh, byId])
  );

  const body = useMemo(() => {
    if (!ready) return null;
    switch (tab) {
      case 'history':
        return <HistoryTab logs={logs} nameOf={nameOf} />;
      case 'records':
        return <RecordsTab logs={logs} nameOf={nameOf} musclesOf={musclesOf} />;
      case 'volume':
        return <VolumeTab logs={logs} primaryOf={primaryOf} />;
      case 'calendar':
        return <CalendarTab logs={logs} nameOf={nameOf} />;
      case 'body':
        return <BodyTab />;
      case 'recovery':
        return <RecoveryTab logs={logs} getEx={getExDetail} />;
      case 'board':
        return <BoardTab logs={logs} />;
      case 'goals':
        return <GoalsTab logs={logs} nameOf={nameOf} />;
      case 'badges':
        return <BadgesTab />;
      case 'insights':
        return (
          <InsightsTab
            logs={logs}
            nameOf={nameOf}
            primaryOf={primaryOf}
            getExercise={getExercise}
          />
        );
      case 'standards':
        return <StandardsTab logs={logs} resolveLiftId={resolveLiftId} />;
      case 'year':
        return <YearTab logs={logs} nameOf={nameOf} primaryOf={primaryOf} />;
      case 'challenges':
        return <ChallengesTab logs={logs} />;
      case 'coach':
        return <CoachTab logs={logs} nameOf={nameOf} primaryOf={primaryOf} />;
      case 'export':
        return <ExportTab logs={logs} nameOf={nameOf} />;
      case 'overview':
      default:
        return <OverviewTab logs={logs} nameOf={nameOf} />;
    }
  }, [
    ready,
    tab,
    logs,
    nameOf,
    primaryOf,
    musclesOf,
    getExercise,
    getExDetail,
    resolveLiftId,
  ]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
        contentContainerStyle={styles.chipContent}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => selectTab(t.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.accent : colors.surface,
                  borderColor: active ? colors.accent : colors.line,
                },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  type.chip,
                  { color: active ? colors.accentInk : colors.muted },
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
      >
        {body}
      </ScrollView>
      <BadgeCelebration
        badges={celebration}
        onClose={() => setCelebration([])}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  chipRow: { flexGrow: 0 },
  chipContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  body: { flex: 1 },
  bodyContent: {
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
});
