import React, { forwardRef } from "react";
import { Text, View } from "react-native";
import { ALL_DAYS } from "@/engine/types";
import type { Meal, Slot } from "@/engine/types";
import type { PlanRow } from "@/db/repos/plansRepo";
import { formatQty } from "@/utils/format";
import { DAY_LONG, SLOT_LABEL } from "@/utils/shareMessage";

/**
 * The week rendered as a days × meal-times table, styled for a shareable
 * image. It is mounted off-screen and captured with react-native-view-shot;
 * it is never part of the visible UI.
 */

const WIDTH = 1000;
const DAY_COL = 150;

export const PlanTableImage = forwardRef<
  View,
  {
    planMeals: PlanRow[];
    catalog: Meal[];
    slots: Slot[];
    proteinGoal: number;
  }
>(function PlanTableImage({ planMeals, catalog, slots, proteinGoal }, ref) {
  const byId = new Map(catalog.map((m) => [m.id, m]));
  const days = ALL_DAYS.filter((d) =>
    planMeals.some((pm) => pm.day === d),
  );

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{ width: WIDTH, backgroundColor: "#fdfaf4", padding: 28 }}
    >
      {/* Title */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <Text style={{ fontSize: 30, fontWeight: "700", color: "#291f18" }}>
          🍲 This week's meal plan
        </Text>
        <Text style={{ fontSize: 16, color: "#6c6158" }}>
          Goal: {proteinGoal}g protein/day
        </Text>
      </View>

      {/* Table */}
      <View
        style={{
          borderWidth: 1,
          borderColor: "#e3ddd5",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {/* Header row */}
        <View style={{ flexDirection: "row", backgroundColor: "#a55a37" }}>
          <HeaderCell width={DAY_COL} label="Day" />
          {slots.map((slot) => (
            <HeaderCell key={slot} label={SLOT_LABEL[slot]} />
          ))}
        </View>

        {days.map((day, rowIdx) => {
          const dayRows = planMeals.filter((pm) => pm.day === day);
          let protein = 0;
          let kcal = 0;
          for (const pm of dayRows) {
            const meal = byId.get(pm.mealId);
            if (meal) {
              protein += meal.protein_per_unit * pm.quantity;
              kcal += (meal.kcal_per_unit ?? 0) * pm.quantity;
            }
          }
          return (
            <View
              key={day}
              style={{
                flexDirection: "row",
                backgroundColor: rowIdx % 2 === 0 ? "#fffdfa" : "#faf5ec",
                borderTopWidth: 1,
                borderTopColor: "#e3ddd5",
              }}
            >
              <View
                style={{
                  width: DAY_COL,
                  padding: 12,
                  borderRightWidth: 1,
                  borderRightColor: "#e3ddd5",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{ fontSize: 16, fontWeight: "700", color: "#291f18" }}
                >
                  {DAY_LONG[day]}
                </Text>
                <Text style={{ fontSize: 13, color: "#6c6158", marginTop: 3 }}>
                  {Math.round(protein)}g · {Math.round(kcal)} cal
                </Text>
              </View>
              {slots.map((slot) => {
                const rows = dayRows.filter((pm) => pm.slot === slot);
                return (
                  <View
                    key={slot}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRightWidth: slot === slots[slots.length - 1] ? 0 : 1,
                      borderRightColor: "#e3ddd5",
                      justifyContent: "center",
                    }}
                  >
                    {rows.length === 0 ? (
                      <Text style={{ fontSize: 14, color: "#c9c0b6" }}>—</Text>
                    ) : (
                      rows.map((pm) => {
                        const meal = byId.get(pm.mealId);
                        if (!meal) return null;
                        const showQty =
                          pm.quantity !== meal.default_qty ||
                          meal.unit !== "serving";
                        return (
                          <Text
                            key={pm.id}
                            style={{
                              fontSize: 14.5,
                              color: "#291f18",
                              fontWeight: "600",
                              marginBottom: 3,
                              lineHeight: 19,
                            }}
                          >
                            {meal.name}
                            {showQty ? (
                              <Text
                                style={{
                                  color: "#6c6158",
                                  fontWeight: "400",
                                  fontSize: 13,
                                }}
                              >
                                {"  "}
                                {formatQty(pm.quantity, meal.unit)}
                              </Text>
                            ) : null}
                          </Text>
                        );
                      })
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>

      <Text
        style={{
          marginTop: 14,
          fontSize: 14,
          color: "#6c6158",
          textAlign: "center",
        }}
      >
        💬 Ask for any meal's recipe · Sent via EezyMeals
      </Text>
    </View>
  );
});

function HeaderCell({ label, width }: { label: string; width?: number }) {
  return (
    <View
      style={{
        width,
        flex: width ? undefined : 1,
        paddingVertical: 12,
        paddingHorizontal: 12,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: "700", color: "#fefbf8" }}>
        {label}
      </Text>
    </View>
  );
}
