// Exercise library state: favorites and user-created custom exercises.
// Backed by the sqlite kv table. Keys keep the web app's `forge-` prefix so
// a future web-backup import maps 1:1 (AUDIT.md section 3b).
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { EXERCISES, type Exercise } from '@/src/data/exercises';

import { kvGetJSON, kvSetJSON } from './db';

/** An exercise that may carry the web app's `custom` flag. */
export type StoredExercise = Exercise & { custom?: boolean };

export interface CustomExerciseInput {
  name: string;
  primary: string;
  secondary: string[];
  equipment: string;
  level: string;
}

const FAVS_KEY = 'forge-favs';
const CUSTOMS_KEY = 'forge-custom-exercises';

function sanitizeFavs(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === 'string');
}

function sanitizeCustoms(raw: unknown): StoredExercise[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (v): v is StoredExercise =>
      typeof v === 'object' &&
      v !== null &&
      typeof (v as Exercise).id === 'string' &&
      typeof (v as Exercise).name === 'string'
  );
}

interface LibraryContextValue {
  ready: boolean;
  /** Built-in exercises plus customs. */
  exercises: StoredExercise[];
  byId: Map<string, StoredExercise>;
  favs: string[];
  isFav: (id: string) => boolean;
  toggleFav: (id: string) => Promise<void>;
  customs: StoredExercise[];
  addCustom: (input: CustomExerciseInput) => Promise<StoredExercise>;
  deleteCustom: (id: string) => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [favs, setFavs] = useState<string[]>([]);
  const [customs, setCustoms] = useState<StoredExercise[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [f, c] = await Promise.all([
        kvGetJSON<unknown>(FAVS_KEY),
        kvGetJSON<unknown>(CUSTOMS_KEY),
      ]);
      if (!cancelled) {
        setFavs(sanitizeFavs(f));
        setCustoms(sanitizeCustoms(c));
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleFav = useCallback(async (id: string) => {
    const current = await kvGetJSON<unknown>(FAVS_KEY);
    const base = sanitizeFavs(current);
    const next = base.includes(id)
      ? base.filter((f) => f !== id)
      : [...base, id];
    setFavs(next);
    await kvSetJSON(FAVS_KEY, next);
  }, []);

  const addCustom = useCallback(
    async (input: CustomExerciseInput): Promise<StoredExercise> => {
      const ex: StoredExercise = {
        id: 'custom-' + Date.now().toString(36),
        name: input.name.trim(),
        primary: input.primary,
        secondary: input.secondary.filter((s) => s !== input.primary),
        equipment: input.equipment,
        level: input.level,
        pattern: 'custom',
        steps: [],
        cues: [],
        mistakes: [],
        custom: true,
      };
      const current = await kvGetJSON<unknown>(CUSTOMS_KEY);
      const next = [...sanitizeCustoms(current), ex];
      setCustoms(next);
      await kvSetJSON(CUSTOMS_KEY, next);
      return ex;
    },
    []
  );

  const deleteCustom = useCallback(async (id: string) => {
    const current = await kvGetJSON<unknown>(CUSTOMS_KEY);
    const next = sanitizeCustoms(current).filter((e) => e.id !== id);
    setCustoms(next);
    await kvSetJSON(CUSTOMS_KEY, next);
    // Drop it from favorites too.
    const favsCurrent = await kvGetJSON<unknown>(FAVS_KEY);
    const favsNext = sanitizeFavs(favsCurrent).filter((f) => f !== id);
    setFavs(favsNext);
    await kvSetJSON(FAVS_KEY, favsNext);
  }, []);

  const value = useMemo<LibraryContextValue>(() => {
    const exercises: StoredExercise[] = [...EXERCISES, ...customs];
    const byId = new Map(exercises.map((e) => [e.id, e]));
    const favSet = new Set(favs);
    return {
      ready,
      exercises,
      byId,
      favs,
      isFav: (id: string) => favSet.has(id),
      toggleFav,
      customs,
      addCustom,
      deleteCustom,
    };
  }, [ready, customs, favs, toggleFav, addCustom, deleteCustom]);

  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider');
  return ctx;
}
