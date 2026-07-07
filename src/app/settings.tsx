import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
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

const DIETS: { value: Diet; label: string }[] = [
  { value: "veg", label: "Veg" },
  { value: "egg", label: "Egg" },
  { value: "non-veg", label: "Non-veg" },
];

export default function Settings() {
  const db = useSQLiteContext();
  const prefs = usePrefsStore((s) => s.prefs);
  const savePrefs = usePrefsStore((s) => s.save);
  const loadPrefs = usePrefsStore((s) => s.load);
  const loadPlan = usePlanStore((s) => s.load);
  const regenerate = usePlanStore((s) => s.regenerate);

  const [diet, setDiet] = useState<Diet>(prefs?.diet ?? "veg");
  const [goalText, setGoalText] = useState(String(prefs?.proteinGoal ?? 90));
  const [mealsPerDay, setMealsPerDay] = useState<3 | 4>(
    prefs?.mealsPerDay ?? 3,
  );
  const [catalogVersion, setCatalogVersion] = useState("–");

  useEffect(() => {
    void getMeta(db, "catalog_version").then((v) =>
      setCatalogVersion(v ?? "0"),
    );
  }, [db]);

  const goal = Number(goalText);
  const goalValid = Number.isFinite(goal) && goal >= 20 && goal <= 400;
  const dirty =
    prefs !== null &&
    (diet !== prefs.diet ||
      (goalValid && goal !== prefs.proteinGoal) ||
      mealsPerDay !== prefs.mealsPerDay);

  const save = async () => {
    if (!goalValid) {
      Alert.alert("Invalid goal", "Enter a protein goal between 20 and 400g.");
      return;
    }
    const saved = await savePrefs(db, {
      diet,
      proteinGoal: goal,
      mealsPerDay,
    });
    // Spec 5.6: editing regenerates nothing automatically; prompt instead.
    Alert.alert(
      "Settings saved",
      "Regenerate this week with new settings?",
      [
        { text: "Keep current plan", style: "cancel" },
        {
          text: "Regenerate",
          onPress: () => {
            regenerate(db, saved).catch((e) => {
              if (e instanceof CatalogTooSmallError) {
                Alert.alert(
                  "Not enough meals",
                  "We couldn't fill every slot with these settings.",
                );
              }
            });
          },
        },
      ],
    );
  };

  const exportBackup = async () => {
    const backup = await buildBackup(db);
    const path = `${FileSystem.cacheDirectory}lazy-meal-planner-backup-${
      new Date().toISOString().slice(0, 10)
    }.json`;
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
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-base text-primary font-semibold">‹ Back</Text>
        </Pressable>
        <Text className="text-xl font-bold text-gray-900">Settings</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }}
      >
        <Text className="text-sm font-bold text-gray-500 uppercase mb-2 mt-2">
          Diet
        </Text>
        <View className="flex-row gap-2 mb-4">
          {DIETS.map((d) => (
            <Pressable
              key={d.value}
              onPress={() => setDiet(d.value)}
              className={`flex-1 rounded-xl border-2 p-3 items-center ${
                diet === d.value
                  ? "border-primary bg-green-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <Text className="font-semibold text-gray-900">{d.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text className="text-sm font-bold text-gray-500 uppercase mb-2">
          Daily protein goal (g)
        </Text>
        <TextInput
          className="rounded-xl border-2 border-gray-200 bg-white p-3 text-lg mb-4"
          keyboardType="number-pad"
          value={goalText}
          onChangeText={setGoalText}
        />

        <Text className="text-sm font-bold text-gray-500 uppercase mb-2">
          Meals per day
        </Text>
        <View className="flex-row gap-2 mb-6">
          {([3, 4] as const).map((n) => (
            <Pressable
              key={n}
              onPress={() => setMealsPerDay(n)}
              className={`flex-1 rounded-xl border-2 p-3 items-center ${
                mealsPerDay === n
                  ? "border-primary bg-green-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <Text className="font-semibold text-gray-900">
                {n === 3 ? "3 meals" : "4 (with snack)"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => void save()}
          disabled={!dirty}
          className={`rounded-2xl p-4 items-center mb-8 ${
            dirty ? "bg-primary" : "bg-gray-200"
          }`}
        >
          <Text className="text-white font-semibold text-base">
            Save changes
          </Text>
        </Pressable>

        <Text className="text-sm font-bold text-gray-500 uppercase mb-2">
          Backup
        </Text>
        <Pressable
          onPress={() => void exportBackup()}
          className="rounded-xl bg-white border border-gray-200 p-4 mb-2"
        >
          <Text className="font-semibold text-gray-900">Export backup</Text>
          <Text className="text-sm text-muted mt-0.5">
            Share a JSON file with your plans and preferences
          </Text>
        </Pressable>
        <Pressable
          onPress={() => void importBackup()}
          className="rounded-xl bg-white border border-gray-200 p-4 mb-8"
        >
          <Text className="font-semibold text-gray-900">Import backup</Text>
          <Text className="text-sm text-muted mt-0.5">
            Restore from a backup file (overwrites current data)
          </Text>
        </Pressable>

        <Text className="text-center text-sm text-muted">
          App version {Constants.expoConfig?.version ?? "1.0.0"} · Catalog
          version {catalogVersion}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
