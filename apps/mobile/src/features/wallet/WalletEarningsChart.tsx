import { useMemo } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
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
const PAD = { top: 12, right: 8, bottom: 24, left: 8 };
const MONTHS = 12;

function monthSlotX(index: number, innerW: number): number {
  return (index / MONTHS) * innerW + innerW / (MONTHS * 2);
}

function chartScale(values: number[], innerH: number) {
  const minV = Math.min(0, ...values);
  const maxV = Math.max(1, ...values);
  const pad = innerH * 0.1;
  const plotH = innerH - pad * 2;
  const span = maxV - minV;
  const toY = (v: number) => innerH - pad - ((v - minV) / span) * plotH;
  return { toY, zeroY: toY(0) };
}

function buildStepPath(values: number[], toY: (v: number) => number, innerW: number): string {
  if (values.length === 0) return "";
  const parts: string[] = [];
  const x0 = monthSlotX(0, innerW);
  parts.push(`M ${x0.toFixed(1)} ${toY(0).toFixed(1)}`);
  parts.push(`L ${x0.toFixed(1)} ${toY(values[0]).toFixed(1)}`);
  for (let i = 1; i < values.length; i++) {
    const x = monthSlotX(i, innerW);
    parts.push(`L ${x.toFixed(1)} ${toY(values[i - 1]).toFixed(1)}`);
    parts.push(`L ${x.toFixed(1)} ${toY(values[i]).toFixed(1)}`);
  }
  parts.push(`L ${innerW.toFixed(1)} ${toY(values[values.length - 1]).toFixed(1)}`);
  return parts.join(" ");
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
    const { toY, zeroY } = chartScale(cumValues, innerH);
    const path = buildStepPath(cumValues, toY, innerW);
    const barMax = Math.max(1, ...safeMonths.map((m) => Math.max(m.earned ?? 0, m.withdrawn ?? 0)));
    const bw = innerW / 14;
    const groupW = bw * 0.9;
    const bars = safeMonths.map((m, i) => {
      const slotCenter = monthSlotX(i, innerW);
      const x = PAD.left + slotCenter - groupW / 2;
      const earnedH = ((m.earned ?? 0) / barMax) * (innerH * 0.35);
      const withdrawnH = ((m.withdrawn ?? 0) / barMax) * (innerH * 0.35);
      const baseY = PAD.top + innerH;
      return { ...m, x, bw, earnedH, withdrawnH, baseY, slotCenter };
    });
    return { cumulativePath: path, zeroY: PAD.top + zeroY, bars };
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
          {safeMonths.map((m, i) => (
            <SvgText
              key={`cum-label-${m.month}`}
              x={PAD.left + monthSlotX(i, innerW)}
              y={CHART_H - 4}
              fontSize={9}
              fontWeight="600"
              fill={colors.textMuted}
              textAnchor="middle"
            >
              {m.label.replace("월", "")}
            </SvgText>
          ))}
        </Svg>
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
              <SvgText
                x={PAD.left + b.slotCenter}
                y={CHART_H - 4}
                fontSize={9}
                fontWeight="600"
                fill={colors.textMuted}
                textAnchor="middle"
              >
                {b.label.replace("월", "")}
              </SvgText>
            </G>
          ))}
        </Svg>
        <View style={styles.legendRow}>
          <Text style={[styles.legend, { color: colors.textMuted }]}>● 수익</Text>
          <Text style={[styles.legend, { color: colors.textMuted }]}>● 지출(출금)</Text>
        </View>
      </View>
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
  legendRow: { flexDirection: "row", gap: spacing.md, paddingHorizontal: 4, paddingTop: 4 },
  legend: { fontSize: 11, fontWeight: "600" },
});
