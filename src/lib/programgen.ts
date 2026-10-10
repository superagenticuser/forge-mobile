// Program generators, mesocycle planner math, quiz matcher, and ICS export.
// Ported from the web app: js/programs.js (pyramid, express, dungeon,
// travelSub, ICS), js/views.js (coach generator, quiz), js/progress.js
// (generatePeriodized). All weight math is in kg; callers convert for display.
import { EXERCISES } from '@/src/data/exercises';
import type { Program } from '@/src/data/programs';
import { bestEpley1RM } from '@/src/lib/training';
import type { WorkoutLog } from '@/src/storage/workout';
import type { StoredProgram } from '@/src/storage/programs';

const byId = new Map(EXERCISES.map((e) => [e.id, e]));

/** Suggested working weight for an exercise: last logged weight, +2.5% when
 * average reps were 10+. Ported verbatim from js/views.js suggestWeight.
 * Weights are kg. */
export function suggestWeightKg(
  exId: string,
  logs: WorkoutLog[]
): { last: number; suggested: number; reps: number } | null {
  for (let i = logs.length - 1; i >= 0; i--) {
    const x = logs[i].exercises.find((e) => e.id === exId);
    if (x && x.sets.length) {
      const last = x.sets[x.sets.length - 1];
      const avgReps = x.sets.reduce((a, s) => a + s.reps, 0) / x.sets.length;
      let suggested = last.weight;
      if (avgReps >= 10) suggested = last.weight * 1.025;
      return {
        last: last.weight,
        suggested: Math.round(suggested * 4) / 4,
        reps: last.reps,
      };
    }
  }
  return null;
}

/** 75% of the best estimated 1RM across all logged sets, for the builder's
 * autofill. Returns kg rounded to 0.25, or null when there is no history. */
export function autofillWeightKg(
  exId: string,
  logs: WorkoutLog[]
): number | null {
  const sets: Array<{ weight: number; reps: number }> = [];
  for (const w of logs) {
    for (const x of w.exercises) {
      if (x.id !== exId) continue;
      for (const s of x.sets) {
        if (s.weight > 0 && s.reps > 0)
          sets.push({ weight: s.weight, reps: s.reps });
      }
    }
  }
  if (!sets.length) return null;
  return Math.round(bestEpley1RM(sets) * 0.75 * 4) / 4;
}

export interface MesocycleDayExercise {
  id: string;
  sets: number;
  reps: string;
  /** Planned working weight in kg. */
  weight: number;
}

export interface MesocycleDay {
  name: string;
  exercises: MesocycleDayExercise[];
  rest?: boolean;
}

export interface MesocycleWeek {
  week: number;
  deload: boolean;
  days: MesocycleDay[];
}

/** 4-week periodized block: +2.5%/week for weeks 1-3, deload week 4 at 60%
 * with one fewer set (min 2). Ported verbatim from js/progress.js
 * generatePeriodized. */
export function generateMesocycle(
  base: Program,
  logs: WorkoutLog[]
): StoredProgram {
  const weeks: MesocycleWeek[] = [];
  for (let w = 1; w <= 4; w++) {
    const isDeload = w === 4;
    weeks.push({
      week: w,
      deload: isDeload,
      days: base.days.map((d) => ({
        name: d.name,
        rest: !!(d as { rest?: boolean }).rest,
        exercises: (d as { rest?: boolean }).rest
          ? []
          : d.exercises.map((x) => {
              const sug = suggestWeightKg(x.id, logs);
              const baseW = sug ? sug.suggested : 20;
              const factor = isDeload ? 0.6 : 1 + (w - 1) * 0.025;
              return {
                id: x.id,
                sets: isDeload ? Math.max(2, x.sets - 1) : x.sets,
                reps: x.reps,
                weight: Math.round(baseW * factor * 4) / 4,
              };
            }),
      })),
    });
  }
  return {
    ...base,
    id: 'meso-' + Date.now().toString(36),
    name: base.name + ' Mesocycle',
    tagline: '4-week periodized plan with deload week 4',
    custom: true,
    level: 'custom',
    daysPerWeek: base.days.length,
    weeks: 4,
    equipment: base.equipment || 'Mixed',
    mesocycle: weeks,
    days: base.days.map((d) => ({
      name: d.name,
      rest: !!(d as { rest?: boolean }).rest,
      exercises: d.exercises.map((x) => ({
        id: x.id,
        sets: x.sets,
        reps: x.reps,
      })),
    })),
  };
}

// ---------- 20-minute express (js/programs.js) ----------

const EXPRESS_POOL = [
  { id: 'goblet-squat', sets: 3, reps: '10' },
  { id: 'push-up', sets: 3, reps: '12' },
  { id: 'dumbbell-romanian-deadlift', sets: 3, reps: '10' },
  { id: 'chest-supported-dumbbell-row', sets: 3, reps: '10' },
  { id: 'overhead-press', sets: 2, reps: '10' },
  { id: 'glute-bridge', sets: 2, reps: '15' },
  { id: 'plank', sets: 2, reps: '45s' },
  { id: 'standing-calf-raise', sets: 2, reps: '15' },
];

/** Condensed full-body session: up to 6 exercises, at most 5 sharing a
 * primary muscle once 5 are picked. Ported verbatim from startExpress. */
export function generateExpress(): StoredProgram {
  const picks: Array<{ id: string; sets: number; reps: string }> = [];
  const groups = new Set<string>();
  for (const e of EXPRESS_POOL) {
    const ex = byId.get(e.id);
    if (!ex || picks.some((p) => p.id === e.id)) continue;
    if (groups.has(ex.primary) && picks.length >= 5) continue;
    groups.add(ex.primary);
    picks.push({ id: e.id, sets: e.sets, reps: e.reps });
    if (picks.length >= 6) break;
  }
  return {
    id: 'express-' + Date.now().toString(36),
    name: '20-Minute Express',
    tagline: 'Full-body condensed session',
    custom: true,
    level: 'custom',
    daysPerWeek: 1,
    weeks: 1,
    equipment: 'Mixed',
    express: true,
    days: [{ name: 'Express session', exercises: picks }],
  };
}

// ---------- Dungeon generator (js/programs.js) ----------

const DUNGEON_TITLES = [
  'Goblin ambush',
  'Skeleton crypt',
  "Dragon's lair",
  'Orc war camp',
  'Dark dungeon',
  'Troll bridge',
];

/** Random 5-exercise encounter, one per muscle group. Ported verbatim from
 * startDungeon. Accepts an RNG for testability. */
export function generateDungeon(
  rand: () => number = Math.random
): StoredProgram {
  const groups = [...new Set(EXERCISES.map((e) => e.primary))];
  for (let i = groups.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [groups[i], groups[j]] = [groups[j], groups[i]];
  }
  const picks: Array<{ id: string; sets: number; reps: string }> = [];
  for (const g of groups) {
    if (picks.length >= 5) break;
    const cands = EXERCISES.filter((e) => e.primary === g);
    if (!cands.length) continue;
    const ex = cands[Math.floor(rand() * cands.length)];
    picks.push({ id: ex.id, sets: 3, reps: '8-12' });
  }
  const title = DUNGEON_TITLES[Math.floor(rand() * DUNGEON_TITLES.length)];
  return {
    id: 'dungeon-' + Date.now().toString(36),
    name: 'Dungeon: ' + title,
    tagline: 'Random encounter. Finish it for +100 bonus XP.',
    custom: true,
    level: 'custom',
    daysPerWeek: 1,
    weeks: 1,
    equipment: 'Mixed',
    dungeon: true,
    days: [{ name: 'The encounter', exercises: picks }],
  };
}

// ---------- Coach generator (js/views.js generateCoachProgram) ----------

/** Builds a plan targeting the 4 least-trained muscle groups of the last 28
 * days, preferring the user's equipment. Ported verbatim. */
export function generateCoachProgram(
  logs: WorkoutLog[],
  myEquipment: string[],
  rand: () => number = Math.random
): StoredProgram {
  const vol: Record<string, number> = {};
  const cutoff = Date.now() - 28 * 864e5;
  for (const w of logs) {
    if (w.ts < cutoff) continue;
    for (const x of w.exercises) {
      const ex = byId.get(x.id);
      if (!ex) continue;
      vol[ex.primary] = (vol[ex.primary] || 0) + x.sets.length;
    }
  }
  const MUSCLE_GROUPS = [
    'chest',
    'back',
    'lats',
    'traps',
    'lower-back',
    'shoulders',
    'biceps',
    'triceps',
    'forearms',
    'abs',
    'obliques',
    'glutes',
    'quads',
    'hamstrings',
    'calves',
    'full-body',
    'cardio',
  ];
  const weak = MUSCLE_GROUPS.sort(
    (a, b) => (vol[a] || 0) - (vol[b] || 0)
  ).slice(0, 4);
  const fitsEq = (e: { equipment: string }) =>
    !myEquipment.length || myEquipment.includes(e.equipment);
  const picks: typeof EXERCISES = [];
  for (const g of weak) {
    const cands = EXERCISES.filter((e) => e.primary === g && fitsEq(e));
    if (cands.length) picks.push(cands[Math.floor(rand() * cands.length)]);
  }
  const compounds = EXERCISES.filter(
    (e) => ['chest', 'back', 'quads'].includes(e.primary) && fitsEq(e)
  );
  while (picks.length < 6 && compounds.length) {
    const c = compounds.splice(Math.floor(rand() * compounds.length), 1)[0];
    if (!picks.includes(c)) picks.push(c);
  }
  const names: Record<string, string> = {
    chest: 'Chest',
    back: 'Back',
    lats: 'Lats',
    traps: 'Traps',
    'lower-back': 'Lower Back',
    shoulders: 'Shoulders',
    biceps: 'Biceps',
    triceps: 'Triceps',
    forearms: 'Forearms',
    abs: 'Abs',
    obliques: 'Obliques',
    glutes: 'Glutes',
    quads: 'Quads',
    hamstrings: 'Hamstrings',
    calves: 'Calves',
    'full-body': 'Full Body',
    cardio: 'Cardio',
  };
  return {
    id: 'coach-' + Date.now().toString(36),
    name: 'AI Coach Plan',
    tagline:
      'Generated for your weak points: ' +
      weak.map((g) => names[g] ?? g).join(', '),
    custom: true,
    level: 'custom',
    daysPerWeek: 3,
    weeks: 4,
    equipment: 'Mixed',
    days: [
      {
        name: 'Day 1',
        exercises: picks
          .slice(0, 3)
          .map((e) => ({ id: e.id, sets: 3, reps: '10' })),
      },
      {
        name: 'Day 2',
        exercises: picks
          .slice(3, 6)
          .map((e) => ({ id: e.id, sets: 3, reps: '12' })),
      },
      {
        name: 'Day 3',
        exercises: picks
          .slice(0, 3)
          .map((e) => ({ id: e.id, sets: 3, reps: '12' })),
      },
    ],
  };
}

// ---------- Pyramid builder (js/programs.js openPyramid math) ----------

/** Linear ramp between top and bottom weights, rounded to 0.5 in display
 * units, returned in kg. Ported from the web's buildPlan. */
export function pyramidWeightsKg(
  topUser: number,
  botUser: number,
  steps: number,
  dir: 'desc' | 'asc',
  toKg: (v: number) => number
): number[] | null {
  if (!(topUser > 0) || !(botUser > 0)) return null;
  const s = Math.min(6, Math.max(3, Math.round(steps)));
  const hi = Math.max(topUser, botUser);
  const lo = Math.min(topUser, botUser);
  const out: number[] = [];
  for (let i = 0; i < s; i++) {
    const t = i / (s - 1);
    const raw = dir === 'desc' ? hi - (hi - lo) * t : lo + (hi - lo) * t;
    out.push(toKg(Math.round(raw * 2) / 2));
  }
  return out;
}

/** Wraps pyramid weights in a one-day custom program, like the web app. */
export function pyramidProgram(
  exerciseId: string,
  exerciseName: string,
  equipment: string,
  weightsKg: number[],
  reps: number
): StoredProgram {
  return {
    id: 'pyramid-' + Date.now().toString(36),
    name: exerciseName + ' Pyramid',
    tagline: 'Pyramid session',
    custom: true,
    level: 'custom',
    daysPerWeek: 1,
    weeks: 1,
    equipment: equipment || 'Mixed',
    days: [
      {
        name: 'Pyramid session',
        exercises: [
          {
            id: exerciseId,
            sets: weightsKg.length,
            reps: String(reps),
            weightsArr: weightsKg,
          },
        ],
      },
    ],
  };
}

// ---------- Quiz matcher (js/views.js) ----------

export interface QuizOption {
  v: string | number;
  label: string;
}

export interface QuizQuestion {
  key: 'days' | 'equip' | 'goal';
  title: string;
  options: QuizOption[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    key: 'days',
    title: 'How many days per week can you train?',
    options: [
      { v: 2, label: '2 days' },
      { v: 3, label: '3 days' },
      { v: 4, label: '4 days' },
      { v: 6, label: '5+ days' },
    ],
  },
  {
    key: 'equip',
    title: 'What equipment do you have access to?',
    options: [
      { v: 'full', label: 'Full gym' },
      { v: 'dumbbells', label: 'Dumbbells + bench' },
      { v: 'dumbbells-only', label: 'Dumbbells only' },
      { v: 'bodyweight', label: 'Bodyweight / minimal' },
    ],
  },
  {
    key: 'goal',
    title: "What's your main goal?",
    options: [
      { v: 'muscle', label: 'Building muscle' },
      { v: 'strength', label: 'Get stronger' },
      { v: 'fitness', label: 'General fitness' },
    ],
  },
];

export interface QuizAnswers {
  days: number;
  equip: string;
  goal: string;
}

const QUIZ_FIT: Record<
  string,
  { days: number[]; equip: string[]; goal: string[] }
> = {
  'full-body-starter': {
    days: [2, 3],
    equip: ['dumbbells', 'dumbbells-only', 'bodyweight'],
    goal: ['muscle', 'fitness'],
  },
  'push-pull-legs': { days: [6], equip: ['full'], goal: ['muscle'] },
  'upper-lower': { days: [4], equip: ['full'], goal: ['muscle', 'strength'] },
  'strength-5x5': { days: [3], equip: ['full'], goal: ['strength'] },
  'dumbbell-home': {
    days: [2, 3],
    equip: ['dumbbells', 'dumbbells-only'],
    goal: ['fitness', 'muscle'],
  },
  'hiit-conditioning': {
    days: [3, 4],
    equip: ['bodyweight', 'dumbbells-only'],
    goal: ['fitness'],
  },
};

/** Scores a program against quiz answers. Ported verbatim from quizScore. */
export function quizScore(
  p: { id: string; level: string; daysPerWeek: number },
  a: QuizAnswers
): { score: number; reasons: string[] } {
  const fit = QUIZ_FIT[p.id];
  if (!fit) return { score: 0, reasons: [] };
  let s = 0;
  const reasons: string[] = [];
  if (fit.days.includes(a.days)) {
    s += 3;
    reasons.push(`${p.daysPerWeek} days/week fits your schedule`);
  } else if (fit.days.some((d) => Math.abs(d - a.days) === 1)) {
    s += 1;
  }
  if (fit.equip.includes(a.equip)) {
    s += 3;
    const label = QUIZ_QUESTIONS[1].options.find(
      (o) => String(o.v) === a.equip
    )?.label;
    reasons.push(`Uses your ${label?.toLowerCase() ?? a.equip}`);
  }
  if (fit.goal.includes(a.goal)) {
    s += 3;
    const label = QUIZ_QUESTIONS[2].options.find(
      (o) => String(o.v) === a.goal
    )?.label;
    reasons.push(`Built for ${label?.toLowerCase() ?? a.goal}`);
  }
  if (p.level === 'beginner') s += 0.5;
  return { score: s, reasons };
}

// ---------- ICS calendar export (js/programs.js exportProgramICS) ----------

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Builds a 4-week .ics calendar for a program, verbatim from the web app. */
export function programICS(p: StoredProgram): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FORGE//Workout//EN',
  ];
  const start = new Date();
  start.setDate(start.getDate() + 1);
  const stamp = (dt: Date) =>
    `${dt.getFullYear()}${pad2(dt.getMonth() + 1)}${pad2(dt.getDate())}`;
  const clean = (s: string) => s.replace(/[,;\\]/g, '');
  for (let wk = 0; wk < 4; wk++) {
    p.days.forEach((d, di) => {
      const dt = new Date(start);
      dt.setDate(dt.getDate() + wk * 7 + di);
      lines.push(
        'BEGIN:VEVENT',
        `UID:forge-${p.id}-${wk}-${di}@forge`,
        `DTSTART:${stamp(dt)}T180000`,
        'DURATION:PT1H',
        `SUMMARY:FORGE ${clean(d.name)}`,
        'DESCRIPTION:' +
          clean(
            d.exercises
              .map((x) => {
                const ex = byId.get(x.id);
                return `${ex ? ex.name : x.id} ${x.sets}x${x.reps}`;
              })
              .join(', ')
          ),
        'END:VEVENT'
      );
    });
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
