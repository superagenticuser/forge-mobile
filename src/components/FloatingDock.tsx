import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/storage/settings';
import { radius, spacing } from '@/src/theme';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home',
  exercises: 'barbell',
  programs: 'calendar',
  progress: 'stats-chart',
  about: 'information-circle',
};

const LABELS: Record<string, string> = {
  index: 'Home',
  exercises: 'Exercises',
  programs: 'Programs',
  progress: 'Progress',
  about: 'About',
};

export function FloatingDock({ state, navigation }: any) {
  const theme = useTheme();
  const { colors, type } = theme;
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: Math.max(insets.bottom, spacing.sm) },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.dock,
          {
            backgroundColor: colors.surface,
            borderColor: colors.line,
            shadowColor: '#000',
          },
        ]}
      >
        {state.routes.map((route: any, index: number) => {
          const focused = state.index === index;
          const icon = ICONS[route.name] ?? 'ellipse';
          const label = LABELS[route.name] ?? route.name;
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
              accessibilityLabel={label}
              style={[
                styles.tab,
                focused && {
                  backgroundColor: colors.accent + '22',
                },
              ]}
            >
              <Ionicons
                name={focused ? icon : (`${icon}-outline` as keyof typeof Ionicons.glyphMap)}
                size={22}
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
                {label}
              </Text>
            </Pressable>
          );
        })}
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  dock: {
    flexDirection: 'row',
    borderRadius: radius.lg + 8,
    borderWidth: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: 2,
  },
  label: {
    fontSize: 10,
  },
});
