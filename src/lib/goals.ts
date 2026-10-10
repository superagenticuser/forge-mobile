// Goal tracker: types, storage, and progress math. Ports the web app's
// goals (js/views.js goal tracker + js/core.js forge-goals storage).
// Targets are stored in kg so the math is unit-safe; display converts.

import { kvGetJSON, kvSetJSON } from '@/src/storage/db';
import { exercisePR } from '@/src/lib/progress';
import type { WorkoutLog } from '@/src/storage/workout';

export interface Goal {
  id: string;
  type: 'weight' | 'frequency';
  /** Target: kg for strength goals, sessions/week for frequency goals. */
  target: number;
  /** Creation date, local YYYY-MM-DD. */
  created: string;
  exerciseId?: string;
  /** Deadline for strength goals, local YYYY-MM-DD. */
  targetDate?: string;
  /** Number of weeks for frequency goals. */
  weeks?: number;
}

export const GOALS_KEY = 'forge-goals';

export async function loadGoals(): Promise<Goal[]> {
  try {
    const g = await kvGetJSON<Goal[]>(GOALS_KEY);
    return Array.isArray(g) ? g : [];
  } catch {
    return [];
  }
}

export async function saveGoals(goals: Goal[]): Promise<void> {
  await kvSetJSON(GOALS_KEY, goals);
}

export interface GoalProgress {
  pct: number;
  title: string;
  sub: string;
  paceTxt: string;
  onPace: boolean;
}

/** Progress of one goal, mirroring the web app's goal card math verbatim.
 * fmtW formats a kg value in display units. */
export function goalProgress(
  g: Goal,
  logs: WorkoutLog[],
  exNameOf: (id: string) => string | null,
  fmtW: (kg: number) => string
): GoalProgress {
  if (g.type === 'weight') {
    const pr = g.exerciseId ? exercisePR(g.exerciseId, logs) : null;
    const cur = pr ? pr.weight : 0;
    const pct =
      g.target > 0 ? Math.min(100, Math.round((cur / g.target) * 100)) : 0;
    const name = (g.exerciseId && exNameOf(g.exerciseId)) || 'Lift';
    const title = `${name} ${fmtW(g.target)}`;
    const sub = `Current best: ${cur > 0 ? fmtW(cur) : 'none yet'} · by ${g.targetDate || 'no date'}`;
    const total =
      new Date((g.targetDate || '') + 'T00:00:00').getTime() -
      new Date(g.created + 'T00:00:00').getTime();
    const elapsed = Date.now() - new Date(g.created + 'T00:00:00').getTime();
    const expected = total > 0 ? Math.min(100, (elapsed / total) * 100) : 100;
    const onPace = pct >= expected * 0.9;
    return {
      pct,
      title,
      sub,
      paceTxt: onPace ? 'On pace' : 'Behind pace',
      onPace,
    };
  }
  const weeks = g.weeks || 8;
  const start = new Date(g.created + 'T00:00:00');
  start.setHours(0, 0, 0, 0);
  let done = 0;
  for (let w = 0; w < weeks; w++) {
    const ws = new Date(start);
    ws.setDate(ws.getDate() + w * 7);
    const we = new Date(ws);
    we.setDate(we.getDate() + 7);
    const c = logs.filter((x) => {
      const d = new Date(x.date + 'T00:00:00');
      return d >= ws && d < we;
    }).length;
    if (c >= g.target) done++;
  }
  const pct = Math.min(100, Math.round((done / weeks) * 100));
  return {
    pct,
    title: `Train ${g.target}x/week for ${weeks} weeks`,
    sub: `${done}/${weeks} weeks hit · ${g.target}x per week target`,
    paceTxt:
      done > 0 ? `${done} week${done > 1 ? 's' : ''} on target` : 'Not started',
    onPace: done > 0,
  };
}
