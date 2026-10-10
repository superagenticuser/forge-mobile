// Recovery math and daily health data, ported from the web app
// (js/views.js getRecoveryStats/recoveryScore/renderBodyRecovery,
// js/progress.js check-in/water/protein/supplement storage, js/core.js
// soreness storage). All weights are kilograms; dates are local
// YYYY-MM-DD keys like the web app.

import { kvGetJSON, kvSetJSON } from '@/src/storage/db';
import { fmtDateKey } from '@/src/lib/progress';
import { groupOf, MUSCLE_INFO } from '@/src/data/muscles';
import type { WorkoutLog } from '@/src/storage/workout';

const CHECKIN_KEY = 'forge-checkin';
const WATER_KEY = 'forge-water';
const PROTEIN_KEY = 'forge-protein';
const SUPP_KEY = 'forge-supp';
const SUPP_LOG_KEY = 'forge-supp-log';
const SORE_KEY = 'forge-sore';

/** Recovery score: web app's exact formula (js/views.js recoveryScore).
 * Base 100, -10 per day since the last workout (up to 3 days),
 * minus a volume factor from the last session. */
export function recoveryScore(logs: WorkoutLog[]): number {
  if (!logs.length) return 100;
  const last = logs[logs.length - 1];
  const daysSince = (Date.now() - last.ts) / 864e5;
  const lastVol = (last.exercises || []).reduce(
    (a, x) =>
      a +
      (x.sets || []).reduce((b, s) => b + (s.weight || 0) * (s.reps || 0), 0),
    0
  );
  const score =
    100 - Math.min(30, daysSince * 10) - Math.min(20, lastVol / 500);
  return Math.max(0, Math.round(score));
}

export function recoveryLabel(score: number): string {
  if (score >= 80) return 'Recovered';
  if (score >= 60) return 'Ready';
  if (score >= 40) return 'Fair';
  return 'Rest up';
}

export interface MuscleRecovery {
  g: string;
  name: string;
  daysAgo: number;
  freshness: number;
  status: 'Fresh' | 'Ready' | 'Recovering';
}

/** Per-muscle freshness, verbatim from the web app's getRecoveryStats. */
export function getRecoveryStats(
  logs: WorkoutLog[],
  getEx: (id: string) => { primary: string; secondary?: string[] } | undefined
): { stats: MuscleRecovery[]; best: MuscleRecovery } | null {
  if (!logs.length) return null;
  const groups = [
    'chest',
    'back',
    'shoulders',
    'biceps',
    'triceps',
    'quads',
    'hamstrings',
    'glutes',
    'abs',
    'calves',
  ];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const stats: MuscleRecovery[] = groups.map((g) => {
    let daysAgo = 99;
    let lastVol = 0;
    logs.forEach((w) => {
      let vol = 0;
      let hit = false;
      (w.exercises || []).forEach((x) => {
        const ex = getEx(x.id);
        if (!ex) return;
        const gs = [groupOf(ex.primary)].concat(
          (ex.secondary || []).map((m) => groupOf(m))
        );
        if (gs.includes(g)) {
          hit = true;
          vol += (x.sets || []).reduce(
            (a, s) => a + (s.weight || 0) * (s.reps || 0),
            0
          );
        }
      });
      if (hit) {
        const d = Math.round(
          (today.getTime() - new Date(w.date + 'T00:00:00').getTime()) / 864e5
        );
        if (d < daysAgo) {
          daysAgo = d;
          lastVol = vol;
        }
      }
    });
    const volumeFactor = Math.min(30, (lastVol / 1000) * 10);
    const freshness = Math.max(
      0,
      Math.min(100, Math.round(daysAgo * 25 - volumeFactor))
    );
    const status =
      freshness >= 75 ? 'Fresh' : freshness >= 40 ? 'Ready' : 'Recovering';
    return {
      g,
      name: MUSCLE_INFO[g] ? MUSCLE_INFO[g].name : g,
      daysAgo,
      freshness,
      status,
    };
  });
  const majors = [
    'chest',
    'back',
    'shoulders',
    'quads',
    'hamstrings',
    'glutes',
  ];
  const best = stats
    .filter((s) => majors.includes(s.g))
    .sort((a, b) => b.freshness - a.freshness)[0];
  return { stats, best };
}

export function daysAgoLabel(daysAgo: number): string {
  if (daysAgo >= 99) return 'Not trained yet';
  if (daysAgo <= 0) return 'Trained today';
  if (daysAgo === 1) return '1 day ago';
  return `${daysAgo} days ago`;
}

// ---------- Morning readiness check-in (forge-checkin) ----------

export interface CheckinData {
  /** Hours of sleep. */
  sleep?: number | null;
  /** Sleep quality 1-5. */
  sleepQuality?: number | null;
  /** Energy 1-5. */
  energy?: number | null;
  /** Overall soreness 1-5. */
  soreness?: number | null;
  /** Fatigue 1-5. */
  fatigue?: number | null;
  /** Motivation 1-5. */
  motivation?: number | null;
  /** HRV in ms (optional). */
  hrv?: number | null;
}

export async function getCheckin(dateKey: string): Promise<CheckinData | null> {
  const m = await loadCheckinMap();
  return m[dateKey] ?? null;
}

/** Full check-in map (dateKey -> data), for correlation analysis. */
export async function loadCheckinMap(): Promise<Record<string, CheckinData>> {
  return (await kvGetJSON<Record<string, CheckinData>>(CHECKIN_KEY)) ?? {};
}

export async function saveCheckin(
  dateKey: string,
  data: CheckinData
): Promise<void> {
  const m = (await kvGetJSON<Record<string, CheckinData>>(CHECKIN_KEY)) ?? {};
  m[dateKey] = data;
  await kvSetJSON(CHECKIN_KEY, m);
}

export interface CheckinHistoryEntry {
  date: string;
  checkin: CheckinData | null;
  water: number;
  protein: number;
}

export async function getCheckinHistory(
  days: number
): Promise<CheckinHistoryEntry[]> {
  const all = (await kvGetJSON<Record<string, CheckinData>>(CHECKIN_KEY)) ?? {};
  const water = (await kvGetJSON<Record<string, number>>(WATER_KEY)) ?? {};
  const protein = (await kvGetJSON<Record<string, number>>(PROTEIN_KEY)) ?? {};
  const out: CheckinHistoryEntry[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = fmtDateKey(d);
    out.push({
      date: key,
      checkin: all[key] ?? null,
      water: water[key] ?? 0,
      protein: protein[key] ?? 0,
    });
  }
  return out;
}

// ---------- Water (forge-water, ml per day) ----------

export const WATER_TARGET_ML = 2000;

export async function getWater(dateKey: string): Promise<number> {
  const m = (await kvGetJSON<Record<string, number>>(WATER_KEY)) ?? {};
  return m[dateKey] ?? 0;
}

export async function addWater(dateKey: string, ml: number): Promise<number> {
  const m = (await kvGetJSON<Record<string, number>>(WATER_KEY)) ?? {};
  const next = Math.max(0, (m[dateKey] ?? 0) + ml);
  m[dateKey] = next;
  await kvSetJSON(WATER_KEY, m);
  return next;
}

export async function setWater(dateKey: string, ml: number): Promise<void> {
  const m = (await kvGetJSON<Record<string, number>>(WATER_KEY)) ?? {};
  m[dateKey] = Math.max(0, ml);
  await kvSetJSON(WATER_KEY, m);
}

// ---------- Protein (forge-protein, grams per day) ----------

/** Daily protein target in grams, verbatim from the web app's proteinTarget. */
export function proteinTarget(
  bodyweightKg: number | null,
  goal: 'cut' | 'maintain' | 'bulk',
  units: 'kg' | 'lb'
): number {
  const bw = bodyweightKg && bodyweightKg > 0 ? bodyweightKg : 70;
  const mult = goal === 'bulk' ? 2.0 : goal === 'cut' ? 2.4 : 1.8;
  const kg = units === 'lb' ? bw * 0.453592 : bw;
  return Math.round(kg * mult);
}

export async function getProtein(dateKey: string): Promise<number> {
  const m = (await kvGetJSON<Record<string, number>>(PROTEIN_KEY)) ?? {};
  return m[dateKey] ?? 0;
}

export async function setProtein(dateKey: string, g: number): Promise<void> {
  const m = (await kvGetJSON<Record<string, number>>(PROTEIN_KEY)) ?? {};
  m[dateKey] = Math.max(0, g);
  await kvSetJSON(PROTEIN_KEY, m);
}

// ---------- Supplements (forge-supp list, forge-supp-log per day) ----------

export interface Supplement {
  id: string;
  name: string;
}

export async function getSupplements(): Promise<Supplement[]> {
  return (await kvGetJSON<Supplement[]>(SUPP_KEY)) ?? [];
}

export async function saveSupplements(list: Supplement[]): Promise<void> {
  await kvSetJSON(SUPP_KEY, list);
}

export async function getSuppLog(dateKey: string): Promise<string[]> {
  const m = (await kvGetJSON<Record<string, string[]>>(SUPP_LOG_KEY)) ?? {};
  return m[dateKey] ?? [];
}

export async function saveSuppLog(
  dateKey: string,
  ids: string[]
): Promise<void> {
  const m = (await kvGetJSON<Record<string, string[]>>(SUPP_LOG_KEY)) ?? {};
  m[dateKey] = ids;
  await kvSetJSON(SUPP_LOG_KEY, m);
}

// ---------- Soreness (forge-sore: dateKey -> groupId -> level) ----------

export type SorenessLevel = 'mild' | 'sore' | 'very-sore' | 'injured';

export const SORE_LEVELS: SorenessLevel[] = [
  'mild',
  'sore',
  'very-sore',
  'injured',
];

export const SORE_LABELS: Record<SorenessLevel, string> = {
  mild: 'Mild',
  sore: 'Sore',
  'very-sore': 'Very sore',
  injured: 'Injured',
};

export type SorenessMap = Record<string, Record<string, SorenessLevel>>;

/** Tap-to-cycle: none > mild > sore > very-sore > injured > none.
 * Returns the new level, or undefined when cleared. */
export function cycleSorenessLevel(
  current: SorenessLevel | undefined
): SorenessLevel | undefined {
  if (!current) return 'mild';
  const i = SORE_LEVELS.indexOf(current);
  if (i === SORE_LEVELS.length - 1) return undefined;
  return SORE_LEVELS[i + 1];
}

export async function getSoreness(): Promise<SorenessMap> {
  return (await kvGetJSON<SorenessMap>(SORE_KEY)) ?? {};
}

export async function saveSoreness(m: SorenessMap): Promise<void> {
  await kvSetJSON(SORE_KEY, m);
}

/** Cycle one muscle group's soreness for a day and persist. Returns the
 * day's updated group map. */
export async function cycleSoreness(
  dateKey: string,
  groupId: string
): Promise<Record<string, SorenessLevel>> {
  const m = await getSoreness();
  const day = { ...(m[dateKey] ?? {}) };
  const next = cycleSorenessLevel(day[groupId]);
  if (next) day[groupId] = next;
  else delete day[groupId];
  m[dateKey] = day;
  await saveSoreness(m);
  return day;
}
