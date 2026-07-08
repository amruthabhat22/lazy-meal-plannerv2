import React, { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useFocusEffect } from "expo-router";
import { usePlanStore } from "@/state/usePlanStore";
import {
  getItems,
  replaceItems,
  setChecked,
  type GroceryItem,
} from "@/db/repos/groceryRepo";
import { aggregateGroceries } from "@/utils/grocery";
import { formatNumber } from "@/utils/format";
import { OrderSheet } from "@/components/OrderSheet";

export default function GroceryScreen() {
  const db = useSQLiteContext();
  const plan = usePlanStore((s) => s.plan);
  const planMeals = usePlanStore((s) => s.planMeals);
  const catalog = usePlanStore((s) => s.catalog);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const orderSheetRef = useRef<BottomSheetModal>(null);

  useFocusEffect(
    useCallback(() => {
      if (plan) void getItems(db, plan.id).then(setItems);
    }, [db, plan]),
  );

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

  const setAll = (value: boolean) => {
    for (const item of items) {
      if (item.isChecked !== value) void setChecked(db, item.id, value);
    }
    setItems((prev) => prev.map((i) => ({ ...i, isChecked: value })));
  };

  const total = items.length;
  const done = items.filter((i) => i.isChecked).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const allChecked = total > 0 && done === total;

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
    <SafeAreaView className="flex-1 bg-secondary/30" edges={["top"]}>
      {/* Header */}
      <View className="border-b border-border bg-background px-4 py-3 flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
          <View className="h-8 w-8 rounded-xl bg-primary/15 items-center justify-center">
            <Feather name="shopping-cart" size={15} color="#a55a37" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-sm font-semibold text-foreground">
              Grocery List
            </Text>
            <Text className="text-[11px] text-muted-foreground">
              Auto-generated from your week
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => void generate()}
            hitSlop={6}
            className="h-9 px-3 rounded-full border border-border bg-card flex-row items-center gap-1.5"
          >
            <Feather name="refresh-cw" size={13} color="#291f18" />
            <Text className="text-xs font-medium text-foreground">
              {items.length ? "Rebuild" : "Generate"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setAll(false)}
            disabled={done === 0}
            hitSlop={6}
            className={`h-9 px-3 rounded-full border border-border bg-card flex-row items-center gap-1.5 ${
              done === 0 ? "opacity-50" : ""
            }`}
          >
            <Feather name="rotate-ccw" size={13} color="#291f18" />
            <Text className="text-xs font-medium text-foreground">Reset</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      >
        {total === 0 ? (
          <View className="items-center mt-12 px-6">
            <Text className="text-center text-sm text-muted-foreground">
              Tap Generate to turn this week's meals into a checklist.
            </Text>
          </View>
        ) : (
          <>
            {/* Progress summary */}
            <View className="rounded-2xl border border-border bg-card p-4 mb-5">
              <View className="flex-row items-baseline justify-between">
                <View>
                  <Text className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                    {done}
                    <Text className="text-lg text-muted-foreground/60">
                      {" "}
                      / {total}
                    </Text>
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    items checked off
                  </Text>
                </View>
                <Text className="text-sm font-semibold text-foreground tabular-nums">
                  {pct}%
                </Text>
              </View>
              <View className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
                <View
                  className={`h-full rounded-full ${
                    pct === 100
                      ? "bg-success"
                      : pct >= 50
                        ? "bg-warning"
                        : "bg-primary/70"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </View>
              <Text className="mt-2 text-xs text-muted-foreground">
                {pct === 100
                  ? "All set — happy cooking."
                  : pct >= 50
                    ? "Halfway there. Keep going."
                    : "Tap items as you grab them."}
              </Text>
            </View>

            {/* Select all */}
            <View className="mb-3 flex-row items-center justify-between px-1">
              <Pressable
                onPress={() => setAll(!allChecked)}
                className="flex-row items-center gap-2"
              >
                <View
                  className={`h-5 w-5 rounded-md border items-center justify-center ${
                    allChecked
                      ? "bg-primary border-primary"
                      : "border-border bg-background"
                  }`}
                >
                  {allChecked ? (
                    <Feather name="check" size={12} color="#fefbf8" />
                  ) : null}
                </View>
                <Text className="text-sm font-medium text-foreground">
                  {allChecked ? "Deselect all" : "Select all"}
                </Text>
              </Pressable>
              <Text className="text-xs text-muted-foreground tabular-nums">
                {done}/{total}
              </Text>
            </View>

            {/* Category sections */}
            <View style={{ gap: 12 }}>
              {sections.map(([category, list]) => {
                const isCollapsed = collapsed.has(category);
                const catDone = list.filter((i) => i.isChecked).length;
                const allDone = catDone === list.length;
                return (
                  <View
                    key={category}
                    className="rounded-2xl border border-border bg-card overflow-hidden"
                  >
                    <Pressable
                      onPress={() =>
                        setCollapsed((prev) => {
                          const next = new Set(prev);
                          if (next.has(category)) next.delete(category);
                          else next.add(category);
                          return next;
                        })
                      }
                      className="flex-row items-center justify-between gap-2 px-4 py-3.5"
                    >
                      <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
                        <Text className="text-sm font-semibold text-foreground">
                          {category}
                        </Text>
                        <View
                          className={`rounded-full px-2 py-0.5 ${
                            allDone ? "bg-success/15" : "bg-secondary"
                          }`}
                        >
                          <Text
                            className={`text-[11px] font-semibold tabular-nums ${
                              allDone ? "text-success" : "text-muted-foreground"
                            }`}
                          >
                            {catDone}/{list.length}
                          </Text>
                        </View>
                      </View>
                      <Feather
                        name={isCollapsed ? "chevron-right" : "chevron-down"}
                        size={16}
                        color="#6c6158"
                      />
                    </Pressable>

                    {!isCollapsed
                      ? list.map((item, i) => (
                          <Pressable
                            key={item.id}
                            onPress={() => toggle(item)}
                            className={`flex-row items-center gap-3 px-4 py-3 border-t ${
                              i === 0 ? "border-border/70" : "border-border/40"
                            }`}
                          >
                            <View
                              className={`h-5 w-5 rounded-md border items-center justify-center ${
                                item.isChecked
                                  ? "bg-primary border-primary"
                                  : "border-border bg-background"
                              }`}
                            >
                              {item.isChecked ? (
                                <Feather
                                  name="check"
                                  size={12}
                                  color="#fefbf8"
                                />
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
                            <Text className="text-xs text-muted-foreground tabular-nums">
                              {formatNumber(item.amount)} {item.unit}
                            </Text>
                          </Pressable>
                        ))
                      : null}
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Sticky order CTA */}
      {total > 0 ? (
        <View className="absolute left-0 right-0 bottom-0 px-4 pb-3 pt-2">
          <Pressable
            onPress={() => orderSheetRef.current?.present()}
            disabled={done === 0}
            className={`h-12 rounded-full flex-row items-center justify-center gap-2 ${
              done === 0 ? "bg-primary/50" : "bg-primary"
            }`}
            style={{
              shadowColor: "#a55a37",
              shadowOpacity: 0.3,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 6,
            }}
          >
            <Feather name="shopping-bag" size={15} color="#fefbf8" />
            <Text className="text-sm font-semibold text-primary-foreground">
              Compare Apps and Order
            </Text>
          </Pressable>
        </View>
      ) : null}

      <OrderSheet ref={orderSheetRef} items={items} />
    </SafeAreaView>
  );
}
