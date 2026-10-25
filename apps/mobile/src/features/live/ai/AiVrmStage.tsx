import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { useAudioPlayer } from "expo-audio";
import { vrmStageDocument } from "@/features/live/ai/vrm-stage-document";
import { API_BASE_URL } from "@/config/env";

export type AiVrmHandle = {
  play: (audioBase64: string | null, emotion: string, text: string) => void;
  stop: () => void;
};

type Props = {
  vrmUrl: string;
  backdropUrl: string | null;
  characterId: string;
  /** Old still. Shown only when this stage has no room backdrop. */
  poster?: number;
  framing?: "bust" | "stage";
  maxPixelRatio?: number;
};

function absUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function NativeVoice({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri);
  useEffect(() => {
    player.play();
  }, [player]);
  return null;
}

export const AiVrmStage = forwardRef<AiVrmHandle, Props>(function AiVrmStage(
  { vrmUrl, backdropUrl, characterId, poster, framing = "stage", maxPixelRatio = 1.5 },
  ref
) {
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [nativePlay, setNativePlay] = useState<{ id: number; uri: string } | null>(null);
  const lastAudio = useRef<string | null>(null);
  const html = useMemo(
    () =>
      vrmStageDocument({
        vrmUrl: absUrl(vrmUrl),
        backdropUrl: backdropUrl ? absUrl(backdropUrl) : null,
        characterId,
        framing,
        maxPixelRatio,
      }),
    [backdropUrl, characterId, framing, maxPixelRatio, vrmUrl]
  );
  const backdropUri = backdropUrl ? absUrl(backdropUrl) : null;

  useImperativeHandle(ref, () => ({
    play(audioBase64, emotion, text) {
      lastAudio.current = audioBase64;
      const payload = `window.mocoPlay && window.mocoPlay(${JSON.stringify(audioBase64 ?? "")}, ${JSON.stringify(emotion)}, ${JSON.stringify(text)}); true;`;
      webRef.current?.injectJavaScript(payload);
    },
    stop() {
      lastAudio.current = null;
      setNativePlay(null);
      webRef.current?.injectJavaScript("window.mocoStop && window.mocoStop(); true;");
    },
  }));

  const onMessage = (event: WebViewMessageEvent) => {
    let msg: { type?: string } | null = null;
    try {
      msg = JSON.parse(event.nativeEvent.data) as { type?: string };
    } catch {
      return;
    }
    if (msg?.type === "ready") setReady(true);
    if (msg?.type === "audio-fallback" && lastAudio.current) {
      setNativePlay({ id: Date.now(), uri: `data:audio/mpeg;base64,${lastAudio.current}` });
    }
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      {backdropUri ? (
        <Image source={{ uri: backdropUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : poster != null ? (
        <Image source={poster} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : null}
      <WebView
        ref={webRef}
        source={{ html, baseUrl: API_BASE_URL }}
        onMessage={onMessage}
        style={[StyleSheet.absoluteFill, { opacity: ready ? 1 : 0, backgroundColor: "transparent" }]}
        pointerEvents="none"
        scrollEnabled={false}
        nestedScrollEnabled={false}
        allowsFullscreenVideo={false}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        originWhitelist={["*"]}
        mixedContentMode="always"
        androidLayerType="hardware"
        onError={() => setReady(false)}
      />
      {nativePlay ? <NativeVoice key={nativePlay.id} uri={nativePlay.uri} /> : null}
    </View>
  );
});
