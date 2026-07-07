import React, { useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, Redirect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import * as Haptics from "expo-haptics";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { getCandidates } from "@/engine/generator";
import { ALL_DAYS, CatalogTooSmallError } from "@/engine/types";
import type { Day, Meal, Slot } from "@/engine/types";
import { usePrefsStore, slotsForPrefs } from "@/state/usePrefsStore";
import { usePlanStore } from "@/state/usePlanStore";
import { DaySelector } from "@/components/DaySelector";
import { StatCard } from "@/components/StatCard";
import { MealCard } from "@/components/MealCard";
import { SwapSheet } from "@/components/SwapSheet";
import { MealInfoSheet } from "@/components/MealInfoSheet";

function todayAsDay(): Day {
  const map: Day[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return map[new Date().getDay()];
}

export default function WeekPlan() {
  const db = useSQLiteContext();
  const prefs = usePrefsStore((s) => s.prefs);
  const catalog = usePlanStore((s) => s.catalog);
  const planMeals = usePlanStore((s) => s.planMeals);
  const regenerate = usePlanStore((s) => s.regenerate);
  const setQuantity = usePlanStore((s) => s.setQuantity);
  const swap = usePlanStore((s) => s.swap);
  const swapToCustom = usePlanStore((s) => s.swapToCustom);

  const [selectedDay, setSelectedDay] = useState<Day>(todayAsDay());
  const [swapTarget, setSwapTarget] = useState<{ day: Day; slot: Slot } | null>(
    null,
  );
  const [infoTarget, setInfoTarget] = useState<{
    meal: Meal;
    quantity: number;
  } | null>(null);
  const swapSheetRef = useRef<BottomSheetModal>(null);
  const infoSheetRef = useRef<BottomSheetModal>(null);

  const mealById = useMemo(
    () => new Map(catalog.map((m) => [m.id, m])),
    [catalog],
  );

  const goalMetByDay = useMemo(() => {
    if (!prefs) return {};
    const result: Partial<Record<Day, boolean>> = {};
    for (const day of ALL_DAYS) {
      const total = planMeals
        .filter((pm) => pm.day === day)
        .reduce((sum, pm) => {
          const meal = mealById.get(pm.mealId);
          return sum + (meal ? meal.protein_per_unit * pm.quantity : 0);
        }, 0);
      result[day] = total >= prefs.proteinGoal * 0.9;
    }
    return result;
  }, [planMeals, mealById, prefs]);

  if (!prefs) return <Redirect href="/onboarding" />;

  const slots = slotsForPrefs(prefs);
  const dayMeals = slots
    .map((slot) => {
      const pm = planMeals.find(
        (p) => p.day === selectedDay && p.slot === slot,
      );
      const meal = pm ? mealById.get(pm.mealId) : undefined;
      return pm && meal ? { pm, meal } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const dayProtein = dayMeals.reduce(
    (sum, { pm, meal }) => sum + meal.protein_per_unit * pm.quantity,
    0,
  );
  const dayKcal = dayMeals.reduce(
    (sum, { pm, meal }) => sum + (meal.kcal_per_unit ?? 0) * pm.quantity,
    0,
  );

  const swapCandidates = useMemo(() => {
    if (!swapTarget || !prefs) return [];
    const current = planMeals.find(
      (p) => p.day === swapTarget.day && p.slot === swapTarget.slot,
    );
    return getCandidates(
      swapTarget.day,
      swapTarget.slot,
      {
        catalog,
        diet: prefs.diet,
        proteinGoal: prefs.proteinGoal,
        slots: slotsForPrefs(prefs),
        planned: planMeals,
        cuisinePrefs: prefs.cuisines,
      },
      { excludeMealId: current?.mealId },
    );
  }, [swapTarget, planMeals, catalog, prefs]);

  const runRegenerate = async (days: Day[]) => {
    try {
      await regenerate(db, prefs, days);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      if (e instanceof CatalogTooSmallError) {
        Alert.alert(
          "Not enough meals",
          "We couldn't fill every slot with your current settings. Try changing diet or meals per day in Settings.",
        );
      } else {
        throw e;
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <View className="flex-1 min-w-0">
          <Text className="text-2xl font-bold tracking-tight text-foreground">
            Your week
          </Text>
          <Text className="text-[13px] text-muted-foreground mt-0.5">
            {Math.round(prefs.proteinGoal)}g protein · {slots.length} meals a day
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => void runRegenerate([...ALL_DAYS])}
            hitSlop={6}
            className="h-8 px-3 rounded-full border border-primary/40 bg-primary/5 items-center justify-center"
          >
            <Text className="text-xs font-semibold text-primary">↻ Week</Text>
          </Pressable>
          <Link href="/grocery" asChild>
            <Pressable
              hitSlop={6}
              className="h-8 w-8 rounded-full bg-secondary items-center justify-center"
            >
              <Text className="text-xs">🛒</Text>
            </Pressable>
          </Link>
          <Link href="/settings" asChild>
            <Pressable
              hitSlop={6}
              className="h-8 w-8 rounded-full bg-secondary items-center justify-center"
            >
              <Text className="text-xs">⚙️</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <DaySelector
        selected={selectedDay}
        onSelect={setSelectedDay}
        goalMetByDay={goalMetByDay}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <StatCard protein={dayProtein} proteinGoal={prefs.proteinGoal} kcal={dayKcal} />

        <View className="px-4 pt-4">
          {dayMeals.map(({ pm, meal }) => (
            <MealCard
              key={pm.slot}
              slot={pm.slot}
              meal={meal}
              quantity={pm.quantity}
              onIncrease={() =>
                setQuantity(
                  db,
                  pm.day,
                  pm.slot,
                  Math.min(meal.max_qty, pm.quantity + meal.qty_step),
                )
              }
              onDecrease={() =>
                setQuantity(
                  db,
                  pm.day,
                  pm.slot,
                  Math.max(meal.min_qty, pm.quantity - meal.qty_step),
                )
              }
              onSwap={() => {
                setSwapTarget({ day: pm.day, slot: pm.slot });
                swapSheetRef.current?.present();
              }}
              onLongPress={() => {
                setInfoTarget({ meal, quantity: pm.quantity });
                infoSheetRef.current?.present();
              }}
            />
          ))}

          {dayMeals.length === 0 ? (
            <View className="items-center mt-16">
              <Text className="text-muted-foreground mb-4">
                No meals for this day yet.
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => void runRegenerate([selectedDay])}
            className="h-12 rounded-xl border border-dashed border-border bg-secondary/30 items-center justify-center mt-1"
          >
            <Text className="text-sm font-semibold text-foreground/80">
              ↻ Regenerate this day
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <SwapSheet
        ref={swapSheetRef}
        candidates={swapCandidates}
        slot={swapTarget?.slot ?? "lunch"}
        diet={prefs.diet}
        onPick={(meal) => {
          if (swapTarget) {
            swap(db, swapTarget.day, swapTarget.slot, meal);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          swapSheetRef.current?.dismiss();
          setSwapTarget(null);
        }}
        onAddCustom={async (input) => {
          if (swapTarget) {
            await swapToCustom(db, swapTarget.day, swapTarget.slot, input);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          swapSheetRef.current?.dismiss();
          setSwapTarget(null);
        }}
      />
      <MealInfoSheet
        ref={infoSheetRef}
        meal={infoTarget?.meal ?? null}
        quantity={infoTarget?.quantity ?? 1}
      />
    </SafeAreaView>
  );
}
