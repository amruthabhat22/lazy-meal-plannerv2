import React, { useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { getCandidates } from "@/engine/generator";
import { ALL_DAYS, CatalogTooSmallError } from "@/engine/types";
import type { Day, Meal, Slot } from "@/engine/types";
import type { PlanRow } from "@/db/repos/plansRepo";
import { getRecipeByMealId, type MealRecipe } from "@/db/repos/mealsRepo";
import { usePrefsStore, slotsForPrefs } from "@/state/usePrefsStore";
import { usePlanStore, type MealPick } from "@/state/usePlanStore";
import { DaySelector } from "@/components/DaySelector";
import { StatCard } from "@/components/StatCard";
import { FoodCard } from "@/components/FoodCard";
import { SwapSheet } from "@/components/SwapSheet";
import { ShareSheet } from "@/components/ShareSheet";
import { RecipeSheet } from "@/components/RecipeSheet";
import { PlanTableImage } from "@/components/PlanTableImage";

const SLOT_LABELS: Record<Slot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

const DIET_LABEL: Record<string, string> = {
  veg: "Vegetarian",
  egg: "Eggetarian",
  "non-veg": "Non-Veg",
};

/** Display order per design: breakfast, lunch, snack, dinner. */
function orderedSlots(slots: Slot[]): Slot[] {
  const order: Slot[] = ["breakfast", "lunch", "snack", "dinner"];
  return order.filter((s) => slots.includes(s));
}

function todayAsDay(): Day {
  const map: Day[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return map[new Date().getDay()];
}

type SheetTarget =
  | { mode: "swap"; row: PlanRow; mealName: string }
  | { mode: "add"; slot: Slot };

export default function WeekPlanScreen() {
  const db = useSQLiteContext();
  const prefs = usePrefsStore((s) => s.prefs);
  const catalog = usePlanStore((s) => s.catalog);
  const planMeals = usePlanStore((s) => s.planMeals);
  const regenerate = usePlanStore((s) => s.regenerate);
  const setRowQuantity = usePlanStore((s) => s.setRowQuantity);
  const removeMeal = usePlanStore((s) => s.removeMeal);
  const swapRow = usePlanStore((s) => s.swapRow);
  const addMeals = usePlanStore((s) => s.addMeals);

  const [selectedDay, setSelectedDay] = useState<Day>(todayAsDay());
  const [target, setTarget] = useState<SheetTarget | null>(null);
  const [recipeTarget, setRecipeTarget] = useState<{
    meal: Meal;
    quantity: number;
    recipe: MealRecipe | null;
  } | null>(null);
  const swapSheetRef = useRef<BottomSheetModal>(null);
  const shareSheetRef = useRef<BottomSheetModal>(null);
  const recipeSheetRef = useRef<BottomSheetModal>(null);
  const planImageRef = useRef<View>(null);

  const mealById = useMemo(
    () => new Map(catalog.map((m) => [m.id, m])),
    [catalog],
  );

  const proteinRatioByDay = useMemo(() => {
    if (!prefs) return {};
    const result: Partial<Record<Day, number>> = {};
    for (const day of ALL_DAYS) {
      const total = planMeals
        .filter((pm) => pm.day === day)
        .reduce((sum, pm) => {
          const meal = mealById.get(pm.mealId);
          return sum + (meal ? meal.protein_per_unit * pm.quantity : 0);
        }, 0);
      result[day] = prefs.proteinGoal > 0 ? total / prefs.proteinGoal : 0;
    }
    return result;
  }, [planMeals, mealById, prefs]);

  const candidates = useMemo(() => {
    if (!target || !prefs) return [];
    const slot = target.mode === "swap" ? target.row.slot : target.slot;
    return getCandidates(
      selectedDay,
      slot,
      {
        catalog,
        diet: prefs.diet,
        proteinGoal: prefs.proteinGoal,
        slots: slotsForPrefs(prefs),
        planned: planMeals,
        cuisinePrefs: prefs.cuisines,
      },
      {
        excludeMealId: target.mode === "swap" ? target.row.mealId : undefined,
      },
    );
  }, [target, selectedDay, planMeals, catalog, prefs]);

  if (!prefs) return <Redirect href="/onboarding" />;

  const slots = orderedSlots(slotsForPrefs(prefs));
  const dayRows = planMeals.filter((pm) => pm.day === selectedDay);

  const withMeal = (rows: PlanRow[]) =>
    rows
      .map((pm) => {
        const meal = mealById.get(pm.mealId);
        return meal ? { pm, meal } : null;
      })
      .filter((x): x is { pm: PlanRow; meal: Meal } => x !== null);

  const dayProtein = withMeal(dayRows).reduce(
    (sum, { pm, meal }) => sum + meal.protein_per_unit * pm.quantity,
    0,
  );
  const dayKcal = withMeal(dayRows).reduce(
    (sum, { pm, meal }) => sum + (meal.kcal_per_unit ?? 0) * pm.quantity,
    0,
  );

  const runRegenerate = async (days: Day[]) => {
    try {
      await regenerate(db, prefs, days);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      if (e instanceof CatalogTooSmallError) {
        Alert.alert(
          "Not enough meals",
          "We couldn't fill every slot with your current settings. Try changing diet or meals per day in Profile.",
        );
      } else {
        throw e;
      }
    }
  };

  const onConfirmPicks = async (picks: MealPick[]) => {
    if (!target) return;
    if (target.mode === "swap") {
      await swapRow(db, target.row.id, picks);
    } else {
      await addMeals(db, selectedDay, target.slot, picks);
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    swapSheetRef.current?.dismiss();
    setTarget(null);
  };

  const openRecipe = async (meal: Meal, quantity: number) => {
    const recipe = await getRecipeByMealId(db, meal.id);
    setRecipeTarget({ meal, quantity, recipe });
    recipeSheetRef.current?.present();
  };

  const shareAsImage = async () => {
    const uri = await captureRef(planImageRef, {
      format: "png",
      quality: 1,
      result: "tmpfile",
    });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: "Share weekly plan",
      });
    } else {
      Alert.alert("Sharing unavailable", "This device can't share files.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-start justify-between px-5 pt-4 pb-2 gap-3">
        <View className="flex-1 min-w-0">
          <Text className="text-2xl font-bold tracking-tight text-foreground">
            Your week 🍲
          </Text>
          <Text
            className="mt-1 text-[13px] text-muted-foreground"
            numberOfLines={1}
          >
            {DIET_LABEL[prefs.diet]} · {prefs.proteinGoal}g protein/day ·{" "}
            {prefs.mealsPerDay} meals
          </Text>
        </View>
        <View className="flex-row items-center gap-2 mt-1">
          <Pressable
            onPress={() => void runRegenerate([...ALL_DAYS])}
            hitSlop={6}
            className="h-10 w-10 rounded-full border border-border bg-card items-center justify-center"
          >
            <Feather name="refresh-cw" size={15} color="#291f18" />
          </Pressable>
          <Pressable
            onPress={() => shareSheetRef.current?.present()}
            hitSlop={6}
            className="h-10 w-10 rounded-full border border-border bg-card items-center justify-center"
          >
            <Feather name="share-2" size={15} color="#291f18" />
          </Pressable>
        </View>
      </View>

      <DaySelector
        selected={selectedDay}
        onSelect={setSelectedDay}
        proteinRatioByDay={proteinRatioByDay}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="pt-3">
          <StatCard
            protein={dayProtein}
            proteinGoal={prefs.proteinGoal}
            kcal={dayKcal}
            kcalGoal={prefs.calorieGoal}
          />
        </View>

        <View className="px-4 pt-5" style={{ gap: 24 }}>
          {slots.map((slot) => {
            const rows = withMeal(dayRows.filter((pm) => pm.slot === slot));
            const slotProtein = Math.round(
              rows.reduce(
                (a, { pm, meal }) => a + meal.protein_per_unit * pm.quantity,
                0,
              ),
            );
            const slotKcal = Math.round(
              rows.reduce(
                (a, { pm, meal }) =>
                  a + (meal.kcal_per_unit ?? 0) * pm.quantity,
                0,
              ),
            );
            return (
              <View key={slot}>
                <View className="flex-row items-center justify-between gap-3 mb-3">
                  <View className="min-w-0">
                    <View className="flex-row items-baseline gap-2">
                      <Text className="text-lg font-bold tracking-tight text-foreground">
                        {SLOT_LABELS[slot]}
                      </Text>
                      {slot === "snack" ? (
                        <Text className="text-[11px] font-medium text-muted-foreground">
                          optional
                        </Text>
                      ) : null}
                    </View>
                    {rows.length > 0 ? (
                      <Text className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                        {slotProtein}g protein · {slotKcal} cal
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => {
                      setTarget({ mode: "add", slot });
                      swapSheetRef.current?.present();
                    }}
                    hitSlop={6}
                    className="h-8 px-3 rounded-full border border-primary/40 bg-primary/5 flex-row items-center gap-1"
                  >
                    <Feather name="plus" size={13} color="#a55a37" />
                    <Text className="text-xs font-semibold text-primary">
                      Add meal
                    </Text>
                  </Pressable>
                </View>

                {rows.map(({ pm, meal }) => (
                  <FoodCard
                    key={pm.id}
                    meal={meal}
                    quantity={pm.quantity}
                    onQtyChange={(q) => setRowQuantity(db, pm.id, q)}
                    onSwap={() => {
                      setTarget({ mode: "swap", row: pm, mealName: meal.name });
                      swapSheetRef.current?.present();
                    }}
                    onRemove={() => removeMeal(db, pm.id)}
                    onOpenRecipe={() => void openRecipe(meal, pm.quantity)}
                  />
                ))}
              </View>
            );
          })}

          <Pressable
            onPress={() => void runRegenerate([selectedDay])}
            className="h-12 rounded-xl border border-dashed border-border bg-secondary/30 items-center justify-center"
          >
            <Text className="text-sm font-semibold text-foreground/80">
              ↻ Regenerate this day
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <SwapSheet
        ref={swapSheetRef}
        mode={target?.mode ?? "swap"}
        slot={
          target?.mode === "swap" ? target.row.slot : (target?.slot ?? "lunch")
        }
        diet={prefs.diet}
        currentMealName={target?.mode === "swap" ? target.mealName : undefined}
        candidates={candidates}
        onConfirm={(picks) => void onConfirmPicks(picks)}
      />
      <ShareSheet
        ref={shareSheetRef}
        planMeals={planMeals}
        catalog={catalog}
        slots={slots}
        onShareImage={shareAsImage}
      />
      <RecipeSheet
        ref={recipeSheetRef}
        meal={recipeTarget?.meal ?? null}
        quantity={recipeTarget?.quantity ?? 1}
        recipe={recipeTarget?.recipe ?? null}
      />

      {/* Off-screen render target for the shareable plan-table image. */}
      <View
        style={{ position: "absolute", left: -2000, top: 0, opacity: 0 }}
        pointerEvents="none"
      >
        <PlanTableImage
          ref={planImageRef}
          planMeals={planMeals}
          catalog={catalog}
          slots={slots}
          proteinGoal={prefs.proteinGoal}
        />
      </View>
    </SafeAreaView>
  );
}
