import { memo } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { IMAGE_CACHE_POLICY, avatarDecodeSize } from "@/perf/image";

const ORANGE_JELLY = "rgba(207, 102, 64, 0.85)";
const RIM = "rgba(255, 255, 255, 0.78)";
const RIM_SOFT = "rgba(255, 255, 255, 0.28)";

type Props = {
  glyph: string;
  image?: string | null;
  size?: number;
  /** Extra glass base layers under the top cover (stack depth). */
  depthLayers?: 1 | 2 | 3;
  style?: StyleProp<ViewStyle>;
};

/**
 * High-end acrylic/glass sandwich chip — translucent orange jelly top cover,
 * stacked clear base layers, sharp rim lighting. Nintendo Switch cartridge DNA.
 */
export const GlassCartridgeChip = memo(function GlassCartridgeChip({
  glyph,
  image,
  size = 56,
  depthLayers = 2,
  style,
}: Props) {
  const r = Math.round(size * 0.28);
  const decode = avatarDecodeSize(size);
  const layerGap = Math.max(3, Math.round(size * 0.07));
  const stackPad = depthLayers * layerGap;

  return (
    <View style={[{ width: size, height: size + stackPad }, style]}>
      {Array.from({ length: depthLayers }, (_, i) => {
        const depth = depthLayers - i;
        return (
          <View
            key={`base-${depth}`}
            pointerEvents="none"
            style={[
              styles.baseLayer,
              {
                width: size,
                height: size,
                borderRadius: r,
                top: depth * layerGap,
                opacity: 0.22 + i * 0.12,
                transform: [{ scale: 1 - depth * 0.02 }],
              },
            ]}
          />
        );
      })}

      <View
        style={[
          styles.shell,
          {
            width: size,
            height: size,
            borderRadius: r,
            top: 0,
          },
        ]}
      >
        {/* Solid orange bed under glass */}
        <View style={[styles.orangeBed, { borderRadius: r }]} />

        <View style={[styles.topCover, { borderRadius: r }]}>
          <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[styles.jellyWash, { borderRadius: r }]} />

          {/* Rim highlight — top/left bright, bottom/right soft */}
          <View
            pointerEvents="none"
            style={[
              styles.rim,
              {
                borderRadius: r,
                borderTopColor: RIM,
                borderLeftColor: RIM,
                borderRightColor: RIM_SOFT,
                borderBottomColor: "rgba(255,255,255,0.12)",
              },
            ]}
          />

          {/* Inner lip / recessed tray */}
          <View
            pointerEvents="none"
            style={[
              styles.innerLip,
              {
                borderRadius: Math.max(6, r - 4),
                margin: Math.max(4, Math.round(size * 0.08)),
              },
            ]}
          />

          {/* Specular shine */}
          <View
            pointerEvents="none"
            style={[
              styles.shine,
              {
                height: Math.round(size * 0.28),
                borderBottomLeftRadius: size,
                borderBottomRightRadius: size,
              },
            ]}
          />

          {image ? (
            <Image
              source={{ uri: image, width: decode, height: decode }}
              style={[
                styles.faceImage,
                {
                  width: size * 0.62,
                  height: size * 0.62,
                  borderRadius: Math.round(size * 0.18),
                },
              ]}
              contentFit="cover"
              cachePolicy={IMAGE_CACHE_POLICY}
              recyclingKey={image}
              transition={0}
            />
          ) : (
            <Text
              style={[
                styles.glyph,
                {
                  fontSize: Math.round(size * 0.42),
                  textShadowRadius: Math.round(size * 0.18),
                },
              ]}
            >
              {glyph}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  baseLayer: {
    position: "absolute",
    left: 0,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1.2,
    borderColor: "rgba(255,255,255,0.35)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 3,
  },
  shell: {
    position: "absolute",
    left: 0,
    overflow: "visible",
  },
  orangeBed: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#CF6640",
  },
  topCover: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  jellyWash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: ORANGE_JELLY,
  },
  rim: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1.6,
  },
  innerLip: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.18)",
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  shine: {
    position: "absolute",
    top: 0,
    left: "12%",
    right: "12%",
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  faceImage: {
    zIndex: 2,
  },
  glyph: {
    zIndex: 2,
    color: "#fff",
    fontWeight: "900",
    textShadowColor: "rgba(255,255,255,0.85)",
    textShadowOffset: { width: 0, height: 0 },
  },
});
