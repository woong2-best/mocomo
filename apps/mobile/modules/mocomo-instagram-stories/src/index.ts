import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

export type InstagramStoryShareOptions = {
  stickerImageUri: string;
  backgroundImageUri?: string;
  backgroundTopColor?: string;
  backgroundBottomColor?: string;
  contentUrl?: string;
  appId?: string;
};

type MocomoInstagramStoriesNative = {
  isAvailable(): boolean;
  shareToStory(options: InstagramStoryShareOptions): Promise<void>;
};

function getNative(): MocomoInstagramStoriesNative | null {
  return requireOptionalNativeModule<MocomoInstagramStoriesNative>("MocomoInstagramStories");
}

export function isInstagramStoriesAvailable(): boolean {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return false;
  try {
    return !!getNative()?.isAvailable();
  } catch {
    return false;
  }
}

export async function shareToInstagramStories(
  options: InstagramStoryShareOptions
): Promise<void> {
  const mod = getNative();
  if (!mod) {
    throw new Error("Instagram Stories sharing is not available in this build.");
  }
  await mod.shareToStory(options);
}
