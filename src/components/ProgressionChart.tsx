// Progression chart: 1RM-over-time for an exercise, rendered with react-native-svg.
// Ports the web app's canvas chart (js/views.js) to native.
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/src/storage/settings';
import { loadWorkoutLogs, type WorkoutLog } from '@/src/storage/workout';
import { bestEpley1RM } from '@/src/lib/training';

interface HistoryPoint {
  date: string;
  ts: number;
  value: number;
}

async function getExerciseHistory(exId: string): Promise<HistoryPoint[]> {
  const logs: WorkoutLog[] = await loadWorkoutLogs();
  const hist: HistoryPoint[] = [];
  for (const w of logs) {
    const ex = w.exercises.find((e) => e.id === exId);
    if (ex) {
      const sets = ex.sets.map((s) => ({
        weight: s.weight ?? 0,
        reps: s.reps ?? 0,
      }));
      const orm = bestEpley1RM(sets);
      if (orm > 0) {
        hist.push({ date: w.date, ts: w.ts, value: orm });
      }
    }
  }
  // Sort by date ascending
  hist.sort((a, b) => a.ts - b.ts);
  return hist;
}

export function ProgressionChart({ exerciseId }: { exerciseId: string }) {
  const theme = useTheme();
  const { colors, type } = theme;
  const [history, setHistory] = useState<HistoryPoint[] | null>(null);

  useEffect(() => {
    getExerciseHistory(exerciseId).then(setHistory);
  }, [exerciseId]);

  if (history === null) {
    return null;
  }

  if (history.length < 2) {
    return (
      <Text style={[type.body, { color: colors.muted }]}>
        {history.length === 1
          ? 'Log this exercise once more to see your progression chart.'
          : 'Log this exercise to see your progression chart.'}
      </Text>
    );
  }

  // Chart dimensions
  const width = 320;
  const height = 170;
  const pL = 44;
  const pR = 10;
  const pT = 10;
  const pB = 22;

  const vals = history.map((h) => h.value);
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  const pad = Math.max((mx - mn) * 0.3, 1);
  const lo = mn - pad;
  const rg = mx - mn + pad * 2 || 1;

  const X = (i: number) =>
    pL + (i / (vals.length - 1)) * (width - pL - pR);
  const Y = (v: number) =>
    pT + (1 - (v - lo) / rg) * (height - pT - pB);

  const points = vals.map((v, i) => `${X(i)},${Y(v)}`).join(' ');

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const formatWeight = (v: number) => v.toFixed(1);

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Gridlines */}
        {[0, 1, 2].map((g) => {
          const gv = lo + (rg * g) / 2;
          const gy = Y(gv);
          return (
            <Line
              key={g}
              x1={pL}
              y1={gy}
              x2={width - pR}
              y2={gy}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={1}
            />
          );
        })}
        {/* Y-axis labels */}
        {[0, 1, 2].map((g) => {
          const gv = lo + (rg * g) / 2;
          const gy = Y(gv);
          return (
            <SvgText
              key={`label-${g}`}
              x={pL - 6}
              y={gy + 4}
              fontSize={11}
              fill="#8a93a6"
              textAnchor="end"
            >
              {formatWeight(gv)}
            </SvgText>
          );
        })}
        {/* Line */}
        <Polyline
          points={points}
          fill="none"
          stroke={colors.accent}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        {/* Dots */}
        {vals.map((v, i) => (
          <Circle
            key={i}
            cx={X(i)}
            cy={Y(v)}
            r={3.5}
            fill={colors.accent}
          />
        ))}
        {/* X-axis labels */}
        <SvgText
          x={pL}
          y={height - 6}
          fontSize={11}
          fill="#8a93a6"
          textAnchor="start"
        >
          {formatDate(history[0].date)}
        </SvgText>
        <SvgText
          x={width - pR}
          y={height - 6}
          fontSize={11}
          fill="#8a93a6"
          textAnchor="end"
        >
          {formatDate(history[history.length - 1].date)}
        </SvgText>
      </Svg>
    </View>
  );
}
