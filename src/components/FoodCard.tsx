import React from "react";
import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { Meal } from "@/engine/types";
import { formatNumber, formatQty } from "@/utils/format";

/** Meal card inside a slot section (design's FoodCard). Dropping the
 * quantity below min removes the meal from the slot. */
export function FoodCard({
  meal,
  quantity,
  onQtyChange,
  onSwap,
  onRemove,
  onLongPress,
}: {
  meal: Meal;
  quantity: number;
  onQtyChange: (next: number) => void;
  onSwap: () => void;
  onRemove: () => void;
  onLongPress: () => void;
}) {
  const protein = Math.round(meal.protein_per_unit * quantity);
  const kcal =
    meal.kcal_per_unit != null ? Math.round(meal.kcal_per_unit * quantity) : null;
  const canIncrease = quantity + meal.qty_step <= meal.max_qty + 1e-9;

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
          <Text className="text-[15px] font-semibold text-foreground leading-tight">
            {meal.name}
          </Text>
          <Text className="text-[13px] text-muted-foreground mt-0.5">
            {formatQty(quantity, meal.unit)}
          </Text>
        </View>
        <Pressable
          onPress={onSwap}
          hitSlop={6}
          className="h-9 px-3 rounded-full flex-row items-center gap-1"
        >
          <Feather name="repeat" size={14} color="#a55a37" />
          <Text className="text-sm font-semibold text-primary">Swap</Text>
        </Pressable>
      </View>

      <View className="mt-2 flex-row items-center justify-between gap-2">
        <View className="flex-row flex-wrap items-center gap-1.5 flex-1">
          <View className="rounded-full bg-secondary/70 px-2 py-0.5">
            <Text className="text-[11px] font-semibold text-foreground/80 tabular-nums">
              {protein}g
            </Text>
          </View>
          {kcal != null ? (
            <View className="rounded-full bg-secondary/70 px-2 py-0.5">
              <Text className="text-[11px] font-semibold text-foreground/80 tabular-nums">
                {kcal} cal
              </Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row items-center gap-1">
          <Pressable
            onPress={() => {
              if (quantity - meal.qty_step < meal.min_qty - 1e-9) {
                onRemove();
              } else {
                onQtyChange(quantity - meal.qty_step);
              }
            }}
            hitSlop={8}
            className="h-8 w-8 rounded-full border border-border bg-background items-center justify-center"
          >
            <Feather name="minus" size={15} color="#291f18" />
          </Pressable>
          <Text className="w-9 text-center text-sm font-semibold text-foreground tabular-nums">
            {formatNumber(quantity)}
          </Text>
          <Pressable
            onPress={() => canIncrease && onQtyChange(quantity + meal.qty_step)}
            disabled={!canIncrease}
            hitSlop={8}
            className={`h-8 w-8 rounded-full border border-border bg-background items-center justify-center ${
              canIncrease ? "" : "opacity-40"
            }`}
          >
            <Feather name="plus" size={15} color="#291f18" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
