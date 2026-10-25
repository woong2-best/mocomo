import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  NOTE_LINE_PX,
  NOTE_PAD_BOTTOM_PX,
  NOTE_PAD_LEFT_PX,
  NOTE_PAD_RIGHT_PX,
  NOTE_PAD_TOP_PX,
} from "@/features/reels/reel-note-pages";

const MAX_LINE_PX = 96;

/** Ruled note filling the reel. `text` is already split to one page. */
export function ReelNotePage({ text }: { text: string }) {
  const lines = Math.max(1, text.split("\n").length);
  const [linePx, setLinePx] = useState(NOTE_LINE_PX);
  const [ruleCount, setRuleCount] = useState(24);
  return (
    <View style={styles.fill}>
      <View
        style={styles.paper}
        onLayout={(e) => {
          const textH = e.nativeEvent.layout.height - NOTE_PAD_TOP_PX - NOTE_PAD_BOTTOM_PX;
          const next = Math.min(MAX_LINE_PX, Math.max(NOTE_LINE_PX, textH / lines));
          setLinePx((prev) => (Math.abs(prev - next) < 0.4 ? prev : next));
          const count = Math.max(8, Math.ceil((e.nativeEvent.layout.height - NOTE_PAD_TOP_PX) / next));
          setRuleCount((prev) => (prev === count ? prev : count));
        }}
      >
        {Array.from({ length: ruleCount }, (_, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={[styles.rule, { top: NOTE_PAD_TOP_PX + (i + 1) * linePx }]}
          />
        ))}
        <Text
          style={[
            styles.body,
            { lineHeight: linePx, fontSize: 17 },
          ]}
        >
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#14110e",
  },
  paper: {
    position: "absolute",
    top: 12,
    right: 12,
    bottom: 12,
    left: 12,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: "#f6f1e4",
  },
  rule: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(90,62,28,0.28)",
  },
  body: {
    paddingTop: NOTE_PAD_TOP_PX,
    paddingLeft: NOTE_PAD_LEFT_PX,
    paddingRight: NOTE_PAD_RIGHT_PX,
    color: "#221c16",
    fontWeight: "500",
  },
});
