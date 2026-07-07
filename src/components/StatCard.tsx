import React from "react";
import { Text, View } from "react-native";

/**
 * Two-column Protein | Calories card. Protein value is color-coded by how
 * close the day is to goal (≥95% success, ≥75% warning, else destructive) —
 * always the honest number.
 */
export function StatCard({
  protein,
  proteinGoal,
  kcal,
}: {
  protein: number;
  proteinGoal: number;
  kcal: number;
}) {
  const ratio = proteinGoal > 0 ? protein / proteinGoal : 0;
  const proteinColor =
    ratio >= 0.95
      ? "text-success"
      : ratio >= 0.75
        ? "text-warning"
        : "text-destructive";
  return (
    <View className="mx-4 rounded-2xl border border-border bg-card overflow-hidden">
      <View className="flex-row">
        <View className="flex-1 px-4 py-4">
          <View className="flex-row items-baseline gap-1.5">
            <Text
              className={`text-3xl font-bold tracking-tight tabular-nums ${proteinColor}`}
            >
              {Math.round(protein)}g
            </Text>
            <Text className="text-xs text-muted-foreground tabular-nums">
              / {Math.round(proteinGoal)}g
            </Text>
          </View>
          <Text className="mt-0.5 text-sm text-muted-foreground">Protein</Text>
        </View>
        <View className="w-px bg-border" />
        <View className="flex-1 px-4 py-4">
          <Text className="text-3xl font-bold tracking-tight tabular-nums text-foreground">
            {Math.round(kcal)}
          </Text>
          <Text className="mt-0.5 text-sm text-muted-foreground">Calories</Text>
        </View>
      </View>
    </View>
  );
}
