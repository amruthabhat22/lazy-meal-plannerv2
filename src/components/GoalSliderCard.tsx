import React from "react";
import { Text, View } from "react-native";
import { Lightbulb } from "lucide-react-native";
import { Slider } from "@/components/ui/Slider";
import { Icon, ICON_COLORS } from "@/components/ui/Icon";
import { FONT_CLIP_FIX } from "@/utils/androidText";

/** Big goal card with a slider (design's StepProtein): label row with a
 * level tag, 5xl number, slider, min/max legend, and an optional
 * rule-of-thumb strip attached to the card bottom. Used by onboarding
 * step 2 and the profile goals section. */
export function GoalSliderCard({
  label,
  levelLabel,
  value,
  unitLabel,
  min,
  max,
  step,
  onChange,
  tip,
}: {
  label: string;
  levelLabel: string;
  value: number;
  unitLabel: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  /** Rule-of-thumb copy rendered as a strip attached under the slider. */
  tip?: string;
}) {
  return (
    <View className="rounded-3xl bg-card border border-border overflow-hidden">
      <View className="p-5">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" style={FONT_CLIP_FIX}>
          {label}
        </Text>
        <Text className="text-xs text-muted-foreground">{levelLabel}</Text>
      </View>
      <View className="mt-2 flex-row items-baseline gap-1">
        <Text className="text-5xl font-semibold text-foreground tabular-nums tracking-tight" style={FONT_CLIP_FIX}>
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
      {tip ? (
        <View className="flex-row items-start gap-2 bg-accent/60 border-t border-accent px-4 py-2.5">
          <View className="mt-px">
            <Icon
              icon={Lightbulb}
              size={14}
              color={ICON_COLORS.accentForeground}
            />
          </View>
          <Text className="flex-1 text-xs leading-snug text-accent-foreground">
            {tip}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Rule-of-thumb copy shared by onboarding and Profile. */
export const PROTEIN_TIP = "Aim for ~1g protein per kg of body weight.";
export const CALORIE_TIP =
  "Your weight (kg) × 30 roughly maintains your weight — e.g. 65 kg ≈ 1,950 kcal. Take ~400 less to lose, ~400 more to gain.";

/** Protein level tag per design. */
export function proteinLevelLabel(goal: number): string {
  return goal < 90 ? "Maintenance" : goal < 140 ? "Active" : "Muscle building";
}

/** Calorie level tag per design. */
export function calorieLevelLabel(calories: number): string {
  return calories < 1600 ? "Cutting" : calories < 2200 ? "Maintain" : "Bulking";
}
