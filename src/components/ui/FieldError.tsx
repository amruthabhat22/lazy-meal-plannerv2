import React from "react";
import { Text, View } from "react-native";
import { CircleAlert } from "lucide-react-native";
import { Icon, ICON_COLORS } from "@/components/ui/Icon";

/** Inline error line under a form field. Renders nothing when message is
 * empty, so callers can pass their validation result directly. */
export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View className="flex-row items-start gap-1.5 mt-1.5">
      <View className="mt-px">
        <Icon icon={CircleAlert} size={13} color={ICON_COLORS.destructive} />
      </View>
      <Text className="flex-1 text-xs leading-snug text-destructive">
        {message}
      </Text>
    </View>
  );
}

/** Border overlay for an invalid input (spread into `style`). */
export const INPUT_ERROR_STYLE = {
  borderWidth: 1,
  borderColor: "#ce403a",
} as const;
