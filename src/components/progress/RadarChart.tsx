// Movement-balance radar chart (react-native-svg). Ports the web app's
// radarSection (js/progress.js): sets per movement pattern over the last
// 28 days, hexagon grid, accent polygon, weakest-pattern callout.
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/src/storage/settings';
import { PATTERNS, PATTERN_NAMES, type Pattern } from '@/src/lib/progress';
import { Muted } from '@/src/components/progress/ui';
import { spacing } from '@/src/theme';

const W = 400;
const H = 360;
const CX = 200;
const CY = 180;
const R = 115;

function pt(i: number, frac: number): [number, number] {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / PATTERNS.length;
  return [CX + Math.cos(a) * R * frac, CY + Math.sin(a) * R * frac];
}

const f1 = (n: number) => n.toFixed(1);

export function RadarChart({ vol }: { vol: Record<Pattern, number> }) {
  const theme = useTheme();
  const { colors, type } = theme;

  const geom = useMemo(() => {
    const max = Math.max(1, ...PATTERNS.map((p) => vol[p]));
    const grid = [0.25, 0.5, 0.75, 1].map((fr) =>
      PATTERNS.map((_, i) => pt(i, fr).map(f1).join(',')).join(' ')
    );
    const poly = PATTERNS.map((p, i) =>
      pt(i, vol[p] / max)
        .map(f1)
        .join(',')
    ).join(' ');
    const dots = PATTERNS.map((p, i) => pt(i, vol[p] / max));
    return { grid, poly, dots };
  }, [vol]);

  const weakest = PATTERNS.reduce((a, b) => (vol[a] <= vol[b] ? a : b));
  const weakestTip =
    vol[weakest] === 0
      ? `No ${PATTERN_NAMES[weakest].toLowerCase()} work logged in 28 days.`
      : `${PATTERN_NAMES[weakest]} is your least trained pattern at ${vol[weakest]} sets.`;

  return (
    <View>
      <Svg
        width="100%"
        height={300}
        viewBox={`0 0 ${W} ${H}`}
        accessibilityRole="image"
        accessibilityLabel="Movement pattern balance radar chart"
      >
        {geom.grid.map((g, i) => (
          <Polygon
            key={i}
            points={g}
            fill="none"
            stroke={colors.line}
            strokeWidth={1}
          />
        ))}
        {PATTERNS.map((p, i) => {
          const xy = pt(i, 1);
          const lb = pt(i, 1.24);
          const anchor =
            Math.abs(lb[0] - CX) < 10 ? 'middle' : lb[0] > CX ? 'start' : 'end';
          return (
            <Svg key={p}>
              <Line
                x1={CX}
                y1={CY}
                x2={f1(xy[0])}
                y2={f1(xy[1])}
                stroke={colors.line}
                strokeWidth={1}
              />
              <SvgText
                x={f1(lb[0])}
                y={f1(lb[1] + 4)}
                textAnchor={anchor}
                fontSize={13}
                fontWeight="700"
                fill={colors.ink}
              >
                {PATTERN_NAMES[p]}
              </SvgText>
              <SvgText
                x={f1(lb[0])}
                y={f1(lb[1] + 20)}
                textAnchor={anchor}
                fontSize={11}
                fill={colors.muted}
              >
                {vol[p]} sets
              </SvgText>
            </Svg>
          );
        })}
        <Polygon
          points={geom.poly}
          fill={colors.accent}
          fillOpacity={0.22}
          stroke={colors.accent}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        {geom.dots.map((d, i) => (
          <Circle
            key={i}
            cx={f1(d[0])}
            cy={f1(d[1])}
            r={4}
            fill={colors.accent}
          />
        ))}
      </Svg>
      <View
        style={[
          styles.callout,
          { backgroundColor: colors.surface, borderColor: colors.line },
        ]}
      >
        <Text style={[type.body, { color: colors.ink }]}>
          Weakest pattern: {PATTERN_NAMES[weakest]}.{' '}
          <Text style={{ color: colors.muted }}>{weakestTip}</Text>
        </Text>
      </View>
      <Muted>
        Sets per movement pattern, last 28 days. Shape shows balance, not
        absolute volume. Carry covers traps, forearms, core and conditioning.
      </Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  callout: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
});
