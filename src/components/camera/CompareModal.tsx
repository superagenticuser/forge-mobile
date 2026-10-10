// Progress photo compare: side-by-side and drag-slider views.
// Ports openCompare from js/progress.js.
import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@/src/storage/settings';
import { radius, spacing } from '@/src/theme';
import type { PhotoEntry } from '@/src/storage/db';

type CmpMode = 'side' | 'slider';

export function CompareModal({
  visible,
  a,
  b,
  onClose,
}: {
  visible: boolean;
  a: PhotoEntry;
  b: PhotoEntry;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  const insets = useSafeAreaInsets();
  const [cmpMode, setCmpMode] = useState<CmpMode>('side');
  // Slider position as a fraction of width (0..1).
  const pos = useSharedValue(0.5);
  const [sliderW, setSliderW] = useState(0);

  const pan = Gesture.Pan().onUpdate((e) => {
    if (sliderW > 0) {
      pos.value = Math.min(0.98, Math.max(0.02, e.x / sliderW));
    }
  });

  const topStyle = useAnimatedStyle(() => ({
    width: `${pos.value * 100}%`,
  }));
  const handleStyle = useAnimatedStyle(() => ({
    left: `${pos.value * 100}%`,
  }));

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.veil}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.bg,
              paddingBottom: insets.bottom + spacing.lg,
            },
          ]}
        >
          <View style={styles.head}>
            <Text style={type.subtitle}>Compare photos</Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={colors.muted} />
            </Pressable>
          </View>
          <View style={styles.segRow}>
            {(['side', 'slider'] as CmpMode[]).map((m) => (
              <Pressable
                key={m}
                style={[
                  styles.segBtn,
                  {
                    backgroundColor:
                      cmpMode === m ? colors.accent : 'transparent',
                  },
                ]}
                onPress={() => setCmpMode(m)}
                accessibilityLabel={m === 'side' ? 'Side by side' : 'Slider'}
              >
                <Text
                  style={[
                    type.chip,
                    { color: cmpMode === m ? colors.bg : colors.muted },
                  ]}
                >
                  {m === 'side' ? 'Side by side' : 'Slider'}
                </Text>
              </Pressable>
            ))}
          </View>

          {cmpMode === 'side' ? (
            <View style={styles.sideRow}>
              <View style={styles.sideCol}>
                <Image
                  source={{ uri: a.src }}
                  style={styles.sideImg}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    type.caption,
                    { color: colors.muted, textAlign: 'center' },
                  ]}
                >
                  {a.date}
                  {a.pose ? ` · ${a.pose}` : ''}
                </Text>
              </View>
              <View style={styles.sideCol}>
                <Image
                  source={{ uri: b.src }}
                  style={styles.sideImg}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    type.caption,
                    { color: colors.muted, textAlign: 'center' },
                  ]}
                >
                  {b.date}
                  {b.pose ? ` · ${b.pose}` : ''}
                </Text>
              </View>
            </View>
          ) : (
            <GestureHandlerRootView style={styles.sliderWrap}>
              <View
                style={styles.slider}
                onLayout={(e) => {
                  setSliderW(e.nativeEvent.layout.width);
                }}
              >
                <Image
                  source={{ uri: b.src }}
                  style={styles.sliderImg}
                  resizeMode="contain"
                />
                <Animated.View style={[styles.sliderTop, topStyle]}>
                  <Image
                    source={{ uri: a.src }}
                    style={[styles.sliderImg, { width: sliderW || undefined }]}
                    resizeMode="contain"
                  />
                </Animated.View>
                <GestureDetector gesture={pan}>
                  <Animated.View style={[styles.handle, handleStyle]}>
                    <View style={styles.grip} />
                  </Animated.View>
                </GestureDetector>
                <View style={styles.labelA}>
                  <Text style={styles.labelText}>{a.date}</Text>
                </View>
                <View style={styles.labelB}>
                  <Text style={styles.labelText}>{b.date}</Text>
                </View>
              </View>
              <Text
                style={[
                  type.caption,
                  { color: colors.muted, textAlign: 'center' },
                ]}
              >
                Drag the handle to compare
              </Text>
            </GestureHandlerRootView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  veil: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  card: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  segRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
  },
  segBtn: {
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  sideRow: { flexDirection: 'row', gap: spacing.sm },
  sideCol: { flex: 1, gap: 6 },
  sideImg: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radius.lg,
    backgroundColor: '#000',
  },
  sliderWrap: { gap: spacing.sm },
  slider: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  sliderImg: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  sliderTop: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  handle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 40,
    marginLeft: -20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grip: {
    width: 4,
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  labelA: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  labelB: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  labelText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
