import React from "react";
import { Text, View } from "react-native";

/**
 * Two-column Protein | Calories card, both color-coded against goals —
 * always the honest number. Protein: ≥95% success, ≥75% warning, else
 * destructive. Calories (a target, not a floor): within 90–110% success,
 * 70–125% warning, else destructive.
 */
export function StatCard({
  protein,
  proteinGoal,
  kcal,
  kcalGoal,
}: {
  protein: number;
  proteinGoal: number;
  kcal: number;
  kcalGoal: number;
}) {
  const pRatio = proteinGoal > 0 ? protein / proteinGoal : 0;
  const proteinColor =
    pRatio >= 0.95
      ? "text-success"
      : pRatio >= 0.75
        ? "text-warning"
        : "text-destructive";
  const cRatio = kcalGoal > 0 ? kcal / kcalGoal : 0;
  const kcalColor =
    cRatio >= 0.9 && cRatio <= 1.1
      ? "text-success"
      : cRatio >= 0.7 && cRatio <= 1.25
        ? "text-warning"
        : "text-destructive";
  return (
    <View className="mx-4 rounded-2xl border border-border bg-card overflow-hidden">
      <View className="flex-row">
        <Cell
          value={`${Math.round(protein)}g`}
          goal={`/ ${Math.round(proteinGoal)}g`}
          label="Protein"
          valueClass={proteinColor}
        />
        <View className="w-px bg-border" />
        <Cell
          value={`${Math.round(kcal)}`}
          goal={`/ ${Math.round(kcalGoal)}`}
          label="Calories"
          valueClass={kcalColor}
        />
      </View>
    </View>
  );
}

function Cell({
  value,
  goal,
  label,
  valueClass,
}: {
  value: string;
  goal: string;
  label: string;
  valueClass: string;
}) {
  return (
    <View className="flex-1 px-4 py-4">
      <View className="flex-row items-baseline gap-1.5">
        <Text
          className={`text-3xl font-bold tracking-tight tabular-nums ${valueClass}`}
        >
          {value}
        </Text>
        <Text className="text-xs text-muted-foreground tabular-nums">
          {goal}
        </Text>
      </View>
      <Text className="mt-0.5 text-sm text-muted-foreground">{label}</Text>
    </View>
  );
}
