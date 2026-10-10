// Shared bits for the Progress tab: section titles, stat cards, empty
// states. All theme-aware (accent, big text, high contrast).
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/src/storage/settings';
import { radius, spacing } from '@/src/theme';

export function SectionTitle({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <Text style={[theme.type.title, styles.sectionTitle]}>{children}</Text>
  );
}

export function StatCard({ value, label }: { value: string; label: string }) {
  const theme = useTheme();
  const { colors, type } = theme;
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      <Text style={[type.title, { color: colors.accent }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[type.caption, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

export function EmptyNote({ title, body }: { title: string; body: string }) {
  const theme = useTheme();
  const { colors, type } = theme;
  return (
    <View
      style={[
        styles.empty,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      <Text style={[type.subtitle, { color: colors.ink }]}>{title}</Text>
      <Text style={[type.body, { color: colors.muted }]}>{body}</Text>
    </View>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <Text style={[theme.type.caption, { color: theme.colors.muted }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { marginTop: spacing.md, marginBottom: spacing.sm },
  statCard: {
    flex: 1,
    minWidth: 100,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 2,
  },
  empty: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
    alignItems: 'center',
  },
});
