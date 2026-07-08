import React, { forwardRef, useMemo } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Feather } from "@expo/vector-icons";
import type { GroceryItem } from "@/db/repos/groceryRepo";

interface AppInfo {
  id: string;
  name: string;
  color: string;
  textColor?: string;
  initial: string;
  etaMin: number;
  priceMultiplier: number;
  availabilityRate: number;
  url: string;
}

const APPS: AppInfo[] = [
  { id: "zepto", name: "Zepto", color: "#7B2CBF", initial: "Z", etaMin: 10, priceMultiplier: 1.02, availabilityRate: 0.95, url: "https://www.zeptonow.com" },
  { id: "blinkit", name: "Blinkit", color: "#F8CB46", textColor: "#000", initial: "B", etaMin: 12, priceMultiplier: 0.98, availabilityRate: 0.97, url: "https://blinkit.com" },
  { id: "instamart", name: "Swiggy Instamart", color: "#FC8019", initial: "S", etaMin: 15, priceMultiplier: 1.05, availabilityRate: 0.92, url: "https://www.swiggy.com/instamart" },
  { id: "bigbasket", name: "BigBasket", color: "#84C225", initial: "b", etaMin: 90, priceMultiplier: 0.92, availabilityRate: 0.99, url: "https://www.bigbasket.com" },
];

// Deterministic estimate per item name (INR) — same trick as the design.
function hashPrice(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return 40 + (h % 260);
}

/** "Compare Apps and Order": estimated totals across delivery apps. */
export const OrderSheet = forwardRef<
  BottomSheetModal,
  { items: GroceryItem[] }
>(function OrderSheet({ items }, ref) {
  const quotes = useMemo(() => {
    const basePrices = items.map((i) => hashPrice(i.name));
    return APPS.map((app) => {
      let total = 0;
      let available = 0;
      items.forEach((item, idx) => {
        const h = (item.name.charCodeAt(0) + app.id.charCodeAt(0)) % 100;
        if (h / 100 < app.availabilityRate) {
          available += 1;
          total += basePrices[idx] * app.priceMultiplier;
        }
      });
      return { app, total: Math.round(total), available };
    }).sort((a, b) => a.total - b.total);
  }, [items]);

  const savings =
    quotes.length > 1 ? quotes[quotes.length - 1].total - quotes[0].total : 0;

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={["80%"]}
      enableDynamicSizing={false}
      backgroundStyle={{ backgroundColor: "#fffdfa" }}
      handleIndicatorStyle={{ backgroundColor: "#e3ddd5" }}
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
      >
        <Text className="text-base font-bold text-foreground">Place order</Text>
        <Text className="text-xs text-muted-foreground mt-0.5 mb-4">
          Comparing {items.length} items across delivery apps
        </Text>

        {quotes.map((q, idx) => {
          const isBest = idx === 0;
          const missing = items.length - q.available;
          return (
            <Pressable
              key={q.app.id}
              onPress={() => void Linking.openURL(q.app.url)}
              className={`rounded-2xl border p-4 mb-2.5 ${
                isBest ? "border-primary/60 bg-primary/5" : "border-border bg-card"
              }`}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className="h-11 w-11 rounded-xl items-center justify-center"
                  style={{ backgroundColor: q.app.color }}
                >
                  <Text
                    className="font-bold text-lg"
                    style={{ color: q.app.textColor ?? "#fff" }}
                  >
                    {q.app.initial}
                  </Text>
                </View>
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center gap-2 flex-wrap">
                    <Text className="text-sm font-semibold text-foreground">
                      {q.app.name}
                    </Text>
                    {isBest ? (
                      <View className="rounded-full bg-primary px-2 py-0.5">
                        <Text className="text-[10px] font-semibold text-primary-foreground">
                          ✨ Best value
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View className="flex-row items-center gap-3 mt-1">
                    <Text className="text-xs text-muted-foreground">
                      ⏱{" "}
                      {q.app.etaMin < 60
                        ? `${q.app.etaMin} min`
                        : `${Math.round(q.app.etaMin / 60)} hr`}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      ✓ {q.available}/{items.length} items
                    </Text>
                    {missing > 0 ? (
                      <Text className="text-xs text-warning">
                        {missing} missing
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View className="flex-row items-center gap-2">
                  <View className="items-end">
                    <Text className="text-base font-semibold text-foreground tabular-nums">
                      ₹{q.total.toLocaleString("en-IN")}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground">
                      est. total
                    </Text>
                  </View>
                  <View className="h-7 w-7 rounded-full bg-primary items-center justify-center">
                    <Feather name="arrow-up-right" size={13} color="#fefbf8" />
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })}

        <Text className="text-[11px] text-muted-foreground text-center pt-2 px-4">
          Prices are estimates. Final cart total is set by the app at checkout.
        </Text>
        {savings > 0 ? (
          <Text className="text-[11px] text-muted-foreground text-center mt-3">
            Saves ~₹{savings.toLocaleString("en-IN")} vs the priciest option
          </Text>
        ) : null}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
