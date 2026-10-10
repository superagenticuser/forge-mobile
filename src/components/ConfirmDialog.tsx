// In-app confirm dialog. The project rule is no native dialogs: this renders
// inside the app instead of using Alert.
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/src/storage/settings';
import { radius, spacing } from '@/src/theme';

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Delete',
  destructive = true,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.veil} onPress={onCancel}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
          // Stop the veil press from firing when tapping inside the card.
          onStartShouldSetResponder={() => true}
        >
          <Text style={type.subtitle}>{title}</Text>
          <Text style={[type.body, { color: colors.muted }]}>{message}</Text>
          <View style={styles.actions}>
            <Pressable
              style={[
                styles.button,
                { backgroundColor: colors.bg, borderColor: colors.line },
              ]}
              onPress={onCancel}
            >
              <Text style={[type.chip, { color: colors.ink }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.button,
                {
                  backgroundColor: destructive ? colors.ember : colors.accent,
                },
              ]}
              onPress={onConfirm}
            >
              <Text style={[type.chip, { color: colors.bg }]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  veil: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  button: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
