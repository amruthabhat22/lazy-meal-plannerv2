import { Platform } from "react-native";

/**
 * Some Android OEM system fonts (OnePlus/Oppo/Vivo "Slate" replacements)
 * render semibold/bold wider than RN measures it, clipping the trailing
 * word ("Add meal" -> "Add", "260 cal" -> "260"). An explicit family makes
 * measurement match rendering; sans-serif-medium keeps the emphasized
 * weight (plain sans-serif made some devices drop to regular). Spread into
 * `style` on any semibold Text that must never clip.
 */
export const FONT_CLIP_FIX =
  Platform.OS === "android"
    ? ({ fontFamily: "sans-serif-medium" } as const)
    : undefined;
