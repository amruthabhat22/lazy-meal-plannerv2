import React, { forwardRef } from "react";
import { Pressable, Text, View } from "react-native";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { LogOut, ShieldCheck } from "lucide-react-native";
import { Icon, ICON_COLORS } from "@/components/ui/Icon";
import {
  renderSheetBackdrop,
  sheetBackgroundStyle,
  sheetHandleStyle,
  useSheetFooterPadding,
} from "@/components/sheetChrome";
import { FONT_CLIP_FIX, FONT_CLIP_FIX_BOLD } from "@/utils/androidText";

/**
 * Log-out confirmation as an app-styled bottom sheet (matches the other
 * sheets' chrome) instead of a native alert. Reassures the user that
 * everything stays on the device.
 */
export const ConfirmLogoutSheet = forwardRef<
  BottomSheetModal,
  {
    onConfirm: () => void;
    onCancel: () => void;
  }
>(function ConfirmLogoutSheet({ onConfirm, onCancel }, ref) {
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
        <View className="items-center pt-2 pb-4">
          <View className="h-12 w-12 rounded-full bg-destructive/10 items-center justify-center mb-3">
            <Icon icon={LogOut} size="md" color={ICON_COLORS.destructive} />
          </View>
          <Text
            className="text-xl font-bold tracking-tight text-foreground text-center"
            style={FONT_CLIP_FIX_BOLD}
          >
            Are you sure you want to log out?
          </Text>
          <View className="flex-row items-start gap-2.5 rounded-xl bg-secondary/40 border border-border/60 px-4 py-3 mt-4">
            <View className="mt-0.5">
              <Icon
                icon={ShieldCheck}
                size="sm"
                color={ICON_COLORS.accentForeground}
              />
            </View>
            <Text className="flex-1 text-sm text-foreground/80 leading-relaxed">
              All your settings and preferences are safely saved on this
              device. You'll find everything just as you left it when you
              sign back in.
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onConfirm}
          accessibilityRole="button"
          className="h-12 rounded-full bg-destructive flex-row items-center justify-center gap-2"
        >
          <Icon icon={LogOut} size="sm" color={ICON_COLORS.primaryForeground} />
          <Text
            className="text-sm font-semibold text-destructive-foreground"
            style={FONT_CLIP_FIX}
          >
            Log out
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
      </BottomSheetView>
    </BottomSheetModal>
  );
});
