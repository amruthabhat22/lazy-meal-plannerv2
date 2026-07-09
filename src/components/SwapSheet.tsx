import React, { forwardRef, useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { Feather } from "@expo/vector-icons";
import {
  renderSheetBackdrop,
  sheetBackgroundStyle,
  sheetHandleStyle,
} from "@/components/sheetChrome";
import type { Candidate } from "@/engine/generator";
import type { Diet, Slot } from "@/engine/types";
import type { CustomMealInput } from "@/db/repos/mealsRepo";
import type { MealPick } from "@/state/usePlanStore";
import { formatProtein, formatQty } from "@/utils/format";

const inputStyle = {
  backgroundColor: "#f3ede6",
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 10,
  fontSize: 15,
  color: "#291f18",
} as const;

interface PendingCustom {
  tempId: string;
  input: CustomMealInput;
}

export const SwapSheet = forwardRef<
  BottomSheetModal,
  {
    mode: "swap" | "add";
    slot: Slot;
    diet: Diet;
    currentMealName?: string;
    candidates: Candidate[];
    onConfirm: (picks: MealPick[]) => void;
  }
>(function SwapSheet(
  { mode, slot, diet, currentMealName, candidates, onConfirm },
  ref,
) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customs, setCustoms] = useState<PendingCustom[]>([]);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customKcal, setCustomKcal] = useState("");

  const reset = useCallback(() => {
    setQuery("");
    setSelected(new Set());
    setCustoms([]);
    setCustomOpen(false);
    setCustomName("");
    setCustomProtein("");
    setCustomKcal("");
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) => c.meal.name.toLowerCase().includes(q));
  }, [candidates, query]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const proteinNum = Number(customProtein);
  const kcalNum = Number(customKcal);
  const customValid =
    customName.trim().length > 1 &&
    Number.isFinite(proteinNum) &&
    proteinNum > 0 &&
    proteinNum <= 150 &&
    (customKcal === "" || (Number.isFinite(kcalNum) && kcalNum > 0));

  const addCustomToList = () => {
    if (!customValid) return;
    const tempId = `custom-${Date.now()}`;
    setCustoms((prev) => [
      ...prev,
      {
        tempId,
        input: {
          name: customName.trim(),
          slot,
          diet,
          proteinPerUnit: proteinNum,
          kcalPerUnit: customKcal === "" ? null : kcalNum,
        },
      },
    ]);
    setSelected((prev) => new Set(prev).add(tempId));
    setCustomOpen(false);
    setCustomName("");
    setCustomProtein("");
    setCustomKcal("");
  };

  const confirm = () => {
    const picks: MealPick[] = [];
    for (const c of candidates) {
      if (selected.has(c.meal.id)) {
        picks.push({
          kind: "catalog",
          mealId: c.meal.id,
          quantity: c.meal.default_qty,
        });
      }
    }
    for (const c of customs) {
      if (selected.has(c.tempId)) {
        picks.push({ kind: "custom", input: c.input });
      }
    }
    if (picks.length === 0) return;
    onConfirm(picks);
    reset();
  };

  const count = selected.size;
  const title = mode === "add" ? "Add meal" : "Swap meal";
  const description =
    mode === "add"
      ? "Pick from suggestions or create your own."
      : `${currentMealName ? `Replacing "${currentMealName}". ` : ""}Pick one or more alternatives.`;

  const CheckBox = ({ isSel }: { isSel: boolean }) => (
    <View
      className={`h-5 w-5 rounded-md border items-center justify-center ${
        isSel ? "bg-primary border-primary" : "border-border bg-background"
      }`}
    >
      {isSel ? <Feather name="check" size={12} color="#fefbf8" /> : null}
    </View>
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={["85%"]}
      enableDynamicSizing={false}
      onDismiss={reset}
      backdropComponent={renderSheetBackdrop}
      backgroundStyle={sheetBackgroundStyle}
      handleIndicatorStyle={sheetHandleStyle}
    >
      <View className="px-5 pb-2">
        <Text className="text-base font-bold text-foreground">{title}</Text>
        <Text className="text-xs text-muted-foreground mt-0.5 mb-3">
          {description}
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
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
        ListEmptyComponent={
          <Text className="text-center text-muted-foreground mt-8">
            No meals match your search.
          </Text>
        }
        renderItem={({ item }: { item: Candidate }) => {
          const { meal } = item;
          const isSel = selected.has(meal.id);
          return (
            <Pressable
              onPress={() => toggle(meal.id)}
              className={`flex-row items-center gap-3 rounded-xl border p-3 mb-2 ${
                isSel ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
            >
              <CheckBox isSel={isSel} />
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
        ListFooterComponent={
          <View>
            {customs.map((c) => {
              const isSel = selected.has(c.tempId);
              return (
                <Pressable
                  key={c.tempId}
                  onPress={() => toggle(c.tempId)}
                  className={`flex-row items-center gap-3 rounded-xl border p-3 mb-2 ${
                    isSel
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  <CheckBox isSel={isSel} />
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-sm font-semibold text-foreground">
                        {c.input.name}
                      </Text>
                      <Text className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        custom
                      </Text>
                    </View>
                    <Text className="text-xs text-muted-foreground mt-0.5">
                      {c.input.proteinPerUnit}g protein
                      {c.input.kcalPerUnit != null
                        ? ` · ${c.input.kcalPerUnit} kcal`
                        : ""}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            <View className="rounded-xl border border-dashed border-border bg-secondary/30 mt-1">
              {!customOpen ? (
                <Pressable
                  onPress={() => setCustomOpen(true)}
                  className="h-12 rounded-xl flex-row items-center justify-center gap-2"
                >
                  <Feather name="plus" size={15} color="#3a2a20" />
                  <Text className="text-sm font-semibold text-foreground/80">
                    Add your own item
                  </Text>
                </Pressable>
              ) : (
                <View className="p-3">
                  <Text className="text-xs font-medium text-muted-foreground mb-1.5">
                    Can't find it? Type a dish
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
                  <View className="flex-row items-center gap-2 mt-3">
                    <Pressable
                      onPress={() => setCustomOpen(false)}
                      className="h-12 px-4 rounded-xl items-center justify-center"
                    >
                      <Text className="text-sm font-medium text-muted-foreground">
                        Cancel
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={addCustomToList}
                      disabled={!customValid}
                      className={`flex-1 h-12 rounded-xl flex-row items-center justify-center gap-1.5 ${
                        customValid ? "bg-primary" : "bg-secondary"
                      }`}
                    >
                      <Feather
                        name="plus"
                        size={15}
                        color={customValid ? "#fefbf8" : "#6c6158"}
                      />
                      <Text
                        className={`text-sm font-semibold ${
                          customValid
                            ? "text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        Add to list
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </View>
        }
      />

      <View className="border-t border-border p-4 bg-background">
        <Pressable
          onPress={confirm}
          disabled={count === 0}
          className={`h-12 rounded-xl items-center justify-center ${
            count === 0 ? "bg-secondary" : "bg-primary"
          }`}
        >
          <Text
            className={`text-sm font-semibold ${
              count === 0 ? "text-muted-foreground" : "text-primary-foreground"
            }`}
          >
            {mode === "add" ? "Add" : "Swap"}
            {count > 0 ? ` (${count})` : ""}
          </Text>
        </Pressable>
      </View>
    </BottomSheetModal>
  );
});
