import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { IMAGE_CACHE_POLICY, feedMediaDecodeWidth } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";

type Props = {
  posterUrl: string | null;
  width: number;
};

/** Poster-only hero thumb — no native video (prevents ExoPlayer crashes on hub). */
export function LiveHeroPreviewPoster({ posterUrl, width }: Props) {
  const { colors } = useTheme();
  const decode = feedMediaDecodeWidth(width);

  if (posterUrl) {
    return (
      <Image
        source={{ uri: posterUrl, width: decode, height: Math.round(decode * (9 / 16)) }}
        style={styles.media}
        contentFit="cover"
        cachePolicy={IMAGE_CACHE_POLICY}
        recyclingKey={posterUrl}
        transition={0}
      />
    );
  }

  return (
    <View style={[styles.media, styles.fallback]}>
      <Ionicons name="radio" size={48} color={colors.terracotta} style={{ opacity: 0.4 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  media: { width: "100%", height: "100%" },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
});
