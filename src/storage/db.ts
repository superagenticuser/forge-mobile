// Local persistence for FORGE, backed by expo-sqlite (single engine, no
// AsyncStorage). Schema mirrors the web app's storage audit (AUDIT.md 3b):
// small values live in `kv`, large/unbounded data in typed tables. Video
// clips are stored as files on disk with only the uri in sqlite (better than
// the web app, which kept Blobs in IndexedDB).
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT
);
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY,
  date TEXT,
  ts INTEGER,
  data TEXT
);
CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY,
  date TEXT,
  ts INTEGER,
  pose TEXT,
  src TEXT
);
CREATE TABLE IF NOT EXISTS clips (
  id INTEGER PRIMARY KEY,
  exId TEXT,
  exName TEXT,
  date TEXT,
  ts INTEGER,
  reps INTEGER,
  mime TEXT,
  uri TEXT
);
CREATE INDEX IF NOT EXISTS idx_logs_ts ON logs (ts);
CREATE INDEX IF NOT EXISTS idx_clips_exId ON clips (exId);
`;

let db: SQLiteDatabase | null = null;

/** Singleton database handle. Schema creation is idempotent. */
export function getDb(): SQLiteDatabase {
  if (!db) {
    db = openDatabaseSync('forge.db');
    db.execSync(SCHEMA);
  }
  return db;
}

// ---------- key/value ----------

export async function kvGet(key: string): Promise<string | null> {
  const row = getDb().getFirstSync<{ value: string }>(
    'SELECT value FROM kv WHERE key = ?',
    [key]
  );
  return row ? row.value : null;
}

export async function kvSet(key: string, value: string): Promise<void> {
  getDb().runSync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [
    key,
    value,
  ]);
}

export async function kvGetJSON<T>(key: string): Promise<T | null> {
  const raw = await kvGet(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function kvSetJSON(key: string, value: unknown): Promise<void> {
  await kvSet(key, JSON.stringify(value));
}

export async function kvDelete(key: string): Promise<void> {
  getDb().runSync('DELETE FROM kv WHERE key = ?', [key]);
}

// ---------- workout logs ----------

export interface LogEntry {
  id: number;
  /** YYYY-MM-DD local date key. */
  date: string;
  /** Unix millis. */
  ts: number;
  /** JSON-encoded workout session. */
  data: string;
}

export async function insertLog(entry: Omit<LogEntry, 'id'>): Promise<number> {
  const res = getDb().runSync(
    'INSERT INTO logs (date, ts, data) VALUES (?, ?, ?)',
    [entry.date, entry.ts, entry.data]
  );
  return Number(res.lastInsertRowId);
}

export async function getLogs(limit?: number): Promise<LogEntry[]> {
  const sql =
    limit == null
      ? 'SELECT id, date, ts, data FROM logs ORDER BY ts DESC'
      : 'SELECT id, date, ts, data FROM logs ORDER BY ts DESC LIMIT ?';
  const args = limit == null ? [] : [limit];
  return getDb().getAllSync<LogEntry>(sql, args);
}

export async function deleteLog(id: number): Promise<void> {
  getDb().runSync('DELETE FROM logs WHERE id = ?', [id]);
}

export async function clearLogs(): Promise<void> {
  getDb().runSync('DELETE FROM logs');
}

// ---------- progress photos ----------

export interface PhotoEntry {
  id: number;
  /** YYYY-MM-DD local date key. */
  date: string;
  /** Unix millis. */
  ts: number;
  /** Pose tab: front | side | back. */
  pose: string;
  /** JPEG data URI (web parity) or file uri. */
  src: string;
}

export async function insertPhoto(
  entry: Omit<PhotoEntry, 'id'>
): Promise<number> {
  const res = getDb().runSync(
    'INSERT INTO photos (date, ts, pose, src) VALUES (?, ?, ?, ?)',
    [entry.date, entry.ts, entry.pose, entry.src]
  );
  return Number(res.lastInsertRowId);
}

export async function getPhotos(): Promise<PhotoEntry[]> {
  return getDb().getAllSync<PhotoEntry>(
    'SELECT id, date, ts, pose, src FROM photos ORDER BY ts DESC'
  );
}

export async function deletePhoto(id: number): Promise<void> {
  getDb().runSync('DELETE FROM photos WHERE id = ?', [id]);
}

export async function clearPhotos(): Promise<void> {
  getDb().runSync('DELETE FROM photos');
}

// ---------- form-recorder clips ----------

export interface ClipEntry {
  id: number;
  exId: string;
  exName: string;
  /** YYYY-MM-DD local date key. */
  date: string;
  /** Unix millis. */
  ts: number;
  reps: number;
  mime: string;
  /** Video file uri under the app document directory. */
  uri: string;
}

export async function insertClip(
  entry: Omit<ClipEntry, 'id'>
): Promise<number> {
  const res = getDb().runSync(
    'INSERT INTO clips (exId, exName, date, ts, reps, mime, uri) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      entry.exId,
      entry.exName,
      entry.date,
      entry.ts,
      entry.reps,
      entry.mime,
      entry.uri,
    ]
  );
  return Number(res.lastInsertRowId);
}

export async function getClips(): Promise<ClipEntry[]> {
  return getDb().getAllSync<ClipEntry>(
    'SELECT id, exId, exName, date, ts, reps, mime, uri FROM clips ORDER BY ts DESC'
  );
}

export async function getClipsByExercise(exId: string): Promise<ClipEntry[]> {
  return getDb().getAllSync<ClipEntry>(
    'SELECT id, exId, exName, date, ts, reps, mime, uri FROM clips WHERE exId = ? ORDER BY ts DESC',
    [exId]
  );
}

export async function deleteClip(id: number): Promise<void> {
  getDb().runSync('DELETE FROM clips WHERE id = ?', [id]);
}

export async function clearClips(): Promise<void> {
  getDb().runSync('DELETE FROM clips');
}
