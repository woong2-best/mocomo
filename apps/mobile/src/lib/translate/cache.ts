import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "mocomo_translate:";
const MAX_ENTRIES = 400;

export async function getCachedTranslation(
  srcLang: string,
  tgtLang: string,
  text: string
): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(`${PREFIX}${srcLang}:${tgtLang}:${text}`);
  } catch {
    return null;
  }
}

export async function setCachedTranslation(
  srcLang: string,
  tgtLang: string,
  text: string,
  translated: string
): Promise<void> {
  try {
    await AsyncStorage.setItem(`${PREFIX}${srcLang}:${tgtLang}:${text}`, translated);
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(PREFIX));
    if (ours.length > MAX_ENTRIES) {
      await AsyncStorage.multiRemove(ours.slice(0, ours.length - MAX_ENTRIES));
    }
  } catch {
    /* ignore cache write failures */
  }
}
