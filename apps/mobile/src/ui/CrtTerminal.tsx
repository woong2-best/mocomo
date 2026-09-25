import { type ReactNode, useEffect, useId, useState } from "react";
import { Platform, StyleSheet, Text, View, type TextProps, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Pattern, Rect, Stop } from "react-native-svg";

/** P1 phosphor — matches classic CRT / man-page green. */
export const PHOSPHOR = "#6CFF62";
export const PHOSPHOR_DIM = "#3E9A38";
export const PHOSPHOR_FAINT = "#1E5A1C";
export const CRT_SCREEN = "#03140A";
export const CRT_BEZEL = "#141A14";
export const CRT_BEZEL_INNER = "#0A120C";

export const CRT_MONO = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
}) as string;

export function CrtScanlines() {
  const uid = useId().replace(/:/g, "");
  const scanId = `crtScan${uid}`;
  const vigId = `crtVig${uid}`;
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id={scanId} x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
          <Rect x="0" y="0" width="3" height="1.4" fill="rgba(0,0,0,0.28)" />
        </Pattern>
        <LinearGradient id={vigId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000" stopOpacity="0.45" />
          <Stop offset="0.12" stopColor="#000" stopOpacity="0" />
          <Stop offset="0.88" stopColor="#000" stopOpacity="0" />
          <Stop offset="1" stopColor="#000" stopOpacity="0.5" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="1200" height="2400" fill={`url(#${scanId})`} />
      <Rect x="0" y="0" width="1200" height="2400" fill={`url(#${vigId})`} />
    </Svg>
  );
}

export function PhosphorText({
  dim,
  faint,
  glow,
  style,
  ...rest
}: TextProps & { dim?: boolean; faint?: boolean; glow?: boolean }) {
  const color = faint ? PHOSPHOR_FAINT : dim ? PHOSPHOR_DIM : PHOSPHOR;
  return (
    <Text
      {...rest}
      style={[
        {
          color,
          fontFamily: CRT_MONO,
          textShadowColor: glow === false ? "transparent" : "rgba(108,255,98,0.55)",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: glow === false || faint ? 0 : dim ? 4 : 8,
        },
        style,
      ]}
    />
  );
}

export function CrtCursor({ height = 14 }: { height?: number }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn((v) => !v), 530);
    return () => clearInterval(t);
  }, []);
  return (
    <View
      style={{
        width: 8,
        height,
        marginLeft: 2,
        backgroundColor: on ? PHOSPHOR : "transparent",
        shadowColor: PHOSPHOR,
        shadowOpacity: on ? 0.9 : 0,
        shadowRadius: 6,
      }}
    />
  );
}

type FrameProps = {
  title: string;
  children: ReactNode;
  style?: ViewStyle;
};

/** CRT monitor + terminal chrome. */
export function CrtFrame({ title, children, style }: FrameProps) {
  return (
    <View style={[styles.bezel, style]}>
      <View style={styles.bezelInner}>
        <View style={styles.titleBar}>
          <View style={styles.traffic}>
            <View style={[styles.dot, { backgroundColor: "#3d5a3d" }]} />
            <View style={[styles.dot, { backgroundColor: "#2a4a2a" }]} />
            <View style={[styles.dot, { backgroundColor: PHOSPHOR_FAINT }]} />
          </View>
          <PhosphorText dim style={styles.title}>
            {title}
          </PhosphorText>
          <View style={styles.trafficSpacer} />
        </View>
        <View style={styles.screen}>
          <View style={styles.phosphorWash} pointerEvents="none" />
          {children}
          <CrtScanlines />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bezel: {
    borderRadius: 18,
    backgroundColor: CRT_BEZEL,
    padding: 10,
    borderWidth: 1,
    borderColor: "#2A332A",
    shadowColor: "#6CFF62",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  bezelInner: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: CRT_BEZEL_INNER,
    backgroundColor: CRT_SCREEN,
  },
  titleBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#07110A",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PHOSPHOR_FAINT,
  },
  traffic: { flexDirection: "row", gap: 5, width: 42 },
  trafficSpacer: { width: 42 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    letterSpacing: 0.6,
  },
  screen: {
    backgroundColor: CRT_SCREEN,
    overflow: "hidden",
  },
  phosphorWash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(40,140,50,0.06)",
  },
});
