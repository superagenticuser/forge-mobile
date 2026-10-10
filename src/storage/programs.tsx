// Custom programs, day templates, active program, day-completion tracking,
// and superset templates. Web keys (forge-custom-programs, forge-templates,
// forge-active, forge-done) are kept identical for future web-backup import.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { Program, ProgramDayExercise } from '@/src/data/programs';
import { PROGRAMS } from '@/src/data/programs';
import type { MesocycleWeek } from '@/src/lib/programgen';
import { kvGetJSON, kvSetJSON } from '@/src/storage/db';

export interface StoredProgramDayExercise extends ProgramDayExercise {
  /** Target weight in kg (builder / mesocycle). */
  weight?: number | null;
  /** Pyramid: per-step weights in kg. */
  weightsArr?: number[];
}

export interface StoredProgramDay {
  name: string;
  exercises: StoredProgramDayExercise[];
  /** Rest day: no exercises, no Start button. */
  rest?: boolean;
}

export interface StoredProgram extends Omit<Program, 'days'> {
  days: StoredProgramDay[];
  custom?: boolean;
  express?: boolean;
  dungeon?: boolean;
  mesocycle?: MesocycleWeek[];
}

export interface DayTemplate {
  id: string;
  name: string;
  exercises: StoredProgramDayExercise[];
}

export interface SupersetTemplate {
  id: string;
  name: string;
  exerciseIds: string[];
}

const CUSTOM_KEY = 'forge-custom-programs';
const TPL_KEY = 'forge-templates';
const ACTIVE_KEY = 'forge-active';
const DONE_KEY = 'forge-done';
const SUPERSET_TPL_KEY = 'forge-superset-templates';

function sanitizeProgram(p: unknown): StoredProgram | null {
  if (!p || typeof p !== 'object') return null;
  const v = p as Record<string, unknown>;
  if (typeof v.id !== 'string' || typeof v.name !== 'string') return null;
  if (!Array.isArray(v.days)) return null;
  const days: StoredProgramDay[] = [];
  for (const d of v.days as Array<Record<string, unknown>>) {
    if (!d || typeof d !== 'object') continue;
    const exercises: StoredProgramDayExercise[] = [];
    for (const x of (d.exercises as Array<Record<string, unknown>>) ?? []) {
      if (!x || typeof x.id !== 'string') continue;
      exercises.push({
        id: x.id,
        sets: typeof x.sets === 'number' ? x.sets : 3,
        reps: typeof x.reps === 'string' ? x.reps : '10',
        weight: typeof x.weight === 'number' ? x.weight : null,
        weightsArr: Array.isArray(x.weightsArr)
          ? (x.weightsArr as unknown[]).filter(
              (w): w is number => typeof w === 'number'
            )
          : undefined,
      });
    }
    days.push({
      name: typeof d.name === 'string' ? d.name : 'Day',
      exercises,
      rest: d.rest === true,
    });
  }
  return {
    id: v.id,
    name: v.name,
    tagline: typeof v.tagline === 'string' ? v.tagline : 'Custom program',
    level: typeof v.level === 'string' ? v.level : 'custom',
    daysPerWeek:
      typeof v.daysPerWeek === 'number' ? v.daysPerWeek : days.length,
    weeks: typeof v.weeks === 'number' ? v.weeks : 4,
    equipment: typeof v.equipment === 'string' ? v.equipment : 'Mixed',
    custom: true,
    express: v.express === true,
    dungeon: v.dungeon === true,
    mesocycle: Array.isArray(v.mesocycle)
      ? (v.mesocycle as MesocycleWeek[])
      : undefined,
    days,
  };
}

interface ProgramsContextValue {
  ready: boolean;
  customPrograms: StoredProgram[];
  templates: DayTemplate[];
  supersetTemplates: SupersetTemplate[];
  activeProgramId: string | null;
  doneMap: Record<string, string[]>;
  allPrograms: StoredProgram[];
  programById: (id: string) => StoredProgram | undefined;
  addCustomProgram: (p: StoredProgram) => Promise<void>;
  deleteCustomProgram: (id: string) => Promise<void>;
  setActiveProgram: (id: string | null) => Promise<void>;
  markDayDone: (programId: string, dayIdx: number) => Promise<void>;
  dayDoneCount: (programId: string, dayIdx: number) => number;
  nextDayIdx: (p: StoredProgram) => number;
  /** Reloads day-completion marks from storage (workout finish writes them
   * directly). Call on screen focus to stay in sync. */
  refreshDone: () => Promise<void>;
  /** Completed vs planned training days for a program. */
  adherence: (p: StoredProgram) => { done: number; total: number };
  saveTemplate: (
    name: string,
    exercises: StoredProgramDayExercise[]
  ) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  saveSupersetTemplate: (name: string, exerciseIds: string[]) => Promise<void>;
  deleteSupersetTemplate: (id: string) => Promise<void>;
}

const ProgramsContext = createContext<ProgramsContextValue | null>(null);

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function ProgramsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [customPrograms, setCustomPrograms] = useState<StoredProgram[]>([]);
  const [templates, setTemplates] = useState<DayTemplate[]>([]);
  const [supersetTemplates, setSupersetTemplates] = useState<
    SupersetTemplate[]
  >([]);
  const [activeProgramId, setActiveProgramId] = useState<string | null>(null);
  const [doneMap, setDoneMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    (async () => {
      const [custom, tpl, active, done, sts] = await Promise.all([
        kvGetJSON<unknown[]>(CUSTOM_KEY),
        kvGetJSON<DayTemplate[]>(TPL_KEY),
        kvGetJSON<string | null>(ACTIVE_KEY),
        kvGetJSON<Record<string, string[]>>(DONE_KEY),
        kvGetJSON<SupersetTemplate[]>(SUPERSET_TPL_KEY),
      ]);
      setCustomPrograms(
        (Array.isArray(custom) ? custom : [])
          .map(sanitizeProgram)
          .filter((p): p is StoredProgram => p !== null)
      );
      setTemplates(Array.isArray(tpl) ? tpl : []);
      setSupersetTemplates(Array.isArray(sts) ? sts : []);
      setActiveProgramId(typeof active === 'string' ? active : null);
      setDoneMap(done && typeof done === 'object' ? done : {});
      setReady(true);
    })();
  }, []);

  const addCustomProgram = useCallback(async (p: StoredProgram) => {
    setCustomPrograms((prev) => {
      const next = [...prev.filter((x) => x.id !== p.id), p];
      kvSetJSON(CUSTOM_KEY, next);
      return next;
    });
  }, []);

  const deleteCustomProgram = useCallback(
    async (id: string) => {
      setCustomPrograms((prev) => {
        const next = prev.filter((p) => p.id !== id);
        kvSetJSON(CUSTOM_KEY, next);
        return next;
      });
      if (activeProgramId === id) {
        setActiveProgramId(null);
        await kvSetJSON(ACTIVE_KEY, null);
      }
    },
    [activeProgramId]
  );

  const setActiveProgram = useCallback(async (id: string | null) => {
    setActiveProgramId(id);
    await kvSetJSON(ACTIVE_KEY, id);
  }, []);

  const markDayDone = useCallback(async (programId: string, dayIdx: number) => {
    const key = `${programId}:${dayIdx}`;
    const today = todayKey();
    setDoneMap((prev) => {
      const next = { ...prev, [key]: [...(prev[key] ?? []), today] };
      kvSetJSON(DONE_KEY, next);
      return next;
    });
  }, []);

  const dayDoneCount = useCallback(
    (programId: string, dayIdx: number) =>
      (doneMap[`${programId}:${dayIdx}`] ?? []).length,
    [doneMap]
  );

  const programById = useCallback(
    (id: string) =>
      (PROGRAMS as StoredProgram[])
        .concat(customPrograms)
        .find((p) => p.id === id),
    [customPrograms]
  );

  const nextDayIdx = useCallback(
    (p: StoredProgram) => {
      const i = p.days.findIndex(
        (_, di) => !(doneMap[`${p.id}:${di}`] ?? []).length
      );
      return i === -1 ? 0 : i;
    },
    [doneMap]
  );

  const refreshDone = useCallback(async () => {
    const done = await kvGetJSON<Record<string, string[]>>(DONE_KEY);
    setDoneMap(done && typeof done === 'object' ? done : {});
  }, []);

  const adherence = useCallback(
    (p: StoredProgram) => {
      let done = 0;
      let total = 0;
      p.days.forEach((d, di) => {
        if (d.rest) return;
        total++;
        if ((doneMap[`${p.id}:${di}`] ?? []).length > 0) done++;
      });
      return { done, total };
    },
    [doneMap]
  );

  const saveTemplate = useCallback(
    async (name: string, exercises: StoredProgramDayExercise[]) => {
      const t: DayTemplate = {
        id: 'tpl-' + Date.now().toString(36),
        name,
        exercises: exercises.map((x) => ({ ...x })),
      };
      setTemplates((prev) => {
        const next = [...prev, t];
        kvSetJSON(TPL_KEY, next);
        return next;
      });
    },
    []
  );

  const deleteTemplate = useCallback(async (id: string) => {
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id);
      kvSetJSON(TPL_KEY, next);
      return next;
    });
  }, []);

  const saveSupersetTemplate = useCallback(
    async (name: string, exerciseIds: string[]) => {
      const t: SupersetTemplate = {
        id: 'ss-' + Date.now().toString(36),
        name,
        exerciseIds: [...exerciseIds],
      };
      setSupersetTemplates((prev) => {
        const next = [...prev, t];
        kvSetJSON(SUPERSET_TPL_KEY, next);
        return next;
      });
    },
    []
  );

  const deleteSupersetTemplate = useCallback(async (id: string) => {
    setSupersetTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id);
      kvSetJSON(SUPERSET_TPL_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<ProgramsContextValue>(
    () => ({
      ready,
      customPrograms,
      templates,
      supersetTemplates,
      activeProgramId,
      doneMap,
      allPrograms: (PROGRAMS as StoredProgram[]).concat(customPrograms),
      programById,
      addCustomProgram,
      deleteCustomProgram,
      setActiveProgram,
      markDayDone,
      dayDoneCount,
      nextDayIdx,
      refreshDone,
      adherence,
      saveTemplate,
      deleteTemplate,
      saveSupersetTemplate,
      deleteSupersetTemplate,
    }),
    [
      ready,
      customPrograms,
      templates,
      supersetTemplates,
      activeProgramId,
      doneMap,
      programById,
      addCustomProgram,
      deleteCustomProgram,
      setActiveProgram,
      markDayDone,
      dayDoneCount,
      nextDayIdx,
      refreshDone,
      adherence,
      saveTemplate,
      deleteTemplate,
      saveSupersetTemplate,
      deleteSupersetTemplate,
    ]
  );

  return (
    <ProgramsContext.Provider value={value}>
      {children}
    </ProgramsContext.Provider>
  );
}

export function usePrograms(): ProgramsContextValue {
  const ctx = useContext(ProgramsContext);
  if (!ctx) throw new Error('usePrograms must be used inside ProgramsProvider');
  return ctx;
}
