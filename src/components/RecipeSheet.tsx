import React, { forwardRef } from "react";
import { Pressable, Text, View } from "react-native";
import { BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import type { Meal } from "@/engine/types";
import type { MealRecipe } from "@/db/repos/mealsRepo";
import { formatIngredientQty, formatNumber } from "@/utils/format";
import {
  renderSheetBackdrop,
  sheetBackgroundStyle,
  sheetHandleStyle,
} from "@/components/sheetChrome";

/** Difficulty chip tints per design: Easy emerald, Medium amber, Hard rose. */
const DIFFICULTY_STYLE: Record<string, { bg: string; fg: string }> = {
  easy: { bg: "rgba(16, 185, 129, 0.1)", fg: "#059669" },
  medium: { bg: "rgba(245, 158, 11, 0.1)", fg: "#d97706" },
  hard: { bg: "rgba(244, 63, 94, 0.1)", fg: "#e11d48" },
};

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-secondary/70 px-2.5 py-1">
      {children}
    </View>
  );
}

function SectionHeading({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <View className="flex-row items-center gap-2 mb-2.5">
      {icon}
      <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </Text>
    </View>
  );
}

/**
 * Recipe & cooking info bottomsheet (design's RecipeSheet): prep time,
 * difficulty, protein/cal chips, ingredients list, numbered instructions.
 * Ingredient amounts are scaled to the planned quantity — honest numbers.
 */
export const RecipeSheet = forwardRef<
  BottomSheetModal,
  { meal: Meal | null; quantity: number; recipe: MealRecipe | null }
>(function RecipeSheet({ meal, quantity, recipe }, ref) {
  const scale = meal && meal.default_qty > 0 ? quantity / meal.default_qty : 1;
  const difficulty = meal?.difficulty
    ? (DIFFICULTY_STYLE[meal.difficulty] ?? DIFFICULTY_STYLE.medium)
    : null;

  const dismiss = () => {
    (ref as React.RefObject<BottomSheetModal | null>)?.current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={["85%"]}
      enableDynamicSizing={false}
      backdropComponent={renderSheetBackdrop}
      backgroundStyle={sheetBackgroundStyle}
      handleIndicatorStyle={sheetHandleStyle}
    >
      {meal ? (
        <>
          {/* Header */}
          <View className="px-5 pt-1 pb-3 border-b border-border">
            <Text className="text-lg font-bold text-foreground pr-8">
              {meal.name}
            </Text>
            <View className="flex-row flex-wrap items-center gap-2 pt-2">
              {meal.prep_time_min != null ? (
                <Chip>
                  <Feather name="clock" size={13} color="#3a2a20" />
                  <Text className="text-xs text-foreground/80">
                    {meal.prep_time_min} min
                  </Text>
                </Chip>
              ) : null}
              {meal.difficulty && difficulty ? (
                <View
                  className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
                  style={{ backgroundColor: difficulty.bg }}
                >
                  <MaterialCommunityIcons
                    name="gauge"
                    size={13}
                    color={difficulty.fg}
                  />
                  <Text
                    className="text-xs font-semibold capitalize"
                    style={{ color: difficulty.fg }}
                  >
                    {meal.difficulty}
                  </Text>
                </View>
              ) : null}
              <Chip>
                <Text className="text-xs text-foreground/80 tabular-nums">
                  {Math.round(meal.protein_per_unit * quantity)}g protein
                </Text>
              </Chip>
              {meal.kcal_per_unit != null ? (
                <Chip>
                  <Text className="text-xs text-foreground/80 tabular-nums">
                    {Math.round(meal.kcal_per_unit * quantity)} cal
                  </Text>
                </Chip>
              ) : null}
            </View>
          </View>

          <BottomSheetScrollView
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 8,
            }}
          >
            {recipe ? (
              <>
                {/* Ingredients */}
                <View className="mb-5">
                  <SectionHeading
                    icon={
                      <MaterialCommunityIcons
                        name="silverware-fork-knife"
                        size={15}
                        color="#a55a37"
                      />
                    }
                    title="Ingredients"
                  />
                  <View className="rounded-xl bg-secondary/40 border border-border/60 p-3.5">
                    {recipe.ingredients.map((ing, i) => (
                      <View
                        key={i}
                        className={`flex-row items-start gap-3 ${
                          i > 0 ? "mt-2" : ""
                        }`}
                      >
                        <View className="mt-1.5 h-2 w-2 rounded-full bg-primary" />
                        <Text className="flex-1 text-sm text-foreground/90 leading-snug">
                          {formatIngredientQty(
                            roundIngredient(ing.amount * scale),
                            ing.unit,
                          )}{" "}
                          {ing.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Instructions */}
                <View className="mb-4">
                  <SectionHeading
                    icon={
                      <MaterialCommunityIcons
                        name="chef-hat"
                        size={15}
                        color="#a55a37"
                      />
                    }
                    title="Instructions"
                  />
                  {recipe.steps.map((step, i) => (
                    <View
                      key={i}
                      className={`flex-row items-start gap-3.5 ${
                        i > 0 ? "mt-3" : ""
                      }`}
                    >
                      <View className="h-6 w-6 rounded-full bg-primary/10 items-center justify-center">
                        <Text className="text-[11px] font-bold text-primary">
                          {i + 1}
                        </Text>
                      </View>
                      <Text className="flex-1 text-sm leading-relaxed text-foreground/90 pt-0.5">
                        {step}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View className="rounded-xl bg-secondary/40 border border-border/60 p-4">
                <Text className="text-sm text-muted-foreground leading-relaxed">
                  This is a custom dish, so there's no saved recipe. Nutrition
                  shown is what you entered
                  {meal.allergens.length
                    ? ` · allergens: ${meal.allergens.join(", ")}`
                    : ""}
                  .
                </Text>
              </View>
            )}
          </BottomSheetScrollView>

          {/* Close */}
          <View className="px-5 pb-8 pt-2 bg-card">
            <Pressable
              onPress={dismiss}
              className="h-11 rounded-full bg-secondary flex-row items-center justify-center gap-2"
            >
              <Feather name="x" size={15} color="#291f18" />
              <Text className="text-sm font-semibold text-foreground">
                Close
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </BottomSheetModal>
  );
});

/** Round scaled amounts to friendly steps (avoid "33.33 g"). */
function roundIngredient(amount: number): number {
  if (amount >= 20) return Math.round(amount / 5) * 5;
  if (amount >= 1) return Math.round(amount * 2) / 2;
  return Number(formatNumber(Math.round(amount * 4) / 4));
}
