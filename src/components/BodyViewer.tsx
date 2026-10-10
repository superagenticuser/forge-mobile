// Interactive 3D body viewer: expo-gl + three.js mannequin with tap-to-select,
// drag rotate, pinch zoom, front/back toggle, and an anatomy info card.
// Reusable from Home, exercise detail, and the recovery phase (soreness mode).

// Emergency kill switch: set to false to disable all GL rendering (renders a
// static placeholder instead). Used to recover from native GL crashes.
export const BODY_3D_ENABLED = false;

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
      if (!size) return;
      const t = themeRef.current;
      const p = propsRef.current;
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
    },
    [size, applyPaint]
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
    setViewState(v);
    sceneRef.current?.setView(v);
  }, []);

  const handleSelect = useCallback((x: number, y: number) => {
    const scene = sceneRef.current;
    if (!scene) return;
    const mid = scene.tap(x, y);
    if (!mid) return;
    const group = groupOf(mid);
    const p = propsRef.current;
    if (p.mode === 'soreness') {
      p.onSorenessCycle?.(group);
      return;
    }
    selectedRef.current = group;
    setSelected(group);
    // Like the web app, flip to the side the tapped muscle reads best on.
    const backSide = BACK_MUSCLES.includes(mid);
    setView(backSide ? 'back' : 'front');
  }, []);

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(500)
        .maxDistance(10)
        .onEnd((e) => handleSelect(e.x, e.y)),
    [handleSelect]
  );
  const longPress = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(500)
        .maxDistance(10)
        .onStart((e) => handleSelect(e.x, e.y)),
    [handleSelect]
  );
  const panPrev = useRef<{ x: number; y: number } | null>(null);
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(1)
        .maxPointers(1)
        .minDistance(10)
        .onStart(() => {
          panPrev.current = null;
          sceneRef.current?.beginInteract();
        })
        .onUpdate((e) => {
          const prev = panPrev.current;
          panPrev.current = { x: e.translationX, y: e.translationY };
          if (prev) {
            sceneRef.current?.pan(
              e.translationX - prev.x,
              e.translationY - prev.y
            );
          }
        })
        .onEnd(() => {
          panPrev.current = null;
          sceneRef.current?.endInteract();
        }),
    []
  );
  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onStart(() => {
          sceneRef.current?.beginInteract();
          sceneRef.current?.pinchStart();
        })
        .onUpdate((e) => sceneRef.current?.pinch(e.scale))
        .onEnd(() => sceneRef.current?.endInteract()),
    []
  );
  const composed = useMemo(
    () => Gesture.Race(tap, longPress, Gesture.Simultaneous(pan, pinch)),
    [tap, longPress, pan, pinch]
  );

  const info = selected ? MUSCLE_INFO[selected] : null;

  if (!BODY_3D_ENABLED) {
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
        <Text style={[type.caption, { color: colors.muted }]}>
          3D body is temporarily disabled while we fix a crash.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.root, { height, backgroundColor: colors.bg }]}
      onLayout={onLayout}
    >
      {size && (
        <GestureDetector gesture={composed}>
          <View style={styles.fill}>
            <GLView style={styles.fill} onContextCreate={onContextCreate} />
            {(props.showViewToggle ?? true) && (
              <View style={styles.viewToggle} pointerEvents="box-none">
                {(['front', 'back'] as const).map((v) => (
                  <Pressable
                    key={v}
                    onPress={() => setView(v)}
                    style={[
                      styles.viewButton,
                      {
                        backgroundColor:
                          view === v ? colors.accent : colors.surface,
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
            {props.mode === 'soreness' && (
              <View style={styles.hint} pointerEvents="none">
                <Text style={[type.caption, { color: colors.muted }]}>
                  {SORENESS_HINT}
                </Text>
              </View>
            )}
            {info && props.mode !== 'soreness' && (
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
        </GestureDetector>
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
