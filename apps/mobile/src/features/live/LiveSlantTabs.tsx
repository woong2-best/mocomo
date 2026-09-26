import { memo, useMemo } from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, {
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Polygon,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import type { MobileLiveCategoryId } from "@/features/live/live-categories";

/**
 * Photo comparison (tab crop):
 * The flat bar stood the words up at 62°, parallel to a steep cut.
 * The target plates lean less: word axis ~40°, and each cut shows a
 * gray thickness instead of a hairline.
 */
const EDGE_DEG = 20;
const TEXT_DEG = 40;
const BAR_H = 108;
const DEPTH = 8;

const TAB_FONT = Platform.OS === "android" ? "sans-serif" : undefined;

const TABS: { id: MobileLiveCategoryId; label: string; weight: number }[] = [
  { id: "ALL", label: "ALL", weight: 3.4 },
  { id: "VIRTUAL", label: "FOLLOW", weight: 4.6 },
  { id: "GAME", label: "GAME", weight: 3.6 },
  { id: "JUST_CHATTING", label: "Chat", weight: 3.6 },
  { id: "IRL", label: "FESTIVAL", weight: 5.4 },
  { id: "MUSIC", label: "MUSIC", weight: 4.8 },
  { id: "LIVE", label: "R-18", weight: 5.2 },
];

type Props = {
  active: MobileLiveCategoryId;
  onSelect: (id: MobileLiveCategoryId) => void;
};

type Slot = {
  id: MobileLiveCategoryId;
  label: string;
  face: string;
  side: string;
  cx: number;
  cy: number;
  left: number;
  faceRight: number;
};

function buildSlots(screenW: number, slant: number): Slot[] {
  const sum = TABS.reduce((n, tab) => n + tab.weight, 0);
  const last = TABS.length - 1;
  let left = 0;
  return TABS.map((tab, index) => {
    const width = (screenW * tab.weight) / sum;
    const right = index === last ? screenW : left + width;
    const faceRight = index === last ? right : right - DEPTH;
    const topL = left + slant;
    const topFaceR = faceRight + slant;
    const topSideR = right + slant;
    let cx = (left + faceRight) / 2 + slant / 2;
    if (index === 0) cx = Math.max(cx, 16);
    if (index === last) cx = Math.min(cx, screenW - 18);
    const slot: Slot = {
      id: tab.id,
      label: tab.label,
      face: `${topL},0 ${topFaceR},0 ${faceRight},${BAR_H} ${left},${BAR_H}`,
      side: `${topFaceR},0 ${topSideR},0 ${right},${BAR_H} ${faceRight},${BAR_H}`,
      cx,
      cy: BAR_H / 2,
      left,
      faceRight,
    };
    left = right;
    return slot;
  });
}

function glyphsInside(slots: Slot[], fontSize: number, slant: number, screenW: number): boolean {
  const cos = Math.cos((TEXT_DEG * Math.PI) / 180);
  const sin = Math.sin((TEXT_DEG * Math.PI) / 180);
  return slots.every((slot) => {
    const halfW = (fontSize * 0.66 * slot.label.length) / 2;
    const halfH = fontSize * 0.36;
    for (const sx of [-halfW, halfW]) {
      for (const sy of [-halfH, halfH]) {
        const px = slot.cx + sx * cos + sy * sin;
        const py = slot.cy - sx * sin + sy * cos;
        const along = (BAR_H - py) / BAR_H;
        const boundL = slot.left + slant * along;
        const boundR = slot.faceRight + slant * along;
        if (py < 2 || py > BAR_H - 2 || px < boundL + 2 || px > boundR - 2 || px < 0 || px > screenW) {
          return false;
        }
      }
    }
    return true;
  });
}

function fitFont(slots: Slot[], slant: number, screenW: number): number {
  let size = 16;
  while (size > 13 && !glyphsInside(slots, size, slant, screenW)) size -= 1;
  return size;
}

const TabLabels = memo(function TabLabels({
  slots,
  fontSize,
  screenW,
}: {
  slots: Slot[];
  fontSize: number;
  screenW: number;
}) {
  return (
    <Svg width={screenW} height={BAR_H} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        {slots.map((slot) => (
          <ClipPath key={`clip-${slot.id}`} id={`liveTabClip-${slot.id}`}>
            <Polygon points={slot.face} />
          </ClipPath>
        ))}
      </Defs>
      {slots.map((slot) => (
        <G key={`label-${slot.id}`} clipPath={`url(#liveTabClip-${slot.id})`}>
          <G transform={`rotate(-${TEXT_DEG}, ${slot.cx}, ${slot.cy})`}>
            <SvgText
              x={slot.cx}
              y={slot.cy}
              dy={fontSize * 0.34}
              fill="#FFFFFF"
              fontSize={fontSize}
              fontFamily={TAB_FONT}
              fontWeight="bold"
              textAnchor="middle"
            >
              {slot.label}
            </SvgText>
          </G>
        </G>
      ))}
    </Svg>
  );
});

export const LiveSlantTabs = memo(function LiveSlantTabs({ active, onSelect }: Props) {
  const { width } = useWindowDimensions();
  const slant = Math.round(BAR_H * Math.tan((EDGE_DEG * Math.PI) / 180));
  const slots = useMemo(() => (width > 0 ? buildSlots(width, slant) : []), [width, slant]);
  const fontSize = useMemo(
    () => (slots.length > 0 ? fitFont(slots, slant, width) : 14),
    [slots, slant, width]
  );

  return (
    <View style={styles.bar}>
      <Svg width={width} height={BAR_H}>
        <Defs>
          <LinearGradient id="liveFaceBlue" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor="#071433" />
            <Stop offset="0.48" stopColor="#1436C4" />
            <Stop offset="1" stopColor="#3C82FF" />
          </LinearGradient>
          <LinearGradient id="liveBevelIdle" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#F2F2F2" />
            <Stop offset="0.28" stopColor="#8A8A8A" />
            <Stop offset="1" stopColor="#1A1A1A" />
          </LinearGradient>
          <LinearGradient id="liveBevelOn" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#F4F8FF" />
            <Stop offset="0.35" stopColor="#5C92FF" />
            <Stop offset="1" stopColor="#10245F" />
          </LinearGradient>
        </Defs>
        {slots.map((slot) => {
          const on = slot.id === active;
          return (
            <G key={`plate-${slot.id}`}>
              <Polygon
                points={slot.side}
                fill={on ? "url(#liveBevelOn)" : "url(#liveBevelIdle)"}
                onPress={() => onSelect(slot.id)}
              />
              <Polygon
                points={slot.face}
                fill={on ? "url(#liveFaceBlue)" : "#070708"}
                onPress={() => onSelect(slot.id)}
              />
            </G>
          );
        })}
      </Svg>
      <TabLabels slots={slots} fontSize={fontSize} screenW={width} />
    </View>
  );
});

const styles = StyleSheet.create({
  bar: {
    height: BAR_H,
    backgroundColor: "#000",
    overflow: "hidden",
  },
});
