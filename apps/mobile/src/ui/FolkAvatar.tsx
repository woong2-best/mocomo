import { useEffect, useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Image, type ImageProps } from "expo-image";
import { IMAGE_CACHE_POLICY, avatarImageSource } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";

/** Squircle radius ≈ 28% of edge — never a circle (50%). */
export function avatarSquircleRadius(size: number): number {
  return Math.max(8, Math.round(size * 0.28));
}

type Props = {
  uri?: string | null;
  name?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** Soft pale cobalt frame around the squircle */
  framed?: boolean;
  priority?: ImageProps["priority"];
};

/**
 * Folk profile chip — terracotta fallback + pale cobalt ring, squircle only.
 */
export function FolkAvatar({
  uri,
  name,
  size = 40,
  style,
  framed = true,
  priority = "normal",
}: Props) {
  const { colors, isDark } = useTheme();
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    setImageFailed(false);
  }, [uri]);
  const r = avatarSquircleRadius(size);
  const letter = (name || "?").trim().slice(0, 1).toUpperCase() || "?";
  const ring = isDark ? "rgba(107, 163, 232, 0.45)" : "rgba(168, 180, 200, 0.95)";
  const showPhoto = Boolean(uri?.trim()) && !imageFailed;

  const inner = (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: r,
          overflow: "hidden",
          backgroundColor: colors.terracotta,
          alignItems: "center",
          justifyContent: "center",
        },
        !framed && style,
      ]}
    >
      {showPhoto ? (
        <Image
          source={avatarImageSource(uri!.trim())}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE_POLICY}
          recyclingKey={uri!.trim()}
          priority={priority}
          transition={0}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Text
          style={{
            color: "#fff",
            fontWeight: "800",
            fontSize: Math.round(size * 0.42),
          }}
        >
          {letter}
        </Text>
      )}
    </View>
  );

  if (!framed) return inner;

  return (
    <View
      style={[
        {
          padding: 2,
          borderRadius: r + 2,
          borderWidth: 2,
          borderColor: ring,
          backgroundColor: colors.background,
        },
        style,
      ]}
    >
      {inner}
    </View>
  );
}
