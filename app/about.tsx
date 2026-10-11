import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/src/storage/settings';
import { radius, spacing } from '@/src/theme';

export default function AboutScreen() {
  const theme = useTheme();
  const { colors, type } = theme;
  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.hero}>
        <Text style={type.hero}>
          FORGE<Text style={{ color: colors.accent }}>.</Text>
        </Text>
        <Text
          style={[type.body, { color: colors.muted, marginTop: spacing.xs }]}
        >
          Train hard. Recover smart.
        </Text>
      </View>

      <Link href="/settings" asChild>
        <Pressable
          // Flattened: expo-router's asChild Slot cannot merge style arrays.
          style={StyleSheet.flatten([
            styles.card,
            styles.settingsRow,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ])}
        >
          <Ionicons
            name="settings-outline"
            size={20}
            color={theme.colors.volt}
          />
          <Text style={[type.subtitle, styles.settingsText]}>Settings</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>
      </Link>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.line },
        ]}
      >
        <View style={styles.cardHeader}>
          <Ionicons name="barbell" size={20} color={colors.accent} />
          <Text style={type.subtitle}>Features</Text>
        </View>
        <Text style={type.body}>
          243 exercises across 17 muscle groups with an interactive 3D body map.
          14 training programs with mesocycle planning. Workout logging with
          rest timer, plate calculator, and form guidance. Progress tracking
          with charts, PRs, and achievements. Recovery dashboard with soreness
          mapping. Camera form checks and progress photos. Voice commands for
          hands-free logging.
        </Text>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.line },
        ]}
      >
        <View style={styles.cardHeader}>
          <Ionicons name="shield-checkmark" size={20} color={colors.accent} />
          <Text style={type.subtitle}>Your data</Text>
        </View>
        <Text style={type.body}>
          All your data stays on your device. Use Settings to back up, restore,
          or import from the web app.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  hero: { paddingTop: spacing.lg },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingsText: { flex: 1 },
});
