// Converts the FORGE web app data files into typed TypeScript modules.
// Sources: ~/workspace/gym-3d-v10/js/data-exercises.js, ~/workspace/gym-3d-v10/js/data-programs.js
// Outputs: src/data/exercises.ts, src/data/programs.ts
// Data is carried over verbatim (no hand edits); only the wrapper changes.
// Usage: node scripts/convert-data.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const webJs = join(root, '..', 'gym-3d-v10', 'js');
const outDir = join(root, 'src', 'data');

function extractLiteral(src, constName, open, close) {
  const marker = `const ${constName} = `;
  const start = src.indexOf(marker);
  if (start < 0) throw new Error(`const ${constName} not found`);
  let i = src.indexOf(open, start);
  if (i < 0) throw new Error(`opening ${open} not found for ${constName}`);
  let depth = 0;
  let inStr = false;
  let quote = '';
  let esc = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === quote) inStr = false;
    } else if (c === '"' || c === "'") {
      inStr = true;
      quote = c;
    } else if (c === open) {
      depth++;
    } else if (c === close) {
      depth--;
      if (depth === 0) return src.slice(i, j + 1);
    }
  }
  throw new Error(`unbalanced ${open}${close} for ${constName}`);
}

// eslint-disable-next-line no-eval
const asValue = (text) => eval(`(${text})`);

function validate() {
  const exSrc = readFileSync(join(webJs, 'data-exercises.js'), 'utf8');
  const prSrc = readFileSync(join(webJs, 'data-programs.js'), 'utf8');

  const exercises = asValue(extractLiteral(exSrc, 'EXERCISES', '[', ']'));
  const muscles = asValue(extractLiteral(exSrc, 'MUSCLES', '{', '}'));
  const programs = asValue(extractLiteral(prSrc, 'PROGRAMS', '[', ']'));

  if (exercises.length !== 243)
    throw new Error(`expected 243 exercises, got ${exercises.length}`);
  if (programs.length !== 14)
    throw new Error(`expected 14 programs, got ${programs.length}`);
  if (Object.keys(muscles).length !== 17)
    throw new Error('expected 17 muscle groups');

  const exIds = new Set(exercises.map((e) => e.id));
  if (exIds.size !== exercises.length)
    throw new Error('duplicate exercise ids');

  const required = [
    'id',
    'name',
    'equipment',
    'level',
    'primary',
    'secondary',
    'pattern',
    'steps',
    'cues',
    'mistakes',
  ];
  for (const e of exercises) {
    for (const k of required) {
      if (!(k in e)) throw new Error(`exercise ${e.id} missing ${k}`);
    }
    for (const id of [
      ...(e.variations?.easier ?? []),
      ...(e.variations?.harder ?? []),
    ]) {
      if (!exIds.has(id))
        throw new Error(`exercise ${e.id} references unknown variation ${id}`);
    }
  }

  const prIds = new Set(programs.map((p) => p.id));
  if (prIds.size !== programs.length) throw new Error('duplicate program ids');
  for (const p of programs) {
    for (const d of p.days) {
      for (const x of d.exercises) {
        if (!exIds.has(x.id))
          throw new Error(
            `program ${p.id} references unknown exercise ${x.id}`
          );
      }
    }
  }

  return { exSrc, prSrc, exercises, muscles, programs };
}

const banner = (source) =>
  `// GENERATED FILE. Do not hand-edit.\n// Source: ${source}\n// Regenerate with: node scripts/convert-data.mjs\n\n`;

function buildExercisesTs(exSrc) {
  const arrayText = extractLiteral(exSrc, 'EXERCISES', '[', ']');
  const musclesText = extractLiteral(exSrc, 'MUSCLES', '{', '}');
  return (
    banner('~/workspace/gym-3d-v10/js/data-exercises.js') +
    `export interface ExerciseMistake {
  m: string;
  fix: string;
}

export interface ExerciseVariations {
  easier?: string[];
  harder?: string[];
}

export interface Exercise {
  id: string;
  name: string;
  equipment: string;
  level: string;
  primary: string;
  secondary: string[];
  pattern: string;
  steps: string[];
  cues: string[];
  mistakes: ExerciseMistake[];
  variations?: ExerciseVariations;
}

/** Canonical muscle group labels in display order (17 groups). */
export const MUSCLE_GROUPS: Record<string, string> = ${musclesText};

/** All 243 exercises, in canonical order. */
export const EXERCISES: Exercise[] = ${arrayText};
`
  );
}

function buildProgramsTs(prSrc) {
  const arrayText = extractLiteral(prSrc, 'PROGRAMS', '[', ']');
  return (
    banner('~/workspace/gym-3d-v10/js/data-programs.js') +
    `export interface ProgramDayExercise {
  id: string;
  sets: number;
  reps: string;
}

export interface ProgramDay {
  name: string;
  exercises: ProgramDayExercise[];
}

export interface Program {
  id: string;
  name: string;
  tagline: string;
  level: string;
  daysPerWeek: number;
  weeks: number;
  equipment: string;
  days: ProgramDay[];
}

/** All 14 training programs, in canonical order. */
export const PROGRAMS: Program[] = ${arrayText};
`
  );
}

const { exSrc, prSrc } = validate();
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'exercises.ts'), buildExercisesTs(exSrc));
writeFileSync(join(outDir, 'programs.ts'), buildProgramsTs(prSrc));
console.log(
  'wrote src/data/exercises.ts and src/data/programs.ts (243 exercises, 14 programs verified)'
);
