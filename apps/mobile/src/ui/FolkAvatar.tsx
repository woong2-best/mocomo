import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { IMAGE_CACHE_POLICY, avatarDecodeSize } from "@/perf/image";
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
};

/**
 * Folk profile chip — terracotta fallback + pale cobalt ring, squircle only.
 */
export function FolkAvatar({ uri, name, size = 40, style, framed = true }: Props) {
  const { colors, isDark } = useTheme();
  const r = avatarSquircleRadius(size);
  const letter = (name || "?").trim().slice(0, 1).toUpperCase() || "?";
  const ring = isDark ? "rgba(107, 163, 232, 0.45)" : "rgba(168, 180, 200, 0.95)";
  const decode = avatarDecodeSize(size);

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
      {uri ? (
        <Image
          source={{ uri, width: decode, height: decode }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE_POLICY}
          recyclingKey={uri}
          transition={0}
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
