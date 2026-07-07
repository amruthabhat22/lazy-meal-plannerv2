import React from "react";
import { Pressable, ScrollView, Text } from "react-native";
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

export function DaySelector({
  selected,
  onSelect,
}: {
  selected: Day;
  onSelect: (day: Day) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        gap: 8,
        alignItems: "center",
      }}
    >
      {ALL_DAYS.map((day) => (
        <Pressable
          key={day}
          onPress={() => onSelect(day)}
          className={`rounded-full px-4 py-2 ${
            selected === day ? "bg-primary" : "bg-gray-100"
          }`}
        >
          <Text
            className={`font-semibold ${
              selected === day ? "text-white" : "text-gray-700"
            }`}
          >
            {LABELS[day]}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
