import React, { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import type { Diet } from "@/engine/types";
import { CatalogTooSmallError } from "@/engine/types";
import { usePrefsStore } from "@/state/usePrefsStore";
import { usePlanStore } from "@/state/usePlanStore";

const PRESETS = [60, 90, 120, 150];

function BigOption({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-2xl border-2 p-5 mb-3 ${
        selected ? "border-primary bg-green-50" : "border-gray-200 bg-white"
      }`}
    >
      <Text className="text-xl font-semibold text-gray-900">{label}</Text>
      {hint ? <Text className="text-sm text-muted mt-1">{hint}</Text> : null}
    </Pressable>
  );
}

export default function Onboarding() {
  const db = useSQLiteContext();
  const savePrefs = usePrefsStore((s) => s.save);
  const regenerate = usePlanStore((s) => s.regenerate);

  const [step, setStep] = useState(0);
  const [diet, setDiet] = useState<Diet | null>(null);
  const [goal, setGoal] = useState<number | null>(null);
  const [customGoal, setCustomGoal] = useState("");
  const [busy, setBusy] = useState(false);

  const finish = async (mealsPerDay: 3 | 4) => {
    if (!diet || !goal || busy) return;
    setBusy(true);
    try {
      const prefs = await savePrefs(db, {
        diet,
        proteinGoal: goal,
        mealsPerDay,
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

  const effectiveCustom = Number(customGoal);
  const customValid =
    Number.isFinite(effectiveCustom) &&
    effectiveCustom >= 20 &&
    effectiveCustom <= 400;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-8">
        <Text className="text-sm text-muted mb-2">Step {step + 1} of 3</Text>

        {step === 0 && (
          <>
            <Text className="text-3xl font-bold text-gray-900 mb-6">
              How do you eat?
            </Text>
            <BigOption
              label="Veg"
              hint="Plant-based and dairy"
              selected={diet === "veg"}
              onPress={() => setDiet("veg")}
            />
            <BigOption
              label="Egg"
              hint="Veg plus eggs"
              selected={diet === "egg"}
              onPress={() => setDiet("egg")}
            />
            <BigOption
              label="Non-veg"
              hint="Everything on the menu"
              selected={diet === "non-veg"}
              onPress={() => setDiet("non-veg")}
            />
            <Pressable
              disabled={!diet}
              onPress={() => setStep(1)}
              className={`rounded-2xl p-5 mt-4 ${diet ? "bg-primary" : "bg-gray-200"}`}
            >
              <Text className="text-center text-lg font-semibold text-white">
                Next
              </Text>
            </Pressable>
          </>
        )}

        {step === 1 && (
          <>
            <Text className="text-3xl font-bold text-gray-900 mb-6">
              Daily protein goal?
            </Text>
            <View className="flex-row flex-wrap gap-3 mb-4">
              {PRESETS.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => {
                    setGoal(p);
                    setCustomGoal("");
                  }}
                  className={`rounded-2xl border-2 px-6 py-4 ${
                    goal === p && customGoal === ""
                      ? "border-primary bg-green-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <Text className="text-xl font-semibold text-gray-900">
                    {p}g
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              className="rounded-2xl border-2 border-gray-200 p-4 text-lg"
              placeholder="Custom (grams)"
              keyboardType="number-pad"
              value={customGoal}
              onChangeText={(t) => {
                setCustomGoal(t);
                const n = Number(t);
                if (Number.isFinite(n) && n >= 20 && n <= 400) setGoal(n);
                else setGoal(null);
              }}
            />
            {customGoal !== "" && !customValid ? (
              <Text className="text-sm text-red-500 mt-2">
                Enter a goal between 20 and 400 grams.
              </Text>
            ) : null}
            <Pressable
              disabled={!goal}
              onPress={() => setStep(2)}
              className={`rounded-2xl p-5 mt-4 ${goal ? "bg-primary" : "bg-gray-200"}`}
            >
              <Text className="text-center text-lg font-semibold text-white">
                Next
              </Text>
            </Pressable>
          </>
        )}

        {step === 2 && (
          <>
            <Text className="text-3xl font-bold text-gray-900 mb-6">
              Meals per day?
            </Text>
            <BigOption
              label="3 meals"
              hint="Breakfast, lunch, dinner"
              selected={false}
              onPress={() => void finish(3)}
            />
            <BigOption
              label="4 meals"
              hint="Adds a snack"
              selected={false}
              onPress={() => void finish(4)}
            />
            {busy ? (
              <Text className="text-center text-muted mt-4">
                Building your week…
              </Text>
            ) : null}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
