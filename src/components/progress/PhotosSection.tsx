// Progress photos section: capture, timeline grid, tap-two-to-compare,
// delete. Ports renderPhotos/openCompare from js/progress.js.
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/src/storage/settings';
import { radius, spacing } from '@/src/theme';
import { deletePhoto, getPhotos, type PhotoEntry } from '@/src/storage/db';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { CameraModal } from '@/src/components/camera/CameraModal';
import { CompareModal } from '@/src/components/camera/CompareModal';
import { deleteAsync } from 'expo-file-system/legacy';

export function PhotosSection() {
  const theme = useTheme();
  const { colors, type } = theme;
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [comparePair, setComparePair] = useState<
    [PhotoEntry, PhotoEntry] | null
  >(null);
  const [pendingDelete, setPendingDelete] = useState<PhotoEntry | null>(null);

  const load = useCallback(async () => {
    try {
      setPhotos(await getPhotos());
    } catch {
      setPhotos([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSelect = useCallback(
    (id: number) => {
      setSelected((sel) => {
        let next: number[];
        if (sel.includes(id)) {
          next = sel.filter((x) => x !== id);
        } else {
          next = [...sel, id];
          if (next.length > 2) next = next.slice(next.length - 2);
        }
        if (next.length === 2) {
          const pair = next
            .map((x) => photos.find((p) => p.id === x))
            .filter((p): p is PhotoEntry => !!p)
            .sort((x, y) => x.ts - y.ts);
          if (pair.length === 2) {
            setComparePair([pair[0], pair[1]]);
            return [];
          }
        }
        return next;
      });
    },
    [photos]
  );

  const doDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setPendingDelete(null);
    setSelected([]);
    try {
      await deleteAsync(pendingDelete.src);
    } catch {
      // File may already be gone.
    }
    await deletePhoto(pendingDelete.id);
    load();
  }, [pendingDelete, load]);

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Text style={type.subtitle}>Progress photos</Text>
        <Pressable
          style={[styles.captureBtn, { backgroundColor: colors.accent }]}
          onPress={() => setCaptureOpen(true)}
          accessibilityLabel="Take progress photo"
        >
          <Ionicons name="camera" size={18} color={colors.bg} />
          <Text style={[type.chip, { color: colors.bg }]}>Take photo</Text>
        </Pressable>
      </View>

      {photos.length >= 2 && (
        <Text style={[type.caption, { color: colors.muted }]}>
          Tap two photos to compare them side by side.
        </Text>
      )}

      {photos.length === 0 ? (
        <View
          style={[
            styles.empty,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <Ionicons name="camera-outline" size={24} color={colors.muted} />
          <Text
            style={[type.body, { color: colors.muted, textAlign: 'center' }]}
          >
            No photos yet. Take a progress photo to start tracking.
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {photos.map((p) => {
            const isSel = selected.includes(p.id);
            return (
              <Pressable
                key={p.id}
                style={[
                  styles.item,
                  {
                    borderColor: isSel ? colors.accent : colors.line,
                    borderWidth: isSel ? 3 : 1,
                  },
                ]}
                onPress={() => toggleSelect(p.id)}
                accessibilityLabel={`Progress photo ${p.date}`}
              >
                <Image
                  source={{ uri: p.src }}
                  style={styles.img}
                  resizeMode="cover"
                />
                {p.pose && (
                  <View style={styles.poseTag}>
                    <Text style={styles.poseText}>{p.pose}</Text>
                  </View>
                )}
                <Text style={styles.dateText}>{p.date}</Text>
                <Pressable
                  style={styles.delBtn}
                  onPress={() => setPendingDelete(p)}
                  hitSlop={8}
                  accessibilityLabel="Delete photo"
                >
                  <Ionicons name="close-circle" size={24} color="#fff" />
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      )}

      <CameraModal
        visible={captureOpen}
        mode="photo"
        title="Take progress photo"
        onClose={() => {
          setCaptureOpen(false);
          load();
        }}
      />

      {comparePair && (
        <CompareModal
          visible
          a={comparePair[0]}
          b={comparePair[1]}
          onClose={() => setComparePair(null)}
        />
      )}

      <ConfirmDialog
        visible={!!pendingDelete}
        title="Delete photo?"
        message="This removes the photo from your device. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={doDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  empty: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    width: '100%',
  },
  item: {
    width: '31%',
    aspectRatio: 3 / 4,
    minHeight: 120,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  img: { ...StyleSheet.absoluteFill },
  poseTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  poseText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  dateText: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 3,
  },
  delBtn: { position: 'absolute', top: 2, right: 2 },
});
