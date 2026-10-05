import { useEffect, useMemo, useRef, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import type { LiveExternalInfo } from "@/api/live";
import { API_BASE_URL, APP_PACKAGE_ID } from "@/config/env";
import { liveUi } from "@/features/live/live-ui";
import { freshLiveStill, youtubeStillFromEmbed } from "@/features/live/live-still";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  external: LiveExternalInfo;
  title: string;
  posterUrl?: string | null;
  /** When false, keep the WebView mounted but paused-looking (unload source). */
  active?: boolean;
  /**
   * MoCoMo chrome under the player (provider · title). Off by default ??
   * title lives as an overlay on the video elsewhere.
   */
  showChrome?: boolean;
  /** Capture taps (e.g. open LiveDetail) instead of interacting with the embed. */
  onPress?: () => void;
  /** Local pause. YouTube uses the iframe API; other embeds pause a <video> if present. */
  paused?: boolean;
  /** Skip the poster tap and load the embed immediately. */
  startImmediately?: boolean;
};

/** YouTube Error 153 needs a real HTTPS Referer / baseUrl ??use site origin first. */
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
    u.searchParams.set("enablejsapi", "1");
    u.searchParams.set("origin", origin);
    return u.toString();
  } catch {
    return embedUrl;
  }
}

function withTwitchEmbedParams(embedUrl: string): string {
  try {
    const u = new URL(embedUrl);
    if (!u.hostname.includes("twitch.tv")) return embedUrl;
    if (!u.searchParams.has("autoplay")) u.searchParams.set("autoplay", "true");
    return u.toString();
  } catch {
    return embedUrl;
  }
}

function youtubeVideoIdFromEmbed(url: string): string | null {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    const i = parts.indexOf("embed");
    const id = i >= 0 ? parts[i + 1] : null;
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function youtubeEmbedHtml(embedUrl: string, title: string, pageOrigin: string): string {
  const safeTitle = title.replace(/[<>&"']/g, "");
  const videoId = youtubeVideoIdFromEmbed(embedUrl);
  const src = embedUrl.replace(/"/g, "&quot;");
  const apiJs = `
  var player = null;
  var done = false;
  window.__mocomoPaused = false;
  window.__mocomoSetPaused = function(paused) {
    window.__mocomoPaused = !!paused;
    if (!player) return;
    try {
      if (window.__mocomoPaused && player.pauseVideo) player.pauseVideo();
      else if (!window.__mocomoPaused && player.playVideo) player.playVideo();
    } catch (e) {}
  };
  var attempts = 0;
  var MAX = 8;
  var BEHIND = 15;
  function snap(force) {
    if (window.__mocomoPaused) return;
    if (done || !player || typeof player.seekTo !== "function") return;
    try {
      var data = player.getVideoData ? player.getVideoData() : {};
      if (data && data.isLive === false) { done = true; return; }
      var d = typeof player.getDuration === "function" ? player.getDuration() : 0;
      var t = typeof player.getCurrentTime === "function" ? player.getCurrentTime() : 0;
      if (force || !d || (d - t) > BEHIND) {
        if (!force && attempts >= MAX) { done = true; return; }
        attempts += 1;
        player.seekTo(d > 0 ? d : 1e10, true);
        if (typeof player.playVideo === "function") player.playVideo();
      } else if (d > 0) {
        done = true;
      }
    } catch (e) {}
  }
  function onYouTubeIframeAPIReady() {
    player = new YT.Player("player", {
      host: "https://www.youtube-nocookie.com",
      width: "100%",
      height: "100%",
      videoId: ${JSON.stringify(videoId ?? "")},
      playerVars: {
        autoplay: 1,
        playsinline: 1,
        modestbranding: 1,
        rel: 0,
        controls: 0,
        fs: 0,
        disablekb: 1,
        iv_load_policy: 3,
        cc_load_policy: 0,
        origin: ${JSON.stringify(pageOrigin)}
      },
      events: {
        onReady: function(e) {
          if (window.__mocomoPaused) {
            try { e.target.pauseVideo(); } catch (x) {}
            return;
          }
          snap(true);
          try { e.target.playVideo(); } catch (x) {}
        },
        onStateChange: function(e) {
          if (window.__mocomoPaused) {
            if (e.data === 1 && player && player.pauseVideo) {
              try { player.pauseVideo(); } catch (x) {}
            }
            return;
          }
          if (e.data === 1 || e.data === 3) snap(false);
        }
      }
    });
  }
  setTimeout(function(){ snap(true); }, 800);
  setTimeout(function(){ snap(false); }, 2000);
  setTimeout(function(){ snap(false); }, 4000);
  setTimeout(function(){ snap(false); }, 7000);
  `;

  if (!videoId) {
    return `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
  html,body{margin:0;padding:0;width:100%;height:100%;background:#000;overflow:hidden}
  iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
</style></head><body>
<iframe title="${safeTitle}" src="${src}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
</body></html>`;
  }

  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
  html,body,#player{margin:0;padding:0;width:100%;height:100%;background:#000;overflow:hidden}
  #player,#player iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
  .veil-br{position:absolute;right:0;bottom:0;width:96px;height:36px;background:linear-gradient(270deg,rgba(0,0,0,.55),transparent);pointer-events:none;z-index:2}
</style></head><body>
<div id="player"></div>
<div class="veil-br"></div>
<script>${apiJs}</script>
<script src="https://www.youtube.com/iframe_api"></script>
</body></html>`;
}

/**
 * External platform player only ??no chat/donation overlays on the video.
 * Mirrors web ExternalLivePlayer (iframe sibling panel pattern).
 */
function playbackJs(paused: boolean): string {
  const verb = paused ? "pause" : "play";
  return `(function(){try{if(window.__mocomoSetPaused)window.__mocomoSetPaused(${paused ? "true" : "false"});var v=document.querySelector("video");if(v&&v.${verb})v.${verb}();}catch(e){}})();true;`;
}

export function ExternalLivePlayer({
  external,
  title,
  posterUrl,
  active = true,
  showChrome = false,
  onPress,
  paused = false,
  startImmediately = false,
}: Props) {
  const { t } = useI18n();
  const copy = useMemo(() => liveUi(t), [t]);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [failed, setFailed] = useState(false);
  const [started, setStarted] = useState(startImmediately);
  const webRef = useRef<WebView>(null);
  const stillUrl = freshLiveStill(posterUrl) ?? youtubeStillFromEmbed(external.embedUrl);
  const origin = useMemo(() => embedRefererOrigin(), []);
  const rawEmbed = external.embedUrl;
  const youtube = !!rawEmbed && isYoutubeEmbed(rawEmbed);
  const embedUrl = rawEmbed
    ? youtube
      ? withYoutubeEmbedParams(rawEmbed, origin)
      : withTwitchEmbedParams(rawEmbed)
    : null;
  const showEmbed = active && started && external.embedSupported && !!embedUrl && !failed;

  useEffect(() => {
    if (startImmediately) setStarted(true);
  }, [startImmediately]);

  useEffect(() => {
    if (!showEmbed) return;
    webRef.current?.injectJavaScript(playbackJs(paused));
  }, [paused, showEmbed]);

  const source = useMemo(() => {
    if (!embedUrl) return undefined;
    if (youtube) {
      return {
        html: youtubeEmbedHtml(embedUrl, title, origin),
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
        {!started ? (
          <Pressable
            style={styles.poster}
            onPress={() => {
              if (onPress) onPress();
              else setStarted(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={copy.openLiveA11y(title)}
          >
            {stillUrl ? (
              <Image
                source={{ uri: stillUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                cachePolicy={IMAGE_CACHE_POLICY}
                transition={0}
              />
            ) : (
              <View style={styles.fallback} />
            )}
          </Pressable>
        ) : showEmbed && source ? (
          <View style={styles.webview} pointerEvents={onPress ? "none" : "auto"}>
            <WebView
              ref={webRef}
              key={`${external.provider}-${embedUrl}`}
              source={source}
              onLoadEnd={() => {
                webRef.current?.injectJavaScript(playbackJs(paused));
              }}
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
              {!active ? copy.scrollToPlay : copy.watchOnSource}
            </Text>
            {active ? (
              <Pressable
                style={styles.openBtn}
                onPress={() => void Linking.openURL(external.watchUrl).catch(() => undefined)}
              >
                <Ionicons name="open-outline" size={16} color="#111" />
                <Text style={styles.openBtnText}>{copy.openExternal}</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {onPress ? (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={copy.openLiveA11y(title)}
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
    poster: { ...StyleSheet.absoluteFill, backgroundColor: "#000" },
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
