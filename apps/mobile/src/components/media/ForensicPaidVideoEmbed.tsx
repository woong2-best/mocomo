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
  /** Paid photos run through the same handoff, rendered by the image canvas. */
  mediaType?: "video" | "image";
  style?: object;
};

/**
 * Reuses the web forensic canvas pipeline inside an authenticated WebView so
 * mobile paid photo/video viewing carries the same invisible forensic signal
 * as web. Nothing here ever receives the origin file URL.
 */
export function ForensicPaidVideoEmbed({
  mediaId,
  contentKind = "POST_MEDIA",
  mediaType = "video",
  style,
}: Props) {
  const [handoffUrl, setHandoffUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const url = await createPaidVideoWebHandoff(mediaId, contentKind, mediaType);
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
  }, [mediaId, contentKind, mediaType]);

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
