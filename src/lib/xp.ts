// Gamification: XP, levels, streak freezes, monthly board. Ported from the
// web app (js/progress.js getXP/saveXP/addXP/xpLevel, js/workout.js XP
// awards, js/core.js workoutStreak freeze logic, js/progress.js
// renderBoardTab). Dates are local YYYY-MM-DD keys like the web app.

import { kvGetJSON, kvSetJSON } from '@/src/storage/db';
import { fmtDateKey, sessionVolumeKg } from '@/src/lib/progress';
import type { WorkoutLog } from '@/src/storage/workout';
import { useCallback, useEffect, useState } from 'react';

const XP_KEY = 'forge-xp';
const XP_LOG_KEY = 'forge-xp-log';

export interface XPData {
  xp: number;
  /** Streak freezes available this month. */
  freeze: number;
  /** YYYY-MM the freeze count was last reset. */
  freezeMonth?: string;
  /** Date keys already covered by a freeze. */
  frozen?: string[];
}

export interface XPLogEntry {
  date: string;
  xp: number;
}

const DEFAULT_XP: XPData = { xp: 0, freeze: 1 };

export async function getXP(): Promise<XPData> {
  const d = await kvGetJSON<XPData>(XP_KEY);
  if (!d || typeof d.xp !== 'number') return { ...DEFAULT_XP };
  return {
    xp: d.xp,
    freeze: typeof d.freeze === 'number' ? d.freeze : 0,
    freezeMonth: d.freezeMonth,
    frozen: Array.isArray(d.frozen) ? d.frozen : [],
  };
}

export async function saveXP(d: XPData): Promise<void> {
  await kvSetJSON(XP_KEY, d);
}

/** Add XP and persist. Returns the updated totals. */
export async function addXP(amount: number): Promise<XPData> {
  const d = await getXP();
  d.xp += amount;
  await saveXP(d);
  return d;
}

/** Web app's exact level curve: level = floor(sqrt(xp/100)) + 1. */
export function xpLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

/** XP thresholds for the level progress bar (web app's woXpFill math). */
export function xpLevelBounds(xp: number): {
  level: number;
  cur: number;
  next: number;
  pct: number;
} {
  const level = xpLevel(xp);
  const cur = 100 * Math.pow(level - 1, 2);
  const next = 100 * Math.pow(level, 2);
  const pct = Math.max(0, Math.min(100, ((xp - cur) / (next - cur)) * 100));
  return { level, cur, next, pct };
}

export async function getXPLog(): Promise<XPLogEntry[]> {
  return (await kvGetJSON<XPLogEntry[]>(XP_LOG_KEY)) ?? [];
}

export async function logXP(date: string, xp: number): Promise<void> {
  const log = await getXPLog();
  log.push({ date, xp });
  await kvSetJSON(XP_LOG_KEY, log);
}

/** Web app's workoutStreak, verbatim logic: walks back from today,
 * consuming a monthly streak freeze for missed days while the streak is
 * alive. Pure: takes XP data in, returns the updated data and whether it
 * changed (caller persists). */
export function streakWithFreezes(
  logs: WorkoutLog[],
  xp: XPData
): { streak: number; xp: XPData; changed: boolean } {
  const days = [...new Set(logs.map((w) => w.date))].sort();
  const next: XPData = {
    xp: xp.xp,
    freeze: xp.freeze,
    freezeMonth: xp.freezeMonth,
    frozen: [...(xp.frozen ?? [])],
  };
  if (!days.length) return { streak: 0, xp: next, changed: false };
  const month = fmtDateKey(new Date()).slice(0, 7);
  let changed = false;
  if (next.freezeMonth !== month) {
    next.freeze = 1;
    next.freezeMonth = month;
    next.frozen = [];
    changed = true;
  }
  let streak = 0;
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  if (!days.includes(fmtDateKey(d))) d.setDate(d.getDate() - 1);
  for (;;) {
    const key = fmtDateKey(d);
    if (days.includes(key) || (next.frozen ?? []).includes(key)) {
      streak++;
    } else if ((next.freeze || 0) > 0 && streak > 0) {
      next.freeze -= 1;
      (next.frozen ?? []).push(key);
      streak++;
      changed = true;
    } else {
      break;
    }
    d.setDate(d.getDate() - 1);
  }
  return { streak, xp: next, changed };
}

/** XP award for a finished workout, from js/workout.js:
 * 2 per set, 50 per PR, 25 streak bonus at 7+ days. */
export function workoutXPGain(
  totalSets: number,
  prCount: number,
  streak: number
): number {
  let gain = totalSets * 2 + prCount * 50;
  if (streak >= 7) gain += 25;
  return gain;
}

// ---------- React hook ----------

/** Loads XP, folds streak freezes into the day streak (persisting any
 * freeze consumption or monthly reset), and returns the gamification
 * state. Re-run when logs change (e.g. after a workout). */
export function useGamification(logs: WorkoutLog[]): {
  xp: XPData;
  streak: number;
  ready: boolean;
} {
  const [state, setState] = useState<{ xp: XPData; streak: number }>({
    xp: { ...DEFAULT_XP },
    streak: 0,
  });
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const xp = await getXP();
    const { streak, xp: next, changed } = streakWithFreezes(logs, xp);
    if (changed) await saveXP(next);
    setState({ xp: next, streak });
    setReady(true);
  }, [logs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return { ...state, ready };
}

// ---------- Monthly board (personal best months, ranked by XP) ----------

export interface BoardRow {
  month: string;
  workouts: number;
  sets: number;
  vol: number;
  xp: number;
}

/** Web app's renderBoardTab math: months from logs, XP summed from the
 * XP log, ranked by XP then volume. */
export async function monthlyBoard(logs: WorkoutLog[]): Promise<BoardRow[]> {
  const months: Record<string, BoardRow> = {};
  logs.forEach((w) => {
    const m = (w.date || '').slice(0, 7);
    if (!m) return;
    months[m] = months[m] || { month: m, workouts: 0, sets: 0, vol: 0, xp: 0 };
    months[m].workouts += 1;
    months[m].sets += (w.exercises || []).reduce(
      (a, x) => a + (x.sets || []).length,
      0
    );
    months[m].vol += sessionVolumeKg(w);
  });
  const xpLog = await getXPLog();
  xpLog.forEach((e) => {
    const m = (e.date || '').slice(0, 7);
    if (months[m]) months[m].xp += e.xp;
  });
  return Object.values(months).sort((a, b) => b.xp - a.xp || b.vol - a.vol);
}

export function monthLabel(month: string): string {
  const d = new Date(month + '-15T12:00:00');
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
