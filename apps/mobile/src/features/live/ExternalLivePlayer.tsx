import { useMemo, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import type { LiveExternalInfo } from "@/api/live";
import { API_BASE_URL, APP_PACKAGE_ID } from "@/config/env";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  external: LiveExternalInfo;
  title: string;
  /** When false, keep the WebView mounted but paused-looking (unload source). */
  active?: boolean;
  /**
   * MoCoMo chrome under the player (provider · title). Off by default —
   * title lives as an overlay on the video elsewhere.
   */
  showChrome?: boolean;
  /** Capture taps (e.g. open LiveDetail) instead of interacting with the embed. */
  onPress?: () => void;
};

/** YouTube Error 153 needs a real HTTPS Referer / baseUrl — use site origin first. */
function embedRefererOrigin(): string {
  try {
    const u = new URL(API_BASE_URL);
    if (u.protocol === "https:" || u.protocol === "http:") {
      return u.origin;
    }
  } catch {
    /* fall through */
  }
  return `https://${APP_PACKAGE_ID}`;
}

function isYoutubeEmbed(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "youtube.com" || host === "youtube-nocookie.com";
  } catch {
    return /youtube(-nocookie)?\.com\/embed\//i.test(url);
  }
}

function withYoutubeEmbedParams(embedUrl: string, origin: string): string {
  try {
    const u = new URL(embedUrl);
    if (!u.searchParams.has("playsinline")) u.searchParams.set("playsinline", "1");
    if (!u.searchParams.has("autoplay")) u.searchParams.set("autoplay", "1");
    if (!u.searchParams.has("rel")) u.searchParams.set("rel", "0");
    // Hide YouTube player chrome as much as the embed API allows.
    u.searchParams.set("modestbranding", "1");
    u.searchParams.set("controls", "0");
    u.searchParams.set("iv_load_policy", "3");
    u.searchParams.set("fs", "0");
    u.searchParams.set("disablekb", "1");
    u.searchParams.set("cc_load_policy", "0");
    if (!u.searchParams.has("enablejsapi")) u.searchParams.set("enablejsapi", "1");
    u.searchParams.set("origin", origin);
    return u.toString();
  } catch {
    return embedUrl;
  }
}

function youtubeEmbedHtml(embedUrl: string, title: string): string {
  const safeTitle = title.replace(/[<>&"']/g, "");
  const src = embedUrl.replace(/"/g, "&quot;");
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
  html,body{margin:0;padding:0;width:100%;height:100%;background:#000;overflow:hidden}
  iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
  /* Cover residual YouTube watermark only — no solid black panels */
  .veil-br{position:absolute;right:0;bottom:0;width:96px;height:36px;background:linear-gradient(270deg,rgba(0,0,0,.55),transparent);pointer-events:none;z-index:2}
</style></head><body>
<iframe
  title="${safeTitle}"
  src="${src}"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
  allowfullscreen
  referrerpolicy="strict-origin-when-cross-origin"
></iframe>
<div class="veil-br"></div>
</body></html>`;
}

/**
 * External platform player only — no chat/donation overlays on the video.
 * Mirrors web ExternalLivePlayer (iframe sibling panel pattern).
 */
export function ExternalLivePlayer({
  external,
  title,
  active = true,
  showChrome = false,
  onPress,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [failed, setFailed] = useState(false);
  const origin = useMemo(() => embedRefererOrigin(), []);
  const rawEmbed = external.embedUrl;
  const youtube = !!rawEmbed && isYoutubeEmbed(rawEmbed);
  const embedUrl = rawEmbed
    ? youtube
      ? withYoutubeEmbedParams(rawEmbed, origin)
      : rawEmbed
    : null;
  const showEmbed = active && external.embedSupported && !!embedUrl && !failed;

  const source = useMemo(() => {
    if (!embedUrl) return undefined;
    if (youtube) {
      return {
        html: youtubeEmbedHtml(embedUrl, title),
        baseUrl: origin.endsWith("/") ? origin : `${origin}/`,
      };
    }
    return {
      uri: embedUrl,
      headers: {
        Referer: origin,
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
    };
  }, [embedUrl, origin, title, youtube]);

  return (
    <View style={[styles.wrap, !showChrome && styles.wrapFill]}>
      <View style={!showChrome ? styles.playerFill : styles.player}>
        {showEmbed && source ? (
          <View style={styles.webview} pointerEvents={onPress ? "none" : "auto"}>
            <WebView
              key={`${external.provider}-${embedUrl}`}
              source={source}
              style={styles.webview}
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              setSupportMultipleWindows={false}
              originWhitelist={["*"]}
              mixedContentMode="always"
              onHttpError={() => setFailed(true)}
              onError={() => setFailed(true)}
              userAgent={
                Platform.OS === "ios"
                  ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
                  : "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
              }
            />
          </View>
        ) : (
          <View style={styles.fallback}>
            <Text style={styles.fallbackText}>
              {!active ? "스크롤하면 재생됩니다" : "원본 페이지에서 시청해 주세요."}
            </Text>
            {active ? (
              <Pressable
                style={styles.openBtn}
                onPress={() => void Linking.openURL(external.watchUrl).catch(() => undefined)}
              >
                <Ionicons name="open-outline" size={16} color="#111" />
                <Text style={styles.openBtnText}>새 창에서 시청하기</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {onPress ? (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${title} 라이브 열기`}
          />
        ) : null}
      </View>
    </View>
  );
}

function createStyles(_colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      overflow: "hidden",
      backgroundColor: "#000",
      width: "100%",
      borderRadius: 12,
    },
    wrapFill: {
      ...StyleSheet.absoluteFill,
      borderRadius: 0,
    },
    player: {
      width: "100%",
      aspectRatio: 16 / 9,
      backgroundColor: "#000",
    },
    playerFill: {
      flex: 1,
      width: "100%",
      height: "100%",
      backgroundColor: "#000",
    },
    webview: { flex: 1, backgroundColor: "#000", opacity: 0.99 },
    fallback: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
      gap: 14,
      backgroundColor: "#000",
    },
    fallbackText: {
      color: "rgba(255,255,255,0.8)",
      fontSize: 13,
      fontWeight: "600",
      textAlign: "center",
      lineHeight: 20,
    },
    openBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#fff",
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    openBtnText: { color: "#111", fontWeight: "800", fontSize: 13 },
  });
}
