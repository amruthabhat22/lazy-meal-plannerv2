import React, { useMemo, useRef, useState } from "react";
import { PanResponder, View } from "react-native";
import * as Haptics from "expo-haptics";

const TRACK_HEIGHT = 12; // design: h-3
const THUMB_SIZE = 28; // design: h-7 w-7

/**
 * Custom slider matching the design (12px track + 28px ringed thumb) —
 * @react-native-community/slider can't render a thick track. Steps are
 * coarse (5g / 50kcal), so plain state updates are smooth enough.
 * The whole control is 44px tall for a full-size touch target.
 */
export function Slider({
  min,
  max,
  step,
  value,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const [width, setWidth] = useState(0);
  // Refs so the PanResponder (created once) always sees current values.
  const stateRef = useRef({ min, max, step, width, onChange });
  const lastRef = useRef(value);
  stateRef.current = { min, max, step, width, onChange };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => update(e.nativeEvent.locationX),
        onPanResponderMove: (e) => update(e.nativeEvent.locationX),
      }),
    [],
  );

  function update(x: number) {
    const s = stateRef.current;
    if (s.width <= 0) return;
    const raw = s.min + (x / s.width) * (s.max - s.min);
    const snapped = Math.round(raw / s.step) * s.step;
    const next = Math.min(s.max, Math.max(s.min, snapped));
    if (next !== lastRef.current) {
      lastRef.current = next;
      void Haptics.selectionAsync();
    }
    s.onChange(next);
  }

  const pct = max > min ? (value - min) / (max - min) : 0;
  const thumbLeft = Math.max(0, pct * width - THUMB_SIZE / 2);

  return (
    <View
      {...pan.panHandlers}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      className="justify-center"
      style={{ height: 44 }}
      accessibilityRole="adjustable"
      accessibilityValue={{ min, max, now: value }}
    >
      {/* Track */}
      <View
        className="w-full rounded-full bg-primary/20 overflow-hidden"
        style={{ height: TRACK_HEIGHT }}
      >
        <View
          className="h-full rounded-full bg-primary"
          style={{ width: `${pct * 100}%` }}
        />
      </View>
      {/* Thumb */}
      <View
        pointerEvents="none"
        className="absolute rounded-full border-2 border-primary bg-background"
        style={{
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          left: thumbLeft,
          shadowColor: "#503c28",
          shadowOpacity: 0.3,
          shadowRadius: 7,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        }}
      />
    </View>
  );
}
