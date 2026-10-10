// Progress math ported from the web app (js/progress.js, js/core.js,
// js/views.js). All weights are kilograms; logs store kg (converted at
// save time in v0.6). Dates are local YYYY-MM-DD keys like the web app.

import { useCallback, useEffect, useState } from 'react';

import { kvGetJSON, kvSetJSON } from '@/src/storage/db';
import {
  loadWorkoutLogs,
  type LoggedSet,
  type WorkoutLog,
} from '@/src/storage/workout';
import { bestEpley1RM } from '@/src/lib/training';

/** Local date key: YYYY-MM-DD (web app's fmtDate). */
export function fmtDateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Map delt sub-ids to their group, like the web app's groupOf. */
const DELT_TO_GROUP: Record<string, string> = {
  'front-delt': 'shoulders',
  'side-delt': 'shoulders',
  'rear-delt': 'shoulders',
};

export function groupOfMuscle(mid: string): string {
  return DELT_TO_GROUP[mid] || mid;
}

/** Volume of one set in kg: weight x reps. */
export function setVolumeKg(s: LoggedSet): number {
  return (s.weight || 0) * (s.reps || 0);
}

/** Volume of one workout in kg. */
export function sessionVolumeKg(w: WorkoutLog): number {
  return (w.exercises || []).reduce(
    (a, x) => a + (x.sets || []).reduce((b, s) => b + setVolumeKg(s), 0),
    0
  );
}

/** Total volume across logs, in kg (web app's totalVolumeKg). */
export function totalVolumeKg(logs: WorkoutLog[]): number {
  return logs.reduce((a, w) => a + sessionVolumeKg(w), 0);
}

/** Total working sets across logs. */
export function totalSets(logs: WorkoutLog[]): number {
  return logs.reduce(
    (a, w) =>
      a + (w.exercises || []).reduce((b, x) => b + (x.sets || []).length, 0),
    0
  );
}

/** Consecutive-day training streak ending today or yesterday.
 * The web app folds XP streak-freezes in; XP is not ported yet (v0.11),
 * so this is the plain day streak. */
export function workoutStreak(logs: WorkoutLog[]): number {
  const days = [...new Set(logs.map((w) => w.date))].sort();
  if (!days.length) return 0;
  const has = (k: string) => days.includes(k);
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  if (!has(fmtDateKey(d))) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (has(fmtDateKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/** Volume lifted in the last 7 days, in kg. */
export function thisWeekVolumeKg(logs: WorkoutLog[]): number {
  const cutoff = Date.now() - 7 * 864e5;
  return logs
    .filter((w) => (w.ts || 0) >= cutoff)
    .reduce((a, w) => a + sessionVolumeKg(w), 0);
}

/** Deload suggestion: last week's volume dropped while frequency stayed
 * high (web app's checkDeload, verbatim logic). */
export function checkDeload(logs: WorkoutLog[]): boolean {
  if (logs.length < 6) return false;
  const now = Date.now();
  const week1 = logs.filter((w) => now - (w.ts || 0) < 7 * 864e5);
  const week2 = logs.filter(
    (w) => now - (w.ts || 0) >= 7 * 864e5 && now - (w.ts || 0) < 14 * 864e5
  );
  if (week1.length < 2 || week2.length < 2) return false;
  const vol = (ws: WorkoutLog[]) =>
    ws.reduce(
      (a, w) =>
        a +
        (w.exercises || []).reduce(
          (b, x) =>
            b + (x.sets || []).reduce((c, s) => c + s.weight * s.reps, 0),
          0
        ),
      0
    );
  return vol(week1) < vol(week2) * 0.85;
}

export interface Plateau {
  id: string;
  name: string;
  sessions: number;
}

/** Exercises whose best set weight has not improved over the last 3-4
 * sessions (web app's detectPlateaus, verbatim logic). */
export function detectPlateaus(
  logs: WorkoutLog[],
  nameOf: (id: string) => string | null
): Plateau[] {
  const byEx: Record<string, Array<{ ts: number; best: number }>> = {};
  logs.forEach((w) =>
    (w.exercises || []).forEach((x) => {
      if (!byEx[x.id]) byEx[x.id] = [];
      const best = Math.max(0, ...(x.sets || []).map((s) => s.weight || 0));
      byEx[x.id].push({ ts: w.ts || 0, best });
    })
  );
  const plateaus: Plateau[] = [];
  for (const id of Object.keys(byEx)) {
    const hist = byEx[id].slice(-4);
    if (hist.length >= 3) {
      const first = hist[0].best;
      const last = hist[hist.length - 1].best;
      if (last <= first && first > 0) {
        const name = nameOf(id);
        if (name) plateaus.push({ id, name, sessions: hist.length });
      }
    }
  }
  return plateaus.slice(0, 5);
}

export interface ExercisePR {
  weight: number;
  reps: number;
}

/** Heaviest set ever per exercise (web app's exercisePR, verbatim logic). */
export function exercisePR(
  exId: string,
  logs: WorkoutLog[]
): ExercisePR | null {
  let best: ExercisePR | null = null;
  logs.forEach((w) =>
    (w.exercises || []).forEach((x) => {
      if (x.id !== exId) return;
      (x.sets || []).forEach((s) => {
        const wgt = s.weight || 0;
        if (
          !best ||
          wgt > best.weight ||
          (wgt === best.weight && s.reps > best.reps)
        )
          best = { weight: wgt, reps: s.reps };
      });
    })
  );
  return best;
}

export interface PREvent {
  date: string;
  id: string;
  name: string;
  weight: number;
  reps: number;
}

/** Chronological scan: every time a weight PR was beaten (web records tab). */
export function prTimelineEvents(
  logs: WorkoutLog[],
  nameOf: (id: string) => string | null
): PREvent[] {
  const events: PREvent[] = [];
  const bestSoFar: Record<string, number> = {};
  const sorted = logs
    .slice()
    .sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ts || 0) - (b.ts || 0)
    );
  sorted.forEach((w) => {
    (w.exercises || []).forEach((x) => {
      (x.sets || []).forEach((s) => {
        const wgt = s.weight || 0;
        if (wgt <= 0) return;
        const cur = bestSoFar[x.id] || 0;
        if (wgt > cur) {
          bestSoFar[x.id] = wgt;
          const name = nameOf(x.id);
          events.push({
            date: w.date,
            id: x.id,
            name: name || x.id,
            weight: wgt,
            reps: s.reps || 0,
          });
        }
      });
    });
  });
  events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return events;
}

/** Sets per muscle group over the last N days (web app's volumeByMuscle). */
export function volumeByMuscle(
  logs: WorkoutLog[],
  days: number,
  primaryOf: (id: string) => string | null
): Array<{ group: string; sets: number }> {
  const cutoff = new Date();
  cutoff.setHours(12, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days);
  const vol: Record<string, number> = {};
  logs.forEach((w) => {
    if (new Date(w.date + 'T12:00:00') < cutoff) return;
    (w.exercises || []).forEach((x) => {
      const primary = primaryOf(x.id);
      if (!primary) return;
      const g = groupOfMuscle(primary);
      vol[g] = (vol[g] || 0) + (x.sets || []).length;
    });
  });
  return Object.keys(vol)
    .map((g) => ({ group: g, sets: vol[g] }))
    .sort((a, b) => b.sets - a.sets);
}

export interface VolumeRecords {
  daily: Record<string, { vol: number; date: string }>;
  weekly: Record<string, { vol: number; date: string }>;
}

/** Best single-day and single-week volume per muscle group
 * (web records tab, verbatim logic). */
export function volumeRecords(
  logs: WorkoutLog[],
  musclesOf: (id: string) => string[]
): VolumeRecords {
  const daily: VolumeRecords['daily'] = {};
  const weekly: VolumeRecords['weekly'] = {};
  logs.forEach((w) => {
    const dayVol: Record<string, number> = {};
    (w.exercises || []).forEach((x) => {
      const v = (x.sets || []).reduce(
        (a, s) => a + (s.weight || 0) * (s.reps || 0),
        0
      );
      musclesOf(x.id).forEach((g) => {
        dayVol[g] = (dayVol[g] || 0) + v;
      });
    });
    Object.keys(dayVol).forEach((g) => {
      if (!daily[g] || dayVol[g] > daily[g].vol)
        daily[g] = { vol: dayVol[g], date: w.date };
    });
  });
  const weekVol: Record<string, number> = {};
  logs.forEach((w) => {
    const d = new Date(w.date + 'T00:00:00');
    const mon = new Date(d);
    mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const wk = fmtDateKey(mon);
    (w.exercises || []).forEach((x) => {
      const v = (x.sets || []).reduce(
        (a, s) => a + (s.weight || 0) * (s.reps || 0),
        0
      );
      musclesOf(x.id).forEach((g) => {
        const k = wk + '|' + g;
        weekVol[k] = (weekVol[k] || 0) + v;
      });
    });
  });
  Object.keys(weekVol).forEach((k) => {
    const [wk, g] = k.split('|');
    if (!weekly[g] || weekVol[k] > weekly[g].vol)
      weekly[g] = { vol: weekVol[k], date: wk };
  });
  return { daily, weekly };
}

/** Date key -> workout count, for heatmap and calendar. */
export function workoutCountsByDate(
  logs: WorkoutLog[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  logs.forEach((w) => {
    counts[w.date] = (counts[w.date] || 0) + 1;
  });
  return counts;
}

export interface OneRmPoint {
  date: string;
  label: string;
  value: number;
}

/** Best Epley 1RM per session for one exercise, chronological. */
export function oneRmProgression(
  exId: string,
  logs: WorkoutLog[]
): OneRmPoint[] {
  const pts: OneRmPoint[] = [];
  const sorted = logs.slice().sort((a, b) => (a.ts || 0) - (b.ts || 0));
  sorted.forEach((w) => {
    const x = (w.exercises || []).find((e) => e.id === exId);
    if (!x || !(x.sets || []).length) return;
    const best = bestEpley1RM(
      (x.sets || []).map((s) => ({ weight: s.weight || 0, reps: s.reps || 0 }))
    );
    if (best > 0) {
      pts.push({
        date: w.date,
        label: shortDateLabel(w.date),
        value: best,
      });
    }
  });
  return pts;
}

/** "Oct 9" style label from a YYYY-MM-DD key. */
export function shortDateLabel(key: string): string {
  try {
    return new Date(key + 'T12:00:00').toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return key;
  }
}

/** Long label: "Thu, Oct 9". */
export function longDateLabel(key: string): string {
  try {
    return new Date(key + 'T12:00:00').toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return key;
  }
}

// ---------- body measurements (web app's forge-measures) ----------

export interface Measure {
  date: string;
  ts: number;
  /** Display units, converted with the current units setting at render time
   * (same as the web app). */
  weight?: number;
  waist?: number;
  chest?: number;
  arms?: number;
}

const MEASURES_KEY = 'forge-measures';

export async function loadMeasures(): Promise<Measure[]> {
  const all = (await kvGetJSON<Measure[]>(MEASURES_KEY)) || [];
  return all
    .filter((m) => m && m.date)
    .sort((a, b) => (a.ts || 0) - (b.ts || 0));
}

export async function addMeasure(m: Measure): Promise<Measure[]> {
  const all = await loadMeasures();
  all.push(m);
  await kvSetJSON(MEASURES_KEY, all);
  return all.sort((a, b) => (a.ts || 0) - (b.ts || 0));
}

// ---------- hook ----------

/** Loads all workout logs; refresh to re-read after a workout is saved. */
export function useWorkoutLogs(): {
  ready: boolean;
  logs: WorkoutLog[];
  refresh: () => Promise<void>;
} {
  const [ready, setReady] = useState(false);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const refresh = useCallback(async () => {
    const all = await loadWorkoutLogs();
    setLogs(all);
    setReady(true);
  }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await loadWorkoutLogs();
      if (!cancelled) {
        setLogs(all);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return { ready, logs, refresh };
}

// ---------- v0.9: DOTS ----------

/** DOTS score from a powerlifting total and bodyweight, both kg.
 * Web app's dotsFromTotal (js/progress.js), verbatim polynomial. */
export function dotsFromTotal(totalKg: number, bwKg: number): number | null {
  if (!totalKg || !bwKg) return null;
  const x = Math.min(Math.max(bwKg, 40), 200);
  const coef =
    0.000001093 * Math.pow(x, 4) -
    0.0007391293 * Math.pow(x, 3) +
    0.19147565 * Math.pow(x, 2) -
    22.41233541 * x +
    1143.86505292;
  return Math.round(((totalKg * 500) / coef) * 10) / 10;
}

/** DOTS from best squat/bench/deadlift Epley 1RMs and bodyweight (kg).
 * bestEpleyForName matches the web app's name-substring lift lookup. */
export function dotsScore(
  logs: WorkoutLog[],
  bwKg: number,
  bestEpleyForName: (part: string) => number
): number | null {
  if (!bwKg || !logs.length) return null;
  const total = ['squat', 'bench', 'deadlift'].reduce(
    (a, n) => a + (bestEpleyForName(n) || 0),
    0
  );
  if (total <= 0) return null;
  return dotsFromTotal(total, bwKg);
}

// ---------- v0.9: strength standards ----------

export interface StdLift {
  id: string;
  name: string;
  ratios: number[];
}

export const STD_LIFTS: StdLift[] = [
  {
    id: 'barbell-back-squat',
    name: 'Squat',
    ratios: [0.75, 1.0, 1.5, 2.0, 2.5],
  },
  {
    id: 'barbell-bench-press',
    name: 'Bench',
    ratios: [0.5, 0.75, 1.0, 1.5, 1.75],
  },
  {
    id: 'barbell-deadlift',
    name: 'Deadlift',
    ratios: [1.0, 1.25, 1.75, 2.25, 2.75],
  },
  {
    id: 'barbell-overhead-press',
    name: 'Overhead press',
    ratios: [0.35, 0.5, 0.75, 1.0, 1.25],
  },
];

export const STD_LEVELS = [
  'Beginner',
  'Novice',
  'Intermediate',
  'Advanced',
  'Elite',
];

/** Level index 0-5 from a bodyweight ratio (web app's renderStandards loop). */
export function standardLevel(ratio: number, ratios: number[]): number {
  let level = 0;
  ratios.forEach((r, i) => {
    if (ratio >= r) level = i + 1;
  });
  return level;
}

// ---------- v0.9: muscle balance ----------

export interface MuscleBalance {
  push: number;
  pull: number;
  ratio: number;
  quad: number;
  ham: number;
  legRatio: number;
}

/** Push/pull and quad/ham set ratios over the last 28 days
 * (web app's muscleBalance, verbatim logic). */
export function muscleBalance(
  logs: WorkoutLog[],
  primaryOf: (id: string) => string | null
): MuscleBalance {
  const map: Record<string, number> = {};
  volumeByMuscle(logs, 28, primaryOf).forEach((v) => {
    map[v.group] = v.sets;
  });
  const push = (map.chest || 0) + (map.shoulders || 0) + (map.triceps || 0);
  const pull = (map.back || 0) + (map.lats || 0) + (map.biceps || 0);
  const quad = map.quads || 0;
  const ham = map.hamstrings || 0;
  return {
    push,
    pull,
    ratio: pull > 0 ? push / pull : 0,
    quad,
    ham,
    legRatio: ham > 0 ? quad / ham : 0,
  };
}

// ---------- v0.9: movement patterns ----------

export const PATTERNS = [
  'push',
  'pull',
  'squat',
  'hinge',
  'lunge',
  'carry',
] as const;

export type Pattern = (typeof PATTERNS)[number];

export const PATTERN_NAMES: Record<Pattern, string> = {
  push: 'Push',
  pull: 'Pull',
  squat: 'Squat',
  hinge: 'Hinge',
  lunge: 'Lunge',
  carry: 'Carry',
};

const MUSCLE_TO_PATTERN: Record<string, Pattern> = {
  chest: 'push',
  shoulders: 'push',
  triceps: 'push',
  back: 'pull',
  lats: 'pull',
  biceps: 'pull',
  quads: 'squat',
  hamstrings: 'hinge',
  glutes: 'hinge',
  'lower-back': 'hinge',
  traps: 'carry',
  forearms: 'carry',
  abs: 'carry',
  obliques: 'carry',
  'full-body': 'carry',
  cardio: 'carry',
};

const LUNGE_WORDS = [
  'lunge',
  'bulgarian',
  'split squat',
  'step-up',
  'stepup',
  'step up',
];

/** Pattern of one exercise (web app's patternOfExercise, verbatim logic). */
export function patternOfExercise(name: string, primary: string): Pattern {
  const nm = (name || '').toLowerCase();
  if (LUNGE_WORDS.some((w) => nm.includes(w))) return 'lunge';
  return MUSCLE_TO_PATTERN[groupOfMuscle(primary)] || 'carry';
}

/** Sets per movement pattern over the last N days
 * (web app's patternVolume, verbatim logic). */
export function patternVolume(
  logs: WorkoutLog[],
  days: number,
  getExercise: (id: string) => { name: string; primary: string } | undefined
): Record<Pattern, number> {
  const cutoff = new Date();
  cutoff.setHours(12, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days);
  const vol: Record<Pattern, number> = {
    push: 0,
    pull: 0,
    squat: 0,
    hinge: 0,
    lunge: 0,
    carry: 0,
  };
  logs.forEach((w) => {
    if (new Date(w.date + 'T12:00:00') < cutoff) return;
    (w.exercises || []).forEach((x) => {
      const ex = getExercise(x.id);
      if (!ex) return;
      vol[patternOfExercise(ex.name, ex.primary)] += (x.sets || []).length;
    });
  });
  return vol;
}

// ---------- v0.9: RPE trend ----------

export interface RpeWeek {
  label: string;
  avg: number | null;
}

/** Average RPE per week, last 12 weeks (web app's rpeTrendSection data). */
export function rpeTrendWeeks(logs: WorkoutLog[]): RpeWeek[] {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weeks: RpeWeek[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(monday);
    start.setDate(monday.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const sKey = fmtDateKey(start);
    const eKey = fmtDateKey(end);
    let sum = 0;
    let n = 0;
    logs.forEach((w) => {
      if (w.date >= sKey && w.date < eKey)
        (w.exercises || []).forEach((x) =>
          (x.sets || []).forEach((s) => {
            if (s.rpe != null) {
              sum += s.rpe;
              n++;
            }
          })
        );
    });
    weeks.push({ label: shortDateLabel(sKey), avg: n ? sum / n : null });
  }
  return weeks;
}

// ---------- v0.9: correlations ----------

/** Data-driven correlations (web app's correlationInsights). Sleep
 * check-ins arrive in v0.11, so this is empty until then. */
export function correlationInsights(_logs: WorkoutLog[]): string[] {
  return [];
}

// ---------- v0.9: year in review ----------

export interface YearLift {
  id: string;
  value: number;
}

export interface YearStats {
  year: number;
  workouts: number;
  volume: number;
  sets: number;
  days: number;
  bestStreak: number;
  groups: number;
  topLifts: YearLift[];
}

/** Annual summary (web app's renderYearTab, verbatim logic). */
export function yearStats(
  logs: WorkoutLog[],
  primaryOf: (id: string) => string | null
): YearStats | null {
  const yr = new Date().getFullYear();
  const ylog = logs.filter((w) => (w.date || '').indexOf(String(yr)) === 0);
  if (!ylog.length) return null;
  const days = [...new Set(ylog.map((w) => w.date))].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1] + 'T12:00:00');
    const cur = new Date(days[i] + 'T12:00:00');
    if ((cur.getTime() - prev.getTime()) / 86400000 === 1) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  const liftBest: Record<string, number> = {};
  ylog.forEach((w) =>
    (w.exercises || []).forEach((x) => {
      const e = bestEpley1RM(
        (x.sets || []).map((s) => ({
          weight: s.weight || 0,
          reps: s.reps || 0,
        }))
      );
      if (e > (liftBest[x.id] || 0)) liftBest[x.id] = e;
    })
  );
  const topLifts = Object.keys(liftBest)
    .map((id) => ({ id, value: liftBest[id] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
  const groups = new Set<string>();
  ylog.forEach((w) =>
    (w.exercises || []).forEach((x) => {
      const p = primaryOf(x.id);
      if (p) groups.add(groupOfMuscle(p));
    })
  );
  return {
    year: yr,
    workouts: ylog.length,
    volume: totalVolumeKg(ylog),
    sets: totalSets(ylog),
    days: days.length,
    bestStreak: best,
    groups: groups.size,
    topLifts,
  };
}

// ---------- v0.9: challenges ----------

export type ChallengeMetric = 'volume7' | 'freq7' | 'streak';

export interface Challenge {
  id: string;
  name: string;
  desc: (units: 'kg' | 'lb') => string;
  target: number;
  metric: ChallengeMetric;
}

/** Personal challenges (web app's CHALLENGES). Progress bars use the fixed
 * v11.71 logic: pct = min(100, round(cur / target * 100)). */
export const CHALLENGES: Challenge[] = [
  {
    id: 'vol-week',
    name: 'Volume week',
    desc: (u) => `Hit ${(20000).toLocaleString()} ${u} total volume in 7 days`,
    target: 20000,
    metric: 'volume7',
  },
  {
    id: 'freq-week',
    name: '5x week',
    desc: () => 'Train 5 times in 7 days',
    target: 5,
    metric: 'freq7',
  },
  {
    id: 'streak-14',
    name: '2-week streak',
    desc: () => '14-day streak',
    target: 14,
    metric: 'streak',
  },
];

export function challengeProgress(
  logs: WorkoutLog[]
): Record<ChallengeMetric, number> {
  const now = Date.now();
  const week = logs.filter((w) => now - (w.ts || 0) < 7 * 864e5);
  const volume7 = week.reduce((a, w) => a + sessionVolumeKg(w), 0);
  return { volume7, freq7: week.length, streak: workoutStreak(logs) };
}
