import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  index: "calendar",
  grocery: "shopping-cart",
  profile: "user",
};

export function BottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row border-t border-border bg-background"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      {state.routes.map((route: (typeof state.routes)[number], index: number) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const active = state.index === index;
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
                navigation.navigate(route.name);
              }
            }}
            className="flex-1 items-center justify-center gap-1 py-2.5"
          >
            <Feather
              name={ICONS[route.name] ?? "circle"}
              size={20}
              color={active ? "#a55a37" : "#6c6158"}
            />
            <Text
              className={`text-[11px] font-medium ${
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
