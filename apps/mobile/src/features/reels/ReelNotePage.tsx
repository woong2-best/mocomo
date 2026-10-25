import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { NOTE_LINE_PX, NOTE_PAD_BOTTOM_PX, NOTE_PAD_LEFT_PX, NOTE_PAD_RIGHT_PX, NOTE_PAD_TOP_PX } from "@/features/reels/reel-note-pages";

const LINE = NOTE_LINE_PX;

/** Ruled note filling the reel. `text` is already split to one page. */
export function ReelNotePage({ text }: { text: string }) {
  const [ruleCount, setRuleCount] = useState(24);
  return (
    <View style={styles.fill}>
      <View
        style={styles.paper}
        onLayout={(e) => {
          const count = Math.max(8, Math.ceil((e.nativeEvent.layout.height - NOTE_PAD_TOP_PX) / LINE));
          setRuleCount((prev) => (prev === count ? prev : count));
        }}
      >
        {Array.from({ length: ruleCount }, (_, i) => (
          <View key={i} pointerEvents="none" style={[styles.rule, { top: NOTE_PAD_TOP_PX + (i + 1) * LINE }]} />
        ))}
        <Text style={styles.body}>{text}</Text>
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
    paddingBottom: NOTE_PAD_BOTTOM_PX,
    color: "#221c16",
    fontSize: 17,
    lineHeight: LINE,
    fontWeight: "500",
  },
});
