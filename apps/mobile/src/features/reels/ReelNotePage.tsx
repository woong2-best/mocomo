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

const EMOJI_RE =
  /(\p{Extended_Pictographic}(?:\uFE0F|\u20E3)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\u20E3)?)*)/gu;

function renderLine(line: string, key: string) {
  return line.split(EMOJI_RE).map((part, i) =>
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
  const [tracks, setTracks] = useState<number[]>([]);

  const onColumnLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    const h = Math.round(e.nativeEvent.layout.height);
    if (w < 8 || h < 8) return;
    setBox((prev) => {
      if (prev.w === w && prev.h === h) return prev;
      setTracks([]);
      return { w, h };
    });
  };

  const budget = useMemo(
    () =>
      box.w > 0
        ? notePageBudget(box.w + pads.left + pads.right, box.h + pads.top + pads.bottom, pads)
        : null,
    [box.h, box.w, pads]
  );
  const lines = useMemo(
    () => (budget ? wrapReelNoteVisual(text, { ...budget, lineWidthPx: box.w }) : []),
    [budget, box.w, text]
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
            key={`${box.w}:${i}:${line}`}
            numberOfLines={1}
            ellipsizeMode="clip"
            onTextLayout={(e) => {
              if (i === lines.length - 1 || box.w <= 0) return;
              setTracks((prev) => {
                if ((prev[i] ?? 0) > 0) return prev;
                const drawn = e.nativeEvent.lines[0]?.width ?? 0;
                if (drawn <= 1) return prev;
                const gaps = Math.max(1, Array.from(line).length - 1);
                const next = Math.max(0, (box.w - drawn) / gaps);
                if (next < 0.15) return prev;
                const copy = prev.slice();
                copy[i] = next;
                return copy;
              });
            }}
            style={[
              styles.row,
              {
                width: box.w,
                height: linePx,
                lineHeight: linePx,
                letterSpacing: i === lines.length - 1 ? 0 : tracks[i] ?? 0,
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
