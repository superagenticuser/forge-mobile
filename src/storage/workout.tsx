// Active workout session state, ported from the web app's workout player
// (js/workout.js). Session state is transient (context only); completed
// workouts are persisted to the sqlite `logs` table in the web app's log
// shape (js/workout.js woFinish entry) so a future web-backup import maps 1:1.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';

import type { ProgramDayExercise } from '@/src/data/programs';
import {
  bestEpley1RM,
  fmtDuration,
  fmtLocalDate,
  parseTargetReps,
} from '@/src/lib/training';

import { getLogs, insertLog } from './db';
import { useLibrary, type StoredExercise } from './library';
import { useSettings, type Units } from './settings';

// ---------- persisted log shape (web-compatible) ----------

/** One logged set, matching the web app's set fields (weight in kg). */
export interface LoggedSet {
  reps: number;
  weight: number;
  added: number;
  rpe: number | null;
  failed: boolean;
  type: 'std';
}

export interface LoggedExercise {
  id: string;
  sets: LoggedSet[];
}

/** Completed workout, matching the web app's woFinish entry shape. */
export interface WorkoutLog {
  date: string;
  ts: number;
  programId: string | null;
  programName: string;
  dayName: string;
  week: number | null;
  exercises: LoggedExercise[];
  notes: string;
  durationMin: number;
  /** Total kg lifted across completed working sets. */
  volume: number;
}

// ---------- live session shape ----------

/** A set row in the active session. Text inputs are stored as strings to
 * keep TextInput controlled without parse churn; numbers are derived. */
export interface SessionSet {
  key: string;
  /** Weight in the user's display units, as typed. */
  weight: string;
  reps: string;
  rpe: string;
  done: boolean;
  warmup: boolean;
}

export interface SessionExercise {
  key: string;
  exerciseId: string;
  targetSets: number;
  targetReps: string;
  sets: SessionSet[];
  note: string;
  expanded: boolean;
  swapped: boolean;
}

export interface ActiveWorkout {
  programId: string | null;
  programName: string;
  dayName: string;
  week: number | null;
  startedAt: number;
  exercises: SessionExercise[];
}

export interface WorkoutSeedExercise {
  exerciseId: string;
  targetSets?: number;
  targetReps?: string;
}

export interface RestState {
  left: number;
  total: number;
  label: string;
}

export interface NewPR {
  id: string;
  name: string;
  weight: number;
  reps: number;
}

export interface WorkoutSummary {
  durationMin: number;
  volumeKg: number;
  totalSets: number;
  totalReps: number;
  prs: NewPR[];
  exerciseCount: number;
}

let keyCounter = 0;
function nextKey(prefix: string): string {
  keyCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${keyCounter}`;
}

function parseInput(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const v = parseFloat(t);
  return Number.isFinite(v) && v >= 0 ? v : null;
}

function toKg(v: number, units: Units): number {
  return units === 'lb' ? v / 2.20462 : v;
}

/** Rest seconds for an exercise, ported from js/workout.js getRestSeconds:
 * heavy compounds get the long rest, everything else the short rest. */
export function restSecondsFor(
  ex: StoredExercise | undefined,
  restShort: number,
  restLong: number
): number {
  if (!ex) return restShort;
  if (ex.equipment === 'barbell' || ex.level === 'advanced') return restLong;
  return restShort;
}

function parseLog(data: string): WorkoutLog | null {
  try {
    const v = JSON.parse(data) as WorkoutLog;
    if (!v || !Array.isArray(v.exercises)) return null;
    return v;
  } catch {
    return null;
  }
}

/** Best logged {weight, reps} for an exercise across saved logs, mirroring
 * js/core.js exercisePR. */
export function previousBest(
  exId: string,
  logs: WorkoutLog[]
): { weight: number; reps: number } | null {
  let best: { weight: number; reps: number } | null = null;
  for (const w of logs) {
    for (const x of w.exercises) {
      if (x.id !== exId) continue;
      for (const s of x.sets) {
        const wgt = s.weight || 0;
        if (
          !best ||
          wgt > best.weight ||
          (wgt === best.weight && s.reps > best.reps)
        ) {
          best = { weight: wgt, reps: s.reps };
        }
      }
    }
  }
  return best;
}

/** Most recent logged weight for an exercise, mirroring js/core.js lastWeightKg. */
export function lastWeightKg(exId: string, logs: WorkoutLog[]): number | null {
  for (let i = logs.length - 1; i >= 0; i--) {
    const x = logs[i].exercises.find((e) => e.id === exId);
    if (x) {
      for (let j = x.sets.length - 1; j >= 0; j--) {
        if (x.sets[j].weight) return x.sets[j].weight;
      }
    }
  }
  return null;
}

async function loadWorkoutLogs(): Promise<WorkoutLog[]> {
  const rows = await getLogs();
  const out: WorkoutLog[] = [];
  for (const r of rows) {
    const parsed = parseLog(r.data);
    if (parsed) out.push(parsed);
  }
  // Oldest first, like the web app's log array.
  out.sort((a, b) => a.ts - b.ts);
  return out;
}

interface WorkoutContextValue {
  workout: ActiveWorkout | null;
  rest: RestState | null;
  lastSummary: WorkoutSummary | null;
  startFreeWorkout: (exerciseIds?: string[]) => Promise<void>;
  startProgramDay: (
    programId: string,
    programName: string,
    dayName: string,
    dayExercises: ProgramDayExercise[]
  ) => Promise<void>;
  addExercise: (exerciseId: string) => void;
  removeExercise: (exKey: string) => void;
  moveExercise: (exKey: string, dir: -1 | 1) => void;
  swapExercise: (exKey: string, newExerciseId: string) => void;
  toggleExerciseExpanded: (exKey: string) => void;
  setExerciseNote: (exKey: string, note: string) => void;
  addSet: (exKey: string) => void;
  updateSet: (
    exKey: string,
    setKey: string,
    patch: Partial<Pick<SessionSet, 'weight' | 'reps' | 'rpe'>>
  ) => void;
  toggleSetDone: (exKey: string, setKey: string) => void;
  deleteSet: (exKey: string, setKey: string) => void;
  addWarmupSets: (
    exKey: string,
    sets: Array<{ weight: number; reps: number }>
  ) => void;
  startRest: (seconds: number, label: string) => void;
  skipRest: () => void;
  extendRest: (seconds: number) => void;
  cancelWorkout: () => void;
  buildSummary: () => Promise<WorkoutSummary | null>;
  saveWorkout: (notes: string) => Promise<WorkoutSummary | null>;
  clearSummary: () => void;
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const { byId } = useLibrary();
  const [workout, setWorkout] = useState<ActiveWorkout | null>(null);
  const [rest, setRest] = useState<RestState | null>(null);
  const [lastSummary, setLastSummary] = useState<WorkoutSummary | null>(null);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifIdRef = useRef<string | null>(null);
  const workoutRef = useRef<ActiveWorkout | null>(null);
  workoutRef.current = workout;
  // restRef mirrors `rest` so the 1s tick never runs side effects inside a
  // state updater (updaters must stay pure).
  const restRef = useRef<RestState | null>(null);

  // Notification presentation: banner + optional sound, matching the
  // settings the user chose for the workout player.
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: settingsRef.current.sound,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }, [settings.sound]);

  const clearRestTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const id = notifIdRef.current;
    notifIdRef.current = null;
    if (id) {
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
  }, []);

  const finishRest = useCallback(() => {
    clearRestTimer();
    restRef.current = null;
    setRest(null);
    const s = settingsRef.current;
    if (s.haptics) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {}
      );
    }
    if (s.voiceCues) {
      try {
        Speech.speak('Rest over. Next set.');
      } catch {
        // Speech engine unavailable; the notification already fired.
      }
    }
  }, [clearRestTimer]);

  const startRest = useCallback(
    (seconds: number, label: string) => {
      const sec = Math.max(5, Math.round(seconds));
      clearRestTimer();
      const state: RestState = { left: sec, total: sec, label };
      restRef.current = state;
      setRest(state);
      // Fire a local notification when the rest ends, so it works even if
      // the screen is off.
      Notifications.scheduleNotificationAsync({
        content: { title: 'Rest over', body: label },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: sec,
        },
      })
        .then((id) => {
          notifIdRef.current = id;
        })
        .catch(() => {});
      timerRef.current = setInterval(() => {
        const prev = restRef.current;
        if (!prev) return;
        if (prev.left <= 1) {
          finishRest();
          return;
        }
        const next = { ...prev, left: prev.left - 1 };
        restRef.current = next;
        setRest(next);
      }, 1000);
    },
    [clearRestTimer, finishRest]
  );

  const skipRest = useCallback(() => {
    clearRestTimer();
    restRef.current = null;
    setRest(null);
  }, [clearRestTimer]);

  const extendRest = useCallback((seconds: number) => {
    const prev = restRef.current;
    if (!prev) return;
    const next = {
      ...prev,
      left: prev.left + seconds,
      total: prev.total + seconds,
    };
    restRef.current = next;
    setRest(next);
    // Re-schedule the end notification for the new finish time.
    const id = notifIdRef.current;
    notifIdRef.current = null;
    if (id) {
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
    Notifications.scheduleNotificationAsync({
      content: { title: 'Rest over', body: prev.label },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: next.left,
      },
    })
      .then((nid) => {
        notifIdRef.current = nid;
      })
      .catch(() => {});
  }, []);

  const ensureNotifPermission = useCallback(async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('forge-rest', {
          name: 'Rest timer',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
        });
      }
    } catch {
      // Rest timer still works visually without notification permission.
    }
  }, []);

  const seedExercises = useCallback(
    (
      seeds: WorkoutSeedExercise[],
      logs: WorkoutLog[],
      units: Units
    ): SessionExercise[] => {
      return seeds.map((s, i) => {
        const targetSets = s.targetSets ?? 3;
        const targetReps = s.targetReps ?? '';
        const lastW = lastWeightKg(s.exerciseId, logs);
        const sets: SessionSet[] = [];
        for (let k = 0; k < targetSets; k++) {
          sets.push({
            key: nextKey('set'),
            weight:
              lastW != null
                ? String(
                    Math.round(
                      (units === 'lb' ? lastW * 2.20462 : lastW) * 10
                    ) / 10
                  )
                : '',
            reps: targetReps ? String(parseTargetReps(targetReps)) : '',
            rpe: '',
            done: false,
            warmup: false,
          });
        }
        return {
          key: nextKey('ex') + '-' + i,
          exerciseId: s.exerciseId,
          targetSets,
          targetReps,
          sets,
          note: '',
          expanded: i === 0,
          swapped: false,
        };
      });
    },
    []
  );

  const startFreeWorkout = useCallback(
    async (exerciseIds: string[] = []) => {
      await ensureNotifPermission();
      const logs = await loadWorkoutLogs();
      const units = settingsRef.current.units;
      const seeds: WorkoutSeedExercise[] = exerciseIds.map((id) => ({
        exerciseId: id,
        targetSets: 3,
        targetReps: '',
      }));
      setWorkout({
        programId: null,
        programName: '',
        dayName: 'Free workout',
        week: null,
        startedAt: Date.now(),
        exercises: seedExercises(seeds, logs, units),
      });
      setLastSummary(null);
    },
    [ensureNotifPermission, seedExercises]
  );

  const startProgramDay = useCallback(
    async (
      programId: string,
      programName: string,
      dayName: string,
      dayExercises: ProgramDayExercise[]
    ) => {
      await ensureNotifPermission();
      const logs = await loadWorkoutLogs();
      const units = settingsRef.current.units;
      setWorkout({
        programId,
        programName,
        dayName,
        week: null,
        startedAt: Date.now(),
        exercises: seedExercises(
          dayExercises.map((e) => ({
            exerciseId: e.id,
            targetSets: e.sets,
            targetReps: e.reps,
          })),
          logs,
          units
        ),
      });
      setLastSummary(null);
    },
    [ensureNotifPermission, seedExercises]
  );

  const addExercise = useCallback((exerciseId: string) => {
    const ex: SessionExercise = {
      key: nextKey('ex'),
      exerciseId,
      targetSets: 3,
      targetReps: '',
      sets: [0, 1, 2].map(() => ({
        key: nextKey('set'),
        weight: '',
        reps: '',
        rpe: '',
        done: false,
        warmup: false,
      })),
      note: '',
      expanded: true,
      swapped: false,
    };
    setWorkout((prev) =>
      prev
        ? {
            ...prev,
            exercises: prev.exercises
              .map((e) => ({
                ...e,
                expanded: false,
              }))
              .concat([{ ...ex, expanded: true }]),
          }
        : prev
    );
  }, []);

  const removeExercise = useCallback((exKey: string) => {
    setWorkout((prev) =>
      prev
        ? { ...prev, exercises: prev.exercises.filter((e) => e.key !== exKey) }
        : prev
    );
  }, []);

  const moveExercise = useCallback((exKey: string, dir: -1 | 1) => {
    setWorkout((prev) => {
      if (!prev) return prev;
      const idx = prev.exercises.findIndex((e) => e.key === exKey);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= prev.exercises.length) return prev;
      const next = [...prev.exercises];
      const [moved] = next.splice(idx, 1);
      next.splice(j, 0, moved);
      return { ...prev, exercises: next };
    });
  }, []);

  const swapExercise = useCallback((exKey: string, newExerciseId: string) => {
    setWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((e) => {
          if (e.key !== exKey) return e;
          // Keep the set count and targets; clear the numbers so the new
          // exercise starts fresh.
          return {
            ...e,
            exerciseId: newExerciseId,
            swapped: true,
            expanded: true,
            sets: e.sets.map((s) => ({
              ...s,
              key: nextKey('set'),
              weight: '',
              reps: s.warmup ? s.reps : '',
              rpe: '',
              done: false,
            })),
          };
        }),
      };
    });
  }, []);

  const toggleExerciseExpanded = useCallback((exKey: string) => {
    setWorkout((prev) =>
      prev
        ? {
            ...prev,
            exercises: prev.exercises.map((e) =>
              e.key === exKey ? { ...e, expanded: !e.expanded } : e
            ),
          }
        : prev
    );
  }, []);

  const setExerciseNote = useCallback((exKey: string, note: string) => {
    setWorkout((prev) =>
      prev
        ? {
            ...prev,
            exercises: prev.exercises.map((e) =>
              e.key === exKey ? { ...e, note } : e
            ),
          }
        : prev
    );
  }, []);

  const addSet = useCallback((exKey: string) => {
    setWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((e) => {
          if (e.key !== exKey) return e;
          const working = e.sets.filter((s) => !s.warmup);
          const last = working[working.length - 1];
          const template: SessionSet = {
            key: nextKey('set'),
            weight: last?.weight ?? '',
            reps:
              last?.reps ??
              (e.targetReps ? String(parseTargetReps(e.targetReps)) : ''),
            rpe: '',
            done: false,
            warmup: false,
          };
          return { ...e, sets: [...e.sets, template] };
        }),
      };
    });
  }, []);

  const updateSet = useCallback(
    (
      exKey: string,
      setKey: string,
      patch: Partial<Pick<SessionSet, 'weight' | 'reps' | 'rpe'>>
    ) => {
      setWorkout((prev) =>
        prev
          ? {
              ...prev,
              exercises: prev.exercises.map((e) =>
                e.key === exKey
                  ? {
                      ...e,
                      sets: e.sets.map((s) =>
                        s.key === setKey ? { ...s, ...patch } : s
                      ),
                    }
                  : e
              ),
            }
          : prev
      );
    },
    []
  );

  const toggleSetDone = useCallback(
    (exKey: string, setKey: string) => {
      const w = workoutRef.current;
      const s = settingsRef.current;
      const ex = w?.exercises.find((e) => e.key === exKey);
      const set = ex?.sets.find((x) => x.key === setKey);
      const willBeDone = set ? !set.done : false;

      setWorkout((prev) =>
        prev
          ? {
              ...prev,
              exercises: prev.exercises.map((e) =>
                e.key === exKey
                  ? {
                      ...e,
                      sets: e.sets.map((x) =>
                        x.key === setKey ? { ...x, done: !x.done } : x
                      ),
                    }
                  : e
              ),
            }
          : prev
      );

      if (willBeDone) {
        if (s.haptics) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
            () => {}
          );
        }
        // Auto-rest after a completed working set, like the web app.
        if (s.autoRest && ex && !set?.warmup) {
          const exercise = byId.get(ex.exerciseId);
          const secs = restSecondsFor(exercise, s.restShort, s.restLong);
          const name = exercise?.name ?? 'Next set';
          startRest(secs, `${name}: rest ${fmtDuration(secs)}`);
        }
      }
    },
    [byId, startRest]
  );

  const deleteSet = useCallback((exKey: string, setKey: string) => {
    setWorkout((prev) =>
      prev
        ? {
            ...prev,
            exercises: prev.exercises.map((e) =>
              e.key === exKey
                ? { ...e, sets: e.sets.filter((x) => x.key !== setKey) }
                : e
            ),
          }
        : prev
    );
  }, []);

  const addWarmupSets = useCallback(
    (exKey: string, sets: Array<{ weight: number; reps: number }>) => {
      const units = settingsRef.current.units;
      setWorkout((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: prev.exercises.map((e) => {
            if (e.key !== exKey) return e;
            const warmups: SessionSet[] = sets.map((ws) => ({
              key: nextKey('set'),
              weight: String(
                Math.round(
                  (units === 'lb' ? ws.weight * 2.20462 : ws.weight) * 10
                ) / 10
              ),
              reps: String(ws.reps),
              rpe: '',
              done: false,
              warmup: true,
            }));
            return { ...e, sets: [...warmups, ...e.sets] };
          }),
        };
      });
    },
    []
  );

  const cancelWorkout = useCallback(() => {
    clearRestTimer();
    setWorkout(null);
  }, [clearRestTimer]);

  /** Build the summary (and the log body) from the current session. */
  const buildSummary = useCallback(async (): Promise<WorkoutSummary | null> => {
    const w = workoutRef.current;
    if (!w) return null;
    const units = settingsRef.current.units;
    const logs = await loadWorkoutLogs();

    let volumeKg = 0;
    let totalSets = 0;
    let totalReps = 0;
    const prs: NewPR[] = [];

    for (const e of w.exercises) {
      const doneWorking = e.sets.filter((s) => s.done && !s.warmup);
      if (!doneWorking.length) continue;
      const prev = previousBest(e.exerciseId, logs);
      const exercise = byId.get(e.exerciseId);
      for (const s of doneWorking) {
        const reps = parseInput(s.reps) ?? 0;
        const wDisp = parseInput(s.weight) ?? 0;
        const wKg = toKg(wDisp, units);
        volumeKg += wKg * reps;
        totalSets += 1;
        totalReps += reps;
        // Weight PR check, mirroring the web app's woFinish logic.
        if (
          !prev ||
          wKg > prev.weight ||
          (wKg === prev.weight && reps > prev.reps)
        ) {
          if (!prs.some((p) => p.id === e.exerciseId)) {
            prs.push({
              id: e.exerciseId,
              name: exercise?.name ?? e.exerciseId,
              weight: wKg,
              reps,
            });
          }
        }
      }
    }

    if (totalSets === 0) return null;

    const durationMin = Math.max(
      1,
      Math.round((Date.now() - w.startedAt) / 60000)
    );
    const summary: WorkoutSummary = {
      durationMin,
      volumeKg,
      totalSets,
      totalReps,
      prs,
      exerciseCount: w.exercises.filter((e) =>
        e.sets.some((s) => s.done && !s.warmup)
      ).length,
    };
    setLastSummary(summary);
    return summary;
  }, [byId]);

  /** Persist the workout to the logs table and clear the session. */
  const saveWorkout = useCallback(
    async (notes: string): Promise<WorkoutSummary | null> => {
      const w = workoutRef.current;
      if (!w) return null;
      const units = settingsRef.current.units;
      const summary = await buildSummary();
      if (!summary) return null;

      const exercises: LoggedExercise[] = [];
      for (const e of w.exercises) {
        const doneWorking = e.sets.filter((s) => s.done && !s.warmup);
        if (!doneWorking.length) continue;
        exercises.push({
          id: e.exerciseId,
          sets: doneWorking.map((s) => {
            const rpe = parseInput(s.rpe);
            return {
              reps: Math.max(1, Math.round(parseInput(s.reps) ?? 0)),
              weight: toKg(parseInput(s.weight) ?? 0, units),
              added: 0,
              rpe: rpe != null ? Math.round(rpe) : null,
              failed: false,
              type: 'std' as const,
            };
          }),
        });
      }

      const now = new Date();
      const log: WorkoutLog = {
        date: fmtLocalDate(now),
        ts: now.getTime(),
        programId: w.programId,
        programName: w.programName,
        dayName: w.dayName,
        week: w.week,
        exercises,
        notes: notes.trim(),
        durationMin: summary.durationMin,
        volume: summary.volumeKg,
      };
      await insertLog({
        date: log.date,
        ts: log.ts,
        data: JSON.stringify(log),
      });

      clearRestTimer();
      setWorkout(null);
      setLastSummary(summary);
      return summary;
    },
    [buildSummary, clearRestTimer]
  );

  const clearSummary = useCallback(() => setLastSummary(null), []);

  const value = useMemo<WorkoutContextValue>(
    () => ({
      workout,
      rest,
      lastSummary,
      startFreeWorkout,
      startProgramDay,
      addExercise,
      removeExercise,
      moveExercise,
      swapExercise,
      toggleExerciseExpanded,
      setExerciseNote,
      addSet,
      updateSet,
      toggleSetDone,
      deleteSet,
      addWarmupSets,
      startRest,
      skipRest,
      extendRest,
      cancelWorkout,
      buildSummary,
      saveWorkout,
      clearSummary,
    }),
    [
      workout,
      rest,
      lastSummary,
      startFreeWorkout,
      startProgramDay,
      addExercise,
      removeExercise,
      moveExercise,
      swapExercise,
      toggleExerciseExpanded,
      setExerciseNote,
      addSet,
      updateSet,
      toggleSetDone,
      deleteSet,
      addWarmupSets,
      startRest,
      skipRest,
      extendRest,
      cancelWorkout,
      buildSummary,
      saveWorkout,
      clearSummary,
    ]
  );

  return (
    <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>
  );
}

export function useWorkout(): WorkoutContextValue {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used within WorkoutProvider');
  return ctx;
}

/** Best Epley 1RM for an exercise from saved logs (for the detail screen). */
export function useExerciseHistory(exerciseId: string): {
  ready: boolean;
  best1RMKg: number;
  lastWeightKg: number | null;
  sessionCount: number;
} {
  const [state, setState] = useState({
    ready: false,
    best1RMKg: 0,
    lastWeightKg: null as number | null,
    sessionCount: 0,
  });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const logs = await loadWorkoutLogs();
      if (cancelled) return;
      const sets: Array<{ weight: number; reps: number }> = [];
      let sessions = 0;
      for (const w of logs) {
        const x = w.exercises.find((e) => e.id === exerciseId);
        if (x && x.sets.length) {
          sessions += 1;
          for (const s of x.sets) sets.push({ weight: s.weight, reps: s.reps });
        }
      }
      setState({
        ready: true,
        best1RMKg: bestEpley1RM(sets),
        lastWeightKg: lastWeightKg(exerciseId, logs),
        sessionCount: sessions,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [exerciseId]);
  return state;
}
