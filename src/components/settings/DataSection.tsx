// Settings > Data: backup, restore, web import, storage meter, reset.
// Ports the web app's backup/restore/export (js/progress.js, js/app.js) to
// native SQLite. Backup files live in the document directory; restore picks
// from the on-device list. Web import accepts pasted forge-export.json.
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { useTheme } from '@/src/storage/settings';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import {
  backupShareUri,
  createBackup,
  deleteBackup,
  formatBytes,
  getBackupSummary,
  getStorageInfo,
  importWebBackup,
  listBackups,
  resetAllData,
  restoreBackup,
  shareFile,
  type BackupFileInfo,
  type StorageInfo,
} from '@/src/lib/backup';
import { radius, spacing } from '@/src/theme';

function DataButton({
  icon,
  label,
  hint,
  onPress,
  disabled,
  busy,
  danger,
}: {
  icon: string;
  label: string;
  hint: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  danger?: boolean;
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={[
        styles.button,
        { backgroundColor: colors.bg, borderColor: colors.line },
      ]}
    >
      <Ionicons
        // @ts-expect-error icon names are validated at runtime
        name={icon}
        size={22}
        color={danger ? colors.ember : colors.accent}
      />
      <View style={styles.buttonText}>
        <Text
          style={[type.subtitle, { color: danger ? colors.ember : colors.ink }]}
        >
          {label}
        </Text>
        <Text style={[type.caption, { color: colors.muted }]}>{hint}</Text>
      </View>
      {busy ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      )}
    </Pressable>
  );
}

export function DataSection() {
  const theme = useTheme();
  const { colors, type } = theme;
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [backups, setBackups] = useState<BackupFileInfo[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showRestore, setShowRestore] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<BackupFileInfo | null>(
    null
  );

  const refresh = useCallback(async () => {
    try {
      setStorage(await getStorageInfo());
      setBackups(await listBackups());
    } catch {
      // Storage info is best effort.
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = async (label: string, fn: () => Promise<string | null>) => {
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      const msg = await fn();
      if (msg) setNotice(msg);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operation failed.');
    } finally {
      setBusy(null);
    }
  };

  const doBackup = () =>
    run('backup', async () => {
      const { uri, filename } = await createBackup();
      const shareUri = await backupShareUri(uri);
      await shareFile(shareUri, 'application/json', 'Share FORGE backup');
      return `Backup saved as ${filename}.`;
    });

  const doRestore = (b: BackupFileInfo) => {
    setConfirmRestore(b);
  };

  const confirmRestoreNow = () => {
    const b = confirmRestore;
    setConfirmRestore(null);
    if (!b) return;
    run('restore', async () => {
      const s = await restoreBackup(b.uri);
      return `Restored ${s.logCount} workouts, ${s.photoCount} photos, ${s.clipCount} clips.`;
    });
  };

  const doDeleteBackup = (b: BackupFileInfo) =>
    run('delete', async () => {
      await deleteBackup(b.uri);
      return `Deleted ${b.filename}.`;
    });

  const doImport = () =>
    run('import', async () => {
      const text = importText.trim();
      if (!text) throw new Error('Paste your web export JSON first.');
      const r = await importWebBackup(text);
      setImportText('');
      setShowImport(false);
      return `Imported ${r.logs} workouts and ${r.favs} favorites from the web backup.`;
    });

  const doPaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setImportText(text);
  };

  const doReset = () => setConfirmReset(true);

  const confirmResetNow = () => {
    setConfirmReset(false);
    run('reset', async () => {
      await resetAllData();
      return 'All data cleared.';
    });
  };

  return (
    <View style={styles.root}>
      {storage && (
        <View
          style={[
            styles.meter,
            { backgroundColor: colors.bg, borderColor: colors.line },
          ]}
        >
          <View style={styles.meterRow}>
            <Text style={[type.caption, { color: colors.muted }]}>
              Database
            </Text>
            <Text style={[type.chip, { color: colors.ink }]}>
              {formatBytes(storage.dbBytes)}
            </Text>
          </View>
          <View style={styles.meterRow}>
            <Text style={[type.caption, { color: colors.muted }]}>
              Photos and clips
            </Text>
            <Text style={[type.chip, { color: colors.ink }]}>
              {formatBytes(storage.mediaBytes)}
            </Text>
          </View>
          <View style={[styles.meterRow, styles.meterLast]}>
            <Text style={[type.caption, { color: colors.muted }]}>Content</Text>
            <Text style={[type.chip, { color: colors.ink }]}>
              {storage.logCount} workouts, {storage.photoCount} photos,{' '}
              {storage.clipCount} clips
            </Text>
          </View>
        </View>
      )}

      <DataButton
        icon="save-outline"
        label="Create backup"
        hint="Save all data to a JSON file"
        onPress={doBackup}
        busy={busy === 'backup'}
      />
      <DataButton
        icon="refresh-outline"
        label="Restore backup"
        hint={
          backups.length
            ? `${backups.length} backup${backups.length === 1 ? '' : 's'} on this device`
            : 'No backups on this device yet'
        }
        onPress={() => setShowRestore(true)}
        disabled={backups.length === 0}
      />
      <DataButton
        icon="cloud-download-outline"
        label="Import web backup"
        hint="Paste a forge-export.json from the web app"
        onPress={() => setShowImport(true)}
      />
      <DataButton
        icon="trash-outline"
        label="Reset all data"
        hint="Clear everything on this device"
        onPress={doReset}
        busy={busy === 'reset'}
        danger
      />

      {notice && (
        <View
          style={[
            styles.feedback,
            { backgroundColor: colors.bg, borderColor: colors.line },
          ]}
        >
          <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
          <Text style={[type.body, styles.feedbackText, { color: colors.ink }]}>
            {notice}
          </Text>
        </View>
      )}
      {error && (
        <View
          style={[
            styles.feedback,
            { backgroundColor: colors.bg, borderColor: colors.ember },
          ]}
        >
          <Ionicons name="alert-circle" size={18} color={colors.ember} />
          <Text style={[type.body, styles.feedbackText, { color: colors.ink }]}>
            {error}
          </Text>
        </View>
      )}

      <ConfirmDialog
        visible={confirmReset}
        title="Reset all data?"
        message="This clears workouts, photos, clips, programs, and settings on this device. This cannot be undone."
        confirmLabel="Reset"
        destructive
        onConfirm={confirmResetNow}
        onCancel={() => setConfirmReset(false)}
      />
      <ConfirmDialog
        visible={confirmRestore != null}
        title="Restore this backup?"
        message={`Current data will be replaced with the backup from ${confirmRestore?.filename ?? ''}.`}
        confirmLabel="Restore"
        destructive
        onConfirm={confirmRestoreNow}
        onCancel={() => setConfirmRestore(null)}
      />

      <Modal
        visible={showRestore}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRestore(false)}
      >
        <SafeAreaView
          style={[styles.modal, { backgroundColor: colors.bg }]}
          edges={['top', 'bottom']}
        >
          <View style={[styles.modalHead, { borderBottomColor: colors.line }]}>
            <Text style={type.subtitle}>Backups on this device</Text>
            <Pressable onPress={() => setShowRestore(false)} hitSlop={12}>
              <Text style={[type.body, { color: colors.accent }]}>Close</Text>
            </Pressable>
          </View>
          <View style={styles.modalBody}>
            {backups.map((b) => (
              <RestoreRow
                key={b.uri}
                backup={b}
                busy={busy === 'restore'}
                onRestore={() => {
                  setShowRestore(false);
                  doRestore(b);
                }}
                onDelete={() => doDeleteBackup(b)}
              />
            ))}
            {backups.length === 0 && (
              <Text style={[type.body, { color: colors.muted }]}>
                No backups yet. Create one first.
              </Text>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showImport}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowImport(false)}
      >
        <SafeAreaView
          style={[styles.modal, { backgroundColor: colors.bg }]}
          edges={['top', 'bottom']}
        >
          <View style={[styles.modalHead, { borderBottomColor: colors.line }]}>
            <Text style={type.subtitle}>Import web backup</Text>
            <Pressable onPress={() => setShowImport(false)} hitSlop={12}>
              <Text style={[type.body, { color: colors.accent }]}>Close</Text>
            </Pressable>
          </View>
          <View style={styles.modalBody}>
            <Text style={[type.body, { color: colors.muted }]}>
              Export from the web app (Settings, Export data), copy the JSON,
              then paste it below. Workouts are matched by date so importing
              twice will not duplicate them.
            </Text>
            <Pressable
              style={[styles.pasteButton, { borderColor: colors.line }]}
              onPress={doPaste}
            >
              <Ionicons
                name="clipboard-outline"
                size={18}
                color={colors.accent}
              />
              <Text style={[type.chip, { color: colors.accent }]}>
                Paste from clipboard
              </Text>
            </Pressable>
            <TextInput
              style={[
                styles.importInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                  color: colors.ink,
                },
              ]}
              value={importText}
              onChangeText={setImportText}
              placeholder="Paste forge-export.json here"
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
            />
            <Pressable
              style={[styles.importButton, { backgroundColor: colors.accent }]}
              onPress={doImport}
              disabled={busy === 'import' || !importText.trim()}
            >
              {busy === 'import' ? (
                <ActivityIndicator size="small" color={colors.bg} />
              ) : (
                <Text style={[type.chip, { color: colors.bg }]}>Import</Text>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function RestoreRow({
  backup,
  busy,
  onRestore,
  onDelete,
}: {
  backup: BackupFileInfo;
  busy: boolean;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  const [summary, setSummary] = useState<string>('Loading...');
  useEffect(() => {
    getBackupSummary(backup.uri)
      .then((s) => {
        const d = new Date(s.exportedAt);
        setSummary(
          `${s.logCount} workouts, ${s.photoCount} photos, ${s.clipCount} clips, exported ${isNaN(d.getTime()) ? s.exportedAt : d.toLocaleDateString()}`
        );
      })
      .catch(() => setSummary('Could not read backup.'));
  }, [backup.uri]);
  return (
    <View
      style={[
        styles.restoreRow,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      <View style={styles.restoreText}>
        <Text style={[type.subtitle, { color: colors.ink }]}>
          {backup.filename}
        </Text>
        <Text style={[type.caption, { color: colors.muted }]}>{summary}</Text>
        <Text style={[type.caption, { color: colors.muted }]}>
          {formatBytes(backup.size)}
        </Text>
      </View>
      <View style={styles.restoreActions}>
        <Pressable
          style={[styles.restoreButton, { backgroundColor: colors.accent }]}
          onPress={onRestore}
          disabled={busy}
        >
          <Text style={[type.chip, { color: colors.bg }]}>Restore</Text>
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={12}>
          <Ionicons name="trash-outline" size={18} color={colors.ember} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm, padding: spacing.md },
  meter: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  meterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meterLast: {},
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  buttonText: { flex: 1, gap: 2 },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  feedbackText: { flex: 1 },
  modal: { flex: 1 },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  modalBody: { padding: spacing.lg, gap: spacing.md },
  restoreRow: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  restoreText: { flex: 1, gap: 2 },
  restoreActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  restoreButton: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  importInput: {
    minHeight: 160,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 13,
  },
  importButton: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
