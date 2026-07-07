import React from "react";
import { Pressable, Text, View } from "react-native";
import type { Meal, Slot } from "@/engine/types";
import { formatProtein, formatQty } from "@/utils/format";

const SLOT_LABELS: Record<Slot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export function MealCard({
  slot,
  meal,
  quantity,
  onIncrease,
  onDecrease,
  onSwap,
  onLongPress,
}: {
  slot: Slot;
  meal: Meal;
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  onSwap: () => void;
  onLongPress: () => void;
}) {
  const protein = meal.protein_per_unit * quantity;
  const canIncrease = quantity + meal.qty_step <= meal.max_qty + 1e-9;
  const canDecrease = quantity - meal.qty_step >= meal.min_qty - 1e-9;

  return (
    <Pressable
      onLongPress={onLongPress}
      className="rounded-2xl bg-white border border-gray-200 p-4 mb-3"
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 pr-3">
          <Text className="text-xs font-semibold text-primary uppercase mb-1">
            {SLOT_LABELS[slot]}
          </Text>
          <Text className="text-lg font-semibold text-gray-900">
            {meal.name}
          </Text>
          <Text className="text-sm text-muted mt-0.5">
            {formatQty(quantity, meal.unit)} · {formatProtein(protein)} protein
          </Text>
        </View>
        <Pressable
          onPress={onSwap}
          hitSlop={8}
          className="rounded-full bg-gray-100 px-3 py-2"
        >
          <Text className="text-sm font-semibold text-gray-700">Swap</Text>
        </Pressable>
      </View>

      <View className="flex-row items-center mt-3">
        <Pressable
          onPress={onDecrease}
          disabled={!canDecrease}
          hitSlop={8}
          className={`w-10 h-10 rounded-full items-center justify-center ${
            canDecrease ? "bg-gray-100" : "bg-gray-50"
          }`}
        >
          <Text
            className={`text-xl font-bold ${canDecrease ? "text-gray-800" : "text-gray-300"}`}
          >
            −
          </Text>
        </Pressable>
        <Text className="mx-4 text-base font-medium text-gray-900 min-w-[80px] text-center">
          {formatQty(quantity, meal.unit)}
        </Text>
        <Pressable
          onPress={onIncrease}
          disabled={!canIncrease}
          hitSlop={8}
          className={`w-10 h-10 rounded-full items-center justify-center ${
            canIncrease ? "bg-gray-100" : "bg-gray-50"
          }`}
        >
          <Text
            className={`text-xl font-bold ${canIncrease ? "text-gray-800" : "text-gray-300"}`}
          >
            +
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
