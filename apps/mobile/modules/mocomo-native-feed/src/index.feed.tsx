import { Platform, type ViewProps } from "react-native";
import { requireNativeViewManager } from "expo-modules-core";

export type NativeFeedEvent<T> = { nativeEvent: T };

export type MocomoNativeFeedProps = ViewProps & {
  apiBaseUrl: string;
  accessToken: string | null;
  isDark?: boolean;
  bottomPadding?: number;
  paused?: boolean;
  refreshNonce?: number;
  onPostPress?: (e: NativeFeedEvent<{ postId: string }>) => void;
  onAuthorPress?: (e: NativeFeedEvent<{ username: string }>) => void;
  onVideoPress?: (
    e: NativeFeedEvent<{ postId: string; mediaId?: string | null; mediaIndex?: number }>
  ) => void;
  onLikePress?: (e: NativeFeedEvent<{ postId: string }>) => void;
  onAdPress?: (e: NativeFeedEvent<{ linkUrl: string }>) => void;
  onReady?: (e: NativeFeedEvent<{ ok: boolean }>) => void;
  onError?: (e: NativeFeedEvent<{ message: string }>) => void;
  onAuthExpired?: (e: NativeFeedEvent<{ reason: string }>) => void;
};

type NativeFeedComponent = React.ComponentType<MocomoNativeFeedProps>;

let NativeFeedView: NativeFeedComponent | null = null;
if (Platform.OS === "android") {
  try {
    NativeFeedView = requireNativeViewManager("MocomoNativeFeed") as NativeFeedComponent;
  } catch {
    NativeFeedView = null;
  }
}

/** @deprecated Do not use in product UI — kept for experiments only. */
export function isNativeFeedSupported(): boolean {
  return false;
}

/** @deprecated Design must stay on FlashList FeedPostCard (128 parity). */
export function MocomoNativeFeedView(_props: MocomoNativeFeedProps) {
  return null;
}
