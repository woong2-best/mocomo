import { Image } from "expo-image";

type Props = {
  height?: number;
  color?: string;
};

const VIEW_W = 950;
const VIEW_H = 580;
const GF_MARK = require("./gf-mark.png");

/** Compact GF wordmark for GIF attach buttons (PNG — SVG arcs crash Android native). */
export function GfIcon({ height = 16, color = "#fff" }: Props) {
  const width = Math.round((height * VIEW_W) / VIEW_H);
  return (
    <Image
      source={GF_MARK}
      style={{ width, height, tintColor: color }}
      contentFit="contain"
      accessibilityLabel="GIF"
    />
  );
}
