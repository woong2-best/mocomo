import AsyncStorage from "@react-native-async-storage/async-storage";

const NOTIFICATION_PROMPT_KEY = "mocomo.onboarding.notification_prompted_v1";

export async function hasSeenNotificationPrompt(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(NOTIFICATION_PROMPT_KEY)) === "1";
  } catch {
    return false;
  }
}

export async function markNotificationPromptSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_PROMPT_KEY, "1");
  } catch {
    /* non-fatal */
  }
}
