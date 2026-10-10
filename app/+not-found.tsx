import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/src/storage/settings';
import { spacing } from '@/src/theme';

export default function NotFoundScreen() {
  const theme = useTheme();
  const { colors, type } = theme;
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={type.title}>This screen doesn't exist.</Text>
        <Link href="/(tabs)" style={styles.link}>
          <Text style={[styles.linkText, { color: colors.accent }]}>
            Go to home screen
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  link: { marginTop: spacing.lg, paddingVertical: spacing.lg },
  linkText: { fontSize: 14, fontWeight: '600' },
});
