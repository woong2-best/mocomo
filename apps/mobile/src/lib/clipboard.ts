import { Share } from "react-native";
import * as Clipboard from "expo-clipboard";

/**
 * Copy text to the system clipboard.
 * Falls back to the OS share sheet if the native clipboard module is missing.
 */
export async function copyTextToClipboard(text: string): Promise<"copied" | "shared"> {
  const value = text.trim();
  if (!value) throw new Error("empty");

  try {
    await Clipboard.setStringAsync(value);
    return "copied";
  } catch {
    await Share.share({ message: value, url: value });
    return "shared";
  }
}
