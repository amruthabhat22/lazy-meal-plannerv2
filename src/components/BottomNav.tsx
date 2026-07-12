import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Calendar, ShoppingCart, type LucideIcon } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Icon, ICON_COLORS } from "@/components/ui/Icon";

/** Profile moved to the week-screen header (user decision) — the bar has
 * just Week and Grocery. */
const ICONS: Record<string, LucideIcon> = {
  index: Calendar,
  grocery: ShoppingCart,
};

/** Structural subset of BottomTabBarProps — expo-router vendors its own
 * react-navigation types, so we type only what we actually use. */
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    emit: (e: {
      type: "tabPress";
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

export function BottomNav({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row border-t border-border bg-background"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const active = state.index === index;
        const TabIcon = ICONS[route.name] ?? Calendar;
        return (
          <Pressable
            key={route.key}
            onPress={() => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!active && !event.defaultPrevented) {
                void Haptics.selectionAsync();
                navigation.navigate(route.name);
              }
            }}
            className="flex-1 items-center justify-center gap-1 py-2.5"
          >
            <Icon
              icon={TabIcon}
              size="md"
              color={active ? ICON_COLORS.primary : ICON_COLORS.muted}
            />
            <Text
              className={`text-xs font-medium ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
