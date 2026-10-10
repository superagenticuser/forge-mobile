import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/src/storage/settings';
import { radius, spacing } from '@/src/theme';

const ported = [
  'Exercise library: 243 exercises with search, muscle, equipment, and level filters',
  'Exercise detail: steps, form cues, common mistakes, and easier/harder variations',
  'Programs: all 14 training programs with per-day exercise plans',
  'Program detail: sets x reps per exercise, deep-linked to exercise detail',
  'FORGE dark theme shared across every screen',
  'Over-the-air updates enabled: new JS changes arrive in about a minute, no reinstall needed',
];

const notYet = [
  'Interactive 3D body map',
  'Workout player (logging sets, rest timer)',
  'Progress charts and history',
  'Camera form checks and progress photos',
  'Voice commands',
  'Achievement badges',
];

const roadmap = [
  'v0.2: workout player with set logging and rest timer',
  'v0.3: local progress storage and charts',
  'v0.4: 3D body map (evaluate three.js on native vs. WebView)',
  'Later: camera, voice, achievements, sync',
];

function Section({
  icon,
  iconColor,
  title,
  items,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  items: string[];
}) {
  const theme = useTheme();
  const { colors, type } = theme;
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={20} color={iconColor} />
        <Text style={type.subtitle}>{title}</Text>
      </View>
      {items.map((item) => (
        <View key={item} style={styles.itemRow}>
          <Text style={[styles.bullet, { color: colors.ember }]}>·</Text>
          <Text style={[type.body, styles.itemText]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

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
          FORGE<Text style={{ color: colors.ember }}>.</Text>
        </Text>
        <Text
          style={[type.body, { color: colors.muted, marginTop: spacing.xs }]}
        >
          React Native experiment v0.1
        </Text>
      </View>

      <Link href="/settings" asChild>
        <Pressable
          style={[
            styles.card,
            styles.settingsRow,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
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
        <Text style={type.body}>
          This is an experiment to rewrite FORGE as a native mobile app with
          Expo and React Native. The web app (superagenticuser/gym-3d) remains
          the production app while this experiment runs.
        </Text>
      </View>

      <Section
        icon="checkmark-circle"
        iconColor={theme.colors.volt}
        title="Ported in v0.1"
        items={ported}
      />
      <Section
        icon="time"
        iconColor={colors.warn}
        title="Not yet ported"
        items={notYet}
      />
      <Section
        icon="map"
        iconColor={colors.ember}
        title="Roadmap"
        items={roadmap}
      />
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
  itemRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bullet: { fontSize: 16, fontWeight: '800', lineHeight: 21 },
  itemText: { flex: 1 },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingsText: { flex: 1 },
});
