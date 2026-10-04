import Svg, { Path } from "react-native-svg";

/** Official YouTube mark — same paths as web `/brand/youtube.svg`. */
export function YoutubeMark({ height = 28 }: { height?: number }) {
  const width = (height * 68) / 48;
  return (
    <Svg width={width} height={height} viewBox="0 0 68 48">
      <Path
        fill="#FF0000"
        d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55C3.97 2.33 2.26 4.81 1.48 7.74.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z"
      />
      <Path fill="#FFFFFF" d="M45 24 27 14v20" />
    </Svg>
  );
}

/** Official Twitch mark — same paths as web `/brand/twitch.svg`. */
export function TwitchMark({ height = 28 }: { height?: number }) {
  const width = (height * 256) / 268;
  return (
    <Svg width={width} height={height} viewBox="0 0 256 268">
      <Path
        fill="#9146FF"
        d="M17.458 0 0 46.176V240.87h63.81v24.015h38.345l38.116-38.116h58.453L256 146.098V0H17.458zm231.397 134.098-38.116 38.116H132.205l-33.017 33.017v-33.017H36.349V17.458h212.506v116.64z"
      />
      <Path
        fill="#FFFFFF"
        d="M185.762 46.176h-31.019v69.359h31.019V46.176zm-82.688 0H72.055v69.359h31.019V46.176z"
      />
    </Svg>
  );
}
