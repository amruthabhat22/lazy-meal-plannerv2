import React from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { FONT_CLIP_FIX_BOLD } from "@/utils/androidText";

/**
 * Shared bottom-sheet chrome matching the design: black/80 tinted scrim,
 * rounded-t-2xl card surface, subtle drag handle, and one header pattern —
 * text-xl bold title, text-sm muted subtitle, hairline divider. Sheets size
 * to their content (h-auto) capped at 85% of the screen; use
 * `useSheetSizing()` for the cap and `useSheetFooterPadding()` so footers
 * end at the safe-area inset with no dead whitespace.
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
  height: 6,
} as const;

/** Content-sized sheet capped at 85% of the window (design max-h-[85vh]). */
export function useSheetSizing() {
  const { height } = useWindowDimensions();
  return {
    enableDynamicSizing: true,
    maxDynamicContentSize: Math.round(height * 0.85),
  } as const;
}

/** Footers pad down to exactly the safe-area inset — nothing more. */
export function useSheetFooterPadding() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, 12);
}

/** Design header: px-5 title text-xl bold + subtitle, hairline divider. */
export function SheetHeader({
  title,
  subtitle,
  divider = true,
}: {
  title: string;
  subtitle?: string;
  divider?: boolean;
}) {
  return (
    <>
      <View className="px-5 pt-1 pb-4">
        <Text className="text-xl font-bold tracking-tight text-foreground pr-8" style={FONT_CLIP_FIX_BOLD}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {divider ? <View className="h-px bg-border" /> : null}
    </>
  );
}
