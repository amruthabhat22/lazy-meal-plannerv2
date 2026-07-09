import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSQLiteContext } from "expo-sqlite";
import Constants from "expo-constants";
// Legacy FS API: handles content:// URIs from the document picker reliably.
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import type { Diet } from "@/engine/types";
import { CatalogTooSmallError } from "@/engine/types";
import { getMeta } from "@/db/schema";
import { buildBackup, restoreBackup, validateBackup } from "@/db/backup";
import { usePrefsStore } from "@/state/usePrefsStore";
import { usePlanStore } from "@/state/usePlanStore";
import { CUISINES } from "@/utils/cuisines";
import {
  GoalSliderCard,
  calorieLevelLabel,
  proteinLevelLabel,
} from "@/components/GoalSliderCard";

const DIETS: { value: Diet; label: string }[] = [
  { value: "veg", label: "Vegetarian" },
  { value: "egg", label: "Eggetarian" },
  { value: "non-veg", label: "Non-Veg" },
];

const MEALS: { value: 2 | 3 | 4; label: string }[] = [
  { value: 2, label: "2 meals" },
  { value: 3, label: "3 meals" },
  { value: 4, label: "4 + snack" },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-2 mt-4">
      {children}
    </Text>
  );
}

export default function Settings() {
  const db = useSQLiteContext();
  const prefs = usePrefsStore((s) => s.prefs);
  const savePrefs = usePrefsStore((s) => s.save);
  const loadPrefs = usePrefsStore((s) => s.load);
  const loadPlan = usePlanStore((s) => s.load);
  const regenerate = usePlanStore((s) => s.regenerate);

  const [diet, setDiet] = useState<Diet>(prefs?.diet ?? "veg");
  const [goal, setGoal] = useState(prefs?.proteinGoal ?? 120);
  const [calories, setCalories] = useState(prefs?.calorieGoal ?? 2000);
  const [mealsPerDay, setMealsPerDay] = useState<2 | 3 | 4>(
    prefs?.mealsPerDay ?? 3,
  );
  const [cuisines, setCuisines] = useState<Set<string>>(
    new Set(prefs?.cuisines ?? []),
  );
  const [catalogVersion, setCatalogVersion] = useState("–");

  useEffect(() => {
    void getMeta(db, "catalog_version").then((v) =>
      setCatalogVersion(v ?? "0"),
    );
  }, [db]);

  const cuisinesEqual =
    prefs !== null &&
    cuisines.size === prefs.cuisines.length &&
    prefs.cuisines.every((c) => cuisines.has(c));
  const dirty =
    prefs !== null &&
    (diet !== prefs.diet ||
      goal !== prefs.proteinGoal ||
      calories !== prefs.calorieGoal ||
      mealsPerDay !== prefs.mealsPerDay ||
      !cuisinesEqual);

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
    const needsRegenerate =
      prefs !== null &&
      (diet !== prefs.diet ||
        goal !== prefs.proteinGoal ||
        mealsPerDay !== prefs.mealsPerDay ||
        !cuisinesEqual);
    const saved = await savePrefs(db, {
      diet,
      proteinGoal: goal,
      calorieGoal: calories,
      mealsPerDay,
      cuisines: [...cuisines],
    });
    if (!needsRegenerate) return;
    try {
      await regenerate(db, saved);
      router.replace("/");
    } catch (e) {
      if (e instanceof CatalogTooSmallError) {
        Alert.alert(
          "Not enough meals",
          "Settings were saved, but we couldn't fill every slot with them. Your current plan is unchanged.",
        );
      } else {
        throw e;
      }
    }
  };

  const exportBackup = async () => {
    const backup = await buildBackup(db);
    const path = `${FileSystem.cacheDirectory}eezyplate-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    await FileSystem.writeAsStringAsync(path, JSON.stringify(backup, null, 2));
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: "application/json" });
    } else {
      Alert.alert("Export saved", `Backup written to ${path}`);
    }
  };

  const importBackup = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/json",
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    let backup;
    try {
      const text = await FileSystem.readAsStringAsync(result.assets[0].uri);
      backup = validateBackup(JSON.parse(text));
    } catch (e) {
      Alert.alert(
        "Invalid backup",
        e instanceof Error ? e.message : "Could not read this file.",
      );
      return;
    }
    Alert.alert(
      "Overwrite everything?",
      "Importing replaces your current plans, preferences, and grocery list. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Overwrite",
          style: "destructive",
          onPress: async () => {
            const { unknownMealIds } = await restoreBackup(db, backup);
            await loadPrefs(db);
            await loadPlan(db);
            if (unknownMealIds.length > 0) {
              Alert.alert(
                "Import complete",
                `${unknownMealIds.length} meal(s) from the backup are not in this app's catalog. They appear as "Unavailable meal" — use Swap to replace them.`,
              );
            } else {
              Alert.alert("Import complete", "Your backup has been restored.");
            }
            router.replace("/");
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-4 pb-2">
        <Text className="text-2xl font-bold tracking-tight text-foreground">
          Profile
        </Text>
        <Text className="text-[13px] text-muted-foreground mt-0.5">
          Your plan settings and backups
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
      >
        <SectionLabel>Diet</SectionLabel>
        <View className="flex-row gap-2">
          {DIETS.map((d) => (
            <Pressable
              key={d.value}
              onPress={() => setDiet(d.value)}
              className={`flex-1 rounded-xl border-2 py-3 items-center bg-card ${
                diet === d.value ? "border-primary" : "border-border"
              }`}
            >
              <Text className="text-sm font-semibold text-foreground">
                {d.label}
              </Text>
            </Pressable>
          ))}
        </View>

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
          />
        </View>

        <SectionLabel>Meals per day</SectionLabel>
        <View className="flex-row gap-2">
          {MEALS.map((m) => (
            <Pressable
              key={m.value}
              onPress={() => setMealsPerDay(m.value)}
              className={`flex-1 rounded-xl border-2 py-3 items-center bg-card ${
                mealsPerDay === m.value ? "border-primary" : "border-border"
              }`}
            >
              <Text className="text-sm font-semibold text-foreground">
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <SectionLabel>Cuisine preferences</SectionLabel>
        <View className="flex-row flex-wrap gap-2">
          {CUISINES.map((c) => {
            const selected = cuisines.has(c.slug);
            return (
              <Pressable
                key={c.slug}
                onPress={() => toggleCuisine(c.slug)}
                className={`rounded-full border px-3.5 py-2 ${
                  selected ? "border-primary bg-primary" : "border-border bg-card"
                }`}
              >
                <Text
                  className={`text-[13px] font-medium ${
                    selected ? "text-primary-foreground" : "text-foreground"
                  }`}
                >
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => void save()}
          disabled={!dirty}
          className={`h-12 rounded-full flex-row items-center justify-center gap-2 mt-6 ${
            dirty ? "bg-primary" : "bg-secondary opacity-60"
          }`}
        >
          <Feather
            name="check"
            size={15}
            color={dirty ? "#fefbf8" : "#6c6158"}
          />
          <Text
            className={`text-sm font-semibold ${
              dirty ? "text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Save and regenerate plan
          </Text>
        </Pressable>

        <SectionLabel>Backup</SectionLabel>
        <Pressable
          onPress={() => void exportBackup()}
          className="rounded-2xl border border-border bg-card p-4 mb-2"
        >
          <Text className="text-sm font-semibold text-foreground">
            Export backup
          </Text>
          <Text className="text-xs text-muted-foreground mt-0.5">
            Share a JSON file with your plans and preferences
          </Text>
        </Pressable>
        <Pressable
          onPress={() => void importBackup()}
          className="rounded-2xl border border-border bg-card p-4"
        >
          <Text className="text-sm font-semibold text-foreground">
            Import backup
          </Text>
          <Text className="text-xs text-muted-foreground mt-0.5">
            Restore from a backup file (overwrites current data)
          </Text>
        </Pressable>

        <Text className="text-center text-xs text-muted-foreground mt-8">
          App version {Constants.expoConfig?.version ?? "1.0.0"} · Catalog
          version {catalogVersion}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
