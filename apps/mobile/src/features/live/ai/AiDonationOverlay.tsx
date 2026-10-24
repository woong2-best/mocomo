import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { useAudioPlayer } from "expo-audio";
import { fetchLiveNow, type LiveNowDonation } from "@/api/live";
import { API_BASE_URL } from "@/config/env";

function youtubeEmbed(item: LiveNowDonation): string | null {
  if (!item.videoId) return null;
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "0",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });
  const start = Math.max(0, Math.floor(item.startSec || 0));
  if (start > 0) params.set("start", String(start));
  if (item.endSec != null && item.endSec > start) {
    params.set("end", String(Math.floor(item.endSec)));
  }
  return `https://www.youtube.com/embed/${encodeURIComponent(item.videoId)}?${params.toString()}`;
}

function sfxUrl(src: string | null): string | null {
  if (!src) return null;
  if (src.startsWith("http")) return src;
  return `${API_BASE_URL}${src}`;
}

function SfxPlayer({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri);
  useEffect(() => {
    player.play();
  }, [player]);
  return null;
}

/** Left-of-avatar donation + video donation, same clock as the website room. */
export function AiDonationOverlay({ channelId }: { channelId: string }) {
  const [current, setCurrent] = useState<LiveNowDonation | null>(null);

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const res = await fetchLiveNow(channelId);
        if (!alive) return;
        const next = res.current ?? null;
        setCurrent((prev) => (prev?.id === next?.id ? prev : next));
      } catch {
        /* room stays up if the clock misses */
      }
    };
    void pull();
    const id = setInterval(() => void pull(), 2000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [channelId]);

  if (!current) return null;

  const name = current.username.replace(/^@/, "");
  const embed = current.type === "VIDEO" ? youtubeEmbed(current) : null;

  const sfx = current.type === "SFX" ? sfxUrl(current.sfxSrc) : null;

  return (
    <View pointerEvents="none" style={styles.wrap}>
      {sfx ? <SfxPlayer key={current.id} uri={sfx} /> : null}
      {embed ? (
        <WebView
          source={{ uri: embed }}
          style={styles.video}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
        />
      ) : null}
      <View style={styles.caption}>
        <Text style={styles.line}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.body}> sent </Text>
          <Text style={styles.moco}>{current.mocoLabel} MOCO</Text>
        </Text>
        {current.message ? (
          <Text style={styles.message} numberOfLines={3}>
            {current.message}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "38%",
    maxWidth: 220,
    justifyContent: "flex-end",
    padding: 8,
  },
  video: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    aspectRatio: 16 / 9,
    backgroundColor: "transparent",
  },
  caption: { gap: 4 },
  line: { color: "#fff" },
  name: { color: "#5dff6a", fontWeight: "800" },
  body: { color: "#fff", fontWeight: "800" },
  moco: { color: "#ffe44d", fontWeight: "800" },
  message: { color: "#fff", fontWeight: "700", textShadowColor: "#000", textShadowRadius: 4 },
});
