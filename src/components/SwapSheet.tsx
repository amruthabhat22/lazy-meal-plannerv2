import React, { forwardRef, useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { Check, Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Icon, ICON_COLORS } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import {
  renderSheetBackdrop,
  sheetBackgroundStyle,
  sheetHandleStyle,
  SheetHeader,
  useSheetFooterPadding,
} from "@/components/sheetChrome";
import type { Candidate } from "@/engine/generator";
import type { Diet, Slot } from "@/engine/types";
import type { CustomMealInput } from "@/db/repos/mealsRepo";
import type { MealPick } from "@/state/usePlanStore";
import { formatProtein, formatQty } from "@/utils/format";
import { FONT_CLIP_FIX } from "@/utils/androidText";

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
    void Haptics.selectionAsync();
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

  const footerPadding = useSheetFooterPadding();

  const CheckBox = ({ isSel }: { isSel: boolean }) => (
    <View
      className={`h-5 w-5 rounded-md border items-center justify-center ${
        isSel ? "bg-primary border-primary" : "border-border bg-background"
      }`}
    >
      {isSel ? (
        <Icon icon={Check} size={13} color={ICON_COLORS.primaryForeground} />
      ) : null}
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
      <SheetHeader title={title} subtitle={description} divider={false} />
      <View className="px-5 pb-3">
        <BottomSheetTextInput
          placeholder="Search meals"
          placeholderTextColor="#6c6158"
          value={query}
          onChangeText={setQuery}
          style={inputStyle}
        />
      </View>
      <View className="h-px bg-border" />

      <BottomSheetFlatList
        data={filtered}
        keyExtractor={(item: Candidate) => item.meal.id}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 16,
        }}
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
                <Text className="text-sm font-semibold text-foreground" style={FONT_CLIP_FIX}>
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
                <Text className="text-xs font-semibold text-accent-foreground tabular-nums" style={FONT_CLIP_FIX}>
                  {formatProtein(meal.protein_per_unit * meal.default_qty)}
                </Text>
              </View>
            </Pressable>
          );
        }}
        // Design feedback: keep "Add your own item" up top so it isn't
        // buried under a long suggestion list.
        ListHeaderComponent={
          <View className="mb-2">
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
                      <Text className="text-sm font-semibold text-foreground" style={FONT_CLIP_FIX}>
                        {c.input.name}
                      </Text>
                      <Text className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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

            <View className="rounded-xl border border-dashed border-border bg-secondary/30">
              {!customOpen ? (
                <Pressable
                  onPress={() => setCustomOpen(true)}
                  className="h-12 rounded-xl flex-row items-center justify-center gap-2"
                >
                  <Icon icon={Plus} size="sm" color={ICON_COLORS.accentForeground} />
                  <Text className="text-sm font-semibold text-foreground/80" style={FONT_CLIP_FIX}>
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
                    <View className="flex-1">
                      <Button
                        label="Add to list"
                        icon={Plus}
                        rounded="xl"
                        onPress={addCustomToList}
                        disabled={!customValid}
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        }
      />

      <View
        className="border-t border-border px-4 pt-3 bg-background"
        style={{ paddingBottom: footerPadding }}
      >
        <Button
          label={`${mode === "add" ? "Add" : "Swap"}${count > 0 ? ` (${count})` : ""}`}
          rounded="xl"
          onPress={confirm}
          disabled={count === 0}
        />
      </View>
    </BottomSheetModal>
  );
});
