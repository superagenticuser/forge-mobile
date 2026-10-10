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
