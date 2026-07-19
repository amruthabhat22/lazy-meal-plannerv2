import React, { forwardRef } from "react";
import { Pressable, Text, View } from "react-native";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { ClipboardCheck, ExternalLink } from "lucide-react-native";
import { Icon, ICON_COLORS } from "@/components/ui/Icon";
import {
  renderSheetBackdrop,
  sheetBackgroundStyle,
  sheetHandleStyle,
  useSheetFooterPadding,
} from "@/components/sheetChrome";
import { FONT_CLIP_FIX, FONT_CLIP_FIX_BOLD } from "@/utils/androidText";

/**
 * Post-copy hand-off to Swiggy Instamart. Swiggy has no public deep link
 * that can inject a shopping list into the cart, so the best possible
 * flow is: copy the list, then walk the user through pasting it into
 * Instamart's shopping-list feature — spelled out step by step.
 */
export const SwiggyHandoffSheet = forwardRef<
  BottomSheetModal,
  {
    itemCount: number;
    onOpenSwiggy: () => void;
    onClose: () => void;
  }
>(function SwiggyHandoffSheet({ itemCount, onOpenSwiggy, onClose }, ref) {
  const footerPadding = useSheetFooterPadding();
  const steps = [
    "Tap the button below to open Swiggy Instamart.",
    'Find the "Shopping list" option (near the search bar).',
    "Paste — Swiggy adds every item and builds your cart.",
  ];
  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      backdropComponent={renderSheetBackdrop}
      backgroundStyle={sheetBackgroundStyle}
      handleIndicatorStyle={sheetHandleStyle}
    >
      <BottomSheetView
        style={{ paddingBottom: footerPadding }}
        className="px-5 pt-1"
      >
        <View className="items-center pt-2 pb-4">
          <View className="h-12 w-12 rounded-full bg-success/10 items-center justify-center mb-3">
            <Icon icon={ClipboardCheck} size="md" color="#2f7d45" />
          </View>
          <Text
            className="text-xl font-bold tracking-tight text-foreground text-center"
            style={FONT_CLIP_FIX_BOLD}
          >
            {itemCount === 1
              ? "1 item copied!"
              : `${itemCount} items copied!`}
          </Text>
          <Text className="text-sm text-muted-foreground text-center mt-2 leading-relaxed px-2">
            Your grocery list is on the clipboard. Paste it in Swiggy and
            your cart builds itself:
          </Text>

          <View className="w-full rounded-xl bg-secondary/40 border border-border/60 px-4 py-3.5 mt-4">
            {steps.map((step, i) => (
              <View
                key={i}
                className={`flex-row items-start gap-3 ${i > 0 ? "mt-3" : ""}`}
              >
                <View className="h-6 w-6 rounded-full bg-primary/10 items-center justify-center">
                  <Text className="text-xs font-bold text-primary" style={FONT_CLIP_FIX_BOLD}>
                    {i + 1}
                  </Text>
                </View>
                <Text className="flex-1 text-sm leading-relaxed text-foreground/90 pt-0.5">
                  {step}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable
          onPress={onOpenSwiggy}
          accessibilityRole="button"
          className="h-12 rounded-full bg-primary flex-row items-center justify-center gap-2"
        >
          <Icon
            icon={ExternalLink}
            size="sm"
            color={ICON_COLORS.primaryForeground}
          />
          <Text
            className="text-sm font-semibold text-primary-foreground"
            style={FONT_CLIP_FIX}
          >
            Open Swiggy Instamart
          </Text>
        </Pressable>
        <Pressable
          onPress={onClose}
          className="h-11 rounded-full bg-secondary items-center justify-center mt-2"
        >
          <Text className="text-sm font-semibold text-foreground" style={FONT_CLIP_FIX}>
            Close
          </Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
});
