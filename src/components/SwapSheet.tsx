import React, { forwardRef, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import type { Candidate } from "@/engine/generator";
import type { Meal } from "@/engine/types";
import { formatProtein, formatQty } from "@/utils/format";

export const SwapSheet = forwardRef<
  BottomSheetModal,
  {
    candidates: Candidate[];
    onPick: (meal: Meal) => void;
  }
>(function SwapSheet({ candidates, onPick }, ref) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) => c.meal.name.toLowerCase().includes(q));
  }, [candidates, query]);

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={["75%"]}
      enableDynamicSizing={false}
      onDismiss={() => setQuery("")}
    >
      <View className="px-4 pb-2">
        <Text className="text-lg font-bold text-gray-900 mb-2">
          Swap meal
        </Text>
        <BottomSheetTextInput
          placeholder="Search meals"
          value={query}
          onChangeText={setQuery}
          style={{
            backgroundColor: "#f3f4f6",
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            fontSize: 16,
          }}
        />
      </View>
      <BottomSheetFlatList
        data={filtered}
        keyExtractor={(item: Candidate) => item.meal.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        ListEmptyComponent={
          <Text className="text-center text-muted mt-8">
            No meals match your search.
          </Text>
        }
        renderItem={({ item }: { item: Candidate }) => {
          const { meal } = item;
          return (
            <Pressable
              onPress={() => onPick(meal)}
              className="flex-row justify-between items-center py-3 border-b border-gray-100"
            >
              <View className="flex-1 pr-3">
                <Text className="text-base font-medium text-gray-900">
                  {meal.name}
                </Text>
                <Text className="text-sm text-muted mt-0.5">
                  {formatQty(meal.default_qty, meal.unit)}
                  {meal.prep_time_min != null
                    ? ` · ${meal.prep_time_min} min`
                    : ""}
                </Text>
              </View>
              <Text className="text-base font-semibold text-primary">
                {formatProtein(meal.protein_per_unit * meal.default_qty)}
              </Text>
            </Pressable>
          );
        }}
      />
    </BottomSheetModal>
  );
});
