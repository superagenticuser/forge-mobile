// Progress tab: overview, history, records, volume, calendar, body.
// Ports the web app's Progress view (js/progress.js renderProgress).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { useTheme } from '@/src/storage/settings';
import { useLibrary } from '@/src/storage/library';
import { kvGet, kvSet } from '@/src/storage/db';
import { useWorkoutLogs, groupOfMuscle } from '@/src/lib/progress';
import { OverviewTab } from '@/src/components/progress/OverviewTab';
import { HistoryTab } from '@/src/components/progress/HistoryTab';
import { RecordsTab } from '@/src/components/progress/RecordsTab';
import { VolumeTab } from '@/src/components/progress/VolumeTab';
import { CalendarTab } from '@/src/components/progress/CalendarTab';
import { BodyTab } from '@/src/components/progress/BodyTab';
import { spacing } from '@/src/theme';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'history', label: 'History' },
  { id: 'records', label: 'Records' },
  { id: 'volume', label: 'Volume' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'body', label: 'Body' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ProgressScreen() {
  const theme = useTheme();
  const { colors, type } = theme;
  const { ready, logs, refresh } = useWorkoutLogs();
  const { byId } = useLibrary();
  const [tab, setTab] = useState<TabId>('overview');

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

  // Re-read logs whenever the tab regains focus (e.g. after a workout).
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

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
      case 'overview':
      default:
        return <OverviewTab logs={logs} nameOf={nameOf} />;
    }
  }, [ready, tab, logs, nameOf, primaryOf, musclesOf]);

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
