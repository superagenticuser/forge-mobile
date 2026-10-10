// Reusable SVG line chart with tappable points. Native port of the web
// app's canvas session-volume chart (js/progress.js
// renderSessionVolumeChart): gridlines, area fill, accent line, dots.
// Tapping a dot selects it; the parent renders the detail card below
// (the native equivalent of the web's chart popup).
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/src/storage/settings';
import { radius, spacing } from '@/src/theme';

export interface ChartPoint {
  label: string;
  value: number;
}

interface Props {
  points: ChartPoint[];
  /** Format a y value for axis labels and the selected readout. */
  formatValue: (v: number) => string;
  /** Called with the tapped point index, or null when deselected. */
  onSelect?: (index: number | null) => void;
  selectedIndex?: number | null;
  height?: number;
  /** Accessible label for the chart. */
  accessibilityLabel?: string;
}

const PAD_L = 46;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 26;

export function LineChart({
  points,
  formatValue,
  onSelect,
  selectedIndex = null,
  height = 210,
  accessibilityLabel,
}: Props) {
  const theme = useTheme();
  const { colors, type } = theme;
  const [width, setWidth] = useState(0);

  const geom = useMemo(() => {
    if (width <= 0 || points.length === 0) return null;
    const iw = width - PAD_L - PAD_R;
    const ih = height - PAD_T - PAD_B;
    const max = Math.max(1, ...points.map((p) => p.value));
    const min = Math.min(0, ...points.map((p) => p.value));
    const span = Math.max(1e-9, max - min);
    const X = (i: number) =>
      points.length === 1
        ? PAD_L + iw / 2
        : PAD_L + (i / (points.length - 1)) * iw;
    const Y = (v: number) => PAD_T + (1 - (v - min) / span) * ih;
    const line = points
      .map(
        (p, i) =>
          `${i === 0 ? 'M' : 'L'}${X(i).toFixed(1)},${Y(p.value).toFixed(1)}`
      )
      .join(' ');
    const area = `${line} L${X(points.length - 1).toFixed(1)},${(PAD_T + ih).toFixed(1)} L${X(0).toFixed(1)},${(PAD_T + ih).toFixed(1)} Z`;
    const grid = [0, 1, 2, 3].map((g) => {
      const gv = min + (span * g) / 3;
      return { y: Y(gv), label: formatValue(gv) };
    });
    return { X, Y, line, area, grid, iw, ih };
  }, [width, points, height, formatValue]);

  const toggle = (i: number) => {
    onSelect?.(selectedIndex === i ? null : i);
  };

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
    >
      {width > 0 && geom && (
        <Svg width={width} height={height}>
          {geom.grid.map((g, i) => (
            <Svg key={`g${i}`}>
              <Line
                x1={PAD_L}
                y1={g.y}
                x2={width - PAD_R}
                y2={g.y}
                stroke={colors.line}
                strokeWidth={1}
              />
              <SvgText
                x={PAD_L - 6}
                y={g.y + 4}
                textAnchor="end"
                fontSize={11}
                fill={colors.muted}
              >
                {g.label}
              </SvgText>
            </Svg>
          ))}
          <Path d={geom.area} fill={colors.accent} opacity={0.18} />
          <Path
            d={geom.line}
            fill="none"
            stroke={colors.accent}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.length > 1 && (
            <Svg>
              <SvgText
                x={PAD_L}
                y={height - 8}
                fontSize={11}
                fill={colors.muted}
              >
                {points[0].label}
              </SvgText>
              <SvgText
                x={width - PAD_R}
                y={height - 8}
                textAnchor="end"
                fontSize={11}
                fill={colors.muted}
              >
                {points[points.length - 1].label}
              </SvgText>
            </Svg>
          )}
          {points.map((p, i) => (
            <Circle
              key={i}
              cx={geom.X(i)}
              cy={geom.Y(p.value)}
              r={selectedIndex === i ? 7 : 5}
              fill={colors.bg}
              stroke={colors.accent}
              strokeWidth={2.5}
              onPress={() => toggle(i)}
            />
          ))}
        </Svg>
      )}
      {selectedIndex != null && points[selectedIndex] && (
        <Pressable
          onPress={() => onSelect?.(null)}
          style={[
            styles.readout,
            {
              backgroundColor: colors.surface,
              borderColor: colors.line,
            },
          ]}
          accessibilityLabel="Clear selection"
        >
          <Text style={[type.body, { color: colors.ink }]}>
            {points[selectedIndex].label}:{' '}
            <Text style={{ fontWeight: '800', color: colors.accent }}>
              {formatValue(points[selectedIndex].value)}
            </Text>
          </Text>
          <Text style={[type.caption, { color: colors.muted }]}>
            Tap again to clear
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  readout: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
});
