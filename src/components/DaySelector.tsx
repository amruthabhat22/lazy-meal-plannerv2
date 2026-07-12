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

/** Dates (day of month) for the current Mon–Sun week. */
export function currentWeekDates(): Record<Day, number> {
  const now = new Date();
  const monday = new Date(now);
  const weekday = (now.getDay() + 6) % 7; // 0 = Monday
  monday.setDate(now.getDate() - weekday);
  const result = {} as Record<Day, number>;
  ALL_DAYS.forEach((day, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    result[day] = d.getDate();
  });
  return result;
}

/** Day tabs: label, circular date, protein-status dot (design's day tabs). */
export function DaySelector({
  selected,
  onSelect,
  proteinRatioByDay,
}: {
  selected: Day;
  onSelect: (day: Day) => void;
  proteinRatioByDay: Partial<Record<Day, number>>;
}) {
  const dates = React.useMemo(currentWeekDates, []);
  return (
    <View className="flex-row px-4 pt-3 pb-1 gap-1">
      {ALL_DAYS.map((day) => {
        const isActive = selected === day;
        const ratio = proteinRatioByDay[day] ?? 0;
        const dotClass =
          ratio >= 0.95
            ? "bg-success"
            : ratio >= 0.75
              ? "bg-warning"
              : ratio > 0
                ? "bg-muted-foreground/40"
                : "bg-muted-foreground/20";
        return (
          <Pressable
            key={day}
            onPress={() => onSelect(day)}
            className="flex-1 items-center gap-1.5 py-1"
          >
            <Text
              className={`text-xs font-semibold tracking-wide ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {LABELS[day]}
            </Text>
            <View
              className={`h-10 w-10 rounded-full items-center justify-center border ${
                isActive
                  ? "bg-foreground border-foreground"
                  : "bg-card border-border"
              }`}
            >
              <Text
                className={`text-sm font-semibold tabular-nums ${
                  isActive ? "text-background" : "text-foreground"
                }`}
              >
                {dates[day]}
              </Text>
            </View>
            <View className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
          </Pressable>
        );
      })}
    </View>
  );
}
