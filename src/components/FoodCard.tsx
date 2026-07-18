import React from "react";
import { Pressable, Text, View } from "react-native";
import { Info, Minus, Plus, Repeat } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Icon, ICON_COLORS } from "@/components/ui/Icon";
import type { Meal } from "@/engine/types";
import { formatNumber, formatQty } from "@/utils/format";
import { FONT_CLIP_FIX } from "@/utils/androidText";

/** Meal card inside a slot section (design's FoodCard). Dropping the
 * quantity below min removes the meal from the slot. The book icon (in the
 * nutrition chips row, per design) and a long-press open the recipe. */
export function FoodCard({
  meal,
  quantity,
  onQtyChange,
  onSwap,
  onRemove,
  onOpenRecipe,
}: {
  meal: Meal;
  quantity: number;
  onQtyChange: (next: number) => void;
  onSwap: () => void;
  onRemove: () => void;
  onOpenRecipe: () => void;
}) {
  const protein = Math.round(meal.protein_per_unit * quantity);
  const kcal =
    meal.kcal_per_unit != null ? Math.round(meal.kcal_per_unit * quantity) : null;

  return (
    <Pressable
      onLongPress={onOpenRecipe}
      delayLongPress={500}
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
          <Text
            className="text-[15px] font-semibold text-foreground leading-tight"
            numberOfLines={2}
           style={FONT_CLIP_FIX}>
            {meal.name}
          </Text>
          <Text className="text-sm text-muted-foreground mt-0.5">
            {meal.grams_per_unit != null && meal.unit !== "g"
              ? `${formatQty(quantity, meal.unit)} (≈ ${Math.round(
                  meal.grams_per_unit * quantity,
                )} g)`
              : formatQty(quantity, meal.unit)}
          </Text>
        </View>
        <Pressable
          onPress={onSwap}
          hitSlop={4}
          accessibilityLabel={`Swap ${meal.name}`}
          className="h-9 rounded-full flex-row items-center justify-center gap-1.5 px-3 -mr-1"
        >
          <Icon icon={Repeat} size="sm" color={ICON_COLORS.primary} />
          <Text className="text-sm font-semibold text-primary" style={FONT_CLIP_FIX}>
            Swap
          </Text>
        </Pressable>
      </View>

      <View className="mt-2 flex-row items-center justify-between gap-2">
        {/* Nutrition chips + recipe icon (design: icon lives in this row).
            Chips hug their text — no fixed widths anywhere. */}
        <View className="flex-row flex-wrap items-center gap-1.5 flex-1">
          <View className="self-auto rounded-full bg-secondary/70 px-2.5 py-1">
            <Text
              className="text-xs leading-4 font-semibold text-foreground/80 tabular-nums"
              style={FONT_CLIP_FIX}
              numberOfLines={1}
            >
              {`${protein}g`}
            </Text>
          </View>
          {kcal != null ? (
            <View className="self-auto rounded-full bg-secondary/70 px-2.5 py-1">
              <Text
                className="text-xs leading-4 font-semibold text-foreground/80 tabular-nums"
                style={FONT_CLIP_FIX}
                numberOfLines={1}
              >
                {`${kcal} cal`}
              </Text>
            </View>
          ) : null}
          {/* Info (not book): the sheet holds recipe, ingredients, and
              the hide-dish action — more than just a recipe. */}
          <Pressable
            onPress={onOpenRecipe}
            hitSlop={10}
            accessibilityLabel={`About ${meal.name}: recipe and options`}
            className="h-6 w-6 rounded-full bg-primary/10 items-center justify-center"
          >
            <Icon icon={Info} size={13} color={ICON_COLORS.primary} />
          </Pressable>
        </View>

        <View className="flex-row items-center gap-1">
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              if (quantity - meal.qty_step < meal.min_qty - 1e-9) {
                onRemove();
              } else {
                onQtyChange(quantity - meal.qty_step);
              }
            }}
            hitSlop={8}
            accessibilityLabel="Decrease quantity"
            className="h-8 w-8 rounded-full border border-border bg-background items-center justify-center"
          >
            <Icon icon={Minus} size="sm" color={ICON_COLORS.foreground} />
          </Pressable>
          <Text className="w-9 text-center text-sm font-semibold text-foreground tabular-nums" style={FONT_CLIP_FIX}>
            {formatNumber(quantity)}
          </Text>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              onQtyChange(quantity + meal.qty_step);
            }}
            hitSlop={8}
            accessibilityLabel="Increase quantity"
            className="h-8 w-8 rounded-full border border-border bg-background items-center justify-center"
          >
            <Icon icon={Plus} size="sm" color={ICON_COLORS.foreground} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
