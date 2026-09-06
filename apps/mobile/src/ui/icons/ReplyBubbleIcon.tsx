import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/theme/ThemeContext";

type Props = {
  size?: number;
  color?: string;
};

/** 답글 말풍선 — 다크: 흰색, 라이트: 검정 (theme text) */
export function ReplyBubbleIcon({ size = 16, color }: Props) {
  const { colors } = useTheme();
  const stroke = color ?? colors.text;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 3.75h10a2.75 2.75 0 0 1 2.75 2.75v6.75A2.75 2.75 0 0 1 17 16H11.8L8.2 19.4V16H7A2.75 2.75 0 0 1 4.25 13.25V6.5A2.75 2.75 0 0 1 7 3.75Z"
        stroke={stroke}
        strokeWidth={1.85}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}
