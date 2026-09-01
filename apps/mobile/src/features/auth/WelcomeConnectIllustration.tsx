import Svg, { Path } from "react-native-svg";

/** White line-art “connect” motif — fills the welcome hero gap on dark login. */
export function WelcomeConnectIllustration({
  width = 280,
  height = 120,
  color = "rgba(245, 240, 232, 0.92)",
}: {
  width?: number;
  height?: number;
  color?: string;
}) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 120" accessibilityElementsHidden>
      <Path
        d="M18 92c18-34 44-58 78-68 8-2 14 4 12 12-12 42-8 64 18 78-22-4-38-12-52-22-8-6-14-14-18-22-4 8-10 16-18 22-12 10-28 18-52 22 26-14 30-36 18-78-2-8 4-14 12-12 34 10 60 34 78 68"
        fill="none"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M262 92c-18-34-44-58-78-68-8-2-14 4-12 12 12 42 8 64-18 78 22-4 38-12 52-22 8-6 14-14 18-22 4 8 10 16 18 22 12 10 28 18 52 22-26-14-30-36-18-78 2-8-4-14-12-12-34 10-60 34-78 68"
        fill="none"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M118 58c8-10 18-16 22-16s14 6 22 16"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M140 58c-8-10-18-16-22-16s-14 6-22 16"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
