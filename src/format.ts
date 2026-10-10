// Small formatting helpers shared across screens.
import { MUSCLE_GROUPS } from './data/exercises';

/** Turn an id like "front-delt" into "Front Delt". */
export function prettify(id: string): string {
  return id
    .split(/[-_]/)
    .map((word) =>
      word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word
    )
    .join(' ');
}

/** Canonical display label for a muscle group id, falling back to prettify. */
export function muscleLabel(id: string): string {
  return MUSCLE_GROUPS[id] ?? prettify(id);
}
