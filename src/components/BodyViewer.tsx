// Interactive 3D body viewer: expo-gl + three.js mannequin with tap-to-select,
// drag rotate, pinch zoom, front/back toggle, and an anatomy info card.
// Reusable from Home, exercise detail, and the recovery phase (soreness mode).

// Emergency kill switch: set to false to disable all GL rendering (renders a
// static placeholder instead). Used to recover from native GL crashes.
export const BODY_3D_ENABLED = true;

import { Ionicons } from '@expo/vector-icons';
import { GLView } from 'expo-gl';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PixelRatio,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import {
  BACK_MUSCLES,
  MUSCLE_INFO,
  expandMuscles,
  groupOf,
} from '@/src/data/muscles';
import { useTheme } from '@/src/storage/settings';
import { BodyScene, type BodyFinish } from '@/src/three/bodyScene';
import { radius, spacing } from '@/src/theme';

export interface BodyViewerProps {
  /** Viewer height in points. Defaults to 360. */
  height?: number;
  /** Muscle group ids to highlight (exercise detail mode). */
  highlightPrimary?: string[];
  highlightSecondary?: string[];
  /** 'soreness' turns taps into soreness-level cycling for the recovery phase. */
  mode?: 'select' | 'soreness';
  /** Soreness level by muscle group id (mild/sore/very-sore/injured). */
  sorenessByGroup?: Record<string, string>;
  onSorenessCycle?: (groupId: string) => void;
  autoRotate?: boolean;
  showViewToggle?: boolean;
}

const SORENESS_HINT =
  'Tap a muscle to cycle its soreness: mild, sore, very sore, injured.';

export function BodyViewer(props: BodyViewerProps) {
  const theme = useTheme();
  const { colors, type, settings } = theme;
  const height = props.height ?? 360;

  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setViewState] = useState<'front' | 'back'>('front');
  // If GL setup throws (device-specific context issues), fall back to the
  // placeholder instead of crashing the app. The error is shown so it can
  // be reported and fixed.
  const [glFailed, setGlFailed] = useState<string | null>(null);

  const sceneRef = useRef<BodyScene | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const themeRef = useRef({ accentHex: colors.accent, settings });
  themeRef.current = { accentHex: colors.accent, settings };
  const selectedRef = useRef<string | null>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height: h } = e.nativeEvent.layout;
    setSize((prev) => {
      if (prev && Math.abs(prev.w - width) < 1 && Math.abs(prev.h - h) < 1) {
        return prev;
      }
      return { w: width, h };
    });
  }, []);

  const applyPaint = useCallback((scene: BodyScene) => {
    const p = propsRef.current;
    if (p.mode === 'soreness') {
      scene.setSorenessTint(p.sorenessByGroup ?? {});
      return;
    }
    if (p.highlightPrimary !== undefined) {
      scene.highlight(
        p.highlightPrimary.flatMap(expandMuscles),
        (p.highlightSecondary ?? []).flatMap(expandMuscles)
      );
    } else if (selectedRef.current) {
      scene.highlight(expandMuscles(selectedRef.current), []);
    } else {
      scene.highlight([], []);
    }
  }, []);

  const onContextCreate = useCallback(
    (gl: any) => {
      if (!size || glFailed) return;
      const t = themeRef.current;
      const p = propsRef.current;
      try {
        const scene = new BodyScene(gl, {
          width: size.w,
          height: size.h,
          pixelRatio: PixelRatio.get(),
          accentHex: t.accentHex,
          finish: (t.settings.bodyFinish as BodyFinish) ?? 'standard',
          autoRotate: p.autoRotate ?? true,
          reduceMotion: t.settings.reduceMotion,
        });
        sceneRef.current = scene;
        applyPaint(scene);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('BodyViewer: 3D setup failed, using placeholder', e);
        setGlFailed(msg);
      }
    },
    [size, applyPaint, glFailed]
  );

  // Pause the render loop when the screen loses focus (tab switch etc.).
  useFocusEffect(
    useCallback(() => {
      sceneRef.current?.setActive(true);
      return () => sceneRef.current?.setActive(false);
    }, [])
  );

  useEffect(() => {
    return () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (size && sceneRef.current) sceneRef.current.resize(size.w, size.h);
  }, [size]);

  useEffect(() => {
    sceneRef.current?.setAccent(colors.accent);
  }, [colors.accent]);

  useEffect(() => {
    sceneRef.current?.setFinish(
      (settings.bodyFinish as BodyFinish) ?? 'standard'
    );
  }, [settings.bodyFinish]);

  useEffect(() => {
    sceneRef.current?.setReduceMotion(settings.reduceMotion);
  }, [settings.reduceMotion]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (scene) applyPaint(scene);
  }, [
    applyPaint,
    props.highlightPrimary,
    props.highlightSecondary,
    props.sorenessByGroup,
    props.mode,
    selected,
  ]);

  const setView = useCallback((v: 'front' | 'back') => {
    try {
      setViewState(v);
      sceneRef.current?.setView(v);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('BodyViewer: setView failed', e);
      setGlFailed(`setView: ${msg}`);
    }
  }, []);

  const handleSelect = useCallback((x: number, y: number) => {
    try {
      const scene = sceneRef.current;
      if (!scene) return;
      const mid = scene.tap(x, y);
      if (!mid) return;
      const group = groupOf(mid);
      const p = propsRef.current;
      if (p.mode === 'soreness') {
        // onSorenessCycle is async; catch rejections to avoid unhandled errors.
        Promise.resolve(p.onSorenessCycle?.(group)).catch((e) => {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn('BodyViewer: soreness cycle failed', e);
          setGlFailed(`soreness: ${msg}`);
        });
        return;
      }
      selectedRef.current = group;
      setSelected(group);
      // Like the web app, flip to the side the tapped muscle reads best on.
      const backSide = BACK_MUSCLES.includes(mid);
      setView(backSide ? 'back' : 'front');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('BodyViewer: tap failed', e);
      setGlFailed(`tap: ${msg}`);
    }
  }, []);

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(500)
        .maxDistance(10)
        .onEnd((e) => {
          'worklet';
          runOnJS(handleSelect)(e.x, e.y);
        }),
    [handleSelect]
  );
  const longPress = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(500)
        .maxDistance(10)
        .onStart((e) => {
          'worklet';
          runOnJS(handleSelect)(e.x, e.y);
        }),
    [handleSelect]
  );
  const panPrev = useRef<{ x: number; y: number } | null>(null);

  const panStart = useCallback(() => {
    panPrev.current = null;
    sceneRef.current?.beginInteract();
  }, []);
  const panUpdate = useCallback((tx: number, ty: number) => {
    const prev = panPrev.current;
    panPrev.current = { x: tx, y: ty };
    if (prev) {
      sceneRef.current?.pan(tx - prev.x, ty - prev.y);
    }
  }, []);
  const panEnd = useCallback(() => {
    panPrev.current = null;
    sceneRef.current?.endInteract();
  }, []);
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(1)
        .maxPointers(1)
        .minDistance(10)
        .onStart(() => {
          'worklet';
          runOnJS(panStart)();
        })
        .onUpdate((e) => {
          'worklet';
          runOnJS(panUpdate)(e.translationX, e.translationY);
        })
        .onEnd(() => {
          'worklet';
          runOnJS(panEnd)();
        }),
    [panStart, panUpdate, panEnd]
  );
  const pinchStart = useCallback(() => {
    sceneRef.current?.beginInteract();
    sceneRef.current?.pinchStart();
  }, []);
  const pinchUpdate = useCallback((scale: number) => {
    sceneRef.current?.pinch(scale);
  }, []);
  const pinchEnd = useCallback(() => {
    sceneRef.current?.endInteract();
  }, []);
  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onStart(() => {
          'worklet';
          runOnJS(pinchStart)();
        })
        .onUpdate((e) => {
          'worklet';
          runOnJS(pinchUpdate)(e.scale);
        })
        .onEnd(() => {
          'worklet';
          runOnJS(pinchEnd)();
        }),
    [pinchStart, pinchUpdate, pinchEnd]
  );
  const composed = useMemo(
    () => Gesture.Race(tap, longPress, Gesture.Simultaneous(pan, pinch)),
    [tap, longPress, pan, pinch]
  );

  const info = selected ? MUSCLE_INFO[selected] : null;

  // Memoize the GL surface so React state updates (selection, view toggle)
  // never re-render or disturb the native GL view.
  const glSurface = useMemo(() => {
    if (!size) return null;
    return (
      <GestureDetector gesture={composed}>
        <View style={styles.fill}>
          <GLView style={styles.fill} onContextCreate={onContextCreate} />
        </View>
      </GestureDetector>
    );
  }, [size, composed, onContextCreate]);

  if (!BODY_3D_ENABLED || glFailed) {
    return (
      <View
        style={[
          styles.root,
          {
            height,
            backgroundColor: colors.surface,
            borderColor: colors.line,
            borderWidth: 1,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <Text
          style={[type.caption, { color: colors.muted, textAlign: 'center' }]}
        >
          3D body failed to start on this device.{'\n\n'}
          {glFailed}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.root, { height, backgroundColor: colors.bg }]}
      onLayout={onLayout}
    >
      {glSurface}
      {size && (props.showViewToggle ?? true) && (
        <View style={styles.viewToggle} pointerEvents="box-none">
          {(['front', 'back'] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              style={[
                styles.viewButton,
                {
                  backgroundColor: view === v ? colors.accent : colors.surface,
                  borderColor: view === v ? colors.accent : colors.line,
                },
              ]}
            >
              <Text
                style={[
                  type.chip,
                  { color: view === v ? colors.bg : colors.muted },
                ]}
              >
                {v === 'front' ? 'Front' : 'Back'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {size && props.mode === 'soreness' && (
        <View style={styles.hint} pointerEvents="none">
          <Text style={[type.caption, { color: colors.muted }]}>
            {SORENESS_HINT}
          </Text>
        </View>
      )}
      {size && info && props.mode !== 'soreness' && (
        <View style={styles.infoWrap} pointerEvents="box-none">
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.line,
              },
            ]}
          >
            <View style={styles.infoHeader}>
              <Text style={[type.subtitle, { color: colors.accent }]}>
                {info.name}
              </Text>
              <Pressable
                onPress={() => {
                  selectedRef.current = null;
                  setSelected(null);
                }}
                hitSlop={12}
                accessibilityLabel="Close muscle info"
              >
                <Ionicons name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>
            <Text style={type.body}>{info.desc}</Text>
            <Text style={[type.caption, { color: colors.muted }]}>
              {info.function}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', overflow: 'hidden', borderRadius: radius.lg },
  fill: { flex: 1 },
  viewToggle: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  viewButton: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  hint: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: 110,
  },
  infoWrap: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
