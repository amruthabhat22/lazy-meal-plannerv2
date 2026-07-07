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

  const checkedCount = items.filter((i) => i.isChecked).length;
  const progress = items.length > 0 ? checkedCount / items.length : 0;

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
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <View className="flex-1 min-w-0">
          <Text className="text-2xl font-bold tracking-tight text-foreground">
            Grocery List
          </Text>
          <Text className="text-[13px] text-muted-foreground mt-0.5">
            Auto-generated from your week
          </Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-sm font-semibold text-primary">Done</Text>
        </Pressable>
      </View>

      {items.length > 0 ? (
        <View className="px-5 pb-2">
          <View className="flex-row justify-between mb-1.5">
            <Text className="text-xs text-muted-foreground">
              {checkedCount} of {items.length} items checked off
            </Text>
            <Pressable onPress={() => void generate()} hitSlop={6}>
              <Text className="text-xs font-semibold text-primary">Reset</Text>
            </Pressable>
          </View>
          <View className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <View
              className="h-1.5 rounded-full bg-success"
              style={{ width: `${progress * 100}%` }}
            />
          </View>
        </View>
      ) : null}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
      >
        {items.length === 0 ? (
          <>
            <Pressable
              onPress={() => void generate()}
              className="h-12 rounded-xl bg-primary items-center justify-center mt-2"
            >
              <Text className="text-sm font-semibold text-primary-foreground">
                Generate list
              </Text>
            </Pressable>
            <Text className="text-center text-sm text-muted-foreground mt-6">
              Your week's meals become a checklist here.
            </Text>
          </>
        ) : null}

        {sections.map(([category, list]) => {
          const isCollapsed = collapsed.has(category);
          return (
            <View key={category} className="mb-3 mt-2">
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
                <Text className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {category} ({list.length})
                </Text>
                <Text className="text-muted-foreground text-xs">
                  {isCollapsed ? "▸" : "▾"}
                </Text>
              </Pressable>
              {!isCollapsed &&
                list.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => toggle(item)}
                    className="flex-row items-center rounded-2xl border border-border bg-card p-3 mb-2"
                  >
                    <View
                      className={`w-6 h-6 rounded-lg border-2 mr-3 items-center justify-center ${
                        item.isChecked
                          ? "bg-success border-success"
                          : "border-border"
                      }`}
                    >
                      {item.isChecked ? (
                        <Text className="text-white text-xs font-bold">✓</Text>
                      ) : null}
                    </View>
                    <Text
                      className={`flex-1 text-sm font-medium ${
                        item.isChecked
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }`}
                    >
                      {item.name}
                    </Text>
                    <View className="rounded-full bg-secondary px-2 py-0.5">
                      <Text className="text-[11px] font-semibold text-foreground/80 tabular-nums">
                        {formatNumber(item.amount)} {item.unit}
                      </Text>
                    </View>
                  </Pressable>
                ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
