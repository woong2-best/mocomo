import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import {
  createPaidVideoWebHandoff,
  type WatermarkContentKind,
} from "@/api/watermark";

type Props = {
  mediaId: string;
  contentKind?: WatermarkContentKind;
  style?: object;
};

/**
 * Reuses the web ForensicVideoCanvas pipeline inside a authenticated WebView
 * so mobile paid playback carries the same invisible forensic signal as web.
 */
export function ForensicPaidVideoEmbed({
  mediaId,
  contentKind = "POST_MEDIA",
  style,
}: Props) {
  const [handoffUrl, setHandoffUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const url = await createPaidVideoWebHandoff(mediaId, contentKind);
        if (!cancelled) setHandoffUrl(url);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "워터마크 재생을 시작할 수 없습니다.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mediaId, contentKind]);

  if (error) {
    return (
      <View style={[styles.center, style]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!handoffUrl) {
    return (
      <View style={[styles.center, style]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <WebView
      source={{ uri: handoffUrl }}
      style={[StyleSheet.absoluteFill, style]}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      domStorageEnabled
      allowsFullscreenVideo
      setSupportMultipleWindows={false}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
});
