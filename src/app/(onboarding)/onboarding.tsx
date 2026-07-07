import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Slider from "@react-native-community/slider";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import type { Diet } from "@/engine/types";
import { CatalogTooSmallError } from "@/engine/types";
import { usePrefsStore } from "@/state/usePrefsStore";
import { usePlanStore } from "@/state/usePlanStore";
import { CUISINES } from "@/utils/cuisines";

const DIET_OPTIONS: { value: Diet; title: string; description: string }[] = [
  { value: "veg", title: "Vegetarian", description: "Paneer, dals, tofu & legumes" },
  { value: "egg", title: "Eggetarian", description: "Veg meals plus eggs" },
  { value: "non-veg", title: "Non-Vegetarian", description: "Chicken, fish, eggs & more" },
];

const MEAL_OPTIONS: { value: 2 | 3 | 4; title: string; description: string }[] = [
  { value: 2, title: "2 meals", description: "Skip breakfast or dinner" },
  { value: 3, title: "3 meals", description: "Breakfast · Lunch · Dinner" },
  { value: 4, title: "4 meals", description: "3 meals + a protein snack" },
];

const STEPS = [
  { title: "What's your diet?", subtitle: "We'll tailor every meal to suit you." },
  { title: "Your protein goal", subtitle: "How much protein do you want each day?" },
  { title: "Cuisine preferences", subtitle: "Optional — pick the flavors you love." },
  { title: "Meals per day", subtitle: "Choose a rhythm that fits your routine." },
];

function OptionCard({
  title,
  description,
  selected,
  onPress,
}: {
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-2xl border-2 bg-card p-4 mb-3 ${
        selected ? "border-primary" : "border-border"
      }`}
    >
      <Text className="text-base font-semibold text-foreground">{title}</Text>
      <Text className="text-[13px] text-muted-foreground mt-0.5">
        {description}
      </Text>
    </Pressable>
  );
}

export default function Onboarding() {
  const db = useSQLiteContext();
  const savePrefs = usePrefsStore((s) => s.save);
  const regenerate = usePlanStore((s) => s.regenerate);

  const [step, setStep] = useState(0);
  const [diet, setDiet] = useState<Diet | null>(null);
  const [goal, setGoal] = useState(120);
  const [cuisines, setCuisines] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const dietLabel = useMemo(
    () => DIET_OPTIONS.find((d) => d.value === diet)?.title ?? "—",
    [diet],
  );

  const toggleCuisine = (slug: string) => {
    setCuisines((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const finish = async (mealsPerDay: 2 | 3 | 4) => {
    if (!diet || busy) return;
    setBusy(true);
    try {
      const prefs = await savePrefs(db, {
        diet,
        proteinGoal: goal,
        mealsPerDay,
        cuisines: [...cuisines],
      });
      await regenerate(db, prefs);
      router.replace("/");
    } catch (e) {
      setBusy(false);
      if (e instanceof CatalogTooSmallError) {
        Alert.alert(
          "Not enough meals",
          "We couldn't find enough meals for these settings. Try a different diet or meal count.",
        );
      } else {
        throw e;
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Step progress */}
      <View className="flex-row gap-1.5 px-5 pt-4">
        {STEPS.map((_, i) => (
          <View
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i <= step ? "bg-primary" : "bg-secondary"
            }`}
          />
        ))}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        <Text className="text-xs font-medium text-muted-foreground mt-6">
          Step {step + 1} of {STEPS.length}
        </Text>
        <Text className="text-2xl font-bold tracking-tight text-foreground mt-1">
          {STEPS[step].title}
        </Text>
        <Text className="text-[13px] text-muted-foreground mt-1 mb-6">
          {STEPS[step].subtitle}
        </Text>

        {step === 0 && (
          <>
            {DIET_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.value}
                title={opt.title}
                description={opt.description}
                selected={diet === opt.value}
                onPress={() => setDiet(opt.value)}
              />
            ))}
            <Pressable
              disabled={!diet}
              onPress={() => setStep(1)}
              className={`h-12 rounded-xl items-center justify-center mt-3 ${
                diet ? "bg-primary" : "bg-secondary"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  diet ? "text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                Continue
              </Text>
            </Pressable>
          </>
        )}

        {step === 1 && (
          <>
            <View className="rounded-2xl border border-border bg-card p-5 items-center">
              <View className="flex-row items-baseline gap-1">
                <Text className="text-4xl font-bold text-foreground tabular-nums">
                  {goal}
                </Text>
                <Text className="text-base text-muted-foreground">g / day</Text>
              </View>
              <Slider
                style={{ width: "100%", height: 40, marginTop: 12 }}
                minimumValue={60}
                maximumValue={200}
                step={5}
                value={goal}
                onValueChange={setGoal}
                minimumTrackTintColor="#a55a37"
                maximumTrackTintColor="#e3ddd5"
                thumbTintColor="#a55a37"
              />
              <View className="flex-row justify-between w-full">
                <Text className="text-xs text-muted-foreground">60g</Text>
                <Text className="text-xs text-muted-foreground">200g</Text>
              </View>
            </View>
            <View className="rounded-xl bg-accent/60 p-3 mt-4">
              <Text className="text-[13px] text-accent-foreground">
                <Text className="font-semibold">Tip:</Text> a common target is
                1.6–2.2g per kg of body weight.
              </Text>
            </View>
            <Pressable
              onPress={() => setStep(2)}
              className="h-12 rounded-xl items-center justify-center mt-6 bg-primary"
            >
              <Text className="text-sm font-semibold text-primary-foreground">
                Continue
              </Text>
            </Pressable>
          </>
        )}

        {step === 2 && (
          <>
            <View className="flex-row flex-wrap gap-2">
              {CUISINES.map((c) => {
                const selected = cuisines.has(c.slug);
                return (
                  <Pressable
                    key={c.slug}
                    onPress={() => toggleCuisine(c.slug)}
                    className={`rounded-full border px-4 py-2.5 ${
                      selected
                        ? "border-primary bg-primary"
                        : "border-border bg-card"
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
            <Text className="text-xs text-muted-foreground mt-3">
              Pick as many as you like.
            </Text>
            <Pressable
              onPress={() => setStep(3)}
              className="h-12 rounded-xl items-center justify-center mt-6 bg-primary"
            >
              <Text className="text-sm font-semibold text-primary-foreground">
                {cuisines.size > 0 ? "Continue" : "Skip for now"}
              </Text>
            </Pressable>
          </>
        )}

        {step === 3 && (
          <>
            {MEAL_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.value}
                title={opt.title}
                description={opt.description}
                selected={false}
                onPress={() => void finish(opt.value)}
              />
            ))}
            <View className="rounded-2xl border border-border bg-card p-4 mt-3">
              <Text className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
                Your plan
              </Text>
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-xs text-muted-foreground">Diet</Text>
                  <Text className="text-sm font-semibold text-foreground mt-0.5">
                    {dietLabel}
                  </Text>
                </View>
                <View>
                  <Text className="text-xs text-muted-foreground">Protein</Text>
                  <Text className="text-sm font-semibold text-foreground mt-0.5">
                    {goal}g / day
                  </Text>
                </View>
                <View>
                  <Text className="text-xs text-muted-foreground">Cuisines</Text>
                  <Text className="text-sm font-semibold text-foreground mt-0.5">
                    {cuisines.size > 0 ? `${cuisines.size} picked` : "Any"}
                  </Text>
                </View>
              </View>
            </View>
            {busy ? (
              <Text className="text-center text-sm text-muted-foreground mt-4">
                Building your week…
              </Text>
            ) : null}
          </>
        )}

        {step > 0 && !busy ? (
          <Pressable
            onPress={() => setStep(step - 1)}
            className="h-10 items-center justify-center mt-2"
          >
            <Text className="text-xs font-semibold text-muted-foreground">
              Back
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
