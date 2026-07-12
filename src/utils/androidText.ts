import { Platform } from "react-native";

/**
 * Some Android OEM system fonts (OnePlus/Oppo/Vivo "Slate" replacements)
 * render semibold/bold wider than RN measures it, clipping the trailing
 * word ("Add meal" → "Add", "260 cal" → "260"). Forcing an explicit
 * family makes measurement match rendering. Spread into `style` on any
 * emphasized Text that must never clip.
 */
export const FONT_CLIP_FIX =
  Platform.OS === "android" ? ({ fontFamily: "sans-serif" } as const) : undefined;
