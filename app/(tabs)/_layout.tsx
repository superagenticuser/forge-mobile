import { Ionicons } from '@expo/vector-icons';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';

import { useTheme } from '@/src/storage/settings';
import { FloatingDock } from '@/src/components/FloatingDock';

function SettingsGear() {
  const theme = useTheme();
  return (
    <Link href="/settings" asChild>
      <Pressable
        hitSlop={12}
        style={{ marginRight: 16 }}
        accessibilityLabel="Open settings"
      >
        <Ionicons
          name="settings-outline"
          size={24}
          color={theme.colors.muted}
        />
      </Pressable>
    </Link>
  );
}

export default function TabLayout() {
  const theme = useTheme();
  return (
    <Tabs
      tabBar={(props) => <FloatingDock {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.bg },
        headerTintColor: theme.colors.ink,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerRight: () => <SettingsGear />,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exercises',
        }}
      />
      <Tabs.Screen
        name="programs"
        options={{
          title: 'Programs',
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'About',
        }}
      />
    </Tabs>
  );
}
