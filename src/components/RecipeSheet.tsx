import React, { forwardRef, useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import {
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetFooterProps,
} from "@gorhom/bottom-sheet";
import {
  ChefHat,
  Clock,
  EyeOff,
  Gauge,
  UtensilsCrossed,
  X,
} from "lucide-react-native";
import { Icon, ICON_COLORS } from "@/components/ui/Icon";
import type { Meal } from "@/engine/types";
import type { MealRecipe } from "@/db/repos/mealsRepo";
import { formatIngredientQty, formatNumber, formatQty } from "@/utils/format";
import {
  renderSheetBackdrop,
  sheetBackgroundStyle,
  sheetHandleStyle,
  useSheetFooterPadding,
  useSheetSizing,
} from "@/components/sheetChrome";
import { FONT_CLIP_FIX, FONT_CLIP_FIX_BOLD } from "@/utils/androidText";

/** Difficulty chip tints per design: Easy emerald, Medium amber, Hard rose. */
const DIFFICULTY_STYLE: Record<string, { bg: string; fg: string }> = {
  easy: { bg: "rgba(16, 185, 129, 0.1)", fg: "#047857" },
  medium: { bg: "rgba(245, 158, 11, 0.1)", fg: "#b45309" },
  hard: { bg: "rgba(244, 63, 94, 0.1)", fg: "#be123c" },
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
    <View className="flex-row items-center gap-2 mb-3">
      {icon}
      <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground" style={FONT_CLIP_FIX_BOLD}>
        {title}
      </Text>
    </View>
  );
}

/**
 * Recipe & cooking info bottomsheet (design's RecipeSheet): prep time,
 * difficulty, protein/cal chips, ingredients list, numbered instructions.
 * Sizes to content (no dead bottom whitespace); ingredient amounts are
 * scaled to the planned quantity — honest numbers.
 */
export const RecipeSheet = forwardRef<
  BottomSheetModal,
  {
    meal: Meal | null;
    quantity: number;
    recipe: MealRecipe | null;
    /** "Don't show this dish again" — omit to hide the action. */
    onBlockDish?: (meal: Meal) => void;
  }
>(function RecipeSheet({ meal, quantity, recipe, onBlockDish }, ref) {
  const sizing = useSheetSizing();
  const footerPadding = useSheetFooterPadding();
  const scale = meal && meal.default_qty > 0 ? quantity / meal.default_qty : 1;
  const difficulty = meal?.difficulty
    ? (DIFFICULTY_STYLE[meal.difficulty] ?? DIFFICULTY_STYLE.medium)
    : null;

  const dismiss = () => {
    (ref as React.RefObject<BottomSheetModal | null>)?.current?.dismiss();
  };

  // Sticky footer: the hide/close CTAs stay pinned while the recipe scrolls.
  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props}>
        <View
          className="px-5 pt-3 bg-card border-t border-border"
          style={{ paddingBottom: footerPadding, gap: 8 }}
        >
          {meal && onBlockDish ? (
            <Pressable
              onPress={() => onBlockDish(meal)}
              accessibilityRole="button"
              className="h-11 rounded-full border border-destructive/30 bg-destructive/5 flex-row items-center justify-center gap-2"
            >
              <Icon icon={EyeOff} size="sm" color={ICON_COLORS.destructive} />
              <Text className="text-sm font-semibold text-destructive" style={FONT_CLIP_FIX}>
                Don't show this dish again
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={dismiss}
            className="h-11 rounded-full bg-secondary flex-row items-center justify-center gap-2"
          >
            <Icon icon={X} size="sm" color={ICON_COLORS.foreground} />
            <Text className="text-sm font-semibold text-foreground" style={FONT_CLIP_FIX}>
              Close
            </Text>
          </Pressable>
        </View>
      </BottomSheetFooter>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meal, onBlockDish, footerPadding],
  );

  const footerSpace =
    footerPadding + 12 + 44 + (onBlockDish ? 52 : 0) + 8;

  return (
    <BottomSheetModal
      ref={ref}
      {...sizing}
      backdropComponent={renderSheetBackdrop}
      backgroundStyle={sheetBackgroundStyle}
      handleIndicatorStyle={sheetHandleStyle}
      footerComponent={meal ? renderFooter : undefined}
    >
      {meal ? (
        <BottomSheetScrollView
          contentContainerStyle={{ paddingBottom: footerSpace }}
        >
          {/* Header */}
          <View className="px-5 pt-1 pb-4 border-b border-border">
            <Text className="text-xl font-bold tracking-tight text-foreground pr-8" style={FONT_CLIP_FIX_BOLD}>
              {meal.name}
            </Text>
            <Text className="text-sm text-muted-foreground mt-1">
              {meal.grams_per_unit != null && meal.unit !== "g"
                ? `Serving: ${formatQty(quantity, meal.unit)} (≈ ${Math.round(
                    meal.grams_per_unit * quantity,
                  )} g)`
                : `Serving: ${formatQty(quantity, meal.unit)}`}
            </Text>
            <View className="flex-row flex-wrap items-center gap-2 mt-2.5">
              {meal.prep_time_min != null ? (
                <Chip>
                  <Icon icon={Clock} size={14} color={ICON_COLORS.accentForeground} />
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
                  <Icon icon={Gauge} size={14} color={difficulty.fg} />
                  <Text
                    className="text-xs font-semibold capitalize"
                    style={[FONT_CLIP_FIX, { color: difficulty.fg }]}
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

          <View className="px-5 py-5">
            {recipe ? (
              <>
                {/* Ingredients */}
                <View className="mb-6">
                  <SectionHeading
                    icon={
                      <Icon
                        icon={UtensilsCrossed}
                        size="sm"
                        color={ICON_COLORS.primary}
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
                <View>
                  <SectionHeading
                    icon={
                      <Icon icon={ChefHat} size="sm" color={ICON_COLORS.primary} />
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
                        <Text className="text-xs font-bold text-primary" style={FONT_CLIP_FIX_BOLD}>
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
          </View>

        </BottomSheetScrollView>
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
