import React from "react";
import { Pressable, Text, View } from "react-native";
import { ALL_DAYS } from "@/engine/types";
import type { Day } from "@/engine/types";

const LABELS: Record<Day, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

/** Equal-width day columns with a goal indicator dot, per the design. */
export function DaySelector({
  selected,
  onSelect,
  goalMetByDay,
}: {
  selected: Day;
  onSelect: (day: Day) => void;
  goalMetByDay: Partial<Record<Day, boolean>>;
}) {
  return (
    <View className="flex-row px-4 pt-3 pb-1 gap-1">
      {ALL_DAYS.map((day) => {
        const isSelected = selected === day;
        const met = goalMetByDay[day];
        return (
          <Pressable
            key={day}
            onPress={() => onSelect(day)}
            className={`flex-1 items-center gap-1.5 py-2 rounded-xl ${
              isSelected ? "bg-primary" : ""
            }`}
          >
            <Text
              className={`text-[13px] font-semibold ${
                isSelected ? "text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {LABELS[day]}
            </Text>
            <View
              className={`h-1.5 w-1.5 rounded-full ${
                isSelected
                  ? "bg-primary-foreground"
                  : met
                    ? "bg-success"
                    : "bg-border"
              }`}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
