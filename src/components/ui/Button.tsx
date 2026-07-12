import React from "react";
import { Pressable, Text, type ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { Icon, ICON_COLORS } from "@/components/ui/Icon";
import { FONT_CLIP_FIX } from "@/utils/androidText";

/**
 * The one shared CTA. Disabled state is a single style everywhere:
 * desaturated secondary background + muted label — never opacity or
 * transparency (per DQA).
 */

type Variant = "primary" | "secondary" | "outline" | "whatsapp";

const ENABLED: Record<Variant, { bg: string; label: string; icon: string; border?: string }> = {
  primary: { bg: "bg-primary", label: "text-primary-foreground", icon: ICON_COLORS.primaryForeground },
  secondary: { bg: "bg-secondary", label: "text-foreground", icon: ICON_COLORS.foreground },
  outline: { bg: "bg-card border border-border", label: "text-foreground", icon: ICON_COLORS.foreground },
  whatsapp: { bg: "bg-[#25D366]", label: "text-white", icon: ICON_COLORS.white },
};

export function Button({
  label,
  onPress,
  disabled = false,
  variant = "primary",
  icon,
  height = 48,
  rounded = "full",
  shadow = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
  icon?: LucideIcon;
  height?: number;
  rounded?: "full" | "xl";
  shadow?: boolean;
}) {
  const v = ENABLED[variant];
  const bg = disabled ? "bg-secondary" : v.bg;
  const labelColor = disabled ? "text-muted-foreground" : v.label;
  const iconColor = disabled ? ICON_COLORS.muted : v.icon;
  const shadowStyle: ViewStyle | undefined =
    shadow && !disabled
      ? {
          shadowColor: "#503c28",
          shadowOpacity: 0.35,
          shadowRadius: 15,
          shadowOffset: { width: 0, height: 10 },
          elevation: 5,
        }
      : undefined;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={`flex-row items-center justify-center gap-2 ${bg} ${
        rounded === "full" ? "rounded-full" : "rounded-xl"
      }`}
      style={[{ height }, shadowStyle]}
    >
      {icon ? <Icon icon={icon} size="sm" color={iconColor} /> : null}
      <Text
        className={`text-sm font-semibold ${labelColor}`}
        style={FONT_CLIP_FIX}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}
