import { StyleSheet, Text, View } from "react-native";

const LINE = 32;
const RULES = 18;

/** Ruled note filling the reel. `text` is already split to one page. */
export function ReelNotePage({ text }: { text: string }) {
  return (
    <View style={styles.fill}>
      <View style={styles.paper}>
        {Array.from({ length: RULES }, (_, i) => (
          <View key={i} pointerEvents="none" style={[styles.rule, { top: 12 + (i + 1) * LINE }]} />
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
    paddingTop: 12,
    paddingHorizontal: 18,
    paddingBottom: 120,
    color: "#221c16",
    fontSize: 17,
    lineHeight: LINE,
    fontWeight: "500",
  },
});
