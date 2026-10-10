// Exercise demo player: animated stick-figure with scrub control.
// Ports the web app's canvas demos (js/demo.js) to react-native-svg.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';

import { useTheme } from '@/src/storage/settings';
import { spacing } from '@/src/theme';

import DEMOS from '@/src/data/exerciseDemos.json';

interface Joint {
  x: number;
  y: number;
}

interface Pose {
  hd: Joint;
  sh: Joint;
  el: Joint;
  ha: Joint;
  hip: Joint;
  kn: Joint;
  an: Joint;
  kn2: Joint;
  an2: Joint;
}

interface DemoFrame {
  p: Pose;
  dur: number;
  step: number;
}

interface Demo {
  hot?: string;
  prop?: string;
  frames: DemoFrame[];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = {} as Pose;
  for (const k of Object.keys(a) as (keyof Pose)[]) {
    out[k] = {
      x: lerp(a[k].x, b[k].x, t),
      y: lerp(a[k].y, b[k].y, t),
    };
  }
  return out;
}

export function ExerciseDemo({ pattern }: { pattern: string }) {
  const theme = useTheme();
  const { colors, type } = theme;
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);
  const progressRef = useRef(0);
  const rafRef = useRef<number>(0);

  const demo = (DEMOS as Record<string, Demo>)[pattern] || null;

  const totalDur = useMemo(() => {
    if (!demo) return 0;
    return demo.frames.reduce((sum, f) => sum + f.dur, 0);
  }, [demo]);

  // Get pose at progress (0-1)
  const getPose = (p: number): Pose | null => {
    if (!demo || demo.frames.length === 0) return null;
    const t = p * totalDur;
    let acc = 0;
    for (let i = 0; i < demo.frames.length; i++) {
      const f = demo.frames[i];
      if (t <= acc + f.dur || i === demo.frames.length - 1) {
        const next = demo.frames[(i + 1) % demo.frames.length];
        const localT = Math.min(1, Math.max(0, (t - acc) / f.dur));
        return lerpPose(f.p, next.p, localT);
      }
      acc += f.dur;
    }
    return demo.frames[0].p;
  };

  // Animation loop
  useEffect(() => {
    if (!playing || !demo) return;
    const startTime = Date.now() - progressRef.current * totalDur * 1000;
    const tick = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const p = (elapsed % totalDur) / totalDur;
      progressRef.current = p;
      setProgress(p);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, demo, totalDur]);

  // Scrub gesture
  const scrubGesture = Gesture.Pan()
    .onUpdate((e) => {
      // Scrub based on horizontal movement
      // This is simplified; a full implementation would track the slider
    });

  if (!demo) {
    return (
      <Text style={[type.body, { color: colors.muted }]}>
        No demo available for this exercise.
      </Text>
    );
  }

  const pose = getPose(progress);
  if (!pose) return null;

  // SVG viewport: fit the full pose range (X: -1.02..0.94, Y: -0.12..2.16)
  // into the viewport with padding. World Y is up, SVG Y is down.
  const W = 200;
  const H = 200;
  const scale = 79;
  const cx = 103;
  const cy = 180;

  const toSvg = (j: Joint) => ({
    x: cx + j.x * scale,
    y: cy - j.y * scale, // Flip Y (world Y up, SVG Y down)
  });

  const pHd = toSvg(pose.hd);
  const pSh = toSvg(pose.sh);
  const pEl = toSvg(pose.el);
  const pHa = toSvg(pose.ha);
  const pHip = toSvg(pose.hip);
  const pKn = toSvg(pose.kn);
  const pAn = toSvg(pose.an);
  const pKn2 = toSvg(pose.kn2);
  const pAn2 = toSvg(pose.an2);

  const strokeColor = colors.accent;
  const strokeWidth = 4;

  return (
    <View style={styles.container}>
      <Svg width={W} height={H}>
        {/* Head */}
        <Circle cx={pHd.x} cy={pHd.y} r={8} fill={strokeColor} />
        {/* Torso */}
        <Line x1={pSh.x} y1={pSh.y} x2={pHip.x} y2={pHip.y} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        {/* Arm */}
        <Line x1={pSh.x} y1={pSh.y} x2={pEl.x} y2={pEl.y} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        <Line x1={pEl.x} y1={pEl.y} x2={pHa.x} y2={pHa.y} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        {/* Leg 1 */}
        <Line x1={pHip.x} y1={pHip.y} x2={pKn.x} y2={pKn.y} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        <Line x1={pKn.x} y1={pKn.y} x2={pAn.x} y2={pAn.y} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        {/* Leg 2 */}
        <Line x1={pHip.x} y1={pHip.y} x2={pKn2.x} y2={pKn2.y} stroke={strokeColor} strokeWidth={strokeWidth * 0.7} strokeLinecap="round" opacity={0.6} />
        <Line x1={pKn2.x} y1={pKn2.y} x2={pAn2.x} y2={pAn2.y} stroke={strokeColor} strokeWidth={strokeWidth * 0.7} strokeLinecap="round" opacity={0.6} />
      </Svg>
      <View style={styles.controls}>
        <Pressable
          onPress={() => setPlaying(!playing)}
          style={[styles.button, { backgroundColor: colors.surface }]}
        >
          <Text style={[type.body, { color: colors.ink }]}>
            {playing ? 'Pause' : 'Play'}
          </Text>
        </Pressable>
        <Text style={[type.caption, { color: colors.muted }]}>
          {Math.round(progress * 100)}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
});
