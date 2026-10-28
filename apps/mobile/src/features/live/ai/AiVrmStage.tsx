import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { useAudioPlayer } from "expo-audio";
import { vrmStageDocument } from "@/features/live/ai/vrm-stage-document";
import { saveVrmStill, useVrmStill } from "@/features/live/ai/vrm-still-cache";
import { API_BASE_URL } from "@/config/env";
import { IMAGE_CACHE_POLICY } from "@/perf/image";

export type AiVrmHandle = {
  play: (audioBase64: string | null, emotion: string, text: string) => void;
  stop: () => void;
  setThinking: (thinking: boolean) => void;
};

type Props = {
  vrmUrl: string;
  backdropUrl: string | null;
  characterId: string;
  /** Old still. Shown only when this stage has no room backdrop or cached frame. */
  poster?: number;
  framing?: "bust" | "stage";
  maxPixelRatio?: number;
  /** Inside a scroll list — skip Android hardware layers that blank WebGL. */
  inList?: boolean;
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
  { vrmUrl, backdropUrl, characterId, poster, framing = "stage", maxPixelRatio = 1.5, inList = false },
  ref
) {
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [nativePlay, setNativePlay] = useState<{ id: number; uri: string } | null>(null);
  const lastAudio = useRef<string | null>(null);
  const thinkingRef = useRef(false);
  const retries = useRef(0);
  const still = useVrmStill(characterId);
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
  const source = useMemo(() => ({ html, baseUrl: API_BASE_URL }), [html]);
  const backdropUri = backdropUrl ? absUrl(backdropUrl) : null;

  useEffect(() => {
    setReady(false);
    retries.current = 0;
  }, [characterId, vrmUrl]);

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
    setThinking(thinking) {
      thinkingRef.current = thinking;
      webRef.current?.injectJavaScript(`window.mocoSetThinking && window.mocoSetThinking(${thinking ? "true" : "false"}); true;`);
    },
  }));

  const reload = () => {
    if (retries.current >= 3) return;
    retries.current += 1;
    setGeneration((n) => n + 1);
  };

  const onMessage = (event: WebViewMessageEvent) => {
    let msg: { type?: string; dataUrl?: string } | null = null;
    try {
      msg = JSON.parse(event.nativeEvent.data) as { type?: string; dataUrl?: string };
    } catch {
      return;
    }
    if (msg?.type === "ready") {
      setReady(true);
      retries.current = 0;
      if (thinkingRef.current) {
        webRef.current?.injectJavaScript("window.mocoSetThinking && window.mocoSetThinking(true); true;");
      }
    }
    if (msg?.type === "snapshot" && typeof msg.dataUrl === "string") {
      void saveVrmStill(characterId, msg.dataUrl);
    }
    if (msg?.type === "audio-fallback" && lastAudio.current) {
      setNativePlay({ id: Date.now(), uri: `data:audio/mpeg;base64,${lastAudio.current}` });
    }
    if (msg?.type === "contextlost" || msg?.type === "error") {
      reload();
    }
  };

  return (
    <View style={StyleSheet.absoluteFill} collapsable={false}>
      {still ? (
        <Image
          source={{ uri: still }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE_POLICY}
          recyclingKey={still}
          transition={0}
        />
      ) : backdropUri ? (
        <Image source={{ uri: backdropUri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy={IMAGE_CACHE_POLICY} />
      ) : poster != null ? (
        <Image source={poster} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : null}
      <WebView
        ref={webRef}
        key={`${characterId}-${generation}`}
        source={source}
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
        cacheEnabled
        cacheMode="LOAD_CACHE_ELSE_NETWORK"
        setSupportMultipleWindows={false}
        originWhitelist={["*"]}
        mixedContentMode="always"
        androidLayerType={inList ? "none" : "hardware"}
        onError={reload}
        onContentProcessDidTerminate={reload}
        onRenderProcessGone={reload}
      />
      {nativePlay ? <NativeVoice key={nativePlay.id} uri={nativePlay.uri} /> : null}
    </View>
  );
});
