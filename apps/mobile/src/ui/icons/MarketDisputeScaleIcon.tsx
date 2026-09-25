import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "@/theme/ThemeContext";

type Props = {
  /** Visual height; width follows the wide scale aspect ratio. */
  size?: number;
  color?: string;
};

/**
 * 분쟁(저울) — 라인 아트. 라이트: brand stroke, 다크: cream text stroke.
 */
export function MarketDisputeScaleIcon({ size = 26, color }: Props) {
  const { colors, isDark } = useTheme();
  const stroke = color ?? (isDark ? colors.text : colors.brand);
  const width = Math.round(size * 1.42);
  const height = size;
  const sw = 1.45;

  return (
    <Svg width={width} height={height} viewBox="0 0 54 36" fill="none">
      <Path
        d="M7 11 Q27 7 47 11"
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={7} cy={11} r={2} stroke={stroke} strokeWidth={sw} />
      <Circle cx={47} cy={11} r={2} stroke={stroke} strokeWidth={sw} />
      <Path d="M9 12.5 L19 27 M13 12.5 L19 27" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      <Path d="M45 12.5 L35 27 M41 12.5 L35 27" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      <Path
        d="M12 27 A7 7 0 0 0 26 27"
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <Path
        d="M28 27 A7 7 0 0 0 42 27"
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
      />
    </Svg>
  );
}
