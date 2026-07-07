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
  const kcal = meal.kcal_per_unit != null ? meal.kcal_per_unit * quantity : null;
  const canIncrease = quantity + meal.qty_step <= meal.max_qty + 1e-9;
  const canDecrease = quantity - meal.qty_step >= meal.min_qty - 1e-9;

  return (
    <Pressable
      onLongPress={onLongPress}
      className="rounded-2xl border border-border bg-card p-3 mb-2.5"
      style={{
        shadowColor: "#503c28",
        shadowOpacity: 0.08,
        shadowRadius: 9,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 min-w-0">
          <Text className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {SLOT_LABELS[slot]}
          </Text>
          <Text className="text-[15px] font-semibold text-foreground leading-tight mt-0.5">
            {meal.name}
          </Text>
          <Text className="text-[13px] text-muted-foreground mt-0.5">
            {formatQty(quantity, meal.unit)}
          </Text>
        </View>
        <Pressable
          onPress={onSwap}
          hitSlop={6}
          className="h-9 px-3 rounded-full items-center justify-center bg-primary/10"
        >
          <Text className="text-sm font-semibold text-primary">Swap</Text>
        </Pressable>
      </View>

      <View className="mt-2 flex-row items-center justify-between gap-2">
        <View className="flex-row flex-wrap items-center gap-1.5 flex-1">
          <View className="rounded-full bg-secondary px-2 py-0.5">
            <Text className="text-[11px] font-semibold text-foreground/80 tabular-nums">
              {formatProtein(protein)} protein
            </Text>
          </View>
          {kcal != null ? (
            <View className="rounded-full bg-accent/60 px-2 py-0.5">
              <Text className="text-[11px] font-semibold text-accent-foreground tabular-nums">
                {Math.round(kcal)} kcal
              </Text>
            </View>
          ) : null}
        </View>
        <View className="flex-row items-center gap-1">
          <Pressable
            onPress={onDecrease}
            disabled={!canDecrease}
            hitSlop={8}
            className={`h-8 w-8 rounded-full items-center justify-center ${
              canDecrease ? "bg-secondary" : "bg-secondary/40"
            }`}
          >
            <Text
              className={`text-base font-bold ${
                canDecrease ? "text-foreground" : "text-muted-foreground/40"
              }`}
            >
              −
            </Text>
          </Pressable>
          <Text className="w-9 text-center text-sm font-semibold text-foreground tabular-nums">
            {quantity % 1 === 0 ? quantity : quantity.toFixed(1)}
          </Text>
          <Pressable
            onPress={onIncrease}
            disabled={!canIncrease}
            hitSlop={8}
            className={`h-8 w-8 rounded-full items-center justify-center ${
              canIncrease ? "bg-secondary" : "bg-secondary/40"
            }`}
          >
            <Text
              className={`text-base font-bold ${
                canIncrease ? "text-foreground" : "text-muted-foreground/40"
              }`}
            >
              +
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
