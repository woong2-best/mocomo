import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NOTE_LINE_PX, noteSafePads } from "@/features/reels/reel-note-pages";

const MAX_LINE_PX = 96;

const EMOJI_RE =
  /(\p{Extended_Pictographic}(?:\uFE0F|\u20E3)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\u20E3)?)*)/gu;

/** Black note. Typed glyphs stay inside the chrome-safe box. */
export function ReelNotePage({ text }: { text: string }) {
  const insets = useSafeAreaInsets();
  const pads = useMemo(() => noteSafePads(insets.top), [insets.top]);
  const lines = Math.max(1, text.split("\n").length);
  const [linePx, setLinePx] = useState(NOTE_LINE_PX);
  return (
    <View style={styles.fill}>
      <View
        style={[
          styles.safe,
          {
            top: pads.top,
            right: pads.right,
            bottom: pads.bottom,
            left: pads.left,
          },
        ]}
        onLayout={(e) => {
          const textH = e.nativeEvent.layout.height;
          const next = Math.min(MAX_LINE_PX, Math.max(NOTE_LINE_PX, textH / lines));
          setLinePx((prev) => (Math.abs(prev - next) < 0.4 ? prev : next));
        }}
      >
        <Text style={[styles.body, { lineHeight: linePx }]}>
          {text.split(EMOJI_RE).map((part, i) =>
            i % 2 === 1 ? (
              <Text key={i}>{part}</Text>
            ) : (
              <Text key={i} style={styles.plain}>
                {part}
              </Text>
            )
          )}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000",
  },
  safe: {
    position: "absolute",
    overflow: "hidden",
  },
  body: {
    width: "100%",
    fontSize: 17,
    fontWeight: "500",
  },
  plain: {
    color: "#fff",
  },
});
