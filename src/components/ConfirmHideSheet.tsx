import React, { forwardRef } from "react";
import { Pressable, Text, View } from "react-native";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { EyeOff } from "lucide-react-native";
import { Icon, ICON_COLORS } from "@/components/ui/Icon";
import type { Meal } from "@/engine/types";
import {
  renderSheetBackdrop,
  sheetBackgroundStyle,
  sheetHandleStyle,
  useSheetFooterPadding,
} from "@/components/sheetChrome";
import { FONT_CLIP_FIX, FONT_CLIP_FIX_BOLD } from "@/utils/androidText";

/**
 * Confirmation sheet for "Don't show this dish again" — explains the
 * consequence (excluded from future plans and swaps) and that it's
 * reversible anytime from Profile → Hidden dishes.
 */
export const ConfirmHideSheet = forwardRef<
  BottomSheetModal,
  {
    meal: Meal | null;
    onConfirm: (meal: Meal) => void;
    onCancel: () => void;
  }
>(function ConfirmHideSheet({ meal, onConfirm, onCancel }, ref) {
  const footerPadding = useSheetFooterPadding();
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
        {meal ? (
          <>
            <View className="items-center pt-2 pb-4">
              <View className="h-12 w-12 rounded-full bg-destructive/10 items-center justify-center mb-3">
                <Icon icon={EyeOff} size="md" color={ICON_COLORS.destructive} />
              </View>
              <Text className="text-xl font-bold tracking-tight text-foreground text-center" style={FONT_CLIP_FIX_BOLD}>
                Don't show this dish again?
              </Text>
              <Text className="text-sm text-muted-foreground text-center mt-2 leading-relaxed px-2">
                "{meal.name}" won't be suggested in future plans or swaps.
                Meals already on your week stay as they are.
              </Text>
              <View className="rounded-xl bg-secondary/40 border border-border/60 px-4 py-3 mt-4">
                <Text className="text-sm text-foreground/80 text-center leading-relaxed">
                  Changed your mind later? You can unhide it anytime from
                  Profile → Hidden dishes.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => onConfirm(meal)}
              accessibilityRole="button"
              className="h-12 rounded-full bg-destructive flex-row items-center justify-center gap-2"
            >
              <Icon
                icon={EyeOff}
                size="sm"
                color={ICON_COLORS.primaryForeground}
              />
              <Text className="text-sm font-semibold text-destructive-foreground" style={FONT_CLIP_FIX}>
                Yes, don't show again
              </Text>
            </Pressable>
            <Pressable
              onPress={onCancel}
              className="h-11 rounded-full bg-secondary items-center justify-center mt-2"
            >
              <Text className="text-sm font-semibold text-foreground" style={FONT_CLIP_FIX}>
                Cancel
              </Text>
            </Pressable>
          </>
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  );
});
