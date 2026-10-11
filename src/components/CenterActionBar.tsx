import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useTheme } from '@/src/storage/settings';
import { useWorkout } from '@/src/storage/workout';
import { radius, spacing } from '@/src/theme';

const TABS: Array<{
  route: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
}> = [
  { route: 'index', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
  { route: 'exercises', label: 'Exercises', icon: 'barbell', iconOutline: 'barbell-outline' },
  { route: 'programs', label: 'Programs', icon: 'calendar', iconOutline: 'calendar-outline' },
  { route: 'progress', label: 'Progress', icon: 'stats-chart', iconOutline: 'stats-chart-outline' },
];

export function CenterActionBar({ state, navigation }: any) {
  const theme = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const { workout, startFreeWorkout } = useWorkout();

  const onWorkoutPress = async () => {
    if (workout) {
      router.push('/workout');
    } else {
      await startFreeWorkout();
      router.push('/workout');
    }
  };

  const renderTab = (tabIndex: number) => {
    const tab = TABS[tabIndex];
    // Find the route index in state.routes
    const routeIndex = state.routes.findIndex((r: any) => r.name === tab.route);
    if (routeIndex === -1) return null;
    const route = state.routes[routeIndex];
    const focused = state.index === routeIndex;
    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };
    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        accessibilityLabel={tab.label}
        style={styles.tab}
      >
        <Ionicons
          name={focused ? tab.icon : tab.iconOutline}
          size={24}
          color={focused ? colors.accent : colors.muted}
        />
        <Text
          style={[
            styles.label,
            {
              color: focused ? colors.accent : colors.muted,
              fontWeight: focused ? '700' : '400',
            },
          ]}
        >
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: Math.max(insets.bottom, spacing.sm),
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {renderTab(0)}
        {renderTab(1)}
        <View style={styles.centerWrap}>
          <Pressable
            onPress={onWorkoutPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={workout ? 'Resume workout' : 'Start workout'}
            style={[styles.centerButton, { backgroundColor: colors.accent }]}
          >
            <Ionicons
              name={workout ? 'refresh' : 'play'}
              size={28}
              color={colors.bg}
            />
          </Pressable>
        </View>
        {renderTab(2)}
        {renderTab(3)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: 2,
  },
  label: {
    fontSize: 10,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
