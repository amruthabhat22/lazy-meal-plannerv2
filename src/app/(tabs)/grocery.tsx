import React, { useCallback, useMemo, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { Check, ChevronDown, ChevronRight, ShoppingBag, ShoppingBasket } from "lucide-react-native";
import { useFocusEffect } from "expo-router";
import { Icon, ICON_COLORS } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { usePlanStore } from "@/state/usePlanStore";
import {
  getItems,
  replaceItems,
  setChecked,
  type GroceryItem,
} from "@/db/repos/groceryRepo";
import { getRecipesByMealIds } from "@/db/repos/mealsRepo";
import { aggregateGroceries, CATEGORY_ORDER } from "@/utils/grocery";
import { formatIngredientQty } from "@/utils/format";
import { FONT_CLIP_FIX } from "@/utils/androidText";
import { SwiggyHandoffSheet } from "@/components/SwiggyHandoffSheet";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";

const SWIGGY_INSTAMART_URL = "https://www.swiggy.com/instamart";

export default function GroceryScreen() {
  const db = useSQLiteContext();
  const plan = usePlanStore((s) => s.plan);
  const planMeals = usePlanStore((s) => s.planMeals);
  const catalog = usePlanStore((s) => s.catalog);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [copiedCount, setCopiedCount] = useState(0);
  const handoffRef = useRef<BottomSheetModal>(null);

  /** Re-aggregate from the current week on every visit — no manual
   * Rebuild. Everything starts unchecked: ticks are a fresh selection
   * each visit, never carried over from earlier sessions. */
  const refresh = useCallback(async () => {
    if (!plan) return;
    const mealIds = [...new Set(planMeals.map((pm) => pm.mealId))];
    const recipes = await getRecipesByMealIds(db, mealIds);
    const aggregated = aggregateGroceries(planMeals, catalog, recipes);
    await replaceItems(db, plan.id, aggregated);
    setItems(await getItems(db, plan.id));
  }, [db, plan, planMeals, catalog]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

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
    return [...byCategory.entries()].sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a[0] as (typeof CATEGORY_ORDER)[number]) -
        CATEGORY_ORDER.indexOf(b[0] as (typeof CATEGORY_ORDER)[number]),
    );
  }, [items]);

  /** Copy the selected items as a paste-ready list, then walk the user
   * through Swiggy Instamart's paste-a-list feature via the hand-off
   * sheet (Swiggy has no deep link that can prefill a cart). */
  const orderItems = async () => {
    const list = items.filter((i) => i.isChecked);
    if (list.length === 0) return;
    const text = list
      .map((i) => `${i.name} — ${formatIngredientQty(i.amount, i.unit)}`)
      .join("\n");
    await Clipboard.setStringAsync(text);
    setCopiedCount(list.length);
    handoffRef.current?.present();
  };

  return (
    <SafeAreaView className="flex-1 bg-secondary/30" edges={["top"]}>
      {/* Header */}
      <View className="border-b border-border bg-background px-4 py-3 flex-row items-center gap-2.5">
        <View className="h-8 w-8 rounded-xl bg-primary/15 items-center justify-center">
          <Icon icon={ShoppingBasket} size="sm" color={ICON_COLORS.primary} />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-sm font-semibold text-foreground" style={FONT_CLIP_FIX}>
            Grocery List
          </Text>
          <Text className="text-xs text-muted-foreground">
            Auto-generated from your week
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      >
        {total === 0 ? (
          <View className="items-center mt-12 px-6">
            <Text className="text-center text-sm text-muted-foreground">
              Your list appears here once this week has meals planned.
            </Text>
          </View>
        ) : (
          <>
            {/* Progress summary */}
            <View className="rounded-2xl border border-border bg-card p-4 mb-5">
              <View className="flex-row items-baseline justify-between">
                <View>
                  <Text className="text-2xl font-semibold tracking-tight text-foreground tabular-nums" style={FONT_CLIP_FIX}>
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
                <Text className="text-sm font-semibold text-foreground tabular-nums" style={FONT_CLIP_FIX}>
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
                hitSlop={10}
                className="flex-row items-center gap-2 py-2"
              >
                <View
                  className={`h-5 w-5 rounded-md border items-center justify-center ${
                    allChecked
                      ? "bg-primary border-primary"
                      : "border-border bg-background"
                  }`}
                >
                  {allChecked ? (
                    <Icon
                      icon={Check}
                      size={13}
                      color={ICON_COLORS.primaryForeground}
                    />
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
                        <Text className="text-sm font-semibold text-foreground" style={FONT_CLIP_FIX}>
                          {category}
                        </Text>
                        <View
                          className={`rounded-full px-2 py-0.5 ${
                            allDone ? "bg-success/15" : "bg-secondary"
                          }`}
                        >
                          <Text
                            className={`text-xs font-semibold tabular-nums ${
                              allDone ? "text-success" : "text-muted-foreground"
                            }`}
                           style={FONT_CLIP_FIX}>
                            {catDone}/{list.length}
                          </Text>
                        </View>
                      </View>
                      <Icon
                        icon={isCollapsed ? ChevronRight : ChevronDown}
                        size="sm"
                        color={ICON_COLORS.muted}
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
                                <Icon
                                  icon={Check}
                                  size={13}
                                  color={ICON_COLORS.primaryForeground}
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
                              {formatIngredientQty(item.amount, item.unit)}
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

      <SwiggyHandoffSheet
        ref={handoffRef}
        itemCount={copiedCount}
        onOpenSwiggy={() => {
          handoffRef.current?.dismiss();
          void Linking.openURL(SWIGGY_INSTAMART_URL);
        }}
        onClose={() => handoffRef.current?.dismiss()}
      />

      {/* Sticky order CTA */}
      {total > 0 ? (
        <View className="absolute left-0 right-0 bottom-0 px-4 pb-3 pt-2">
          <Button
            label={`Order Items${done > 0 ? ` (${done})` : ""}`}
            icon={ShoppingBag}
            onPress={() => void orderItems()}
            disabled={done === 0}
            shadow
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
