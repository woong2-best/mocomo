import Svg, { G, Path, Rect } from "react-native-svg";

type Props = {
  height?: number;
  color?: string;
};

const VIEW_W = 950;
const VIEW_H = 580;
const GF_PATH =
  "M585 248 A282 281 0 1 0 604 632 Q607 628 607 618 L606 422 Q606 411 595 411 L383 411 Q371 411 371 423 L371 498 Q371 510 383 510 L494 510 L494 578 Q494 586 486 592 A168 174 0 1 1 497 322 Q505 335 520 330 L585 273 Q596 263 585 248 Z";

/** Compact GF wordmark for GIF attach buttons. */
export function GfIcon({ height = 16, color = "#fff" }: Props) {
  const width = Math.round((height * VIEW_W) / VIEW_H);
  return (
    <Svg width={width} height={height} viewBox="70 160 950 580">
      <G fill={color}>
        <Path d={GF_PATH} />
        <Rect x="685" y="180" width="110" height="57" rx="8" />
        <Rect x="685" y="282" width="102" height="436" rx="10" />
        <Rect x="685" y="282" width="307" height="76" rx="10" />
        <Rect x="770" y="455" width="195" height="80" rx="8" />
      </G>
    </Svg>
  );
}
