import React from "react";
import { Pressable, Text, View } from "react-native";
import { ALLERGENS } from "@/utils/allergens";
import * as Haptics from "expo-haptics";

/** Multi-select allergen pills (onboarding step + Profile section).
 * Selected allergens are hard-excluded from every generated plan. */
export function AllergenChips({
  selected,
  onToggle,
}: {
  selected: Set<string>;
  onToggle: (slug: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {ALLERGENS.map((a) => {
        const isSel = selected.has(a.slug);
        // Identical geometry in both states — only colors change, so
        // chips never grow/shift when toggled.
        return (
          <Pressable
            key={a.slug}
            onPress={() => {
              void Haptics.selectionAsync();
              onToggle(a.slug);
            }}
            hitSlop={4}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSel }}
            className={`rounded-full border px-3.5 py-2.5 ${
              isSel
                ? "border-destructive bg-destructive"
                : "border-border bg-card"
            }`}
          >
            <Text
              className={`text-sm leading-5 font-medium ${
                isSel ? "text-primary-foreground" : "text-foreground"
              }`}
            >
              {a.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
