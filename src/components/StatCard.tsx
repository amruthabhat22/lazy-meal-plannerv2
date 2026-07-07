import React from "react";
import { Text, View } from "react-native";

/**
 * Two-column Protein | Calories summary card (design's grid divide-x card).
 * Calories are display-only; protein carries the progress bar and the honest
 * number even when the goal is missed.
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
  const ratio = proteinGoal > 0 ? Math.min(1, protein / proteinGoal) : 0;
  const met = protein >= proteinGoal * 0.9;
  return (
    <View className="mx-4 rounded-2xl border border-border bg-card overflow-hidden">
      <View className="flex-row">
        <View className="flex-1 px-4 py-4">
          <Text className="text-[11px] font-medium text-muted-foreground">
            Protein
          </Text>
          <View className="flex-row items-baseline gap-1.5 mt-0.5">
            <Text className="text-lg font-bold tracking-tight text-foreground tabular-nums">
              {Math.round(protein)}g
            </Text>
            <Text className="text-xs text-muted-foreground tabular-nums">
              / {Math.round(proteinGoal)}g
            </Text>
          </View>
          <View className="h-1.5 rounded-full bg-secondary overflow-hidden mt-2">
            <View
              className={`h-1.5 rounded-full ${met ? "bg-success" : "bg-warning"}`}
              style={{ width: `${ratio * 100}%` }}
            />
          </View>
        </View>
        <View className="w-px bg-border" />
        <View className="flex-1 px-4 py-4">
          <Text className="text-[11px] font-medium text-muted-foreground">
            Calories
          </Text>
          <View className="flex-row items-baseline gap-1.5 mt-0.5">
            <Text className="text-lg font-bold tracking-tight text-foreground tabular-nums">
              {Math.round(kcal)}
            </Text>
            <Text className="text-xs text-muted-foreground">kcal</Text>
          </View>
          <Text className="text-[11px] text-muted-foreground mt-2.5">
            estimated
          </Text>
        </View>
      </View>
    </View>
  );
}
