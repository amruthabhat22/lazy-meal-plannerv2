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
    <BottomSheetModal ref={ref} enableDynamicSizing>
      <BottomSheetView style={{ paddingBottom: 40 }}>
        {meal ? (
          <View className="px-5 pt-1">
            <Text className="text-xl font-bold text-gray-900 mb-3">
              {meal.name}
            </Text>
            <Row
              label="Protein"
              value={`${formatQty(quantity, meal.unit)} × ${formatNumber(
                meal.protein_per_unit,
              )}g = ${formatProtein(meal.protein_per_unit * quantity)}`}
            />
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
    <View className="flex-row justify-between py-2 border-b border-gray-100">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="text-sm font-medium text-gray-900 capitalize">
        {value}
      </Text>
    </View>
  );
}
