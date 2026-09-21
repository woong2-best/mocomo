import { Platform, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { requireNativeViewManager } from "expo-modules-core";

type Props = {
  url: string | null;
  playing: boolean;
  muted?: boolean;
  posterUrl?: string | null;
  streamUid?: string | null;
  style?: StyleProp<ViewStyle>;
  onFirstFrame?: () => void;
};

type NativeProps = Props & {
  onReady?: (e: { nativeEvent: { ok: boolean } }) => void;
  onError?: (e: { nativeEvent: { message: string } }) => void;
  onFirstFrame?: (e: { nativeEvent: { ok: boolean } }) => void;
};

type NativeComp = React.ComponentType<NativeProps>;

let NativeView: NativeComp | null = null;
if (Platform.OS === "android") {
  try {
    NativeView = requireNativeViewManager("MocomoPooledVideo") as NativeComp;
  } catch {
    NativeView = null;
  }
}

export function isPooledVideoSupported(): boolean {
  return Platform.OS === "android" && NativeView != null;
}

/** Drop-in surface — parent supplies size; no visual chrome of its own. */
export function MocomoPooledVideoView({
  url,
  playing,
  muted = true,
  posterUrl,
  streamUid,
  style,
  onFirstFrame,
}: Props) {
  if (!NativeView || !url) return null;
  const View = NativeView;
  return (
    <View
      style={style ?? StyleSheet.absoluteFill}
      url={url}
      posterUrl={posterUrl ?? undefined}
      streamUid={streamUid ?? undefined}
      playing={playing}
      muted={muted}
      onFirstFrame={
        onFirstFrame
          ? () => {
              onFirstFrame();
            }
          : undefined
      }
    />
  );
}
