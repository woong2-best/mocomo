import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

type Parts = {
  ended: boolean;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  text: string;
};

function pad2(n: number): string {
  return String(Math.max(0, n)).padStart(2, "0");
}

export function auctionCountdownParts(endsAt: string | null | undefined, now = Date.now()): Parts | null {
  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  if (!Number.isFinite(end)) return null;
  const diff = end - now;
  const totalSecs = diff <= 0 ? 0 : Math.floor(diff / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;
  const d = pad2(days);
  const h = pad2(hours);
  const m = pad2(minutes);
  const s = pad2(seconds);
  return {
    ended: diff <= 0,
    days: d,
    hours: h,
    minutes: m,
    seconds: s,
    text: `${d}:${h}:${m}:${s}`,
  };
}

const CELLS = [
  ["days", "일"],
  ["hours", "시"],
  ["minutes", "분"],
  ["seconds", "초"],
] as const;

export function AuctionCountdown({
  endsAt,
  variant = "compact",
  tone = "brand",
}: {
  endsAt: string | null | undefined;
  variant?: "compact" | "clock";
  tone?: "brand" | "gold";
}) {
  const [parts, setParts] = useState<Parts | null>(null);

  useEffect(() => {
    const tick = () => setParts(auctionCountdownParts(endsAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return null;

  const digit = parts?.ended ? "textDim" : tone === "gold" ? "textGold" : "textLed";
  const chip = tone === "gold" ? styles.chipGold : styles.chip;

  if (variant === "compact") {
    return (
      <View style={[styles.compact, chip]} accessibilityLabel={parts?.ended ? "경매 마감" : `남은 시간 ${parts?.text ?? ""}`}>
        <Text style={[styles.compactText, styles[digit]]}>{parts?.text ?? "--:--:--:--"}</Text>
      </View>
    );
  }

  return (
    <View style={styles.clock} accessibilityLabel={parts?.ended ? "경매 마감" : `남은 시간 ${parts?.text ?? ""}`}>
      {CELLS.map(([key, label], index) => (
        <View key={key} style={styles.cellWrap}>
          {index > 0 ? <Text style={[styles.colon, styles[digit]]}>:</Text> : null}
          <View style={styles.cell}>
            <View style={[styles.digit, chip]}>
              <Text style={[styles.digitText, styles[digit]]}>{parts ? parts[key] : "--"}</Text>
            </View>
            <Text style={styles.unit}>{label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  compact: {
    alignSelf: "flex-start",
    marginTop: 6,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  compactText: {
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.6,
  },
  clock: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 10,
  },
  cellWrap: { flexDirection: "row", alignItems: "flex-end" },
  cell: { alignItems: "center" },
  digit: {
    minWidth: 46,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 8,
    alignItems: "center",
  },
  digitText: {
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    fontSize: 22,
    letterSpacing: 1,
  },
  colon: {
    fontWeight: "800",
    fontSize: 20,
    marginHorizontal: 3,
    marginBottom: 18,
  },
  unit: { marginTop: 4, fontSize: 10, fontWeight: "700", color: "#8a8178" },
  chip: { backgroundColor: "#14110e" },
  chipGold: { backgroundColor: "rgba(20, 12, 8, 0.72)" },
  textLed: { color: "#ff9a3c" },
  textGold: { color: "#e7c27a" },
  textDim: { color: "#8a8178" },
});
