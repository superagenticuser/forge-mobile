// Form-clip library: list an exercise's recorded clips, play them back with
// speed control, delete them. Ports openClipLibrary from js/camera.js.
import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';

import { useTheme } from '@/src/storage/settings';
import { radius, spacing } from '@/src/theme';
import {
  deleteClip,
  getClipsByExercise,
  type ClipEntry,
} from '@/src/storage/db';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { deleteAsync } from 'expo-file-system/legacy';

const SPEEDS = [0.25, 0.5, 1, 2];

function ClipItem({
  clip,
  onDeleted,
}: {
  clip: ClipEntry;
  onDeleted: () => void;
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  const [speed, setSpeed] = useState(1);
  const [confirmDel, setConfirmDel] = useState(false);

  const player = useVideoPlayer(clip.uri, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    player.playbackRate = speed;
  }, [player, speed]);

  useEffect(() => {
    return () => {
      player.release();
    };
  }, [player]);

  const doDelete = useCallback(async () => {
    setConfirmDel(false);
    try {
      await deleteAsync(clip.uri);
    } catch {
      // File may already be gone; remove the row anyway.
    }
    await deleteClip(clip.id);
    onDeleted();
  }, [clip, onDeleted]);

  return (
    <View
      style={[
        styles.item,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls
      />
      <View style={styles.meta}>
        <Text style={[type.caption, { color: colors.muted }]}>
          {clip.date}
          {clip.reps > 0 ? ` · ${clip.reps} reps` : ''}
        </Text>
        <View style={styles.speedRow}>
          {SPEEDS.map((s) => (
            <Pressable
              key={s}
              style={[
                styles.speedBtn,
                {
                  borderColor: colors.line,
                  backgroundColor: speed === s ? colors.accent : 'transparent',
                },
              ]}
              onPress={() => setSpeed(s)}
              accessibilityLabel={`Playback speed ${s}x`}
            >
              <Text
                style={[
                  type.caption,
                  { color: speed === s ? colors.bg : colors.muted },
                ]}
              >
                {s}x
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.speedBtn, { borderColor: colors.ember }]}
            onPress={() => setConfirmDel(true)}
            hitSlop={8}
            accessibilityLabel="Delete clip"
          >
            <Ionicons name="trash-outline" size={16} color={colors.ember} />
          </Pressable>
        </View>
      </View>
      <ConfirmDialog
        visible={confirmDel}
        title="Delete clip?"
        message="This removes the video from your device. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={doDelete}
        onCancel={() => setConfirmDel(false)}
      />
    </View>
  );
}

export function ClipLibraryModal({
  visible,
  exId,
  exName,
  onClose,
}: {
  visible: boolean;
  exId: string;
  exName: string;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  const insets = useSafeAreaInsets();
  const [clips, setClips] = useState<ClipEntry[]>([]);

  const load = useCallback(async () => {
    try {
      setClips(await getClipsByExercise(exId));
    } catch {
      setClips([]);
    }
  }, [exId]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.veil}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bg,
              paddingBottom: insets.bottom + spacing.lg,
            },
          ]}
        >
          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Text style={type.subtitle}>Form clips</Text>
              <Text style={[type.caption, { color: colors.muted }]}>
                {exName} · {clips.length} clip{clips.length === 1 ? '' : 's'}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={colors.muted} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.list}
            contentContainerStyle={{ gap: spacing.md }}
          >
            {clips.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons
                  name="videocam-outline"
                  size={40}
                  color={colors.muted}
                />
                <Text
                  style={[
                    type.body,
                    { color: colors.muted, textAlign: 'center' },
                  ]}
                >
                  No clips yet. Use Record during a workout to save form videos
                  here.
                </Text>
              </View>
            ) : (
              clips.map((c) => (
                <ClipItem key={c.id} clip={c} onDeleted={load} />
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  veil: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  list: { flexGrow: 0 },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  item: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  meta: { padding: spacing.md, gap: spacing.sm },
  speedRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  speedBtn: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
