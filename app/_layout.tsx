import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Pressable,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SettingsProvider, useTheme } from '@/src/storage/settings';
import { LibraryProvider } from '@/src/storage/library';
import { radius, spacing } from '@/src/theme';

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

function RootLayoutInner() {
  const theme = useTheme();
  const { ready, dismiss } = useUpdatePrompt();

  useEffect(() => {
    if (theme.ready) {
      SplashScreen.hideAsync();
    }
  }, [theme.ready]);

  return (
    <ThemeProvider value={DarkTheme}>
      <StatusBar style="light" />
      {ready && (
        <View
          style={[
            styles.updateBanner,
            {
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.volt,
              // Clear the Android status bar so the banner never sits under it.
              paddingTop: (RNStatusBar.currentHeight ?? 0) + spacing.sm,
            },
          ]}
        >
          <Ionicons
            name="arrow-down-circle"
            size={20}
            color={theme.colors.volt}
          />
          <Text style={[theme.type.body, styles.updateText]}>
            A new version is ready.
          </Text>
          <Pressable
            style={[
              styles.updateButton,
              { backgroundColor: theme.colors.volt },
            ]}
            onPress={() => Updates.reloadAsync()}
          >
            <Text style={[styles.updateButtonText, { color: theme.colors.bg }]}>
              Restart now
            </Text>
          </Pressable>
          <Pressable onPress={dismiss} hitSlop={8}>
            <Ionicons name="close" size={18} color={theme.colors.muted} />
          </Pressable>
        </View>
      )}
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.bg },
          headerTintColor: theme.colors.ink,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: theme.colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="exercise/[id]" options={{ title: 'Exercise' }} />
        <Stack.Screen name="program/[id]" options={{ title: 'Program' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SettingsProvider>
      <LibraryProvider>
        <RootLayoutInner />
      </LibraryProvider>
    </SettingsProvider>
  );
}

const styles = StyleSheet.create({
  updateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  updateText: { flex: 1 },
  updateButton: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  updateButtonText: { fontSize: 13, fontWeight: '800' },
});
