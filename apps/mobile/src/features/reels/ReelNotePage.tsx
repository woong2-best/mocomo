import { useMemo, useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  NOTE_LINE_PX,
  notePageBudget,
  noteSafePads,
  wrapReelNoteVisual,
} from "@/features/reels/reel-note-pages";

const MAX_LINE_PX = 96;

function splitEmojiParts(line: string): string[] {
  try {
    return line.split(
      /(\p{Extended_Pictographic}(?:\uFE0F|\u20E3)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\u20E3)?)*)/gu
    );
  } catch {
    return [line];
  }
}

function renderLine(line: string, key: string) {
  return splitEmojiParts(line).map((part, i) =>
    i % 2 === 1 ? (
      <Text key={`${key}-${i}`}>{part}</Text>
    ) : (
      <Text key={`${key}-${i}`} style={styles.plain}>
        {part}
      </Text>
    )
  );
}

/** Black note. One measured column; lines cannot paint under Reels chrome. */
export function ReelNotePage({ text }: { text: string }) {
  const insets = useSafeAreaInsets();
  const pads = useMemo(() => noteSafePads(insets.top), [insets.top]);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const onColumnLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    const h = Math.round(e.nativeEvent.layout.height);
    if (w < 8 || h < 8) return;
    setBox((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
  };

  const budget = useMemo(
    () =>
      box.w > 0
        ? {
            ...notePageBudget(
              box.w + pads.left + pads.right,
              box.h + pads.top + pads.bottom,
              pads
            ),
            lineWidthPx: box.w,
          }
        : null,
    [box.h, box.w, pads]
  );
  const lines = useMemo(
    () => (budget ? wrapReelNoteVisual(text, budget) : []),
    [budget, text]
  );
  const linePx =
    box.h > 0 && lines.length > 0
      ? Math.min(MAX_LINE_PX, Math.max(NOTE_LINE_PX, box.h / lines.length))
      : NOTE_LINE_PX;

  return (
    <View
      style={[
        styles.fill,
        {
          paddingTop: pads.top,
          paddingRight: pads.right,
          paddingBottom: pads.bottom,
          paddingLeft: pads.left,
        },
      ]}
    >
      <View style={styles.column} onLayout={onColumnLayout}>
        {lines.map((line, i) => (
          <Text
            key={`${box.w}:${i}:${line.slice(0, 24)}`}
            numberOfLines={1}
            ellipsizeMode="clip"
            style={[
              styles.row,
              {
                width: box.w,
                height: linePx,
                lineHeight: linePx,
              },
            ]}
          >
            {renderLine(line, String(i))}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000",
  },
  column: {
    flex: 1,
    overflow: "hidden",
  },
  row: {
    fontSize: 17,
    fontWeight: "500",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  plain: {
    color: "#fff",
  },
});
