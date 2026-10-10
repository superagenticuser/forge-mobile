// Progress > Export: workout card image share, JSON export, CSV export.
// Ports the web app's workout card exporter (js/views.js generateShareCard
// + js/workout.js shareCard handler) using react-native-view-shot and
// expo-sharing, plus log exports (v0.15 covers full backup/restore).
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy';

import type { WorkoutLog } from '@/src/storage/workout';
import { useTheme } from '@/src/storage/settings';
import { fmtWeight } from '@/src/lib/training';
import { longDateLabel, sessionVolumeKg } from '@/src/lib/progress';
import { ShareCard } from '@/src/components/progress/ShareCard';
import { EmptyNote, Muted, SectionTitle } from '@/src/components/progress/ui';
import { radius, spacing } from '@/src/theme';

async function shareUri(uri: string, mimeType: string, label: string) {
  const ok = await Sharing.isAvailableAsync();
  if (!ok) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: label });
}

function logsToCsv(logs: WorkoutLog[]): string {
  const rows = [
    'date,workout,exercise,sets,reps,weight_kg,rpe,duration_min,notes',
  ];
  logs.forEach((w) => {
    const wname = [w.programName, w.dayName].filter(Boolean).join(' - ');
    (w.exercises || []).forEach((x) =>
      (x.sets || []).forEach((s) => {
        const q = (v: string | number | null | undefined) =>
          `"${String(v ?? '').replace(/"/g, '""')}"`;
        rows.push(
          [
            w.date,
            q(wname),
            q(x.id),
            1,
            s.reps || 0,
            s.weight || 0,
            s.rpe ?? '',
            w.durationMin || '',
            q(w.notes || ''),
          ].join(',')
        );
      })
    );
  });
  return rows.join('\n');
}

export function ExportTab({
  logs,
  nameOf,
}: {
  logs: WorkoutLog[];
  nameOf: (id: string) => string | null;
}) {
  const theme = useTheme();
  const { colors, type, settings } = theme;
  const units = settings.units === 'lb' ? 'lb' : 'kg';
  const [selected, setSelected] = useState<WorkoutLog | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<View>(null);

  const recent = logs.slice(-10).reverse();

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setBusy(null);
    }
  };

  const shareCard = () =>
    run('card', async () => {
      if (!selected || !cardRef.current) return;
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
      });
      await shareUri(uri, 'image/png', 'Share workout card');
    });

  const exportJson = () =>
    run('json', async () => {
      if (!cacheDirectory) throw new Error('Cache directory unavailable.');
      const uri = `${cacheDirectory}forge-logs.json`;
      await writeAsStringAsync(uri, JSON.stringify(logs, null, 2));
      await shareUri(uri, 'application/json', 'Export logs as JSON');
    });

  const exportCsv = () =>
    run('csv', async () => {
      if (!cacheDirectory) throw new Error('Cache directory unavailable.');
      const uri = `${cacheDirectory}forge-logs.csv`;
      await writeAsStringAsync(uri, logsToCsv(logs));
      await shareUri(uri, 'text/csv', 'Export logs as CSV');
    });

  const Button = ({
    id,
    icon,
    label,
    hint,
    onPress,
  }: {
    id: string;
    icon: string;
    label: string;
    hint: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      disabled={busy != null}
      style={[
        styles.button,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      <Ionicons
        // @ts-expect-error icon names are validated at runtime
        name={icon}
        size={22}
        color={colors.accent}
      />
      <View style={styles.buttonText}>
        <Text style={[type.subtitle, { color: colors.ink }]}>{label}</Text>
        <Text style={[type.caption, { color: colors.muted }]}>{hint}</Text>
      </View>
      {busy === id ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : (
        <Ionicons name="share-outline" size={18} color={colors.muted} />
      )}
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <SectionTitle>Export and share</SectionTitle>
      <Muted>
        Share a workout card image or export your logs for spreadsheets and
        backups.
      </Muted>

      {logs.length === 0 ? (
        <EmptyNote
          title="Nothing to export yet"
          body="Log a workout and it will be available here."
        />
      ) : (
        <>
          <Button
            id="json"
            icon="document-text-outline"
            label="Export logs as JSON"
            hint={`${logs.length} workouts, web-backup compatible shape`}
            onPress={exportJson}
          />
          <Button
            id="csv"
            icon="grid-outline"
            label="Export logs as CSV"
            hint="One row per set, opens in spreadsheets"
            onPress={exportCsv}
          />
          <SectionTitle>Workout card</SectionTitle>
          <Muted>Pick a recent workout, then share it as an image.</Muted>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.picker}
          >
            {recent.map((w, i) => {
              const active = selected?.ts === w.ts;
              return (
                <Pressable
                  key={`${w.date}-${w.ts}-${i}`}
                  onPress={() => setSelected(active ? null : w)}
                  style={[
                    styles.pick,
                    {
                      backgroundColor: active ? colors.accent : colors.surface,
                      borderColor: active ? colors.accent : colors.line,
                    },
                  ]}
                >
                  <Text
                    style={[
                      type.chip,
                      { color: active ? colors.bg : colors.ink },
                    ]}
                  >
                    {longDateLabel(w.date)}
                  </Text>
                  <Text
                    style={[
                      type.caption,
                      { color: active ? colors.bg : colors.muted },
                    ]}
                  >
                    {fmtWeight(sessionVolumeKg(w), units)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}

      {error && (
        <View
          style={[
            styles.error,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <Text style={[type.body, { color: colors.ink }]}>{error}</Text>
        </View>
      )}

      <Modal
        visible={selected != null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(null)}
      >
        <SafeAreaView
          style={[styles.modal, { backgroundColor: colors.bg }]}
          edges={['top', 'bottom']}
        >
          <View style={[styles.modalHead, { borderBottomColor: colors.line }]}>
            <Text style={type.subtitle}>Workout card</Text>
            <Pressable onPress={() => setSelected(null)} hitSlop={12}>
              <Text style={[type.body, { color: colors.accent }]}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {selected && (
              <View ref={cardRef} collapsable={false}>
                <ShareCard workout={selected} nameOf={nameOf} />
              </View>
            )}
          </ScrollView>
          <View
            style={[
              styles.modalFoot,
              { borderTopColor: colors.line, backgroundColor: colors.bg },
            ]}
          >
            <Pressable
              style={[styles.shareButton, { backgroundColor: colors.accent }]}
              onPress={shareCard}
              disabled={busy != null}
            >
              {busy === 'card' ? (
                <ActivityIndicator size="small" color={colors.bg} />
              ) : (
                <Text style={[type.chip, { color: colors.bg }]}>
                  Share image
                </Text>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  buttonText: { flex: 1, gap: 2 },
  picker: { flexGrow: 0 },
  pick: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    gap: 2,
    alignItems: 'center',
  },
  error: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  modal: { flex: 1 },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  modalBody: { padding: spacing.lg, alignItems: 'center' },
  modalFoot: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  shareButton: {
    borderRadius: 999,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
