import React from "react";
import { Pressable } from "react-native";
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Feather } from "@expo/vector-icons";

/**
 * Shared bottom-sheet chrome matching the design: every sheet sits on a
 * black/80 tinted scrim that fades in, has a rounded-t-2xl card background,
 * a subtle drag handle, and an X close button in the top-right corner.
 */

export function renderSheetBackdrop(props: BottomSheetBackdropProps) {
  return (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      opacity={0.8}
      pressBehavior="close"
    />
  );
}

/** rounded-t-2xl card surface (design token --card). */
export const sheetBackgroundStyle = {
  backgroundColor: "#fffdfa",
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
} as const;

/** h-1.5 w-10 rounded-full bg-muted-foreground/20 drag handle. */
export const sheetHandleStyle = {
  backgroundColor: "rgba(108, 97, 88, 0.2)",
  width: 40,
  height: 5,
} as const;

/** Absolute X close button (design: top-right, opacity-70). */
export function SheetCloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityLabel="Close"
      className="absolute right-4 top-1 h-8 w-8 rounded-full items-center justify-center opacity-70"
    >
      <Feather name="x" size={18} color="#291f18" />
    </Pressable>
  );
}
