import { Ionicons } from '@expo/vector-icons';
import { Link, Tabs } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/src/storage/settings';
import { CenterActionBar } from '@/src/components/CenterActionBar';

function HeaderButtons() {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Link href="/about" asChild>
        <Pressable
          hitSlop={12}
          style={{ marginRight: 16 }}
          accessibilityLabel="About"
        >
          <Ionicons
            name="information-circle-outline"
            size={24}
            color={theme.colors.muted}
          />
        </Pressable>
      </Link>
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
    </View>
  );
}

export default function TabLayout() {
  const theme = useTheme();
  return (
    <Tabs
      tabBar={(props) => <CenterActionBar {...props} />}
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
          headerRight: () => <HeaderButtons />,
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
    </Tabs>
  );
}
