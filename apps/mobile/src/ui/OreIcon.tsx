import { useId } from "react";
import { Image } from "expo-image";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

/** Parity with web `OreIcon` + `/support/tiers` hero halo (radial fade, not a flat tint disk). */
export function OreIcon({
  uri,
  size,
  haloColor,
  shadow = "sm",
  style,
}: {
  uri: string;
  size: number;
  /** Tier accent — soft radial glow behind icon (hero only). */
  haloColor?: string;
  shadow?: "sm" | "lg" | "none";
  style?: ViewStyle;
}) {
  const gradId = useId().replace(/:/g, "");
  const pad = haloColor ? Math.round(size * 0.28) : 0;
  const box = size + pad * 2;

  const shadowStyle =
    shadow === "none"
      ? undefined
      : shadow === "lg"
        ? Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.22,
              shadowRadius: 10,
            },
            android: { elevation: 5 },
          })
        : Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.12,
              shadowRadius: 2,
            },
            android: { elevation: 1 },
          });

  return (
    <View style={[{ width: box, height: box, alignItems: "center", justifyContent: "center" }, style]}>
      {haloColor ? (
        <Svg width={box} height={box} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <RadialGradient id={gradId} cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor={haloColor} stopOpacity={0.13} />
              <Stop offset="70%" stopColor={haloColor} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={box / 2} cy={box / 2} r={box / 2} fill={`url(#${gradId})`} />
        </Svg>
      ) : null}
      <Image source={{ uri }} style={[{ width: size, height: size }, shadowStyle]} contentFit="contain" />
    </View>
  );
}
