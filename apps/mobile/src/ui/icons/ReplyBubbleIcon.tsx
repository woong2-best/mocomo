import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/theme/ThemeContext";

type Props = {
  size?: number;
  color?: string;
};

/** 답글 곡선 화살표 — 다크: 흰색, 라이트: 검정 */
export function ReplyBubbleIcon({ size = 16, color }: Props) {
  const { colors } = useTheme();
  const stroke = color ?? colors.text;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6m-6-6l6-6"
        stroke={stroke}
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
