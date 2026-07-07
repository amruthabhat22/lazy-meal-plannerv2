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
import { ProteinBar } from "@/components/ProteinBar";
import { MealCard } from "@/components/MealCard";
import { SwapSheet } from "@/components/SwapSheet";
import { MealInfoSheet } from "@/components/MealInfoSheet";

function todayAsDay(): Day {
  // getDay(): 0 = Sunday ... 6 = Saturday
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
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
        <Text className="text-2xl font-bold text-gray-900 flex-1" numberOfLines={1}>
          Your Week
        </Text>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => void runRegenerate([...ALL_DAYS])}
            hitSlop={6}
            className="rounded-full bg-gray-100 px-3 py-2"
          >
            <Text className="text-sm font-semibold text-gray-700">
              ↻ Week
            </Text>
          </Pressable>
          <Link href="/grocery" asChild>
            <Pressable hitSlop={6} className="rounded-full bg-gray-100 px-3 py-2">
              <Text className="text-sm font-semibold text-gray-700">🛒</Text>
            </Pressable>
          </Link>
          <Link href="/settings" asChild>
            <Pressable hitSlop={6} className="rounded-full bg-gray-100 px-3 py-2">
              <Text className="text-sm font-semibold text-gray-700">⚙️</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <DaySelector selected={selectedDay} onSelect={setSelectedDay} />
      <ProteinBar total={dayProtein} goal={prefs.proteinGoal} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      >
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
            <Text className="text-muted mb-4">No meals for this day yet.</Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => void runRegenerate([selectedDay])}
          className="rounded-2xl border border-gray-200 bg-white p-4 items-center"
        >
          <Text className="font-semibold text-gray-700">
            ↻ Regenerate this day
          </Text>
        </Pressable>
      </ScrollView>

      <SwapSheet
        ref={swapSheetRef}
        candidates={swapCandidates}
        onPick={(meal) => {
          if (swapTarget) {
            swap(db, swapTarget.day, swapTarget.slot, meal);
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
