import { Image } from "react-native";

type Props = {
  height?: number;
  color?: string;
};

const VIEW_W = 950;
const VIEW_H = 580;

/**
 * Compact GF wordmark. PNG + tintColor — SVG elliptical arcs crash
 * Android's native renderer when drawn through react-native-svg.
 */
export function GfIcon({ height = 14, color = "#fff" }: Props) {
  const width = Math.round((height * VIEW_W) / VIEW_H);
  return (
    <Image
      source={require("./gf-mark.png")}
      style={{ width, height, tintColor: color }}
      resizeMode="contain"
    />
  );
}
