import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import * as Haptics from "expo-haptics";
import { usePlanStore } from "@/state/usePlanStore";
import {
  getItems,
  replaceItems,
  setChecked,
  type GroceryItem,
} from "@/db/repos/groceryRepo";
import { aggregateGroceries } from "@/utils/grocery";
import { formatNumber } from "@/utils/format";

export default function Grocery() {
  const db = useSQLiteContext();
  const plan = usePlanStore((s) => s.plan);
  const planMeals = usePlanStore((s) => s.planMeals);
  const catalog = usePlanStore((s) => s.catalog);

  const [items, setItems] = useState<GroceryItem[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (plan) void getItems(db, plan.id).then(setItems);
  }, [db, plan]);

  const generate = async () => {
    if (!plan) return;
    const aggregated = aggregateGroceries(planMeals, catalog);
    await replaceItems(db, plan.id, aggregated);
    setItems(await getItems(db, plan.id));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggle = (item: GroceryItem) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, isChecked: !i.isChecked } : i,
      ),
    );
    void setChecked(db, item.id, !item.isChecked);
    void Haptics.selectionAsync();
  };

  const sections = useMemo(() => {
    const byCategory = new Map<string, GroceryItem[]>();
    for (const item of items) {
      const list = byCategory.get(item.category) ?? [];
      list.push(item);
      byCategory.set(item.category, list);
    }
    return [...byCategory.entries()];
  }, [items]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-base text-primary font-semibold">‹ Back</Text>
        </Pressable>
        <Text className="text-xl font-bold text-gray-900">Grocery List</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      >
        <Pressable
          onPress={() => void generate()}
          className="rounded-2xl bg-primary p-4 items-center mb-4"
        >
          <Text className="text-white font-semibold text-base">
            {items.length ? "Regenerate list" : "Generate list"}
          </Text>
        </Pressable>

        {items.length === 0 ? (
          <Text className="text-center text-muted mt-8">
            Generate a list from your active week plan.
          </Text>
        ) : null}

        {sections.map(([category, list]) => {
          const isCollapsed = collapsed.has(category);
          return (
            <View key={category} className="mb-3">
              <Pressable
                onPress={() =>
                  setCollapsed((prev) => {
                    const next = new Set(prev);
                    if (next.has(category)) next.delete(category);
                    else next.add(category);
                    return next;
                  })
                }
                className="flex-row justify-between items-center py-2"
              >
                <Text className="text-sm font-bold text-gray-500 uppercase">
                  {category} ({list.length})
                </Text>
                <Text className="text-gray-400">{isCollapsed ? "▸" : "▾"}</Text>
              </Pressable>
              {!isCollapsed &&
                list.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => toggle(item)}
                    className="flex-row items-center bg-white rounded-xl border border-gray-200 p-3 mb-2"
                  >
                    <View
                      className={`w-6 h-6 rounded-md border-2 mr-3 items-center justify-center ${
                        item.isChecked
                          ? "bg-primary border-primary"
                          : "border-gray-300"
                      }`}
                    >
                      {item.isChecked ? (
                        <Text className="text-white text-xs font-bold">✓</Text>
                      ) : null}
                    </View>
                    <Text
                      className={`flex-1 text-base ${
                        item.isChecked
                          ? "text-gray-400 line-through"
                          : "text-gray-900"
                      }`}
                    >
                      {item.name}
                    </Text>
                    <Text className="text-sm text-muted">
                      {formatNumber(item.amount)} {item.unit}
                    </Text>
                  </Pressable>
                ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
