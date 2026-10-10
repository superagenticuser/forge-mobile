// Badge celebration: in-app modal shown once per newly earned badge.
// Ports the web app's badge celebration popup (js/badges.js
// showBadgeCelebration) as a native modal.
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/src/storage/settings';
import type { BadgeDef } from '@/src/lib/badges';
import { radius, spacing } from '@/src/theme';

export function BadgeCelebration({
  badges,
  onClose,
}: {
  badges: Array<BadgeDef & { earnedAt: number }>;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  return (
    <Modal
      visible={badges.length > 0}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.veil} edges={['top', 'bottom']}>
        <Pressable style={styles.veil} onPress={onClose}>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
          >
            <Text style={styles.trophy}>🏆</Text>
            <Text style={[type.title, { color: colors.ink }]}>
              New badge{badges.length > 1 ? 's' : ''} earned!
            </Text>
            {badges.map((b) => (
              <View key={b.id} style={styles.row}>
                <Text style={styles.icon}>{b.icon}</Text>
                <View style={styles.text}>
                  <Text style={[type.subtitle, { color: colors.ink }]}>
                    {b.name}
                  </Text>
                  <Text style={[type.caption, { color: colors.muted }]}>
                    {b.desc}
                  </Text>
                </View>
              </View>
            ))}
            <Pressable
              style={[styles.button, { backgroundColor: colors.accent }]}
              onPress={onClose}
            >
              <Text style={[type.chip, { color: colors.bg }]}>Nice!</Text>
            </Pressable>
          </View>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  veil: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  trophy: { fontSize: 48, lineHeight: 56 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
  },
  icon: { fontSize: 32, lineHeight: 38 },
  text: { flex: 1, gap: 2 },
  button: {
    borderRadius: 999,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
});
