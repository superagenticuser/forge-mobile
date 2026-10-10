// Full-screen camera modal: progress photo capture, form recorder, and
// mirror mode. Ports js/camera.js from the web app to expo-camera.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/storage/settings';
import { radius, spacing } from '@/src/theme';
import {
  getPhotos,
  insertClip,
  insertPhoto,
  type PhotoEntry,
} from '@/src/storage/db';
import { copyAsync } from 'expo-file-system/legacy';
import { Directory, Paths } from 'expo-file-system';

export type CameraMode = 'photo' | 'recorder' | 'mirror';

export const PHOTO_POSES = ['front', 'side', 'back'] as const;
export type PhotoPose = (typeof PHOTO_POSES)[number];

function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function fmtTimer(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

/** Ensure the forge-media directory exists and return it. */
function mediaDir(): Directory {
  try {
    const dir = new Directory(Paths.document, 'forge-media');
    dir.list();
    return dir;
  } catch {
    return Paths.document.createDirectory('forge-media');
  }
}

export function CameraModal({
  visible,
  mode,
  title,
  onClose,
  // Recorder mode props.
  exId,
  exName,
  onClipSaved,
  // Mirror mode HUD content.
  hud,
  onMirrorSetDone,
}: {
  visible: boolean;
  mode: CameraMode;
  title: string;
  onClose: () => void;
  exId?: string;
  exName?: string;
  onClipSaved?: (reps: number) => void;
  hud?: React.ReactNode;
  onMirrorSetDone?: () => void;
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [facing, setFacing] = useState<'front' | 'back'>(
    mode === 'mirror' || mode === 'photo' ? 'front' : 'back'
  );
  const [pose, setPose] = useState<PhotoPose>('front');
  const [ghost, setGhost] = useState<PhotoEntry | null>(null);
  const [saving, setSaving] = useState(false);

  // Recorder state.
  const [recording, setRecording] = useState(false);
  const [reps, setReps] = useState(0);
  const [recSecs, setRecSecs] = useState(0);
  const recTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset per open.
  useEffect(() => {
    if (visible) {
      setFacing(mode === 'mirror' || mode === 'photo' ? 'front' : 'back');
      setPose('front');
      setGhost(null);
      setRecording(false);
      setReps(0);
      setRecSecs(0);
    }
    return () => {
      if (recTimer.current) {
        clearInterval(recTimer.current);
        recTimer.current = null;
      }
    };
  }, [visible, mode]);

  // Ghost overlay: latest photo for the current pose.
  useEffect(() => {
    if (!visible || mode !== 'photo') return;
    let cancelled = false;
    getPhotos()
      .then((all) => {
        if (cancelled) return;
        const last = all
          .filter((p) => p.pose === pose)
          .sort((a, b) => b.ts - a.ts)[0];
        setGhost(last ?? null);
      })
      .catch(() => setGhost(null));
    return () => {
      cancelled = true;
    };
  }, [visible, mode, pose]);

  const flip = useCallback(() => {
    setFacing((f) => (f === 'front' ? 'back' : 'front'));
  }, []);

  const takePhoto = useCallback(async () => {
    if (saving || !cameraRef.current) return;
    setSaving(true);
    try {
      const pic = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: false,
      });
      if (!pic?.uri) throw new Error('no uri');
      const dir = mediaDir();
      const dest = `${dir.uri}photo-${Date.now()}.jpg`;
      await copyAsync({ from: pic.uri, to: dest });
      await insertPhoto({
        date: todayKey(),
        ts: Date.now(),
        pose,
        src: dest,
      });
      onClose();
    } catch {
      // Keep the modal open so the user can retry.
    } finally {
      setSaving(false);
    }
  }, [saving, pose, onClose]);

  const startRecording = useCallback(async () => {
    if (recording || !cameraRef.current) return;
    setRecording(true);
    setRecSecs(0);
    recTimer.current = setInterval(() => {
      setRecSecs((s) => {
        if (s + 1 >= 300) {
          stopRecordingRef.current();
          return s;
        }
        return s + 1;
      });
    }, 1000);
    try {
      // Note: CameraView has mute={true} so no microphone permission is needed.
      const res = await cameraRef.current.recordAsync({
        maxDuration: 300,
      });
      if (recTimer.current) {
        clearInterval(recTimer.current);
        recTimer.current = null;
      }
      setRecording(false);
      if (res?.uri && exId) {
        const dir = mediaDir();
        const dest = `${dir.uri}clip-${Date.now()}.mp4`;
        await copyAsync({ from: res.uri, to: dest });
        await insertClip({
          exId,
          exName: exName ?? '',
          date: todayKey(),
          ts: Date.now(),
          reps,
          mime: 'video/mp4',
          uri: dest,
        });
        onClipSaved?.(reps);
      }
      onClose();
    } catch {
      if (recTimer.current) {
        clearInterval(recTimer.current);
        recTimer.current = null;
      }
      setRecording(false);
    }
  }, [recording, exId, exName, reps, onClipSaved, onClose]);

  const stopRecordingRef = useRef(() => {});
  stopRecordingRef.current = () => {
    cameraRef.current?.stopRecording();
  };
  const stopRecording = useCallback(() => {
    stopRecordingRef.current();
  }, []);

  const bumpReps = useCallback((d: number) => {
    setReps((r) => Math.max(0, r + d));
  }, []);

  if (!visible) return null;

  if (!permission) {
    return (
      <Modal visible transparent={false} onRequestClose={onClose}>
        <View
          style={[
            styles.center,
            { backgroundColor: colors.bg, paddingTop: insets.top },
          ]}
        >
          <Text style={[type.body, { color: colors.muted }]}>
            Loading camera…
          </Text>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible transparent={false} onRequestClose={onClose}>
        <View
          style={[
            styles.center,
            {
              backgroundColor: colors.bg,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              paddingHorizontal: spacing.lg,
              gap: spacing.md,
            },
          ]}
        >
          <Ionicons name="camera-outline" size={48} color={colors.muted} />
          <Text style={[type.title, { textAlign: 'center' }]}>
            Camera access needed
          </Text>
          <Text
            style={[type.body, { color: colors.muted, textAlign: 'center' }]}
          >
            FORGE needs camera access for progress photos, form recordings, and
            mirror mode. Your photos and clips stay on this device.
          </Text>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
            onPress={requestPermission}
          >
            <Text style={[type.chip, { color: colors.bg }]}>
              Allow camera access
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.primaryBtn,
              { borderColor: colors.line, borderWidth: 1 },
            ]}
            onPress={onClose}
          >
            <Text style={[type.chip, { color: colors.ink }]}>Not now</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          mirror={facing === 'front'}
          mute
        />

        {/* Ghost overlay for consistent photo framing. */}
        {mode === 'photo' && ghost && (
          <Image
            source={{ uri: ghost.src }}
            style={styles.ghost}
            resizeMode="contain"
          />
        )}

        {/* Top bar. */}
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable
            style={styles.topBtn}
            onPress={onClose}
            hitSlop={12}
            accessibilityLabel="Close camera"
          >
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
          {mode === 'recorder' && recording ? (
            <View style={styles.timerPill}>
              <View style={styles.recDot} />
              <Text style={styles.timerText}>{fmtTimer(recSecs)}</Text>
            </View>
          ) : (
            <View style={styles.topBtn} />
          )}
        </View>

        {/* Mirror HUD. */}
        {mode === 'mirror' && hud && (
          <View style={[styles.hud, { top: insets.top + 64 }]}>{hud}</View>
        )}

        {/* Bottom controls. */}
        <View
          style={[
            styles.controls,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
        >
          {mode === 'photo' && (
            <>
              <View style={styles.poseTabs}>
                {PHOTO_POSES.map((p) => (
                  <Pressable
                    key={p}
                    style={[styles.poseTab, pose === p && styles.poseTabOn]}
                    onPress={() => setPose(p)}
                    accessibilityLabel={`${p} pose`}
                  >
                    <Text
                      style={[styles.poseText, pose === p && styles.poseTextOn]}
                    >
                      {p[0].toUpperCase() + p.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.shutterRow}>
                <Pressable
                  style={styles.flipBtn}
                  onPress={flip}
                  hitSlop={12}
                  accessibilityLabel="Switch camera"
                >
                  <Ionicons
                    name="camera-reverse-outline"
                    size={26}
                    color="#fff"
                  />
                </Pressable>
                <Pressable
                  style={styles.shutter}
                  onPress={takePhoto}
                  disabled={saving}
                  accessibilityLabel="Take photo"
                >
                  <View style={styles.shutterInner} />
                </Pressable>
                <View style={styles.flipBtn} />
              </View>
              <Text style={styles.hint}>
                Line up with the ghost of your last {pose} photo for consistent
                framing.
              </Text>
            </>
          )}

          {mode === 'recorder' && (
            <>
              <View style={styles.repRow}>
                <Pressable
                  style={styles.repBtn}
                  onPress={() => bumpReps(-1)}
                  hitSlop={8}
                  accessibilityLabel="Remove a rep"
                >
                  <Ionicons name="remove" size={22} color="#fff" />
                </Pressable>
                <View style={styles.repCount}>
                  <Text style={styles.repNum}>{reps}</Text>
                  <Text style={styles.repLabel}>reps</Text>
                </View>
                <Pressable
                  style={styles.repBtn}
                  onPress={() => bumpReps(1)}
                  hitSlop={8}
                  accessibilityLabel="Count a rep"
                >
                  <Ionicons name="add" size={22} color="#fff" />
                </Pressable>
              </View>
              <View style={styles.shutterRow}>
                <Pressable
                  style={styles.flipBtn}
                  onPress={flip}
                  disabled={recording}
                  hitSlop={12}
                  accessibilityLabel="Switch camera"
                >
                  <Ionicons
                    name="camera-reverse-outline"
                    size={26}
                    color={recording ? '#666' : '#fff'}
                  />
                </Pressable>
                <Pressable
                  style={[styles.recBtn, recording && styles.recBtnOn]}
                  onPress={recording ? stopRecording : startRecording}
                  accessibilityLabel={recording ? 'Stop recording' : 'Record'}
                >
                  <View
                    style={recording ? styles.stopSquare : styles.recDotBig}
                  />
                  <Text style={styles.recBtnText}>
                    {recording ? 'Stop' : 'Record'}
                  </Text>
                </Pressable>
                <View style={styles.flipBtn} />
              </View>
              <Text style={styles.hint}>
                Tap + for each rep. Stop recording to save the clip.
              </Text>
            </>
          )}

          {mode === 'mirror' && (
            <>
              <View style={styles.shutterRow}>
                <Pressable
                  style={styles.flipBtn}
                  onPress={flip}
                  hitSlop={12}
                  accessibilityLabel="Switch camera"
                >
                  <Ionicons
                    name="camera-reverse-outline"
                    size={26}
                    color="#fff"
                  />
                </Pressable>
                {onMirrorSetDone && (
                  <Pressable
                    style={styles.setDoneBtn}
                    onPress={onMirrorSetDone}
                    accessibilityLabel="Log set done"
                  >
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.setDoneText}>Set done</Text>
                  </Pressable>
                )}
                <View style={styles.flipBtn} />
              </View>
              <Text style={styles.hint}>
                Tap Set done to log the set and move on. Your rest timer keeps
                running.
              </Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  camera: { ...StyleSheet.absoluteFill },
  ghost: {
    ...StyleSheet.absoluteFill,
    opacity: 0.35,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    minWidth: 220,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  topBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 22,
  },
  titleText: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 4,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff3b30',
  },
  timerText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  hud: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 2,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  poseTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
  },
  poseTab: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
  },
  poseTabOn: { backgroundColor: 'rgba(255,255,255,0.9)' },
  poseText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  poseTextOn: { color: '#000' },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  flipBtn: { width: 52, alignItems: 'center' },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  hint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 4,
  },
  repRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  repBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repCount: { alignItems: 'center', minWidth: 70 },
  repNum: { color: '#fff', fontSize: 28, fontWeight: '800' },
  repLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  recBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: '#ff3b30',
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  recBtnOn: { backgroundColor: '#ff3b30' },
  recDotBig: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ff3b30',
  },
  stopSquare: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  recBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  setDoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  setDoneText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
