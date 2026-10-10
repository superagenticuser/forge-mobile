// Set-type picker for the workout player, ported from the web app's
// set-type select (js/workout.js): Std, Warmup, Drop, R-P, Cluster, Myo.
import { Ionicons } from '@expo/vector-icons';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  SET_TYPES,
  SET_TYPE_DESC,
  SET_TYPE_SHORT,
  type SetType,
} from '@/src/lib/training';
import { useTheme } from '@/src/storage/settings';
import { radius, spacing } from '@/src/theme';

export function SetTypeModal({
  visible,
  current,
  onClose,
  onPick,
}: {
  visible: boolean;
  current: SetType;
  onClose: () => void;
  onPick: (type: SetType) => void;
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.veil} onPress={onClose}>
        <SafeAreaView
          style={styles.sheetWrap}
          edges={['bottom']}
          pointerEvents="box-none"
        >
          <Pressable
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[type.subtitle, styles.title]}>Set type</Text>
            <ScrollView>
              {SET_TYPES.map((t) => {
                const active = t === current;
                return (
                  <Pressable
                    key={t}
                    style={[
                      styles.row,
                      {
                        backgroundColor: active ? colors.bg : 'transparent',
                        borderColor: active ? colors.accent : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      onPick(t);
                      onClose();
                    }}
                  >
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: active ? colors.accent : colors.line,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: active ? colors.bg : colors.ink },
                        ]}
                      >
                        {SET_TYPE_SHORT[t]}
                      </Text>
                    </View>
                    <Text style={[type.body, { color: colors.ink, flex: 1 }]}>
                      {SET_TYPE_DESC[t]}
                    </Text>
                    {active && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={colors.accent}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              style={[styles.cancel, { borderColor: colors.line }]}
              onPress={onClose}
            >
              <Text style={[type.body, { color: colors.muted }]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  veil: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetWrap: { justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
    maxHeight: '80%',
  },
  title: { marginBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  badge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    minWidth: 52,
    alignItems: 'center',
  },
  badgeText: { fontSize: 12, fontWeight: '800' },
  cancel: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
});
