import React from "react";
import { Text, View } from "react-native";
import { Slider } from "@/components/ui/Slider";

/** Big goal card with a slider (design's StepProtein): label row with a
 * level tag, 5xl number, slider, min/max legend. Used by onboarding step 2
 * and the profile goals section. */
export function GoalSliderCard({
  label,
  levelLabel,
  value,
  unitLabel,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  levelLabel: string;
  value: number;
  unitLabel: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <View className="rounded-3xl bg-card border border-border p-5">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </Text>
        <Text className="text-xs text-muted-foreground">{levelLabel}</Text>
      </View>
      <View className="mt-2 flex-row items-baseline gap-1">
        <Text className="text-5xl font-semibold text-foreground tabular-nums tracking-tight">
          {value}
        </Text>
        <Text className="text-xl font-medium text-muted-foreground">
          {unitLabel}
        </Text>
      </View>
      <View className="mt-4">
        <Slider
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
        />
      </View>
      <View className="flex-row justify-between w-full mt-1">
        <Text className="text-xs text-muted-foreground font-medium">
          {min}
          {unitLabel === "g / day" ? "g" : ""}
        </Text>
        <Text className="text-xs text-muted-foreground font-medium">
          {max}
          {unitLabel === "g / day" ? "g" : ""}
        </Text>
      </View>
    </View>
  );
}

/** Protein level tag per design. */
export function proteinLevelLabel(goal: number): string {
  return goal < 90 ? "Maintenance" : goal < 140 ? "Active" : "Muscle building";
}

/** Calorie level tag per design. */
export function calorieLevelLabel(calories: number): string {
  return calories < 1600 ? "Cutting" : calories < 2200 ? "Maintain" : "Bulking";
}
