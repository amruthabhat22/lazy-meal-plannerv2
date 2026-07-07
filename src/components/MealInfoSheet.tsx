import React, { forwardRef } from "react";
import { Text, View } from "react-native";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import type { Meal } from "@/engine/types";
import { formatNumber, formatProtein, formatQty } from "@/utils/format";

/** Read-only meal facts on long-press (spec 5.4). */
export const MealInfoSheet = forwardRef<
  BottomSheetModal,
  { meal: Meal | null; quantity: number }
>(function MealInfoSheet({ meal, quantity }, ref) {
  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      backgroundStyle={{ backgroundColor: "#fffdfa" }}
      handleIndicatorStyle={{ backgroundColor: "#e3ddd5" }}
    >
      <BottomSheetView style={{ paddingBottom: 40 }}>
        {meal ? (
          <View className="px-5 pt-1">
            <Text className="text-xl font-bold text-foreground mb-3">
              {meal.name}
            </Text>
            <Row
              label="Protein"
              value={`${formatQty(quantity, meal.unit)} × ${formatNumber(
                meal.protein_per_unit,
              )}g = ${formatProtein(meal.protein_per_unit * quantity)}`}
            />
            {meal.kcal_per_unit != null ? (
              <Row
                label="Calories"
                value={`${Math.round(meal.kcal_per_unit * quantity)} kcal`}
              />
            ) : null}
            {meal.prep_time_min != null ? (
              <Row label="Prep time" value={`${meal.prep_time_min} min`} />
            ) : null}
            {meal.difficulty ? (
              <Row label="Difficulty" value={meal.difficulty} />
            ) : null}
            <Row
              label="Allergens"
              value={meal.allergens.length ? meal.allergens.join(", ") : "None"}
            />
          </View>
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-2 border-b border-border/60">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="text-sm font-medium text-foreground capitalize">
        {value}
      </Text>
    </View>
  );
}
