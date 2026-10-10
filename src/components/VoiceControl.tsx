// Voice control for the workout player: hands-free set logging and workout
// commands via @react-native-voice/voice (native speech-to-text) with spoken
// feedback through expo-speech. Gated behind the voiceControl setting and the
// OS microphone permission (requested automatically by the voice library on
// Android when recognition starts).
import { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Voice from '@react-native-voice/voice';

import { useTheme } from '@/src/storage/settings';
import { useLibrary } from '@/src/storage/library';
import {
  restSecondsFor,
  supersetGroup,
  useWorkout,
  type SessionExercise,
  type SessionSet,
} from '@/src/storage/workout';
import { fmtDuration } from '@/src/lib/training';
import {
  classifyVoiceCommand,
  voiceHint,
  type Units,
} from '@/src/lib/voice';
import { spacing } from '@/src/theme';

interface OpenSet {
  exercise: SessionExercise;
  exerciseIndex: number;
  set: SessionSet;
}

/** First exercise (in order) that still has incomplete sets. */
function firstOpenExercise(
  exercises: SessionExercise[]
): { exercise: SessionExercise; index: number } | null {
  for (let i = 0; i < exercises.length; i++) {
    if (exercises[i].sets.some((s) => !s.done)) return { exercise: exercises[i], index: i };
  }
  return null;
}

/** First incomplete set of an exercise, warmup sets included. */
function firstOpenSet(exercise: SessionExercise): SessionSet | null {
  return exercise.sets.find((s) => !s.done) ?? null;
}

function findOpenSet(exercises: SessionExercise[]): OpenSet | null {
  const found = firstOpenExercise(exercises);
  if (!found) return null;
  const set = firstOpenSet(found.exercise);
  if (!set) return null;
  return { exercise: found.exercise, exerciseIndex: found.index, set };
}

export function VoiceButton() {
  const theme = useTheme();
  const { colors, type } = theme;
  const settings = theme.settings;
  const {
    workout,
    toggleSetDone,
    updateSet,
    startRest,
    skipRest,
  } = useWorkout();
  const { byId } = useLibrary();

  const [listening, setListening] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const listeningRef = useRef(false);
  const workoutRef = useRef(workout);
  workoutRef.current = workout;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const speak = useCallback((message: string) => {
    if (settingsRef.current.voiceCues) {
      try {
        Speech.speak(message, { rate: 1.05 });
      } catch {
        // TTS unavailable; the on-screen status still shows the message.
      }
    }
  }, []);

  const say = useCallback(
    (message: string, spoken?: string) => {
      setStatus(message);
      speak(spoken ?? message);
    },
    [speak]
  );

  // Complete the next open set (marks done; auto-rest follows the setting).
  const doNextSet = useCallback(() => {
    const w = workoutRef.current;
    if (!w) return false;
    const open = findOpenSet(w.exercises);
    if (!open) return false;
    toggleSetDone(open.exercise.key, open.set.key);
    return true;
  }, [toggleSetDone]);

  // Fill reps/weight on the next open set without completing it.
  const doLogSet = useCallback(
    (reps: number | null, weight: number | null) => {
      const w = workoutRef.current;
      if (!w) return false;
      const open = findOpenSet(w.exercises);
      if (!open) return false;
      const patch: { reps?: string; weight?: string } = {};
      if (reps !== null) patch.reps = String(reps);
      if (weight !== null) patch.weight = String(weight);
      if (Object.keys(patch).length === 0) return false;
      updateSet(open.exercise.key, open.set.key, patch);
      return true;
    },
    [updateSet]
  );

  // Add a weight increment to the next open set's current weight.
  const doAddWeight = useCallback(
    (amount: number) => {
      const w = workoutRef.current;
      if (!w) return false;
      const open = findOpenSet(w.exercises);
      if (!open) return false;
      const current = parseFloat(open.set.weight) || 0;
      const next = Math.round((current + amount) * 10) / 10;
      updateSet(open.exercise.key, open.set.key, { weight: String(next) });
      return next;
    },
    [updateSet]
  );

  const doStartRest = useCallback(() => {
    const w = workoutRef.current;
    const s = settingsRef.current;
    if (!w) return;
    let secs = s.restShort;
    const found = firstOpenExercise(w.exercises);
    if (found) {
      const libEx = byId.get(found.exercise.exerciseId);
      const linked =
        supersetGroup(found.index, w.exercises, w.linkedAfter).size > 1;
      secs = linked
        ? 30
        : restSecondsFor(libEx, s.restShort, s.restLong);
    }
    startRest(secs, `Voice rest ${fmtDuration(secs)}`);
  }, [byId, startRest]);

  const handleCommand = useCallback(
    (rawText: string) => {
      const units = settingsRef.current.units as Units;
      const action = classifyVoiceCommand(rawText);
      switch (action.kind) {
        case 'next-set': {
          const ok = doNextSet();
          say(
            ok ? `Set logged: "${rawText}"` : 'No open sets left.',
            ok ? 'Set logged.' : 'No open sets left.'
          );
          break;
        }
        case 'start-rest': {
          doStartRest();
          say(`Rest timer started: "${rawText}"`, 'Rest timer started.');
          break;
        }
        case 'stop-rest': {
          skipRest();
          say(`Timer stopped: "${rawText}"`, 'Timer stopped.');
          break;
        }
        case 'next-exercise': {
          const w = workoutRef.current;
          const found = w ? firstOpenExercise(w.exercises) : null;
          if (found) {
            const name = byId.get(found.exercise.exerciseId)?.name ?? 'Next exercise';
            say(`Next exercise: ${name}`, `Next exercise: ${name}.`);
          } else {
            say('All exercises are complete.', 'All exercises are complete.');
          }
          break;
        }
        case 'add-weight': {
          const next = doAddWeight(action.amount);
          if (next !== false) {
            const unitWord = units === 'lb' ? 'pounds' : 'kilos';
            say(
              `Weight set to ${next} ${units}: "${rawText}"`,
              `Weight ${next} ${unitWord}.`
            );
          } else {
            say('No open sets left.');
          }
          break;
        }
        case 'log-set': {
          const ok = doLogSet(action.reps, action.weight);
          if (ok) {
            const parts: string[] = [];
            if (action.weight !== null) parts.push(`${action.weight} ${units}`);
            if (action.reps !== null)
              parts.push(`${action.reps} rep${action.reps === 1 ? '' : 's'}`);
            const label = parts.join(' for ');
            say(`Logged: ${label}`, `Logged ${label}.`);
          } else {
            say('No open sets left.');
          }
          break;
        }
        case 'unknown': {
          say(`Heard: "${action.text}". ${voiceHint(units)}`);
          break;
        }
      }
    },
    [byId, doAddWeight, doLogSet, doNextSet, doStartRest, say, skipRest]
  );

  // Wire up the native voice events once.
  useEffect(() => {
    Voice.isAvailable()
      .then((v) => setAvailable(v === 1))
      .catch(() => setAvailable(false));

    Voice.onSpeechResults = (e) => {
      const text = e.value?.[0]?.trim() ?? '';
      if (text) handleCommand(text);
    };
    Voice.onSpeechError = (e) => {
      const code = e.error?.code ?? '';
      // 7 = no match, 6 = no speech; both just mean "try again".
      if (code === '7' || code === '6' || code === '5') {
        setStatus('Did not catch that. Try again.');
      } else {
        setStatus('Voice recognition had an issue. Try again.');
      }
      listeningRef.current = false;
      setListening(false);
    };
    Voice.onSpeechEnd = () => {
      listeningRef.current = false;
      setListening(false);
    };

    return () => {
      Voice.destroy()
        .catch(() => {})
        .finally(() => Voice.removeAllListeners());
    };
  }, [handleCommand]);

  const toggleListening = useCallback(async () => {
    if (listeningRef.current) {
      try {
        await Voice.stop();
      } catch {
        // ignore; onSpeechEnd will reset the state
      }
      listeningRef.current = false;
      setListening(false);
      return;
    }
    if (available === false) {
      setStatus('Voice recognition is not available on this device.');
      return;
    }
    setStatus(null);
    try {
      // On Android this triggers the RECORD_AUDIO permission prompt
      // automatically on first use.
      await Voice.start('en-US');
      listeningRef.current = true;
      setListening(true);
      setStatus(
        `Listening... ${voiceHint(settingsRef.current.units as Units)}`
      );
    } catch {
      listeningRef.current = false;
      setListening(false);
      setStatus('Could not start listening. Check microphone permission.');
    }
  }, [available]);

  if (!settings.voiceControl) return null;

  return (
    <View style={styles.wrap}>
      <Pressable
        style={[
          styles.button,
          {
            borderColor: listening ? colors.accent : colors.line,
            backgroundColor: listening ? colors.accent : 'transparent',
          },
        ]}
        onPress={toggleListening}
        hitSlop={8}
        accessibilityLabel={listening ? 'Stop voice control' : 'Voice control'}
        accessibilityRole="button"
      >
        <Ionicons
          name={listening ? 'stop' : 'mic'}
          size={16}
          color={listening ? colors.bg : colors.accent}
        />
        <Text
          style={[
            type.chip,
            { color: listening ? colors.bg : colors.accent },
          ]}
        >
          {listening ? 'Listening' : 'Voice'}
        </Text>
      </Pressable>
      {status !== null && (
        <View
          style={[
            styles.status,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <Ionicons
            name={listening ? 'radio' : 'chatbubble-ellipses-outline'}
            size={14}
            color={colors.accent}
          />
          <Text style={[type.caption, { color: colors.ink, flex: 1 }]}>
            {status}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    maxWidth: 280,
  },
});
