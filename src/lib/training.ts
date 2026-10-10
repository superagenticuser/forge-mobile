// Training math ported from the web app (js/progress.js, js/views.js).
// Used by the exercise detail screen now; the workout player and progress
// phases will build on these.

/** Epley formula: estimated one-rep max from a working set. */
export function epley1RM(weight: number, reps: number): number {
  return weight * (1 + Math.max(0, reps) / 30);
}

/** Best Epley estimate across a list of logged sets. */
export function bestEpley1RM(
  sets: Array<{ weight: number; reps: number }>
): number {
  let best = 0;
  for (const s of sets) {
    if (s.weight > 0 && s.reps > 0) {
      const est = epley1RM(s.weight, s.reps);
      if (est > best) best = est;
    }
  }
  return best;
}

/** Web app unit conversion (js/core.js toKg/fromKg): logs always store kg. */
export function toKgFromDisplay(v: number, units: 'kg' | 'lb'): number {
  return units === 'lb' ? v / 2.20462 : v;
}

export function fromKgToDisplay(kg: number, units: 'kg' | 'lb'): number {
  return units === 'lb' ? kg * 2.20462 : kg;
}

function trimNum(v: number): string {
  return String(Math.round(v * 10) / 10);
}

/** Format a kg value in the user's units, e.g. "80 kg" or "176.4 lb". */
export function fmtWeight(kg: number, units: 'kg' | 'lb'): string {
  return `${trimNum(fromKgToDisplay(kg, units))} ${units}`;
}

/** Parse the leading number out of a program reps prescription ("10", "8 / side", "30s"). */
export function parseTargetReps(reps: string): number {
  const m = reps.match(/\d+/);
  return m ? parseInt(m[0], 10) : 10;
}

/** Parse a numeric text input; null when empty or invalid. */
export function parseNum(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const v = parseFloat(t);
  return Number.isFinite(v) ? v : null;
}

/** Format seconds as m:ss or h:mm:ss. */
export function fmtDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? h + ':' : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

/** Local YYYY-MM-DD date key, matching the web app's fmtDate. */
export function fmtLocalDate(d: Date): string {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

// ---------- set types (workout player) ----------

/** Per-set type, ported from the web app's set-type select (js/workout.js). */
export type SetType = 'std' | 'warmup' | 'drop' | 'rp' | 'cluster' | 'myo';

export const SET_TYPES: SetType[] = [
  'std',
  'warmup',
  'drop',
  'rp',
  'cluster',
  'myo',
];

export const SET_TYPE_SHORT: Record<SetType, string> = {
  std: 'Std',
  warmup: 'WU',
  drop: 'Drop',
  rp: 'R-P',
  cluster: 'Clu',
  myo: 'Myo',
};

export const SET_TYPE_DESC: Record<SetType, string> = {
  std: 'Standard working set.',
  warmup: 'Warm-up set. Excluded from volume and PRs.',
  drop: 'Drop set: reduce the weight and keep going without rest.',
  rp: 'Rest-pause: pause 15 to 30 seconds, then squeeze out more reps.',
  cluster: 'Cluster set: short pauses between mini-sets of a heavy weight.',
  myo: 'Myo-rep: one activation set, then mini-sets with short rests.',
};

// ---------- plate calculator (js/views.js calcPlates) ----------

/** Competition plate colors, ported from the web app's PLATE_COLORS. */
export const PLATE_COLORS: Record<number, string> = {
  25: '#d43a2f',
  20: '#2f6fd4',
  15: '#d4a92f',
  10: '#3aa655',
  5: '#e8e8e8',
  2.5: '#c0392b',
  1.25: '#95a5a6',
  45: '#d43a2f',
  35: '#2f6fd4',
};

const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
const PLATES_LB = [45, 35, 25, 10, 5, 2.5];

/**
 * Greedy plate loading, ported from js/views.js calcPlates. All values are in
 * the user's display units (the web app reads the inputs as-is). Returns
 * plates per side (heaviest first) and the shortfall when the target cannot
 * be matched exactly.
 */
export function calcPlates(
  target: number,
  bar: number,
  units: 'kg' | 'lb'
): { perSide: number[]; shortBy: number; impossible: boolean } {
  const plates = units === 'kg' ? PLATES_KG : PLATES_LB;
  let remaining = (target - bar) / 2;
  if (remaining < 0) return { perSide: [], shortBy: 0, impossible: true };
  const used: number[] = [];
  for (const p of plates) {
    while (remaining >= p - 0.001) {
      used.push(p);
      remaining -= p;
    }
  }
  return {
    perSide: used,
    shortBy: remaining > 0.01 ? remaining * 2 : 0,
    impossible: false,
  };
}

// ---------- form cues (js/views.js FORM_CUES) ----------

/** Form cues by muscle group, rotated during the rest timer. */
export const FORM_CUES: Record<string, string[]> = {
  chest: [
    'Squeeze shoulder blades together',
    'Keep a slight arch in your back',
    "Lower with control, don't bounce",
  ],
  back: [
    'Lead with your elbows',
    'Squeeze at the top for 1 second',
    "Don't swing, control the weight",
  ],
  shoulders: [
    'Keep core braced',
    "Don't shrug your traps up",
    'Control the negative',
  ],
  biceps: [
    'Pin elbows to your sides',
    "Don't swing your torso",
    'Full range of motion',
  ],
  triceps: [
    'Keep upper arms still',
    'Lock out at the top',
    "Don't flare elbows",
  ],
  quads: [
    'Knees track over toes',
    'Chest up, core tight',
    'Drive through your heels',
  ],
  hamstrings: [
    'Hinge at the hips',
    'Slight bend in knees',
    'Feel the stretch, then squeeze',
  ],
  glutes: [
    'Squeeze hard at the top',
    "Don't hyperextend your back",
    'Drive through heels',
  ],
  calves: ['Full stretch at bottom', 'Pause at the top', "Don't bounce"],
  abs: ['Exhale on the effort', "Don't pull your neck", 'Slow and controlled'],
  default: [
    'Breathe steadily',
    'Control the weight both ways',
    'Stop if form breaks down',
  ],
};

/** Cues for a muscle group, falling back to the default set. */
export function formCuesFor(primary: string): string[] {
  return FORM_CUES[primary] ?? FORM_CUES.default;
}

// ---------- travel mode (js/programs.js travelSub) ----------

const TRAVEL_EQ = ['bodyweight', 'dumbbell', 'band'];

/**
 * Minimal-equipment alternative for an exercise, ported from
 * js/programs.js travelSub. Prefers beginner-level alternatives.
 */
export function travelSub<
  T extends { id: string; primary: string; equipment: string; level: string },
>(exerciseId: string, exercises: T[]): T | null {
  const ex = exercises.find((e) => e.id === exerciseId);
  if (!ex || TRAVEL_EQ.includes(ex.equipment)) return null;
  const cands = exercises.filter(
    (e) =>
      e.id !== exerciseId &&
      e.primary === ex.primary &&
      TRAVEL_EQ.includes(e.equipment)
  );
  if (!cands.length) return null;
  cands.sort(
    (a, b) =>
      (a.level === 'beginner' ? 0 : 1) - (b.level === 'beginner' ? 0 : 1)
  );
  return cands[0];
}
