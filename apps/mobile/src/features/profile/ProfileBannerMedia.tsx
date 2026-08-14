import { useEffect, useMemo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { type ThemeColors } from "@/theme/tokens";

type Props = {
  bannerUrl?: string | null;
  bannerVideoUrl?: string | null;
  /** When false, pause video (e.g. drawer closed). Default true. */
  active?: boolean;
  style?: StyleProp<ViewStyle>;
};

function hasVideo(url?: string | null): boolean {
  return Boolean(url?.trim());
}

function bannerImageUrl(bannerUrl?: string | null, bannerVideoUrl?: string | null): string | null {
  if (hasVideo(bannerVideoUrl)) return null;
  const url = bannerUrl?.trim();
  return url || null;
}

export function ProfileBannerMedia({
  bannerUrl,
  bannerVideoUrl,
  active = true,
  style,
}: Props) {
  const { colors, isDark } = useTheme();
  const fallback = useMemo(() => createFallbackStyles(colors, isDark), [colors, isDark]);
  const videoSrc = hasVideo(bannerVideoUrl) ? bannerVideoUrl!.trim() : null;
  const imageSrc = bannerImageUrl(bannerUrl, bannerVideoUrl);
  const shouldPlay = Boolean(videoSrc) && active;

  const player = useVideoPlayer(shouldPlay ? videoSrc : null, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    if (!shouldPlay) {
      try {
        player.pause();
      } catch {
        /* player may not be ready */
      }
      return;
    }
    try {
      player.play();
    } catch {
      /* autoplay may fail until visible */
    }
  }, [player, shouldPlay]);

  return (
    <View style={[StyleSheet.absoluteFill, style]}>
      {videoSrc ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          allowsPictureInPicture={false}
        />
      ) : imageSrc ? (
        <Image
          source={{ uri: imageSrc }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE_POLICY}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, fallback.root]}>
          <View style={fallback.wash} />
        </View>
      )}
    </View>
  );
}

function createFallbackStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    root: {
      backgroundColor: isDark ? "#18243A" : colors.surfaceRaised,
    },
    wash: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(207, 102, 64, 0.12)",
    },
  });
}
