import { useMemo } from "react";
import { Animated, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { G, Line, Path, Rect } from "react-native-svg";
import { spacing, type ThemeColors } from "@/theme/tokens";

type Month = {
  month: number;
  label: string;
  earned: number;
  withdrawn: number;
  net: number;
  cumulative: number;
};

type Props = {
  months: Month[];
  yearNet: number;
  colors: ThemeColors;
};

const CHART_H = 160;
const PAD = { top: 12, right: 8, bottom: 8, left: 8 };

function buildPath(values: number[], maxAbs: number, innerW: number, innerH: number): string {
  if (values.length === 0) return "";
  const midY = innerH / 2;
  const scale = maxAbs > 0 ? (innerH * 0.42) / maxAbs : 1;
  return values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * innerW;
      const y = midY - v * scale;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function WalletEarningsChart({ months, yearNet, colors }: Props) {
  const { width: screenW } = useWindowDimensions();
  const chartW = Math.max(280, Math.min(screenW - spacing.md * 4, 400));
  const innerW = chartW - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const trendUp = yearNet >= 0;

  const safeMonths = months?.length === 12 ? months : [];

  const { cumulativePath, zeroY, bars } = useMemo(() => {
    const cumValues = safeMonths.map((m) => m.cumulative ?? 0);
    const maxAbs = Math.max(
      1,
      ...cumValues.map(Math.abs),
      ...safeMonths.map((m) => m.earned ?? 0),
      ...safeMonths.map((m) => m.withdrawn ?? 0)
    );
    const path = buildPath(cumValues, maxAbs, innerW, innerH);
    const midY = PAD.top + innerH / 2;
    const barMax = Math.max(1, ...safeMonths.map((m) => Math.max(m.earned ?? 0, m.withdrawn ?? 0)));
    const bars = safeMonths.map((m, i) => {
      const x = PAD.left + (i / 12) * innerW + innerW / 24;
      const bw = innerW / 14;
      const earnedH = ((m.earned ?? 0) / barMax) * (innerH * 0.35);
      const withdrawnH = ((m.withdrawn ?? 0) / barMax) * (innerH * 0.35);
      const baseY = PAD.top + innerH;
      return { ...m, x, bw, earnedH, withdrawnH, baseY };
    });
    return { cumulativePath: path, zeroY: midY, bars };
  }, [safeMonths, innerH, innerW]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.panel, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
        <View style={styles.panelHeader}>
          <Text style={[styles.panelTitle, { color: colors.textMuted }]}>누적 순수익 추이</Text>
          <Text style={[styles.trend, { color: trendUp ? colors.success : colors.danger }]}>
            {trendUp ? "▲" : "▼"} {Math.abs(yearNet ?? 0).toLocaleString("ko-KR")}원
          </Text>
        </View>
        <Svg width={chartW} height={CHART_H}>
          <Line
            x1={PAD.left}
            y1={zeroY}
            x2={chartW - PAD.right}
            y2={zeroY}
            stroke={colors.hairline}
            strokeDasharray="4 4"
          />
          {cumulativePath ? (
            <Path
              d={cumulativePath}
              fill="none"
              stroke={trendUp ? colors.success : colors.danger}
              strokeWidth={2.5}
              transform={`translate(${PAD.left}, ${PAD.top})`}
            />
          ) : null}
        </Svg>
        <MonthLabels months={safeMonths} colors={colors} />
      </View>

      <View style={[styles.panel, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
        <Text style={[styles.panelTitle, { color: colors.textMuted, marginBottom: spacing.sm }]}>
          월별 수익 · 지출
        </Text>
        <Svg width={chartW} height={CHART_H}>
          {bars.map((b) => (
            <G key={`bar-${b.month}`}>
              <Rect
                x={b.x}
                y={b.baseY - b.earnedH}
                width={b.bw * 0.42}
                height={Math.max(0, b.earnedH)}
                rx={3}
                fill={colors.cobalt}
                opacity={0.9}
              />
              <Rect
                x={b.x + b.bw * 0.48}
                y={b.baseY - b.withdrawnH}
                width={b.bw * 0.42}
                height={Math.max(0, b.withdrawnH)}
                rx={3}
                fill={colors.terracotta}
                opacity={0.9}
              />
            </G>
          ))}
        </Svg>
        <MonthLabels months={safeMonths} colors={colors} />
        <View style={styles.legendRow}>
          <Text style={[styles.legend, { color: colors.textMuted }]}>● 수익</Text>
          <Text style={[styles.legend, { color: colors.textMuted }]}>● 지출(출금)</Text>
        </View>
      </View>
    </View>
  );
}

function MonthLabels({ months, colors }: { months: Month[]; colors: ThemeColors }) {
  return (
    <View style={styles.monthRow}>
      {months.map((m) => (
        <Text key={m.month} style={[styles.monthLabel, { color: colors.textMuted }]}>
          {m.label.replace("월", "")}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  panel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.sm,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  panelTitle: { fontSize: 13, fontWeight: "700" },
  trend: { fontSize: 12, fontWeight: "800" },
  monthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 4,
  },
  monthLabel: { fontSize: 9, fontWeight: "600", flex: 1, textAlign: "center" },
  legendRow: { flexDirection: "row", gap: spacing.md, paddingHorizontal: 4, paddingTop: 4 },
  legend: { fontSize: 11, fontWeight: "600" },
});
