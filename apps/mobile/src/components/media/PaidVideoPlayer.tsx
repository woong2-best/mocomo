import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import type { FeedMedia } from "@/api/feed";
import { getAccessToken } from "@/auth/token-store";
import {
  fetchWatermarkConfig,
  isPaidPlaybackPath,
  resolveAbsolutePlaybackUrl,
} from "@/api/watermark";
import { ForensicPaidVideoEmbed } from "@/components/media/ForensicPaidVideoEmbed";

type Props = {
  media: FeedMedia;
  active: boolean;
  muted?: boolean;
  contentFit?: "contain" | "cover";
  style?: object;
};

export function PaidVideoPlayer({
  media,
  active,
  muted = true,
  contentFit = "cover",
  style,
}: Props) {
  const [forensicEnabled, setForensicEnabled] = useState(false);
  const paid = isPaidPlaybackPath(media.url) || (media.priceKrw ?? 0) > 0;
  const locked = Boolean(media.locked);
  const mediaId = media.id?.trim() || null;

  useEffect(() => {
    if (!paid || locked) return;
    let cancelled = false;
    void fetchWatermarkConfig()
      .then((cfg) => {
        if (!cancelled) setForensicEnabled(cfg.enabled);
      })
      .catch(() => {
        if (!cancelled) setForensicEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, [paid, locked]);

  const absoluteSrc = useMemo(
    () => (media.url?.trim() ? resolveAbsolutePlaybackUrl(media.url.trim()) : ""),
    [media.url]
  );

  const [authHeader, setAuthHeader] = useState<Record<string, string> | undefined>();

  useEffect(() => {
    if (!paid || locked || forensicEnabled) return;
    void getAccessToken().then((token) => {
      if (token) setAuthHeader({ Authorization: `Bearer ${token}` });
    });
  }, [paid, locked, forensicEnabled]);

  if (locked || !absoluteSrc) {
    return <View style={[styles.blocked, style]} />;
  }

  if (forensicEnabled && mediaId) {
    return <ForensicPaidVideoEmbed mediaId={mediaId} style={style} />;
  }

  return (
    <NativePaidVideo
      src={absoluteSrc}
      active={active}
      muted={muted}
      contentFit={contentFit}
      headers={paid ? authHeader : undefined}
      style={style}
    />
  );
}

function NativePaidVideo({
  src,
  active,
  muted,
  contentFit,
  headers,
  style,
}: {
  src: string;
  active: boolean;
  muted: boolean;
  contentFit: "contain" | "cover";
  headers?: Record<string, string>;
  style?: object;
}) {
  const source = active ? { uri: src, headers } : null;
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = muted;
  });

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  useEffect(() => {
    if (!active) {
      try {
        player.pause();
      } catch {
        // ignore
      }
      return;
    }
    try {
      player.play();
    } catch {
      // ignore
    }
    return () => {
      try {
        player.pause();
      } catch {
        // ignore
      }
    };
  }, [active, player]);

  if (!active) return null;

  return (
    <VideoView
      player={player}
      style={[StyleSheet.absoluteFill, style]}
      contentFit={contentFit}
      nativeControls={false}
    />
  );
}

const styles = StyleSheet.create({
  blocked: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#111",
  },
});
