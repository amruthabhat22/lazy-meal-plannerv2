import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  Check,
  EyeOff,
  LogOut,
  UserRound,
  X,
  Drumstick,
  Egg,
  Leaf,
  Moon,
  Sparkles,
  Utensils,
  type LucideIcon,
} from "lucide-react-native";
import type { Diet } from "@/engine/types";
import { CatalogTooSmallError } from "@/engine/types";
import { getMeta } from "@/db/schema";
import { usePrefsStore } from "@/state/usePrefsStore";
import { usePlanStore } from "@/state/usePlanStore";
import { useSessionStore } from "@/state/useSessionStore";
import { formatPhone } from "@/utils/contacts";
import { CUISINES } from "@/utils/cuisines";
import { Icon, ICON_COLORS } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { SelectableCard } from "@/components/SelectableCard";
import { AllergenChips } from "@/components/AllergenChips";
import { ConfirmLogoutSheet } from "@/components/ConfirmLogoutSheet";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { getBlockedMealIds, unblockMeal } from "@/utils/blockedMeals";
import {
  CALORIE_TIP,
  GoalSliderCard,
  PROTEIN_TIP,
  calorieLevelLabel,
  proteinLevelLabel,
} from "@/components/GoalSliderCard";
import { FONT_CLIP_FIX } from "@/utils/androidText";

const DIET_OPTIONS: {
  value: Diet;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  { value: "veg", title: "Vegetarian", description: "Paneer, dals, tofu & legumes", icon: Leaf },
  { value: "egg", title: "Eggetarian", description: "Veg meals plus eggs", icon: Egg },
  { value: "non-veg", title: "Non-Vegetarian", description: "Chicken, fish, eggs & more", icon: Drumstick },
];

const MEAL_OPTIONS: {
  value: 2 | 3 | 4;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  { value: 2, title: "2 meals", description: "Skip breakfast or dinner", icon: Moon },
  { value: 3, title: "3 meals", description: "Breakfast · Lunch · Dinner", icon: Utensils },
  { value: 4, title: "4 meals", description: "3 meals + a protein snack", icon: Sparkles },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 mt-7" style={FONT_CLIP_FIX}>
      {children}
    </Text>
  );
}

export default function Profile() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const prefs = usePrefsStore((s) => s.prefs);
  const savePrefs = usePrefsStore((s) => s.save);
  const regenerate = usePlanStore((s) => s.regenerate);
  const catalog = usePlanStore((s) => s.catalog);
  const session = useSessionStore((s) => s.session);
  const signOut = useSessionStore((s) => s.signOut);

  const [diet, setDiet] = useState<Diet>(prefs?.diet ?? "veg");
  const [goal, setGoal] = useState(prefs?.proteinGoal ?? 120);
  const [calories, setCalories] = useState(prefs?.calorieGoal ?? 2000);
  const [mealsPerDay, setMealsPerDay] = useState<2 | 3 | 4>(
    prefs?.mealsPerDay ?? 3,
  );
  const [cuisines, setCuisines] = useState<Set<string>>(
    new Set(prefs?.cuisines ?? []),
  );
  const [allergiesSel, setAllergiesSel] = useState<Set<string>>(
    new Set(prefs?.allergies ?? []),
  );
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [catalogVersion, setCatalogVersion] = useState("–");
  const confirmLogoutRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    void getMeta(db, "catalog_version").then((v) =>
      setCatalogVersion(v ?? "0"),
    );
    void getBlockedMealIds(db).then(setBlockedIds);
  }, [db]);

  const cuisinesEqual =
    prefs !== null &&
    cuisines.size === prefs.cuisines.length &&
    prefs.cuisines.every((c) => cuisines.has(c));
  const allergiesEqual =
    prefs !== null &&
    allergiesSel.size === prefs.allergies.length &&
    prefs.allergies.every((a) => allergiesSel.has(a));
  const dirty =
    prefs !== null &&
    (diet !== prefs.diet ||
      goal !== prefs.proteinGoal ||
      calories !== prefs.calorieGoal ||
      mealsPerDay !== prefs.mealsPerDay ||
      !cuisinesEqual ||
      !allergiesEqual);

  const toggleCuisine = (slug: string) => {
    setCuisines((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  // Design: one explicit "Save and regenerate plan" action. Only calorie-
  // or cuisine-only edits skip the regenerate (nothing to re-plan).
  const save = async () => {
    if (busy) return;
    // Allergy changes MUST regenerate — the current plan may contain
    // dishes that are no longer safe.
    const needsRegenerate =
      prefs !== null &&
      (diet !== prefs.diet ||
        goal !== prefs.proteinGoal ||
        mealsPerDay !== prefs.mealsPerDay ||
        !cuisinesEqual ||
        !allergiesEqual);
    setBusy(true);
    try {
      const saved = await savePrefs(db, {
        diet,
        proteinGoal: goal,
        calorieGoal: calories,
        mealsPerDay,
        cuisines: [...cuisines],
        allergies: [...allergiesSel],
      });
      if (needsRegenerate) {
        await regenerate(db, saved);
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      if (e instanceof CatalogTooSmallError) {
        Alert.alert(
          "Not enough meals",
          "Settings were saved, but we couldn't fill every slot with them. Your current plan is unchanged.",
        );
      } else {
        throw e;
      }
    } finally {
      setBusy(false);
    }
  };

  const ctaSpace = 64 + Math.max(insets.bottom, 12);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header: back · title (design) */}
      <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityLabel="Back"
          className="h-10 w-10 rounded-full border border-border bg-card items-center justify-center"
        >
          <Icon icon={ArrowLeft} size="sm" color={ICON_COLORS.foreground} />
        </Pressable>
        <Text className="text-base font-semibold tracking-tight text-foreground" style={FONT_CLIP_FIX}>
          Profile
        </Text>
        <View className="h-10 w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: ctaSpace + 16,
        }}
      >
        <SectionLabel>Diet</SectionLabel>
        {DIET_OPTIONS.map((opt) => (
          <SelectableCard
            key={opt.value}
            icon={opt.icon}
            title={opt.title}
            description={opt.description}
            selected={diet === opt.value}
            onPress={() => setDiet(opt.value)}
          />
        ))}

        <SectionLabel>Daily protein & calorie goals</SectionLabel>
        <GoalSliderCard
          label="Protein"
          levelLabel={proteinLevelLabel(goal)}
          value={goal}
          unitLabel="g / day"
          min={60}
          max={200}
          step={5}
          onChange={setGoal}
          tip={PROTEIN_TIP}
        />
        <View className="mt-3">
          <GoalSliderCard
            label="Calories"
            levelLabel={calorieLevelLabel(calories)}
            value={calories}
            unitLabel="kcal / day"
            min={1200}
            max={3500}
            step={50}
            onChange={setCalories}
            tip={CALORIE_TIP}
          />
        </View>

        <SectionLabel>Allergies</SectionLabel>
        <Text className="text-sm text-muted-foreground mb-3 -mt-1">
          Dishes containing these are never suggested.
        </Text>
        <AllergenChips
          selected={allergiesSel}
          onToggle={(slug) =>
            setAllergiesSel((prev) => {
              const next = new Set(prev);
              if (next.has(slug)) next.delete(slug);
              else next.add(slug);
              return next;
            })
          }
        />

        <SectionLabel>Meals per day</SectionLabel>
        {MEAL_OPTIONS.map((opt) => (
          <SelectableCard
            key={opt.value}
            icon={opt.icon}
            title={opt.title}
            description={opt.description}
            selected={mealsPerDay === opt.value}
            onPress={() => setMealsPerDay(opt.value)}
          />
        ))}

        <SectionLabel>Cuisine preferences</SectionLabel>
        <View className="flex-row flex-wrap gap-2">
          {CUISINES.map((c) => {
            const selected = cuisines.has(c.slug);
            return (
              <Pressable
                key={c.slug}
                onPress={() => toggleCuisine(c.slug)}
                className={`rounded-full border px-3.5 py-2.5 ${
                  selected ? "border-primary bg-primary" : "border-border bg-card"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    selected ? "text-primary-foreground" : "text-foreground"
                  }`}
                >
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <SectionLabel>Hidden dishes</SectionLabel>
        {blockedIds.length === 0 ? (
          <Text className="text-sm text-muted-foreground">
            Nothing hidden. Open any meal's recipe and tap "Don't show this
            dish again" to hide it from future plans.
          </Text>
        ) : (
          blockedIds.map((id) => {
            const meal = catalog.find((m) => m.id === id);
            return (
              <View
                key={id}
                className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3 mb-2"
              >
                <View className="h-9 w-9 rounded-full bg-destructive/10 items-center justify-center">
                  <Icon icon={EyeOff} size="sm" color={ICON_COLORS.destructive} />
                </View>
                <Text className="flex-1 text-sm font-semibold text-foreground" style={FONT_CLIP_FIX}>
                  {meal?.name ?? "Unknown dish"}
                </Text>
                <Pressable
                  onPress={() =>
                    void unblockMeal(db, id).then(setBlockedIds)
                  }
                  hitSlop={12}
                  accessibilityLabel={`Show ${meal?.name ?? "dish"} again`}
                  className="h-8 px-3 rounded-full border border-border bg-background flex-row items-center gap-1"
                >
                  <Icon icon={X} size={13} color={ICON_COLORS.foreground} />
                  <Text className="text-xs font-semibold text-foreground" style={FONT_CLIP_FIX}>
                    Unhide
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}

        <SectionLabel>Account</SectionLabel>
        {session ? (
          <View className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3 mb-3">
            <View className="h-10 w-10 rounded-full bg-primary/10 items-center justify-center">
              <Icon icon={UserRound} size="sm" color={ICON_COLORS.primary} />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-sm font-semibold text-foreground" style={FONT_CLIP_FIX}>
                {session.name}
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                {session.method === "phone" && session.phone
                  ? formatPhone(session.phone)
                  : session.method === "email" && session.email
                    ? session.email
                    : "Signed in with Google"}
              </Text>
            </View>
          </View>
        ) : null}
        <Pressable
          onPress={() => confirmLogoutRef.current?.present()}
          accessibilityRole="button"
          className="h-12 rounded-full border border-destructive/30 bg-destructive/5 flex-row items-center justify-center gap-2"
        >
          <Icon icon={LogOut} size="sm" color={ICON_COLORS.destructive} />
          <Text className="text-sm font-semibold text-destructive" style={FONT_CLIP_FIX}>
            Log out
          </Text>
        </Pressable>

        <Text className="text-center text-xs text-muted-foreground mt-8">
          App version {Constants.expoConfig?.version ?? "1.0.0"} · Catalog
          version {catalogVersion}
        </Text>
      </ScrollView>

      <ConfirmLogoutSheet
        ref={confirmLogoutRef}
        onConfirm={() => {
          confirmLogoutRef.current?.dismiss();
          void signOut(db).then(() => router.replace("/login"));
        }}
        onCancel={() => confirmLogoutRef.current?.dismiss()}
      />

      {/* Sticky save CTA — disabled until something changes */}
      <View
        className="absolute left-0 right-0 bottom-0 border-t border-border bg-background px-5 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <Button
          label={busy ? "Rebuilding your week…" : "Save and regenerate plan"}
          icon={Check}
          onPress={() => void save()}
          disabled={!dirty || busy}
        />
      </View>
    </SafeAreaView>
  );
}
