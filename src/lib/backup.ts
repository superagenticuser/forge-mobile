// Data portability for FORGE: backup, restore, web-backup import, reset,
// and storage metering. Ports the web app's backup/export logic
// (js/progress.js backupData, js/app.js exportData) to the native SQLite
// storage. Uses expo-file-system (legacy API, matches ExportTab) and
// expo-sharing, both already in the APK.
import * as Sharing from 'expo-sharing';
import {
  cacheDirectory,
  documentDirectory,
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
  deleteAsync,
  readDirectoryAsync,
  copyAsync,
} from 'expo-file-system/legacy';

import {
  getDb,
  getLogs,
  getPhotos,
  getClips,
  insertLog,
  insertPhoto,
  insertClip,
  type LogEntry,
  type PhotoEntry,
  type ClipEntry,
} from '@/src/storage/db';
import type { WorkoutLog } from '@/src/storage/workout';

const BACKUP_PREFIX = 'forge-backup-';
const BACKUP_SUFFIX = '.json';
const BACKUP_FORMAT = 'forge-mobile-backup';
const BACKUP_VERSION = 1;

/** Shape of a native backup file. */
export interface NativeBackup {
  format: string;
  version: number;
  exportedAt: string;
  appVersion: string;
  kv: Record<string, string>;
  logs: LogEntry[];
  photos: PhotoEntry[];
  clips: ClipEntry[];
}

export interface BackupFileInfo {
  uri: string;
  filename: string;
  size: number;
  modified: number;
}

export interface BackupSummary {
  exportedAt: string;
  logCount: number;
  photoCount: number;
  clipCount: number;
  kvCount: number;
}

export interface StorageInfo {
  dbBytes: number;
  mediaBytes: number;
  logCount: number;
  photoCount: number;
  clipCount: number;
}

function backupDir(): string {
  if (!documentDirectory) throw new Error('Document directory unavailable.');
  return documentDirectory;
}

function fmtDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Gather every row from sqlite into a backup object. */
export async function buildBackup(): Promise<NativeBackup> {
  const db = getDb();
  const kvRows = db.getAllSync<{ key: string; value: string }>(
    'SELECT key, value FROM kv'
  );
  const kv: Record<string, string> = {};
  kvRows.forEach((r) => {
    kv[r.key] = r.value;
  });
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: '1.0.0',
    kv,
    logs: await getLogs(),
    photos: await getPhotos(),
    clips: await getClips(),
  };
}

/** Write a backup to the document directory. Returns the file uri. */
export async function createBackup(): Promise<{
  uri: string;
  filename: string;
}> {
  const backup = await buildBackup();
  const filename = `${BACKUP_PREFIX}${fmtDate(new Date())}.json`;
  const uri = `${backupDir()}${filename}`;
  await writeAsStringAsync(uri, JSON.stringify(backup));
  return { uri, filename };
}

/** List backup files in the document directory, newest first. */
export async function listBackups(): Promise<BackupFileInfo[]> {
  const dir = backupDir();
  let names: string[];
  try {
    names = await readDirectoryAsync(dir);
  } catch {
    return [];
  }
  const out: BackupFileInfo[] = [];
  for (const name of names) {
    if (!name.startsWith(BACKUP_PREFIX) || !name.endsWith(BACKUP_SUFFIX))
      continue;
    const uri = `${dir}${name}`;
    try {
      const info = await getInfoAsync(uri);
      if (info.exists) {
        out.push({
          uri,
          filename: name,
          size: info.size ?? 0,
          modified: info.modificationTime ?? 0,
        });
      }
    } catch {
      // Skip unreadable files.
    }
  }
  out.sort((a, b) => b.modified - a.modified);
  return out;
}

/** Read just the summary of a backup file without restoring it. */
export async function getBackupSummary(uri: string): Promise<BackupSummary> {
  const raw = await readAsStringAsync(uri);
  const data = JSON.parse(raw) as Partial<NativeBackup>;
  if (data.format !== BACKUP_FORMAT) {
    throw new Error('Not a FORGE mobile backup file.');
  }
  return {
    exportedAt: data.exportedAt ?? 'unknown',
    logCount: data.logs?.length ?? 0,
    photoCount: data.photos?.length ?? 0,
    clipCount: data.clips?.length ?? 0,
    kvCount: data.kv ? Object.keys(data.kv).length : 0,
  };
}

/** Replace all local data with the contents of a backup file. */
export async function restoreBackup(uri: string): Promise<BackupSummary> {
  const raw = await readAsStringAsync(uri);
  const data = JSON.parse(raw) as Partial<NativeBackup>;
  if (data.format !== BACKUP_FORMAT || !Array.isArray(data.logs)) {
    throw new Error('Not a valid FORGE mobile backup file.');
  }
  const db = getDb();
  db.execSync(
    'DELETE FROM kv; DELETE FROM logs; DELETE FROM photos; DELETE FROM clips;'
  );
  if (data.kv) {
    for (const [key, value] of Object.entries(data.kv)) {
      db.runSync('INSERT INTO kv (key, value) VALUES (?, ?)', [key, value]);
    }
  }
  for (const l of data.logs ?? []) {
    await insertLog({ date: l.date, ts: l.ts, data: l.data });
  }
  for (const p of data.photos ?? []) {
    await insertPhoto({ date: p.date, ts: p.ts, pose: p.pose, src: p.src });
  }
  for (const c of data.clips ?? []) {
    await insertClip({
      exId: c.exId,
      exName: c.exName,
      date: c.date,
      ts: c.ts,
      reps: c.reps,
      mime: c.mime,
      uri: c.uri,
    });
  }
  return {
    exportedAt: data.exportedAt ?? 'unknown',
    logCount: data.logs?.length ?? 0,
    photoCount: data.photos?.length ?? 0,
    clipCount: data.clips?.length ?? 0,
    kvCount: data.kv ? Object.keys(data.kv).length : 0,
  };
}

/** Delete a backup file. */
export async function deleteBackup(uri: string): Promise<void> {
  await deleteAsync(uri, { idempotent: true });
}

/** Share a file via the system share sheet. */
export async function shareFile(
  uri: string,
  mimeType: string,
  label: string
): Promise<void> {
  const ok = await Sharing.isAvailableAsync();
  if (!ok) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: label });
}

// ---------- web backup import ----------

/** Web app's forge-export.json shape (js/app.js exportData). */
interface WebExport {
  favs?: string[];
  log?: WebWorkout[];
  done?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  accent?: string;
  exportedAt?: string;
}

interface WebWorkout {
  date: string;
  ts: number;
  programName?: string;
  dayName?: string;
  week?: number | null;
  exercises?: { id: string; sets?: WebSet[] }[];
  notes?: string;
}

interface WebSet {
  reps?: number;
  weight?: number;
  added?: number;
  rpe?: number | null;
  failed?: boolean;
  type?: string;
}

export interface WebImportResult {
  logs: number;
  favs: number;
  settingsApplied: boolean;
}

/** Map a web workout entry to the native WorkoutLog shape. */
function mapWebWorkout(w: WebWorkout): WorkoutLog {
  const exercises = (w.exercises ?? []).map((x) => ({
    id: x.id,
    sets: (x.sets ?? []).map((s) => ({
      reps: s.reps ?? 0,
      weight: s.weight ?? 0,
      added: s.added ?? 0,
      rpe: s.rpe ?? null,
      failed: !!s.failed,
      type: (s.type ??
        'std') as WorkoutLog['exercises'][number]['sets'][number]['type'],
    })),
  }));
  const volume = exercises.reduce(
    (sum, x) =>
      sum + x.sets.reduce((a, s) => a + (s.weight || 0) * (s.reps || 0), 0),
    0
  );
  return {
    date: w.date,
    ts: w.ts,
    programId: null,
    programName: w.programName ?? '',
    dayName: w.dayName ?? '',
    week: w.week ?? null,
    exercises,
    notes: w.notes ?? '',
    durationMin: 0,
    volume,
  };
}

/**
 * Import the web app's forge-export.json. Merges web data into the native
 * store: favorites, workout logs (deduplicated by ts), program-day marks,
 * settings (web keys mapped onto native defaults), and accent.
 */
export async function importWebBackup(
  jsonText: string
): Promise<WebImportResult> {
  let data: WebExport;
  try {
    data = JSON.parse(jsonText) as WebExport;
  } catch {
    throw new Error('That is not valid JSON.');
  }
  if (
    !data ||
    typeof data !== 'object' ||
    (!data.log && !data.favs && !data.settings)
  ) {
    throw new Error('Not a FORGE web export file.');
  }
  const db = getDb();
  let logCount = 0;
  if (Array.isArray(data.log)) {
    const existing = new Set((await getLogs()).map((l) => l.ts));
    for (const w of data.log) {
      if (!w || typeof w.ts !== 'number' || existing.has(w.ts)) continue;
      const mapped = mapWebWorkout(w);
      await insertLog({ date: w.date, ts: w.ts, data: JSON.stringify(mapped) });
      existing.add(w.ts);
      logCount++;
    }
  }
  let favCount = 0;
  if (Array.isArray(data.favs)) {
    db.runSync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [
      'forge-favs',
      JSON.stringify(data.favs),
    ]);
    favCount = data.favs.length;
  }
  if (data.done && typeof data.done === 'object') {
    db.runSync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [
      'forge-done',
      JSON.stringify(data.done),
    ]);
  }
  let settingsApplied = false;
  if (data.settings && typeof data.settings === 'object') {
    const s = data.settings;
    const mapped: Record<string, unknown> = {};
    if (typeof s.units === 'string')
      mapped.units = s.units === 'lb' ? 'lb' : 'kg';
    if (typeof s.sound === 'boolean') mapped.sound = s.sound;
    if (typeof s.reduceMotion === 'boolean')
      mapped.reduceMotion = s.reduceMotion;
    if (Array.isArray(s.myEquipment)) mapped.myEquipment = s.myEquipment;
    if (typeof s.advanced === 'boolean') mapped.advanced = s.advanced;
    if (typeof s.haptics === 'boolean') mapped.haptics = s.haptics;
    if (typeof s.bigText === 'boolean') mapped.bigText = s.bigText;
    if (typeof s.highContrast === 'boolean')
      mapped.highContrast = s.highContrast;
    if (typeof s.bodyFinish === 'string') mapped.bodyFinish = s.bodyFinish;
    if (Object.keys(mapped).length > 0) {
      const current = db.getFirstSync<{ value: string }>(
        'SELECT value FROM kv WHERE key = ?',
        ['forge-settings']
      );
      let merged: Record<string, unknown> = {};
      if (current) {
        try {
          merged = JSON.parse(current.value) as Record<string, unknown>;
        } catch {
          merged = {};
        }
      }
      db.runSync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [
        'forge-settings',
        JSON.stringify({ ...merged, ...mapped }),
      ]);
      settingsApplied = true;
    }
  }
  if (typeof data.accent === 'string' && data.accent) {
    db.runSync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [
      'forge-accent',
      data.accent,
    ]);
  }
  return { logs: logCount, favs: favCount, settingsApplied };
}

// ---------- reset ----------

/** Clear all app data: kv, logs, photos, clips, and media files on disk. */
export async function resetAllData(): Promise<void> {
  const db = getDb();
  db.execSync(
    'DELETE FROM kv; DELETE FROM logs; DELETE FROM photos; DELETE FROM clips;'
  );
  if (documentDirectory) {
    try {
      const names = await readDirectoryAsync(documentDirectory);
      for (const name of names) {
        if (name.startsWith('forge-media') || name.startsWith(BACKUP_PREFIX)) {
          continue;
        }
        const uri = `${documentDirectory}${name}`;
        if (/\.(jpg|jpeg|png|mp4|mov)$/i.test(name)) {
          await deleteAsync(uri, { idempotent: true });
        }
      }
    } catch {
      // Best effort; DB rows are already cleared.
    }
  }
}

// ---------- storage meter ----------

async function dirSize(uri: string): Promise<number> {
  let total = 0;
  try {
    const names = await readDirectoryAsync(uri);
    for (const name of names) {
      try {
        const info = await getInfoAsync(`${uri}${name}`);
        if (info.exists && !info.isDirectory) total += info.size ?? 0;
      } catch {
        // Skip unreadable entries.
      }
    }
  } catch {
    // Directory missing or unreadable.
  }
  return total;
}

/** Sizes and counts for the storage meter in Settings. */
export async function getStorageInfo(): Promise<StorageInfo> {
  const db = getDb();
  let dbBytes = 0;
  if (documentDirectory) {
    try {
      const info = await getInfoAsync(`${documentDirectory}SQLite/forge.db`);
      if (info.exists) dbBytes = info.size ?? 0;
    } catch {
      // Fall through with 0.
    }
  }
  const mediaBytes = documentDirectory ? await dirSize(documentDirectory) : 0;
  const logs = db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM logs');
  const photos = db.getFirstSync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM photos'
  );
  const clips = db.getFirstSync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM clips'
  );
  return {
    dbBytes,
    mediaBytes,
    logCount: logs?.n ?? 0,
    photoCount: photos?.n ?? 0,
    clipCount: clips?.n ?? 0,
  };
}

/** Copy a backup file to the cache dir so it can be shared. */
export async function backupShareUri(uri: string): Promise<string> {
  if (!cacheDirectory) throw new Error('Cache directory unavailable.');
  const name = uri.split('/').pop() ?? 'forge-backup.json';
  const dest = `${cacheDirectory}${name}`;
  await copyAsync({ from: uri, to: dest });
  return dest;
}
