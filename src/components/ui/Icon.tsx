import React from "react";
import type { LucideIcon } from "lucide-react-native";

/**
 * Single icon wrapper so every glyph in the app shares the same size and
 * color tokens (Untitled UI style: stroke 2, sizes 16/20/24). Usage:
 *
 *   import { Leaf } from "lucide-react-native";
 *   <Icon icon={Leaf} size="md" color={ICON_COLORS.primary} />
 *
 * Emojis are banned as UI glyphs — they may appear only inside
 * user-generated/message content.
 */

export const ICON_SIZES = { sm: 16, md: 20, lg: 24 } as const;
export type IconSize = keyof typeof ICON_SIZES;

/** Palette tokens only — keep in sync with tailwind.config.js. */
export const ICON_COLORS = {
  foreground: "#291f18",
  muted: "#6c6158",
  primary: "#a55a37",
  primaryForeground: "#fefbf8",
  accentForeground: "#3a2a20",
  success: "#2f7d45",
  warning: "#b45309",
  destructive: "#ce403a",
  whatsapp: "#25D366",
  white: "#ffffff",
} as const;

export function Icon({
  icon: IconComponent,
  size = "sm",
  color = ICON_COLORS.foreground,
  strokeWidth = 2,
}: {
  icon: LucideIcon;
  size?: IconSize | number;
  color?: string;
  strokeWidth?: number;
}) {
  const px = typeof size === "number" ? size : ICON_SIZES[size];
  return <IconComponent size={px} color={color} strokeWidth={strokeWidth} />;
}
