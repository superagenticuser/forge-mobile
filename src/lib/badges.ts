// Achievement badges: 20 definitions, evaluation, storage, celebration
// bookkeeping. Ports js/badges.js verbatim (checks, storage keys,
// legacy migration). Stored in the sqlite kv table under the web keys
// "forge-badges" ({badgeId: earnedTimestamp}) and "forge-badges-seen".

import { kvGetJSON, kvSetJSON } from '@/src/storage/db';
import { fmtDateKey, sessionVolumeKg, workoutStreak } from '@/src/lib/progress';
import type { WorkoutLog } from '@/src/storage/workout';

export interface BadgeContext {
  /** Consecutive-day training streak (web app's workoutStreak). */
  streak: number;
  exNameOf: (id: string) => string | null;
}

export interface BadgeDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  check: (logs: WorkoutLog[], ctx: BadgeContext) => boolean;
}

/** Heaviest single set (kg) for any exercise whose name matches nameRe. */
function maxLiftKg(
  logs: WorkoutLog[],
  ctx: BadgeContext,
  nameRe: RegExp
): number {
  let best = 0;
  logs.forEach((w) =>
    (w.exercises || []).forEach((x) => {
      const name = ctx.exNameOf(x.id);
      if (!name || !nameRe.test(name)) return;
      (x.sets || []).forEach((s) => {
        const wt = s.weight || 0;
        if (wt > best) best = wt;
      });
    })
  );
  return best;
}

/** Distinct exercises with at least one weighted set (weight PR count). */
function prExerciseCount(logs: WorkoutLog[]): number {
  const best: Record<string, number> = {};
  logs.forEach((w) =>
    (w.exercises || []).forEach((x) =>
      (x.sets || []).forEach((s) => {
        const wt = s.weight || 0;
        if (wt > 0 && wt > (best[x.id] || 0)) best[x.id] = wt;
      })
    )
  );
  return Object.keys(best).length;
}

/** Monday-start week key for a YYYY-MM-DD date. */
function weekStartKey(dateStr: string): string | null {
  const d = new Date((dateStr || '') + 'T12:00:00');
  if (isNaN(d.getTime())) return null;
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return fmtDateKey(mon);
}

export const BADGES: BadgeDef[] = [
  {
    id: 'first-workout',
    name: 'First workout',
    desc: 'Log your first workout',
    icon: '🎯',
    check: (logs) => logs.length >= 1,
  },
  {
    id: 'ten-workouts',
    name: 'Getting serious',
    desc: 'Log 10 workouts',
    icon: '🔥',
    check: (logs) => logs.length >= 10,
  },
  {
    id: 'fifty-workouts',
    name: 'Committed',
    desc: 'Log 50 workouts',
    icon: '💪',
    check: (logs) => logs.length >= 50,
  },
  {
    id: 'hundred-workouts',
    name: 'Century club',
    desc: 'Log 100 workouts',
    icon: '🏆',
    check: (logs) => logs.length >= 100,
  },
  {
    id: 'streak-7',
    name: 'Week streak',
    desc: 'Train 7 days in a row',
    icon: '⚡',
    check: (_logs, ctx) => ctx.streak >= 7,
  },
  {
    id: 'streak-30',
    name: 'Month streak',
    desc: 'Train 30 days in a row',
    icon: '🌟',
    check: (_logs, ctx) => ctx.streak >= 30,
  },
  {
    id: 'bench-100',
    name: 'Triple-digit bench',
    desc: 'Bench press 100 kg in a single set',
    icon: '🏋️',
    check: (logs, ctx) => maxLiftKg(logs, ctx, /bench/i) >= 100,
  },
  {
    id: 'deadlift-140',
    name: 'Deadlift milestone',
    desc: 'Deadlift 140 kg in a single set',
    icon: '🦍',
    check: (logs, ctx) => maxLiftKg(logs, ctx, /deadlift/i) >= 140,
  },
  {
    id: 'volume-1k-session',
    name: 'Tonne session',
    desc: 'Lift 1,000 kg in a single workout',
    icon: '🏗️',
    check: (logs) => logs.some((w) => sessionVolumeKg(w) >= 1000),
  },
  {
    id: 'volume-5k-session',
    name: 'Five-tonne session',
    desc: 'Lift 5,000 kg in a single workout',
    icon: '🚀',
    check: (logs) => logs.some((w) => sessionVolumeKg(w) >= 5000),
  },
  {
    id: 'exercises-25',
    name: 'Explorer',
    desc: 'Train 25 different exercises',
    icon: '🗺️',
    check: (logs) => {
      const ids = new Set<string>();
      logs.forEach((w) => (w.exercises || []).forEach((x) => ids.add(x.id)));
      return ids.size >= 25;
    },
  },
  {
    id: 'exercises-50',
    name: 'Variety pack',
    desc: 'Train 50 different exercises',
    icon: '🧭',
    check: (logs) => {
      const ids = new Set<string>();
      logs.forEach((w) => (w.exercises || []).forEach((x) => ids.add(x.id)));
      return ids.size >= 50;
    },
  },
  {
    id: 'exercises-100',
    name: 'Century of moves',
    desc: 'Train 100 different exercises',
    icon: '🎖️',
    check: (logs) => {
      const ids = new Set<string>();
      logs.forEach((w) => (w.exercises || []).forEach((x) => ids.add(x.id)));
      return ids.size >= 100;
    },
  },
  {
    id: 'first-pr',
    name: 'Record breaker',
    desc: 'Set your first personal record',
    icon: '🥇',
    check: (logs) => prExerciseCount(logs) >= 1,
  },
  {
    id: 'prs-10',
    name: 'PR machine',
    desc: 'Set personal records on 10 exercises',
    icon: '🏅',
    check: (logs) => prExerciseCount(logs) >= 10,
  },
  {
    id: 'early-bird',
    name: 'Early bird',
    desc: 'Finish a workout before 7 AM',
    icon: '🌅',
    check: (logs) => logs.some((w) => w.ts && new Date(w.ts).getHours() < 7),
  },
  {
    id: 'night-owl',
    name: 'Night owl',
    desc: 'Finish a workout after 9 PM',
    icon: '🌙',
    check: (logs) => logs.some((w) => w.ts && new Date(w.ts).getHours() >= 21),
  },
  {
    id: 'weekend-warrior',
    name: 'Weekend warrior',
    desc: 'Train both Saturday and Sunday in one weekend',
    icon: '🥊',
    check: (logs) => {
      const weeks: Record<string, Set<number>> = {};
      logs.forEach((w) => {
        const d = new Date((w.date || '') + 'T12:00:00');
        if (isNaN(d.getTime())) return;
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) return;
        const k = weekStartKey(w.date);
        if (!k) return;
        weeks[k] = weeks[k] || new Set<number>();
        weeks[k].add(dow);
      });
      return Object.keys(weeks).some((k) => weeks[k].size === 2);
    },
  },
  {
    id: 'perfect-week',
    name: 'Perfect week',
    desc: 'Train 5 or more times in a single week',
    icon: '📅',
    check: (logs) => {
      const counts: Record<string, number> = {};
      logs.forEach((w) => {
        const k = weekStartKey(w.date);
        if (!k) return;
        counts[k] = (counts[k] || 0) + 1;
      });
      return Object.keys(counts).some((k) => counts[k] >= 5);
    },
  },
  {
    id: 'streak-365',
    name: 'Iron year',
    desc: 'Train 365 days in a row',
    icon: '💎',
    check: (_logs, ctx) => ctx.streak >= 365,
  },
];

const BADGES_KEY = 'forge-badges';
const BADGES_SEEN_KEY = 'forge-badges-seen';

const LEGACY_MAP: Record<string, string> = {
  first: 'first-workout',
  ten: 'ten-workouts',
  fifty: 'fifty-workouts',
  hundred: 'hundred-workouts',
  streak7: 'streak-7',
  streak30: 'streak-30',
};

/** Earned badges as {badgeId: earnedTimestamp}, with legacy array migration. */
export async function getEarnedBadges(): Promise<Record<string, number>> {
  try {
    const raw = await kvGetJSON<Record<string, number> | string[]>(BADGES_KEY);
    if (!raw) return {};
    if (Array.isArray(raw)) {
      const now = Date.now();
      const obj: Record<string, number> = {};
      raw.forEach((id) => {
        obj[LEGACY_MAP[id] || id] = now;
      });
      await kvSetJSON(BADGES_KEY, obj);
      await kvSetJSON(BADGES_SEEN_KEY, now);
      return obj;
    }
    return typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

async function saveEarnedBadges(obj: Record<string, number>): Promise<void> {
  await kvSetJSON(BADGES_KEY, obj);
}

/** Evaluate every badge against the logs; store newly earned ones and
 * return them (web app's checkBadges). */
export async function checkBadges(
  logs: WorkoutLog[],
  ctx: BadgeContext
): Promise<BadgeDef[]> {
  const earned = await getEarnedBadges();
  const fresh: BadgeDef[] = [];
  for (const b of BADGES) {
    if (earned[b.id]) continue;
    let ok = false;
    try {
      ok = !!b.check(logs, ctx);
    } catch {
      ok = false;
    }
    if (ok) {
      earned[b.id] = Date.now();
      fresh.push(b);
    }
  }
  if (fresh.length) await saveEarnedBadges(earned);
  return fresh;
}

/** Badges earned since the last check, then marks them seen so each
 * badge celebrates once (web app's getNewBadges). */
export async function getNewBadges(): Promise<
  Array<BadgeDef & { earnedAt: number }>
> {
  const seen = (await kvGetJSON<number>(BADGES_SEEN_KEY)) || 0;
  const earned = await getEarnedBadges();
  const out = BADGES.filter((b) => earned[b.id] && earned[b.id] > seen).map(
    (b) => ({ ...b, earnedAt: earned[b.id] })
  );
  await markBadgesSeen();
  return out;
}

export async function markBadgesSeen(): Promise<void> {
  await kvSetJSON(BADGES_SEEN_KEY, Date.now());
}

/** Earned date of one badge as YYYY-MM-DD, or null. */
export async function badgeEarnedOn(id: string): Promise<string | null> {
  const earned = await getEarnedBadges();
  const ts = earned[id];
  if (!ts) return null;
  try {
    return fmtDateKey(new Date(ts));
  } catch {
    return null;
  }
}

/** Convenience: build the badge context from logs (streak) and a name lookup. */
export function badgeContext(
  logs: WorkoutLog[],
  exNameOf: (id: string) => string | null
): BadgeContext {
  return { streak: workoutStreak(logs), exNameOf };
}
