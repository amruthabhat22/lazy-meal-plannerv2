import React, { forwardRef, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import type { Candidate } from "@/engine/generator";
import type { Diet, Meal, Slot } from "@/engine/types";
import type { CustomMealInput } from "@/db/repos/mealsRepo";
import { formatProtein, formatQty } from "@/utils/format";

const inputStyle = {
  backgroundColor: "#f3ede6",
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 10,
  fontSize: 15,
  color: "#291f18",
} as const;

export const SwapSheet = forwardRef<
  BottomSheetModal,
  {
    candidates: Candidate[];
    slot: Slot;
    diet: Diet;
    onPick: (meal: Meal) => void;
    onAddCustom: (input: CustomMealInput) => void | Promise<void>;
  }
>(function SwapSheet({ candidates, slot, diet, onPick, onAddCustom }, ref) {
  const [query, setQuery] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customKcal, setCustomKcal] = useState("");

  const reset = () => {
    setQuery("");
    setCustomOpen(false);
    setCustomName("");
    setCustomProtein("");
    setCustomKcal("");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) => c.meal.name.toLowerCase().includes(q));
  }, [candidates, query]);

  const proteinNum = Number(customProtein);
  const kcalNum = Number(customKcal);
  const customValid =
    customName.trim().length > 1 &&
    Number.isFinite(proteinNum) &&
    proteinNum > 0 &&
    proteinNum <= 150 &&
    (customKcal === "" || (Number.isFinite(kcalNum) && kcalNum > 0));

  const submitCustom = () => {
    if (!customValid) return;
    void onAddCustom({
      name: customName.trim(),
      slot,
      diet,
      proteinPerUnit: proteinNum,
      kcalPerUnit: customKcal === "" ? null : kcalNum,
    });
    reset();
  };

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={["75%"]}
      enableDynamicSizing={false}
      onDismiss={reset}
      backgroundStyle={{ backgroundColor: "#fffdfa" }}
      handleIndicatorStyle={{ backgroundColor: "#e3ddd5" }}
    >
      <View className="px-5 pb-2">
        <Text className="text-base font-bold text-foreground">Swap meal</Text>
        <Text className="text-xs text-muted-foreground mt-0.5 mb-3">
          Pick from suggestions or create your own.
        </Text>
        <BottomSheetTextInput
          placeholder="Search meals"
          placeholderTextColor="#6c6158"
          value={query}
          onChangeText={setQuery}
          style={inputStyle}
        />
      </View>

      <BottomSheetFlatList
        data={filtered}
        keyExtractor={(item: Candidate) => item.meal.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        ListEmptyComponent={
          <Text className="text-center text-muted-foreground mt-8">
            No meals match your search.
          </Text>
        }
        ListFooterComponent={
          <View className="mt-3">
            {!customOpen ? (
              <Pressable
                onPress={() => setCustomOpen(true)}
                className="h-12 rounded-xl border border-dashed border-border bg-secondary/30 items-center justify-center"
              >
                <Text className="text-sm font-semibold text-foreground/80">
                  Can't find it? Type a dish
                </Text>
              </Pressable>
            ) : (
              <View className="rounded-2xl border border-border bg-card p-3">
                <Text className="text-xs font-medium text-muted-foreground mb-1.5">
                  Dish name
                </Text>
                <BottomSheetTextInput
                  placeholder="e.g. Chicken shawarma bowl"
                  placeholderTextColor="#6c6158"
                  value={customName}
                  onChangeText={setCustomName}
                  style={inputStyle}
                />
                <View className="flex-row gap-2 mt-3">
                  <View className="flex-1">
                    <Text className="text-xs font-medium text-muted-foreground mb-1.5">
                      Protein (g / serving)
                    </Text>
                    <BottomSheetTextInput
                      placeholder="25"
                      placeholderTextColor="#6c6158"
                      keyboardType="numeric"
                      value={customProtein}
                      onChangeText={setCustomProtein}
                      style={inputStyle}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-medium text-muted-foreground mb-1.5">
                      Calories (optional)
                    </Text>
                    <BottomSheetTextInput
                      placeholder="450"
                      placeholderTextColor="#6c6158"
                      keyboardType="numeric"
                      value={customKcal}
                      onChangeText={setCustomKcal}
                      style={inputStyle}
                    />
                  </View>
                </View>
                <Pressable
                  onPress={submitCustom}
                  disabled={!customValid}
                  className={`h-12 rounded-xl items-center justify-center mt-3 ${
                    customValid ? "bg-primary" : "bg-secondary"
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      customValid
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    Add meal
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setCustomOpen(false)}
                  className="h-10 items-center justify-center"
                >
                  <Text className="text-xs font-semibold text-muted-foreground">
                    Cancel
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        }
        renderItem={({ item }: { item: Candidate }) => {
          const { meal } = item;
          return (
            <Pressable
              onPress={() => onPick(meal)}
              className="flex-row items-center gap-3 py-3 border-b border-border/60"
            >
              <View className="flex-1 min-w-0">
                <Text className="text-sm font-semibold text-foreground">
                  {meal.name}
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  {formatQty(meal.default_qty, meal.unit)}
                  {meal.prep_time_min != null
                    ? ` · ${meal.prep_time_min} min`
                    : ""}
                </Text>
              </View>
              <View className="rounded-full bg-accent/60 px-2 py-0.5">
                <Text className="text-[11px] font-semibold text-accent-foreground tabular-nums">
                  {formatProtein(meal.protein_per_unit * meal.default_qty)}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </BottomSheetModal>
  );
});
