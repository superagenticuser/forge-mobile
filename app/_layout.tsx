import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '@/src/theme';

SplashScreen.preventAutoHideAsync();

// Checks for over-the-air updates whenever the app comes to the foreground,
// so updates apply without needing a force stop. Shows an in-app prompt when
// a new version is downloaded and ready.
function useUpdatePrompt() {
  const [ready, setReady] = useState(false);
  const checking = useRef(false);

  const check = useCallback(async () => {
    if (!Updates.isEnabled || __DEV__ || checking.current) return;
    checking.current = true;
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        await Updates.fetchUpdateAsync();
        setReady(true);
      }
    } catch {
      // Network or server hiccup: stay silent and try again next time.
    } finally {
      checking.current = false;
    }
  }, []);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, [check]);

  return { ready, dismiss: () => setReady(false) };
}

export default function RootLayout() {
  const { ready, dismiss } = useUpdatePrompt();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={DarkTheme}>
      <StatusBar style="light" />
      {ready && (
        <View style={styles.updateBanner}>
          <Ionicons name="arrow-down-circle" size={20} color={colors.volt} />
          <Text style={styles.updateText}>A new version is ready.</Text>
          <Pressable
            style={styles.updateButton}
            onPress={() => Updates.reloadAsync()}
          >
            <Text style={styles.updateButtonText}>Restart now</Text>
          </Pressable>
          <Pressable onPress={dismiss} hitSlop={8}>
            <Ionicons name="close" size={18} color={colors.muted} />
          </Pressable>
        </View>
      )}
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="exercise/[id]" options={{ title: 'Exercise' }} />
        <Stack.Screen name="program/[id]" options={{ title: 'Program' }} />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  updateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.volt,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  updateText: { ...type.body, flex: 1 },
  updateButton: {
    backgroundColor: colors.volt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  updateButtonText: { fontSize: 13, fontWeight: '800', color: colors.bg },
});
