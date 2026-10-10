// Progress > Coach: data-driven training advice. Ports the web app's
// coach Q&A (js/progress.js answerCoach) plus the virtual meet simulator
// (renderMeetTool): enter attempts per lift, get total and DOTS score.
// Mesocycle/WOD tools live in later phases; the warm-up calculator is
// already in the workout player.
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { WorkoutLog } from '@/src/storage/workout';
import { useTheme } from '@/src/storage/settings';
import { fmtWeight, parseNum, toKgFromDisplay } from '@/src/lib/training';
import {
  checkDeload,
  correlationInsights,
  detectPlateaus,
  dotsFromTotal,
  fmtDateKey,
  loadMeasures,
  muscleBalance,
  totalVolumeKg,
} from '@/src/lib/progress';
import {
  getCheckin,
  getSoreness,
  loadCheckinMap,
  recoveryLabel,
  recoveryScore,
  type CheckinData,
} from '@/src/lib/recovery';
import { EmptyNote, Muted, SectionTitle } from '@/src/components/progress/ui';
import { radius, spacing } from '@/src/theme';

interface RecoveryContext {
  score: number;
  checkin: CheckinData | null;
  checkins: Record<string, CheckinData>;
  soreCount: number;
}

function answerCoach(
  q: string,
  logs: WorkoutLog[],
  nameOf: (id: string) => string | null,
  primaryOf: (id: string) => string | null,
  units: 'kg' | 'lb',
  rec: RecoveryContext
): string {
  if (!logs.length) return 'I need more data. Log a few workouts first.';
  if (/recover|readiness|sore/.test(q)) {
    const bits = [
      `Your recovery score is ${rec.score}% (${recoveryLabel(rec.score)}).`,
    ];
    if (rec.checkin?.sleep != null)
      bits.push(`You slept ${rec.checkin.sleep}h last night.`);
    if (rec.soreCount > 0)
      bits.push(
        `${rec.soreCount} muscle group${rec.soreCount === 1 ? ' is' : 's are'} sore today.`
      );
    if (rec.score < 40) bits.push('Take a rest day or do light mobility work.');
    else if (rec.score < 60)
      bits.push('Keep today moderate and prioritize sleep tonight.');
    else bits.push('You are cleared to train hard.');
    return bits.join(' ');
  }
  if (/bench|stuck|plateau/.test(q)) {
    const plats = detectPlateaus(logs, nameOf);
    const bp = plats.find((p) => /bench|press/i.test(p.name));
    return bp
      ? `Your ${bp.name} has stalled for ${bp.sessions} sessions. Try adding a back-off set, swapping to incline for 2 weeks, or checking your sleep.`
      : 'No bench plateau detected. Keep progressing!';
  }
  if (/sleep/.test(q)) {
    const corr = correlationInsights(logs, rec.checkins);
    if (corr.length) return corr[0];
    const ci = rec.checkin;
    return ci?.sleep != null
      ? `You logged ${ci.sleep}h of sleep. Keep logging daily to unlock sleep-vs-performance correlations.`
      : 'Log sleep in daily check-ins to unlock recovery insights.';
  }
  if (/volume|how much/.test(q)) {
    return `You have lifted ${fmtWeight(totalVolumeKg(logs), units)} total across ${logs.length} workouts.`;
  }
  if (/balance|imbalance/.test(q)) {
    const bal = muscleBalance(logs, primaryOf);
    return `Push/pull ratio is ${bal.ratio ? bal.ratio.toFixed(2) : 'unknown'}. Aim for 1.0 or slightly pull-dominant.`;
  }
  if (/deload|tired/.test(q)) {
    return checkDeload(logs)
      ? 'Yes, your volume is dropping. Take a light week.'
      : 'No deload needed right now. Keep pushing.';
  }
  return 'I need more data. Log a few workouts first.';
}

const LIFTS = ['Squat', 'Bench', 'Deadlift'];

function VirtualMeet({ units }: { units: 'kg' | 'lb' }) {
  const theme = useTheme();
  const { colors, type } = theme;
  const [attempts, setAttempts] = useState<string[][]>(
    LIFTS.map(() => ['', '', ''])
  );
  const [bw, setBw] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const setAtt = (li: number, ai: number, v: string) =>
    setAttempts((prev) =>
      prev.map((row, i) =>
        i === li ? row.map((c, j) => (j === ai ? v : c)) : row
      )
    );

  const calc = async () => {
    const best = attempts.map((row) =>
      Math.max(0, ...row.map((v) => toKgFromDisplay(parseNum(v) ?? 0, units)))
    );
    let bwKg = toKgFromDisplay(parseNum(bw) ?? 0, units);
    if (!bwKg) {
      const m = await loadMeasures();
      const last = m.length ? m[m.length - 1] : null;
      if (last && last.weight)
        bwKg = units === 'lb' ? last.weight * 0.453592 : last.weight;
    }
    const total = best[0] + best[1] + best[2];
    if (total <= 0 || bwKg <= 0) {
      setResult('Enter at least one attempt and your bodyweight.');
      return;
    }
    const dots = dotsFromTotal(total, bwKg);
    setResult(
      `Total: ${fmtWeight(total, units)} · DOTS: ${dots != null ? dots : '-'}`
    );
  };

  const inputStyle = [
    type.body,
    styles.input,
    {
      color: colors.ink,
      backgroundColor: colors.surface,
      borderColor: colors.line,
    },
  ];

  return (
    <View
      style={[
        styles.tool,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      <Text style={[type.subtitle, { color: colors.ink }]}>
        Virtual meet simulator
      </Text>
      <Muted>
        Enter up to 3 attempts per lift ({units}). Your heaviest successful
        attempt counts.
      </Muted>
      {LIFTS.map((l, li) => (
        <View key={l} style={styles.liftRow}>
          <Text style={[type.body, { color: colors.ink, minWidth: 80 }]}>
            {l}
          </Text>
          {[0, 1, 2].map((a) => (
            <TextInput
              key={a}
              style={[inputStyle, styles.attInput]}
              keyboardType="decimal-pad"
              placeholder={`Att ${a + 1}`}
              placeholderTextColor={colors.muted}
              value={attempts[li][a]}
              onChangeText={(v) => setAtt(li, a, v)}
            />
          ))}
        </View>
      ))}
      <View style={styles.liftRow}>
        <Text style={[type.body, { color: colors.ink, minWidth: 80 }]}>
          Bodyweight
        </Text>
        <TextInput
          style={[inputStyle, { flex: 1 }]}
          keyboardType="decimal-pad"
          placeholder={units}
          placeholderTextColor={colors.muted}
          value={bw}
          onChangeText={setBw}
        />
      </View>
      <Pressable
        style={[styles.button, { backgroundColor: colors.accent }]}
        onPress={calc}
      >
        <Text style={[type.chip, { color: colors.bg }]}>Calculate total</Text>
      </Pressable>
      {result && (
        <Text style={[type.subtitle, { color: colors.accent }]}>{result}</Text>
      )}
    </View>
  );
}

export function CoachTab({
  logs,
  nameOf,
  primaryOf,
}: {
  logs: WorkoutLog[];
  nameOf: (id: string) => string | null;
  primaryOf: (id: string) => string | null;
}) {
  const theme = useTheme();
  const { colors, type, settings } = theme;
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [rec, setRec] = useState<RecoveryContext>({
    score: 100,
    checkin: null,
    checkins: {},
    soreCount: 0,
  });
  const units = settings.units === 'lb' ? 'lb' : 'kg';

  useEffect(() => {
    (async () => {
      const todayKey = fmtDateKey(new Date());
      const [checkin, sore, checkins] = await Promise.all([
        getCheckin(todayKey),
        getSoreness(),
        loadCheckinMap(),
      ]);
      setRec({
        score: recoveryScore(logs),
        checkin,
        checkins,
        soreCount: Object.keys(sore[todayKey] ?? {}).length,
      });
    })();
  }, [logs]);

  const ask = () => {
    setAnswer(
      answerCoach(q.toLowerCase(), logs, nameOf, primaryOf, units, rec)
    );
  };

  const suggestions = useMemo(
    () => [
      'Why is my bench stuck?',
      'Do I need a deload?',
      'How is my recovery?',
      'How much volume have I lifted?',
      'Is my training balanced?',
    ],
    []
  );

  return (
    <View style={styles.root}>
      <SectionTitle>Ask your coach</SectionTitle>
      <Muted>Answers from your own training data.</Muted>
      {!logs.length && (
        <EmptyNote
          title="No training data yet"
          body="Log a few workouts and the coach can answer from your numbers."
        />
      )}
      <View
        style={[
          styles.askRow,
          { backgroundColor: colors.surface, borderColor: colors.line },
        ]}
      >
        <TextInput
          style={[type.body, styles.askInput, { color: colors.ink }]}
          placeholder="e.g. why is my bench stuck?"
          placeholderTextColor={colors.muted}
          value={q}
          onChangeText={setQ}
          onSubmitEditing={ask}
          returnKeyType="send"
        />
        <Pressable
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={ask}
        >
          <Text style={[type.chip, { color: colors.bg }]}>Ask</Text>
        </Pressable>
      </View>
      <View style={styles.suggestions}>
        {suggestions.map((s) => (
          <Pressable
            key={s}
            onPress={() => {
              setQ(s);
              setAnswer(
                answerCoach(
                  s.toLowerCase(),
                  logs,
                  nameOf,
                  primaryOf,
                  units,
                  rec
                )
              );
            }}
            style={[
              styles.sugg,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
          >
            <Text style={[type.caption, { color: colors.muted }]}>{s}</Text>
          </Pressable>
        ))}
      </View>
      {answer && (
        <View
          style={[
            styles.answer,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <Text style={[type.body, { color: colors.ink }]}>
            <Text style={{ fontWeight: '800', color: colors.accent }}>
              Coach:{' '}
            </Text>
            {answer}
          </Text>
        </View>
      )}

      <SectionTitle>Virtual meet</SectionTitle>
      <VirtualMeet units={units} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  askRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.sm,
    paddingLeft: spacing.md,
  },
  askInput: { flex: 1 },
  button: {
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  sugg: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  answer: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  tool: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  liftRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  attInput: { width: 76 },
});
