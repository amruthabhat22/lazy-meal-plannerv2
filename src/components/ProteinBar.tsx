import React from "react";
import { Text, View } from "react-native";
import { formatProtein } from "@/utils/format";

/** Honest per-day protein summary (spec 5.2): shows the real number always. */
export function ProteinBar({ total, goal }: { total: number; goal: number }) {
  const ratio = goal > 0 ? Math.min(1, total / goal) : 0;
  const met = total >= goal * 0.9;
  return (
    <View className="px-4 py-3">
      <View className="flex-row justify-between mb-1">
        <Text className="text-sm font-medium text-gray-700">Protein</Text>
        <Text
          className={`text-sm font-semibold ${met ? "text-primary" : "text-amber-600"}`}
        >
          {formatProtein(total)} / {formatProtein(goal)}
        </Text>
      </View>
      <View className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <View
          className={`h-2 rounded-full ${met ? "bg-primary" : "bg-amber-500"}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </View>
    </View>
  );
}
