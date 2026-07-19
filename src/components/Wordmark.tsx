import React from "react";
import { Text } from "react-native";
import type { StyleProp, TextStyle } from "react-native";

/**
 * The two-tone brand wordmark: "Eezy" in the surrounding text color,
 * "Meals" in primary orange. Size/weight come from the wrapper's
 * className/style so it fits headers of any scale.
 */
export function Wordmark({
  className,
  style,
}: {
  className?: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text className={className} style={style}>
      Eezy
      <Text className="text-primary">Meals</Text>
    </Text>
  );
}
