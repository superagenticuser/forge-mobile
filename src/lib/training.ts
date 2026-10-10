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
