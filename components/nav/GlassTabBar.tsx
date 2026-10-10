import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet, type LayoutChangeEvent } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { COLORS, MOTION, RADIUS, withAlpha } from '../../constants/theme';
import { Text } from '../ui/Typography';

type Glyph = keyof typeof Ionicons.glyphMap;

/** Per-tab glyph (outline when idle, filled when focused) and light color. */
export const TAB_META: Record<string, { icon: string; color: string }> = {
  index: { icon: 'layers', color: COLORS.primary },
  studio: { icon: 'mic', color: COLORS.secondary },
  social: { icon: 'chatbubbles', color: COLORS.accent },
  life: { icon: 'heart', color: '#FF7EBD' },
  empire: { icon: 'trophy', color: COLORS.gold },
};

const BAR_H = 66;
const INSET = 6;

function TabItem({
  label,
  icon,
  focused,
  onPress,
  onLongPress,
}: {
  label: string;
  icon: string;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const lift = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    lift.value = withSpring(focused ? 1 : 0, MOTION.spring);
  }, [focused, lift]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.value * 2 }, { scale: 1 + lift.value * 0.14 }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.item}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <Animated.View style={iconStyle}>
        <Ionicons
          name={(focused ? icon : `${icon}-outline`) as Glyph}
          size={22}
          color={focused ? '#FFFFFF' : COLORS.textMuted}
        />
      </Animated.View>
      <Text
        variant="label"
        color={focused ? '#FFFFFF' : COLORS.textMuted}
        style={styles.label}
        numberOfLines={1}
      >
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

/**
 * The floating glass dock: a frosted bar hovering over the stage, with a
 * lit pill that springs to the focused tab and takes on that tab's color.
 */
export function GlassTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const itemW = useSharedValue(0);
  const x = useSharedValue(state.index);

  useEffect(() => {
    x.value = withSpring(state.index, MOTION.spring);
  }, [state.index, x]);

  const onLayout = (e: LayoutChangeEvent) => {
    itemW.value = (e.nativeEvent.layout.width - INSET * 2) / state.routes.length;
  };

  const pillStyle = useAnimatedStyle(() => ({
    width: itemW.value,
    opacity: itemW.value > 0 ? 1 : 0,
    transform: [{ translateX: x.value * itemW.value }],
  }));

  const focusedName = state.routes[state.index]?.name ?? 'index';
  const focusColor = TAB_META[focusedName]?.color ?? COLORS.primary;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View
        style={[styles.bar, { boxShadow: "0px 12px 32px rgba(0,0,0,0.55)" }]}
        onLayout={onLayout}
      >
        <LinearGradient
          colors={['rgba(38,32,72,0.94)', 'rgba(14,12,30,0.96)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.round]}
        />
        <Animated.View style={[styles.pill, pillStyle]}>
          <LinearGradient
            colors={[withAlpha(focusColor, 0.55), withAlpha(focusColor, 0.14)]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.pillRound]}
          />
        </Animated.View>

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const meta = TAB_META[route.name] ?? { icon: 'ellipse', color: COLORS.primary };
          const label = typeof options.title === 'string' ? options.title : route.name;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          return (
            <TabItem
              key={route.key}
              label={label}
              icon={meta.icon}
              focused={focused}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingTop: 6, backgroundColor: 'transparent' },
  bar: {
    height: BAR_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: INSET,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  round: { borderRadius: RADIUS.xl },
  pill: {
    position: 'absolute',
    left: INSET,
    top: INSET,
    bottom: INSET,
  },
  pillRound: { borderRadius: RADIUS.lg },
  item: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 9, letterSpacing: 1.2 },
});
