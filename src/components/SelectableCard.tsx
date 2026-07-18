import React from "react";
import { Pressable, Text, View } from "react-native";
import { Check, type LucideIcon } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Icon, ICON_COLORS } from "@/components/ui/Icon";
import { FONT_CLIP_FIX } from "@/utils/androidText";

/** Design's option card (diet / meals-per-day): icon tile, title +
 * description, check circle on the right. Used by onboarding and Profile. */
export function SelectableCard({
  icon,
  title,
  description,
  selected,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={`rounded-2xl border bg-card px-4 py-3.5 mb-3 ${
        selected ? "border-primary/70" : "border-border"
      }`}
      style={
        selected
          ? {
              shadowColor: "#503c28",
              shadowOpacity: 0.18,
              shadowRadius: 15,
              shadowOffset: { width: 0, height: 10 },
              elevation: 3,
            }
          : undefined
      }
    >
      <View className="flex-row items-center gap-3.5">
        <View
          className={`h-12 w-12 rounded-xl items-center justify-center ${
            selected ? "bg-primary/10" : "bg-accent"
          }`}
        >
          <Icon
            icon={icon}
            size="lg"
            color={
              selected ? ICON_COLORS.primary : ICON_COLORS.accentForeground
            }
          />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-base font-semibold text-foreground leading-tight" style={FONT_CLIP_FIX}>
            {title}
          </Text>
          <Text
            className="text-sm text-muted-foreground mt-0.5"
            numberOfLines={1}
          >
            {description}
          </Text>
        </View>
        <View
          className={`h-5 w-5 rounded-full border items-center justify-center ${
            selected ? "border-primary bg-primary" : "border-border"
          }`}
        >
          {selected ? (
            <Icon icon={Check} size={12} color={ICON_COLORS.primaryForeground} />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
